/* ============================================================
   Green Lions — invito al calendario.

   Manda per email l'invito a una giornata, come allegato .ics.
   Gmail lo riconosce e mostra i pulsanti Sì / Forse / No: chi
   accetta se lo ritrova nel proprio calendario.

   Quando parte
   ------------
   La chiamano due webhook del database (vedi ISTRUZIONI):

     · tabella "disponibilita", INSERT e UPDATE
       → un giocatore ha risposto. Se ha detto sì o forse riceve
         l'invito; se ha cambiato idea in no, riceve la disdetta.

     · tabella "giornate", UPDATE
       → la giornata è cambiata o è stata annullata. L'aggiornamento
         va a tutti quelli che avevano detto sì o forse.

   Come fa Gmail a non creare doppioni
   -----------------------------------
   Ogni giornata ha un UID che non cambia mai e un contatore
   "sequenza" che sale a ogni modifica. Stesso UID + sequenza più
   alta = "aggiorna quello che hai già", non "aggiungine un altro".
   È lo standard iCalendar (RFC 5545), non un trucco di Gmail:
   funziona anche con Outlook e Apple Calendario.

   Cosa serve nei Secrets della funzione
   -------------------------------------
     GMAIL_USER           la casella che manda (è anche l'organizzatore)
     GMAIL_APP_PASSWORD   la "password per le app" di Google
     WEBHOOK_SECRET       parola inventata, la stessa messa nei webhook
     SITO_URL             facoltativo, per il link in fondo alla mail
   ============================================================ */

import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const GMAIL_USER = Deno.env.get("GMAIL_USER") ?? "";
const GMAIL_APP_PASSWORD = Deno.env.get("GMAIL_APP_PASSWORD") ?? "";
const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET") ?? "";
const SITO_URL = Deno.env.get("SITO_URL") ?? "https://divisegreenlions.netlify.app";

// Iniettate da Supabase, non vanno impostate a mano.
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const SQUADRA = "Green Lions";

type Giornata = {
  id: number;
  titolo: string;
  tipo: string;
  avversario: string | null;
  inizio: string;
  durata_min: number;
  luogo: string;
  indirizzo: string | null;
  note: string | null;
  stato: string;
  uid: string;
  sequenza: number;
};

type Giocatore = { id: number; nome: string; cognome: string; email: string };

/* ---------- lettura dal database, con la chiave di servizio ---------- */

async function db<T>(percorso: string): Promise<T[]> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${percorso}`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  if (!r.ok) throw new Error(`lettura ${percorso}: ${r.status} ${await r.text()}`);
  return await r.json();
}

const leggiGiornata = async (id: number) =>
  (await db<Giornata>(`giornate?id=eq.${id}&select=*`))[0];

const leggiGiocatore = async (id: number) =>
  (await db<Giocatore>(`giocatori?id=eq.${id}&select=id,nome,cognome,email`))[0];

/** Chi ha detto sì o forse: sono quelli che hanno l'evento in calendario. */
async function leggiIscritti(giornataId: number): Promise<Giocatore[]> {
  const righe = await db<{ giocatori: Giocatore }>(
    `disponibilita?giornata_id=eq.${giornataId}&stato=in.(si,forse)` +
      `&select=giocatori(id,nome,cognome,email)`,
  );
  return righe.map((r) => r.giocatori).filter(Boolean);
}

/* ---------- costruzione del file .ics ---------- */

/** Nel formato iCalendar virgole, punti e virgola e a capo vanno protetti. */
function esc(testo: string): string {
  return testo
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Le righe non possono superare i 75 ottetti: si spezzano con uno spazio. */
function piega(riga: string): string {
  const byte = new TextEncoder().encode(riga);
  if (byte.length <= 74) return riga;
  const pezzi: string[] = [];
  let corrente = "";
  let lunghezza = 0;
  for (const carattere of riga) {
    const peso = new TextEncoder().encode(carattere).length;
    // dalla seconda riga in poi c'è lo spazio iniziale, quindi un ottetto in meno
    if (lunghezza + peso > (pezzi.length === 0 ? 74 : 73)) {
      pezzi.push(corrente);
      corrente = "";
      lunghezza = 0;
    }
    corrente += carattere;
    lunghezza += peso;
  }
  pezzi.push(corrente);
  return pezzi.join("\r\n ");
}

const quandoICS = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

function titoloEsteso(g: Giornata): string {
  if (g.tipo === "partita" && g.avversario) return `${SQUADRA} – ${g.avversario}`;
  return g.titolo;
}

function costruisciICS(g: Giornata, destinatario: Giocatore, metodo: "REQUEST" | "CANCEL"): string {
  const inizio = new Date(g.inizio);
  const fine = new Date(inizio.getTime() + g.durata_min * 60_000);

  const luogo = g.indirizzo ? `${g.luogo}, ${g.indirizzo}` : g.luogo;
  const descrizione = [
    g.tipo === "partita" && g.avversario ? `Avversario: ${g.avversario}` : `Tipo: ${g.tipo}`,
    g.note ? `\n${g.note}` : "",
    `\nDisponibilità e aggiornamenti: ${SITO_URL}/calendario/`,
  ].filter(Boolean).join("");

  const righe = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Green Lions//Calendario//IT",
    "CALSCALE:GREGORIAN",
    `METHOD:${metodo}`,
    "BEGIN:VEVENT",
    `UID:${g.uid}`,
    `SEQUENCE:${g.sequenza}`,
    `DTSTAMP:${quandoICS(new Date())}`,
    `DTSTART:${quandoICS(inizio)}`,
    `DTEND:${quandoICS(fine)}`,
    `SUMMARY:${esc(titoloEsteso(g))}`,
    `LOCATION:${esc(luogo)}`,
    `DESCRIPTION:${esc(descrizione)}`,
    `STATUS:${metodo === "CANCEL" ? "CANCELLED" : "CONFIRMED"}`,
    `ORGANIZER;CN=${esc(SQUADRA)}:mailto:${GMAIL_USER}`,
    `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;` +
      `RSVP=TRUE;CN=${esc(destinatario.nome + " " + destinatario.cognome)}:mailto:${destinatario.email}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return righe.map(piega).join("\r\n") + "\r\n";
}

/* ---------- la mail ---------- */

const dataItaliana = (iso: string) =>
  new Date(iso).toLocaleString("it-IT", {
    timeZone: "Europe/Rome",
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

function componiMail(g: Giornata, dest: Giocatore, metodo: "REQUEST" | "CANCEL", aggiornamento: boolean) {
  const titolo = titoloEsteso(g);
  const quando = dataItaliana(g.inizio);
  const dove = g.indirizzo ? `${g.luogo}, ${g.indirizzo}` : g.luogo;

  if (metodo === "CANCEL") {
    return {
      oggetto: `Annullata: ${titolo} — ${quando}`,
      testo: `Ciao ${dest.nome},\n\n${titolo} del ${quando} non si fa più.\n` +
        `L'evento sparisce da solo dal tuo calendario.\n\n${SITO_URL}/calendario/\n`,
      html: `<p>Ciao ${dest.nome},</p><p><b>${titolo}</b> del ${quando} <b>non si fa più</b>.
             L'evento sparisce da solo dal tuo calendario.</p>
             <p><a href="${SITO_URL}/calendario/">Il calendario dei ${SQUADRA}</a></p>`,
    };
  }

  const apertura = aggiornamento
    ? `${titolo} è cambiata. Il tuo calendario si aggiorna da solo, questi sono i dati nuovi:`
    : `Ci sei per ${titolo}. Ecco il promemoria:`;

  return {
    oggetto: `${aggiornamento ? "Aggiornata: " : ""}${titolo} — ${quando}`,
    testo: `Ciao ${dest.nome},\n\n${apertura}\n\nQuando: ${quando}\nDove: ${dove}\n` +
      `${g.note ? `\nNote: ${g.note}\n` : ""}\n${SITO_URL}/calendario/\n`,
    html: `<p>Ciao ${dest.nome},</p><p>${apertura}</p>
           <table cellpadding="4" style="font-family:sans-serif;font-size:15px">
             <tr><td><b>Quando</b></td><td>${quando}</td></tr>
             <tr><td><b>Dove</b></td><td>${dove}</td></tr>
             ${g.note ? `<tr><td><b>Note</b></td><td>${g.note}</td></tr>` : ""}
           </table>
           <p><a href="${SITO_URL}/calendario/">Il calendario dei ${SQUADRA}</a></p>`,
  };
}

async function spedisci(
  giornata: Giornata,
  destinatari: Giocatore[],
  metodo: "REQUEST" | "CANCEL",
  aggiornamento: boolean,
) {
  if (destinatari.length === 0) return { inviate: 0, errori: [] as string[] };

  const client = new SMTPClient({
    connection: {
      hostname: "smtp.gmail.com",
      port: 465,
      tls: true,
      auth: { username: GMAIL_USER, password: GMAIL_APP_PASSWORD },
    },
  });

  let inviate = 0;
  const errori: string[] = [];

  try {
    for (const dest of destinatari) {
      const ics = costruisciICS(giornata, dest, metodo);
      const mail = componiMail(giornata, dest, metodo, aggiornamento);
      try {
        await client.send({
          from: `${SQUADRA} <${GMAIL_USER}>`,
          to: `${dest.nome} ${dest.cognome} <${dest.email}>`,
          subject: mail.oggetto,
          content: mail.testo,
          html: mail.html,
          // La parte "alternativa" è quella che fa comparire i pulsanti
          // Sì / Forse / No dentro Gmail...
          mimeContent: [{
            mimeType: `text/calendar; charset="utf-8"; method=${metodo}`,
            content: ics,
          }],
          // ...l'allegato serve a chi legge la posta con un altro programma.
          attachments: [{
            filename: "invito.ics",
            contentType: `text/calendar; method=${metodo}; name="invito.ics"`,
            encoding: "text",
            content: ics,
          }],
        });
        inviate++;
      } catch (e) {
        errori.push(`${dest.email}: ${e instanceof Error ? e.message : e}`);
      }
    }
  } finally {
    await client.close();
  }

  return { inviate, errori };
}

/* ---------- ingresso ---------- */

Deno.serve(async (req) => {
  if (req.headers.get("x-webhook-secret") !== WEBHOOK_SECRET) {
    return new Response("no", { status: 401 });
  }

  try {
    const corpo = await req.json();

    // Prova manuale: { "prova": { "giornata_id": 1, "giocatore_id": 2 } }
    if (corpo.prova) {
      const g = await leggiGiornata(corpo.prova.giornata_id);
      const p = await leggiGiocatore(corpo.prova.giocatore_id);
      if (!g || !p) return Response.json({ errore: "giornata o giocatore inesistente" }, { status: 400 });
      const esito = await spedisci(g, [p], "REQUEST", false);
      return Response.json({ prova: true, ...esito });
    }

    const { table, type, record, old_record } = corpo;

    /* --- un giocatore ha risposto --- */
    if (table === "disponibilita") {
      const giornata = await leggiGiornata(record.giornata_id);
      const giocatore = await leggiGiocatore(record.giocatore_id);
      if (!giornata || !giocatore) return Response.json({ saltato: "riga incompleta" });
      if (giornata.stato === "annullata") return Response.json({ saltato: "giornata annullata" });

      const oraDentro = record.stato === "si" || record.stato === "forse";
      const primaDentro = old_record?.stato === "si" || old_record?.stato === "forse";

      if (oraDentro) {
        // sì → forse (o viceversa) non cambia nulla per il calendario:
        // l'evento c'è già e i dati sono gli stessi
        if (primaDentro) return Response.json({ saltato: "era già iscritto" });
        return Response.json(await spedisci(giornata, [giocatore], "REQUEST", false));
      }

      // ha detto no: la disdetta serve solo a chi l'invito ce l'aveva
      if (primaDentro) return Response.json(await spedisci(giornata, [giocatore], "CANCEL", false));
      return Response.json({ saltato: "ha detto no senza essere iscritto" });
    }

    /* --- la giornata è cambiata --- */
    if (table === "giornate" && type === "UPDATE") {
      const giornata: Giornata = record;

      // sequenza ferma = modifica che non riguarda i partecipanti
      // (o è la funzione stessa che sta riscrivendo la riga)
      if (old_record && giornata.sequenza === old_record.sequenza) {
        return Response.json({ saltato: "sequenza invariata" });
      }

      const iscritti = await leggiIscritti(giornata.id);
      const annullata = giornata.stato === "annullata";
      return Response.json(
        await spedisci(giornata, iscritti, annullata ? "CANCEL" : "REQUEST", !annullata),
      );
    }

    return Response.json({ saltato: `niente da fare per ${table}/${type}` });
  } catch (e) {
    console.error(e);
    return Response.json({ errore: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
});
