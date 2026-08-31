/* ============================================================
   Green Lions — prova delle pagine

   Carica ogni pagina in un browser finto, con risposte finte al
   posto di Supabase, e controlla che disegni davvero qualcosa.

   Serve perché un controllo di sola sintassi non basta: il guaio
   che ha fatto sparire la rosa era una variabile che ne copriva
   un'altra — sintassi perfetta, funzione che moriva alla prima
   riga utile.

   È facoltativo e non c'entra col sito pubblicato. Per usarlo:

       cd strumenti
       npm install jsdom
       node prova-pagine.js ..

   Esce con 0 se tutte le pagine si disegnano, 1 altrimenti.
   ============================================================ */

const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const path = require('path');

const RADICE = process.argv[2];

const DATI = {
  rosa_pubblica: [
    { id: 1, nome: 'Thomas',  iniziale: 'F.', numero: 1,  ruolo: 'giocatore',      tessera_anspi: true,  tessera_csi: false, visita_scadenza: null, e_giocatore: true },
    { id: 2, nome: 'Nicolò',  iniziale: 'V.', numero: 8,  ruolo: 'giocatore',      tessera_anspi: false, tessera_csi: true,  visita_scadenza: '2027-06-30', e_giocatore: true },
    { id: 3, nome: 'Anna',    iniziale: 'R.', numero: null, ruolo: 'portiere',     tessera_anspi: true,  tessera_csi: false, visita_scadenza: '2026-09-05', e_giocatore: true },
    { id: 4, nome: 'Marco',   iniziale: 'B.', numero: 10, ruolo: 'allenatore',     tessera_anspi: true,  tessera_csi: true,  visita_scadenza: null, e_giocatore: false },
    { id: 5, nome: 'Zitto',   iniziale: 'Z.', numero: 12, ruolo: 'giocatore',      tessera_anspi: false, tessera_csi: false, visita_scadenza: '2099-01-01', e_giocatore: true },
  ],
  calendario_pubblico: [
    { id: 1, titolo: 'Campionato 1a', tipo: 'partita', avversario: 'Smama', inizio: '2099-09-14T13:30:00+00:00',
      durata_min: 90, luogo: 'Campo Paradiso', indirizzo: 'Via Paradiso 11', note: 'Ritrovo un ora prima',
      stato: 'programmata', sequenza: 0, aggiornato_il: '2026-08-01T10:00:00+00:00' },
    { id: 2, titolo: 'Amichevole', tipo: 'partita', avversario: 'Paradiso', inizio: '2020-09-14T13:30:00+00:00',
      durata_min: 90, luogo: 'Campo', indirizzo: null, note: null,
      stato: 'annullata', sequenza: 1, aggiornato_il: '2026-08-01T10:00:00+00:00' },
  ],
  disponibilita_pubblica: [
    { giornata_id: 1, giocatore_id: 1, nome: 'Thomas', iniziale: 'F.', numero: 1, tessera_anspi: true,  tessera_csi: false, stato: 'si' },
    { giornata_id: 1, giocatore_id: 2, nome: 'Nicolò', iniziale: 'V.', numero: 8, ruolo: 'giocatore', e_giocatore: true, tessera_anspi: false, tessera_csi: true, stato: 'forse' },
    { giornata_id: 1, giocatore_id: 4, nome: 'Marco', iniziale: 'B.', numero: null, ruolo: 'allenatore', e_giocatore: false, tessera_anspi: false, tessera_csi: false, stato: 'si' },
    { giornata_id: 1, giocatore_id: 3, nome: 'Anna', iniziale: 'R.', numero: null, ruolo: 'portiere', e_giocatore: true, tessera_anspi: true, tessera_csi: false, stato: 'no' },
  ],
  classifica: [
    { id: 1, girone: 'A', nome: 'CL',          noi: false, giocate: 1, vinte: 1, pari: 0, perse: 0, gol_fatti: 2, gol_subiti: 0, differenza: 2,  punti: 3 },
    { id: 2, girone: 'A', nome: 'Cappuccini',  noi: false, giocate: 1, vinte: 0, pari: 0, perse: 1, gol_fatti: 0, gol_subiti: 2, differenza: -2, punti: 0 },
    { id: 3, girone: 'A', nome: 'DandyLions',  noi: false, giocate: 0, vinte: 0, pari: 0, perse: 0, gol_fatti: 0, gol_subiti: 0, differenza: 0,  punti: 0 },
    { id: 4, girone: 'A', nome: 'Oratorio C.', noi: false, giocate: 0, vinte: 0, pari: 0, perse: 0, gol_fatti: 0, gol_subiti: 0, differenza: 0,  punti: 0 },
    { id: 5, girone: 'B', nome: 'Green Lions', noi: true,  giocate: 1, vinte: 1, pari: 0, perse: 0, gol_fatti: 3, gol_subiti: 1, differenza: 2,  punti: 3 },
    { id: 6, girone: 'B', nome: 'Smama',       noi: false, giocate: 1, vinte: 0, pari: 0, perse: 1, gol_fatti: 1, gol_subiti: 3, differenza: -2, punti: 0 },
    { id: 7, girone: 'B', nome: 'Paradiso',    noi: false, giocate: 0, vinte: 0, pari: 0, perse: 0, gol_fatti: 0, gol_subiti: 0, differenza: 0,  punti: 0 },
    { id: 8, girone: 'B', nome: 'Oratorio SPD',noi: false, giocate: 0, vinte: 0, pari: 0, perse: 0, gol_fatti: 0, gol_subiti: 0, differenza: 0,  punti: 0 },
    { id: 9, girone: 'C', nome: 'Errano',      noi: false, giocate: 0, vinte: 0, pari: 0, perse: 0, gol_fatti: 0, gol_subiti: 0, differenza: 0,  punti: 0 },
  ],
  partite_pubbliche: [
    { id: 1, girone: 'B', casa_id: 5, casa: 'Green Lions', ospite_id: 6, ospite: 'Smama', gol_casa: 3, gol_ospite: 1, giocata_il: '2026-09-14' },
  ],
  kit_presi: [{ numero: 8, nome: 'Nicolò' }],
  // la distinta e' una funzione, non una vista: risponde a /rpc/distinta
  distinta: [
    { numero: 1, nome: 'Thomas', cognome: 'Ferrari', tessera_anspi: true, tessera_csi: false,
      tessera_anspi_numero: '00123-AB', tessera_csi_numero: null, visita_scadenza: '2099-01-01', stato: 'si' },
    { numero: 8, nome: 'Nicolò', cognome: 'Venieri', tessera_anspi: false, tessera_csi: true,
      tessera_anspi_numero: null, tessera_csi_numero: 'CSI/9910', visita_scadenza: '2099-01-01', stato: 'forse' },
  ],
  da_sollecitare: [{ id: 3, nome: 'Anna', cognome: 'Rossi', telefono: '3331234567' }],
  rosa_gestione: [],
  segna_consegna: '2026-08-31T18:00:00+00:00',
  consegne: [
    { numero: 1, nome: 'Thomas', cognome: 'Ferrari', consegnata_il: '2026-08-30T10:00:00+00:00' },
    { numero: 8, nome: 'Nicolò', cognome: 'Venieri', consegnata_il: null },
    { numero: 10, nome: 'Francesco', cognome: 'Alberti', consegnata_il: null },
  ],
};

const PAGINE = [
  { file: 'squadra/index.html',    attesi: '#elenco .giocatore',            minimo: 4 },
  { file: 'calendario/index.html', attesi: '#elenco .giornata',             minimo: 2 },
  { file: 'classifica/index.html', attesi: '#tabellone table.classifica tbody tr', minimo: 9 },
  { file: 'regolamento/index.html',attesi: '.voce',                          minimo: 3 },
  { file: 'index.html',            attesi: '.card',                          minimo: 4 },
  { file: 'divise/index.html',     attesi: '#grid .kit',                     minimo: 17 },
  // la pagina consegne parte chiusa: le do il codice gia' in tasca, come
  // succede quando il telefono ricarica la pagina al campo
  { file: 'consegne/index.html',   attesi: '#elenco .riga',                  minimo: 3,
    prima: (w) => w.sessionStorage.setItem('gl-consegne-codice', 'PAROLA') },
];

function finteRisposte(url) {
  const u = String(url);
  const m = u.match(/\/rest\/v1\/(?:rpc\/)?([a-z_]+)/);
  const nome = m ? m[1] : '';
  // attenzione: non tutte le funzioni tornano una lista. segna_consegna
  // torna un momento, e dargli [] faceva scoppiare la pagina — che e'
  // esattamente il genere di cosa per cui questo file esiste.
  const corpo = DATI[nome] !== undefined ? DATI[nome] : [];
  return Promise.resolve({
    ok: true, status: 200,
    json: () => Promise.resolve(corpo),
    text: () => Promise.resolve(JSON.stringify(corpo)),
  });
}

async function provaPagina(p) {
  let html = fs.readFileSync(path.join(RADICE, p.file), 'utf8');
  // Il file condiviso va fuso DENTRO lo script della pagina, non messo in un
  // blocco a parte: nel browser i due blocchi si vedono le variabili a vicenda,
  // in jsdom no, e avrei errori che nella realtà non esistono.
  // Nel commento d'esempio di supabase.js c'e un </script> letterale: caricato
  // come file esterno non da fastidio, ma incollato qui dentro chiuderebbe il
  // blocco a meta. Lo spezzo.
  const condiviso = fs.readFileSync(path.join(RADICE, 'assets/js/supabase.js'), 'utf8')
    .split('</' + 'script>').join('<\\/' + 'script>');
  const chiusura = '</' + 'script>';
  const tag = '<script src="/assets/js/supabase.js">' + chiusura + '\n<script>';
  if (html.includes(tag)) {
    html = html.replace(tag, () => '<script>\n' + condiviso + '\n');
  } else if (html.includes('supabase.js')) {
    throw new Error('lo script condiviso non e collegato come previsto in ' + p.file);
  }

  const errori = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => errori.push(e.message + (e.detail ? ' — ' + e.detail : '')));

  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    url: 'https://esempio.netlify.app' + (p.file === 'index.html' ? '/' : '/' + path.dirname(p.file) + '/'),
    virtualConsole: vc,
    beforeParse(w) {
      if (p.prima) p.prima(w);
      w.fetch = finteRisposte;
      w.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
      w.HTMLDialogElement.prototype.close = function () { this.open = false; };
      w.print = () => {};
      w.addEventListener('error', (ev) => errori.push('errore: ' + ev.message));
      w.addEventListener('unhandledrejection', (ev) => errori.push('promessa non gestita: ' + ev.reason));
    },
  });

  await new Promise((r) => setTimeout(r, 250));
  const trovati = dom.window.document.querySelectorAll(p.attesi).length;

  // Aprire ogni finestra: il caricamento da solo non tocca il codice dei
  // moduli, ed e li che si nascondono meta degli errori.
  const bottoni = dom.window.document.querySelectorAll(
    'button[id^=apri], .giocatore, .giornata .azioni-riga button, .partite button, .consegne .riga');
  for (const b of bottoni) {
    try { b.click(); } catch (e) { errori.push('clic su ' + (b.id || b.className) + ': ' + e.message); }
    await new Promise((r) => setTimeout(r, 20));
  }

  dom.window.close();
  return { errori, trovati, toccati: bottoni.length };
}

(async () => {
  let guai = 0;
  for (const p of PAGINE) {
    const esito = await provaPagina(p);
    const { errori, trovati } = esito;
    const ok = errori.length === 0 && trovati >= p.minimo;
    if (!ok) guai++;
    console.log(`${ok ? 'OK   ' : 'GUAIO'} ${p.file.padEnd(24)} ${String(trovati).padStart(3)} elementi, ${String(esito.toccati).padStart(2)} pulsanti provati`);
    for (const e of errori) console.log('        ' + e.split('\n')[0]);
  }
  console.log(guai ? `\n${guai} pagine con problemi` : '\nTutte le pagine si disegnano.');
  process.exit(guai ? 1 : 0);
})();
