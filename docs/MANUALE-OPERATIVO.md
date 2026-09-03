# Green Lions

Il sito della squadra. Sono pagine statiche — HTML, un foglio di stile, qualche
immagine — pubblicate su Netlify. Non c'è niente da compilare e non servono
programmi installati: si aprono i file con un editor di testo e si salvano.

## Le pagine

| Indirizzo | Cosa fa |
|---|---|
| `/` | home, elenco delle pagine |
| `/divise/` | prenotazione delle divise: si sceglie un numero libero e si lasciano i dati |
| `/squadra/` | la rosa. Chi ha il codice della squadra può aggiungersi |
| `/calendario/` | le giornate. Si dà la disponibilità e arriva l'invito da mettere in calendario; con il codice si creano e si modificano le giornate |
| `/classifica/` | i tre gironi con punti e differenza reti, e i risultati |
| `/regolamento/` | le regole del campionato e come si arriva alla finale |
| `/formazione/` | come ci mettiamo in campo, con i controlli di regolamento dal vivo |
| `/consegne/` | **solo gestione** — spuntare al campo chi ha ritirato la divisa |

Tutte scrivono su Supabase e chiedono un codice per farlo. I codici sono **due**:

- il **codice squadra**, che gira nel gruppo: entrare in rosa, dare la
  disponibilità, segnare le tessere, stampare la distinta;
- il **codice di gestione**, che ha solo chi gestisce: creare, modificare,
  annullare ed eliminare una giornata, sollecitare chi non ha risposto,
  inserire i risultati.

Il codice di gestione vale anche dove basterebbe quello di squadra, così chi
gestisce ne ricorda uno solo. Senza codice, dal sito non si scrive niente.

## Com'è organizzata la cartella

```
.
├── index.html            home
├── 404.html              pagina di errore
├── divise/index.html     prenotazione divise (file unico e autonomo)
├── squadra/index.html
├── calendario/index.html
├── regolamento/index.html
├── classifica/index.html
├── consegne/index.html
├── formazione/index.html
├── assets/
│   ├── css/site.css      colori e stili comuni
│   ├── js/supabase.js    lettura del database e chiamata alle sue funzioni
│   └── img/              logo, favicon, immagine per WhatsApp
├── supabase/
│   └── functions/invito-calendario/index.ts
│                         manda l'invito del calendario via mail
├── netlify.toml          configurazione del deploy
└── robots.txt            indicazioni per i motori di ricerca
```

`supabase/` non viene pubblicato con il sito: è il codice della funzione che gira
su Supabase, tenuto qui perché è parte del progetto e non contiene password.

Una cartella con dentro `index.html` diventa un indirizzo pulito:
`squadra/index.html` si apre come `/squadra/`. Per aggiungere una pagina basta
creare una cartella nuova, copiarci dentro `squadra/index.html` come base e
aggiungere la card corrispondente nella home.

**`divise/index.html` è volutamente un file unico**: si porta dentro tutto,
stile compreso, e non dipende da `assets/`. Così si può aprire con doppio clic
o trascinare su `netlify.com/drop` da solo. Il prezzo è che i colori sono
scritti in due posti: se ne cambi uno in `assets/css/site.css`, cambialo anche là.

## Vedere il sito sul proprio computer

Il doppio clic su `index.html` funziona quasi: i link che iniziano con `/`
(il foglio di stile, le immagini) non vengono trovati. Meglio far partire un
server locale — è una riga sola, Python c'è già su Mac:

```bash
python3 -m http.server 8000
```

Poi si apre <http://localhost:8000>. Si ferma con `Ctrl+C`.

## Controllare che le pagine funzionino

`strumenti/prova-pagine.js` carica ogni pagina in un browser finto, con risposte
finte al posto di Supabase, e verifica che disegni davvero qualcosa — poi tocca
tutti i pulsanti per aprire le finestre. È facoltativo e non c'entra con il sito
pubblicato:

```bash
cd strumenti && npm install jsdom && node prova-pagine.js ..
```

Serve perché controllare la sola sintassi non basta: una variabile che ne copre
un'altra passa qualunque controllo sintattico e poi fa morire la funzione alla
prima riga utile, lasciando la pagina vuota senza dire niente.

## Pubblicare

Il sito è collegato a questa repository: **ogni push su `main` fa un deploy
automatico**, in genere in meno di un minuto. Non serve trascinare niente.

Se Netlify non è ancora collegato: su app.netlify.com → *Add new site* →
*Import an existing project* → GitHub → questa repo. Non chiede né comando di
build né publish directory, li legge da `netlify.toml`.

### Se il sito cambia indirizzo

L'anteprima che compare incollando il link su WhatsApp ha bisogno
dell'indirizzo per esteso, quindi è scritto dentro le pagine (cerca il commento
`DOMINIO`). Per cambiarlo ovunque in un colpo solo:

```bash
grep -rl 'divisegreenlions.netlify.app' --include='*.html' . \
  | xargs sed -i '' 's|divisegreenlions\.netlify\.app|nuovo-indirizzo.netlify.app|g'
```

## Il database

Tutto sta su [Supabase](https://supabase.com): le prenotazioni delle divise, la
rosa, le giornate e le disponibilità.

La chiave scritta nelle pagine è quella **pubblica** (`anon`): da sola può fare
soltanto quello che il database permette, quindi può stare in chiaro. La chiave
`service_role` non va messa in una pagina web, mai.

**Le pagine non scrivono mai direttamente nelle tabelle.** Leggono da viste che
contengono solo quello che può essere pubblico (niente email, niente telefoni,
del cognome solo l'iniziale) e scrivono chiamando funzioni del database, che
prima di scrivere controllano il codice della squadra. Il no lo dice il
database, non la pagina: non si aggira smanettando col browser.

```html
<script src="/assets/js/supabase.js"></script>
<script>
  const righe = await glLeggi('rosa_pubblica');              // lettura
  await glChiama('segna_disponibilita', { _codice: '…' });   // scrittura
</script>
```

| Vista (lettura) | Funzione (scrittura) |
|---|---|
| `kit_presi` | policy sulla tabella `prenotazioni` |
| `rosa_pubblica` | `aggiungi_giocatore`, `imposta_scheda` |
| — (solo funzione) | `rosa_gestione` |
| `calendario_pubblico` | `crea_giornata`, `modifica_giornata`, `annulla_giornata`, `elimina_giornata` |
| `disponibilita_pubblica` | `segna_disponibilita` |
| — (solo funzione) | `distinta`, `da_sollecitare` |
| `classifica`, `partite_pubbliche` | `segna_risultato`, `elimina_risultato` |
| — (solo funzione) | `consegne`, `segna_consegna` |
| `formazione_pubblica` | `salva_formazione` |

### I tesserati ANSPI

Ogni persona in rosa ha due caselle indipendenti, `tessera_anspi` e
`tessera_csi` — due e non un unico campo "tipo tessera", perché capita di
averle entrambe e il regolamento conta solo le ANSPI.

Il calendario se ne serve da solo: per ogni giornata conta quanti ANSPI hanno
detto **sì** (un "forse" non copre un obbligo di regolamento) e avvisa quando
sono meno di due, o quando sono esattamente due e quindi devono giocare tutta
la partita. Se il minimo cambia, va cambiato in due posti: `regolamento/index.html`
e `calendario/index.html` (cerca `anspiSi`).

### La distinta

Dal calendario, su ogni giornata, c'è il pulsante **Distinta**: chiede il codice
e mostra chi ha dato la disponibilità con numero di maglia, nome e cognome per
esteso e tessere. Da lì si stampa un foglio da portare al campo, con una casella
da spuntare per chi si presenta.

**Quello che esce dalla stampante è il modulo ufficiale** della lega
(`Templates/Calciotto 2026 - Modulo Distinta.pdf`): stesse colonne, stesso testo,
stesso ordine, 18 righe per i giocatori e 5 per gli accompagnatori. Non riempiamo
il PDF originale — non ha campi compilabili, andrebbe sovrascritto a coordinate
fisse e si romperebbe al primo ritocco — ma la carta che l'organizzazione riceve
è il loro modulo.

Il cognome per esteso, la data di nascita e il documento arrivano dalla funzione
`distinta`, non dalle viste pubbliche: quelle danno apposta solo nome e iniziale.
`distinta` chiede il **codice della squadra**, non quello di gestione: la distinta
la compila chi va al campo.

La stampa non usa una pagina a parte: c'è un `@media print` che toglie di mezzo
tutto il resto e lascia solo il foglio, riempito al momento in `#stampa`.

### I dati che vuole il modulo

Data di nascita, tipo e numero del documento si scrivono **dalla scheda della
persona**, nella pagina Squadra, insieme a tessere e visita medica. Non entrano
in `rosa_pubblica`: si vedono solo a **gestione sbloccata**, come i cognomi per
esteso. Chi apre il sito senza codice continua a leggere nome, iniziale e nulla
più.

Toccare una persona con la gestione chiusa **non apre la scheda**: chiede prima
il codice, e poi apre da sola quella che stavi cercando. Non è per rigore, è per
non fare danni: senza il codice la pagina non sa cosa c'è già scritto, e salvare
riempirebbe di vuoti quello che non vede.

A gestione sbloccata, chi ha buchi nell'anagrafica porta un bollino rosso
«no anagrafica»: si vede subito chi aprire, senza tentarli a uno a uno. Lo stesso
elenco esiste in SQL come `dati_distinta_mancanti`, e la pagina della distinta lo
ripete prima di stampare.

### I numeri di tessera, e lo sblocco gestione

Ogni tesserato ha anche il **numero** della tessera ANSPI e CSI, salvato come
testo: le tessere hanno zeri davanti, lettere e trattini, e con un intero il
primo zero sparirebbe. Serve per ricopiarli sulla distinta senza andarli a
cercare, ed è lì che compaiono — accanto alla sigla, sia a schermo sia sul foglio
stampato.

**Non stanno in `rosa_pubblica`**: un numero di tessera è un identificativo, come
il cognome, e quella vista la legge chiunque apra il sito. Escono da due funzioni
protette: `distinta`, per scriverli sul foglio, e `rosa_gestione`, per
correggerli.

Da qui lo **sblocco gestione** sulla pagina Squadra: un pulsante che chiede il
codice di gestione e ricarica la rosa completa — cognomi per esteso, numeri di
tessera, schede già compilate. Il codice resta **solo in memoria**, per quella
visita: si ricarica la pagina e si torna alla vista di tutti. Senza sblocco la
pagina funziona esattamente come prima.

### Chi gioca e chi no

I ruoli `allenatore` e `staff` stanno nel gruppo ma **non sono giocatori**: non
entrano nel conto della rosa, non vanno nella distinta, non contano nel minimo
ANSPI e non gli viene chiesto il certificato medico. Possono comunque dare la
disponibilità — così sanno quando si gioca e ricevono l'invito in calendario —
e compaiono nell'elenco dei presenti con il loro ruolo accanto.

La regola sta in un posto solo, la funzione `e_giocatore(ruolo)`: se domani
nascono altri ruoli non da campo, si aggiungono lì e tutto il resto segue.

### La visita medica

Ogni persona in rosa ha `visita_scadenza`, una **data**: quella scritta sul
certificato. Non una casella "ce l'ha", che diventerebbe falsa da sola il giorno
della scadenza senza che nessuno se ne accorga.

**Senza certificato valido non si dà la disponibilità**, e il divieto sta nel
database dentro `segna_disponibilita`: è un vincolo che riguarda la salute di
qualcuno, non un dettaglio di interfaccia da poter aggirare col browser. Il
confronto è con **il giorno della partita**, non con oggi: un certificato che
scade fra una settimana non serve per una partita fra un mese.

Il "non ci sono" resta sempre possibile — chi non può giocare deve comunque poter
far sapere che non c'è. La pagina lo dice appena scegli il nome, invece di far
compilare il modulo per poi rifiutarlo.

La scadenza si segna dalla scheda del giocatore, e vuole il **codice di
gestione**: chi è sbarrato non deve poter alzare da sé la sbarra. Nella stessa
scheda ci sono anche le tessere; se preferisci che i giocatori se le dichiarino
da soli col codice di squadra, è una riga in `imposta_scheda`.

### La formazione

`/formazione/?giornata=<id>` è un campo con le pedine: si tocca un giocatore in
panchina e poi il punto dove metterlo, oppure lo si trascina. Sul telefono il
tocco-tocco è più veloce e più preciso del trascinamento, quindi ci sono
entrambi. Non è drag-and-drop di HTML — su Safari mobile non funziona — ma
eventi puntatore.

Le pedine sono bottoni veri sopra un disegno del campo, non forme dentro un SVG:
così restano raggiungibili da tastiera e leggibili a voce. Le posizioni si
salvano **in percentuale**, quindi lo stesso schema vale su qualsiasi schermo.

**Il valore non è la lavagna, sono i controlli.** Mentre sposti, la pagina dice
quanti sono in campo, quanti ANSPI ci sono — rosso sotto i due, giallo con
esattamente due perché allora nessuno dei due può uscire — se c'è un ANSPI in
panchina per il cambio, se manca il portiere e se qualcuno ha il certificato
scaduto per quella data. Sono le stesse regole che il calendario racconta a
parole; qui le vedi mentre decidi.

C'è anche la **palla**, che si sposta come una pedina, e una **penna** per
tracciare frecce e movimenti: tre colori, tratto con o senza punta, annulla
l'ultimo tratto e cancella tutto. Su iPad il dito sposta le pedine e la **Apple
Pencil disegna**, senza cambiare modalità: la penna riconosce il tipo di
puntatore.

Pedine, palla e frecce si salvano **insieme**, in una chiamata sola: una lavagna
è una cosa sola, e mezza salvata sarebbe lo schema di adesso con le frecce di
ieri. I tratti sono liste di punti in percentuale, semplificati mentre si
disegnano, e il database rifiuta una lavagna troppo pesante.

Si salva con il **codice squadra** e non con quello di gestione: l'allenatore è
esterno, il codice di gestione non ce l'ha, e la formazione è mestiere suo. In
campo può andarci solo chi ha detto sì o forse, e lo impone il database.

### Le consegne delle divise

`/consegne/` è una pagina da usare in piedi, al campo, con una mano sola: elenco
grande, si tocca il nome e la divisa risulta consegnata. Tocchi di nuovo e torna
indietro. C'è il filtro «solo da consegnare» per far sparire chi è già passato.

Due scelte che la rendono usabile lì:

- **Il codice si dà una volta** e resta in `sessionStorage`, non in una variabile
  qualsiasi: al campo basta che il telefono ricarichi la pagina — cambio app,
  schermo spento — per perderla, e ridigitare la parola davanti a tutti ogni volta
  non va bene. Sparisce quando chiudi la scheda del browser. Non è un login.
- **Il segno appare subito** e la scrittura viaggia dietro. Se la rete non c'è, la
  spunta torna com'era e compare l'avviso: non resta un segno verde che in realtà
  non è stato salvato.

Sul database è una data, `prenotazioni.consegnata_il`, non una casella sì/no: così
resta scritto anche *quando*, che è quello che serve se qualcuno dice di non aver
mai ricevuto niente.

### I solleciti

Sulle giornate future c'è **Sollecita**: chiede il codice di gestione e mostra
chi non ha ancora risposto, con un pulsante per ciascuno.

Il pulsante non manda niente: **apre l'app messaggi con destinatario e testo già
scritti**, e l'invio lo dà la persona. Nessun browser permette a una pagina di
spedire un SMS da sola, ed è giusto così. C'è anche un "SMS a tutti" con i numeri
in un colpo solo, e un "Copia per WhatsApp" per chi preferisce incollare nel gruppo.

I numeri di telefono escono da `da_sollecitare`, che vuole il codice di gestione:
la rubrica della squadra non deve uscire a chiunque conosca la parola del gruppo.

### La classifica

`/classifica/` mostra i tre gironi con punti, differenza reti e i risultati. Tre
punti la vittoria e uno il pareggio — il regolamento non lo dice, è lo standard.

Le partite sono **tutte** quelle del campionato, non solo le nostre: senza i
risultati degli altri la classifica non esiste. Le nostre giornate restano nel
calendario, che dice quando e dove; qui c'è com'è finita.

Due cose che la pagina calcola da sola perché discendono dal regolamento: la riga
tratteggiata sotto la terza nei gironi da 4 (l'ultima è eliminata) e la nota che
dice **quale delle due terze passerebbe adesso**, confrontando la differenza reti
fra girone A e girone B.

Un incontro esiste una volta sola, in qualunque ordine lo si scriva: reinserire
"Smama – Green Lions" dopo "Green Lions – Smama" corregge la stessa riga invece di
crearne una seconda. Vale per un girone a giro unico; se ci fosse il ritorno,
si toglie un indice.

### Gli inviti al calendario

Quando un giocatore dice che c'è, gli arriva una mail con l'invito: chi accetta
se lo ritrova nel proprio calendario. Se poi la partita cambia orario o campo,
l'evento **si aggiorna da solo** in tutti i calendari di chi aveva accettato, e
se viene annullata sparisce.

Non è magia di Gmail: ogni giornata ha un identificativo che non cambia mai e un
contatore che sale a ogni modifica, e i calendari sanno cosa farne (è lo standard
iCalendar, RFC 5545). Il codice è in `supabase/functions/invito-calendario/`,
lo fanno partire due webhook del database.

I passi per attivarlo — SQL da eseguire, funzione da caricare, webhook da creare —
sono in `Confident/ISTRUZIONI-squadra-calendario.md`.

### La cartella `Confident/`

Contiene gli schemi SQL e le istruzioni operative, **codice squadra compreso**.
È esclusa da git (`.gitignore`) e resta solo sul computer: la repository è
pubblica, e quel codice è la sola cosa che impedisce a un estraneo di prenotare
una divisa o di spostare una partita. Chi deve metterci mano se la fa passare
per un'altra via.

```
Confident/
├── schema.sql                          divise
├── schema-squadra-calendario.sql       rosa, giornate, disponibilità
├── aggiornamento-1-elimina-giornata.sql
├── aggiornamento-2-tessere-e-import.sql   tessere ANSPI/CSI, rosa dalle divise
├── aggiornamento-3-distinta.sql
├── aggiornamento-4-codice-admin.sql        il secondo codice
├── aggiornamento-5-solleciti.sql
├── aggiornamento-6-risultati-classifica.sql
├── aggiornamento-7-visita-medica.sql
├── aggiornamento-8-numeri-tessera.sql
├── aggiornamento-9-staff-fuori-rosa.sql
├── aggiornamento-10-consegne.sql
├── aggiornamento-11-modulo-distinta.sql
├── aggiornamento-12-anagrafica-dalla-scheda.sql
├── aggiornamento-13-formazione.sql
├── aggiornamento-14-palla-e-lavagna.sql
├── ISTRUZIONI.md                       come è stata messa online la pagina divise
└── ISTRUZIONI-squadra-calendario.md    come attivare rosa, calendario e inviti
```

## Licenza

MIT — vedi [LICENSE](LICENSE).
