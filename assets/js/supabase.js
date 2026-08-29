/* ============================================================
   Green Lions — accesso al database Supabase.

   Da usare nelle pagine nuove così:

     <script src="/assets/js/supabase.js"></script>
     <script>
       glLeggi('nome_vista').then(righe => { ... });
     </script>

   Attenzione: divise/index.html NON usa questo file, ha la sua
   copia della configurazione. È un file unico e autonomo di
   proposito (vedi il commento in cima a /assets/css/site.css).
   Se cambi progetto Supabase, cambia le chiavi in tutti e due.
   ============================================================ */

/* Chiave pubblica "anon": può fare solo quello che le policy del
   database le concedono, quindi sta tranquillamente in chiaro qui.
   La chiave "service_role" NON va mai messa in una pagina web. */
const GL_SUPABASE_URL = "https://czgmdmtnxnaxowadfdfv.supabase.co";
const GL_SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6Z21kbXRueG5heG93YWRmZGZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3MjYyMzksImV4cCI6MjEwMzMwMjIzOX0.31uDHJbVvdSL0j2dQVGM9ApigtjX9G1w6V6ODmpOyMA";

const GL_BASE = GL_SUPABASE_URL.trim().replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
const GL_AUTH = { apikey: GL_SUPABASE_KEY, Authorization: 'Bearer ' + GL_SUPABASE_KEY };

/** L'ultima lettura andata male, o null. Vedi il commento dentro glLeggi. */
let GL_ULTIMO_ERRORE = null;

/**
 * Legge una tabella o una vista del database.
 *
 * Funziona solo sulle viste pubbliche, quelle che il database
 * lascia leggere a chiunque: kit_presi, rosa_pubblica,
 * calendario_pubblico, disponibilita_pubblica. Contengono solo
 * quello che può essere visto da tutti — mai email né telefoni.
 * Per una pagina nuova serve creare la vista e darle il permesso,
 * come negli schemi in Confident/.
 *
 * @param {string} tabella  nome della tabella o vista
 * @param {string} query    filtri e ordinamenti PostgREST,
 *                          es. "select=nome,ruolo&order=numero"
 * @returns {Promise<Array>} le righe; array vuoto se la lettura fallisce
 */
async function glLeggi(tabella, query = 'select=*') {
  try {
    const r = await fetch(GL_BASE + '/rest/v1/' + tabella + '?' + query, { headers: GL_AUTH });
    if (!r.ok) {
      const corpo = await r.json().catch(() => ({}));
      throw new Error(corpo.message || 'risposta ' + r.status);
    }
    return await r.json();
  } catch (e) {
    // Una lettura fallita torna comunque una lista vuota, così la pagina si
    // disegna lo stesso. Ma "vuoto" e "rotto" non sono la stessa cosa: senza
    // questa traccia la pagina direbbe "non c'è nessuno" mentre in realtà non
    // è riuscita a chiederlo. Chi chiama azzera GL_ULTIMO_ERRORE prima di
    // ricaricare e lo guarda dopo.
    GL_ULTIMO_ERRORE = e.message || 'nessuna risposta';
    console.error('lettura di ' + tabella + ' fallita:', e);
    return [];
  }
}


/* ------------------------------------------------------------
   Scrittura: le funzioni del database

   Le pagine non scrivono mai direttamente nelle tabelle. Chiamano
   una funzione (aggiungi_giocatore, crea_giornata, ...) che prima
   di scrivere controlla il codice squadra. È il database a dire
   di no, non la pagina: così non si aggira togliendo un campo
   dal modulo con gli strumenti per sviluppatori del browser.
   ------------------------------------------------------------ */

/** Errore che arriva dal database, con dentro il suo codice parlante. */
class GlErrore extends Error {
  constructor(codice, http) {
    super(codice);
    this.codice = codice;
    this.http = http;
  }
}

/**
 * Chiama una funzione del database.
 * @param {string} funzione   es. 'aggiungi_giocatore'
 * @param {object} parametri  i parametri, con il trattino basso: { _codice: '...' }
 * @throws {GlErrore} se il database rifiuta
 */
async function glChiama(funzione, parametri = {}) {
  let r;
  try {
    r = await fetch(GL_BASE + '/rest/v1/rpc/' + funzione, {
      method: 'POST',
      headers: { ...GL_AUTH, 'Content-Type': 'application/json' },
      body: JSON.stringify(parametri)
    });
  } catch {
    throw new GlErrore('RETE_ASSENTE', 0);
  }

  if (r.ok) return r.status === 204 ? null : await r.json().catch(() => null);

  const corpo = await r.json().catch(() => ({}));
  throw new GlErrore(String(corpo.message || 'errore ' + r.status), r.status);
}

/* Gli errori che le funzioni possono sollevare, detti a parole. */
const GL_MESSAGGI = {
  CODICE_ERRATO:       'Codice sbagliato. È quello scritto nel gruppo — maiuscole e minuscole non contano, gli spazi sì.',
  EMAIL_GIA_IN_ROSA:   'Questa email è già in rosa. Se devi correggere qualcosa, chiedi a chi gestisce il sito.',
  NUMERO_OCCUPATO:     'Quel numero di maglia ce l\'ha già un altro. Scegline un altro o lascia il campo vuoto.',
  NOME_NON_VALIDO:     'Scrivi nome e cognome per esteso (almeno due lettere ciascuno).',
  EMAIL_NON_VALIDA:    'L\'email non sembra valida: è lì che arriva l\'invito, controllala bene.',
  TITOLO_NON_VALIDO:   'Il titolo è troppo corto.',
  LUOGO_NON_VALIDO:    'Scrivi dove si gioca.',
  STATO_NON_VALIDO:    'Risposta non valida.',
  GIORNATA_INESISTENTE:'Questa giornata non c\'è più o è stata annullata. Ricarica la pagina.',
  PRIMA_ANNULLA:       'C\'è già chi ha questa giornata nel proprio calendario. Annullala prima — così gli parte la disdetta e l\'evento sparisce anche da lì — poi la puoi eliminare.',
  RETE_ASSENTE:        'Connessione assente. Controlla la rete e riprova.'
};

/** Il messaggio da mostrare per un errore arrivato dal database. */
function glMessaggio(e) {
  if (e instanceof GlErrore) {
    if (GL_MESSAGGI[e.codice]) return GL_MESSAGGI[e.codice];
    if (/api key|jwt/i.test(e.codice)) {
      return 'La pagina non riesce a collegarsi al database: la chiave è sbagliata o scaduta. Avvisa chi gestisce il sito, non è colpa tua.';
    }
    if (e.http === 404) return 'Il database non trova questa funzione: manca un pezzo di configurazione. Avvisa chi gestisce il sito.';
  }
  console.error(e);
  return 'Non è andata a buon fine. Riprova tra poco.';
}
