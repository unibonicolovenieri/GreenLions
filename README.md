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

Tutte e tre scrivono su Supabase e chiedono il **codice della squadra** per farlo:
è quello che mandi nel gruppo. Senza, dal sito non si scrive niente.

## Com'è organizzata la cartella

```
.
├── index.html            home
├── 404.html              pagina di errore
├── divise/index.html     prenotazione divise (file unico e autonomo)
├── squadra/index.html
├── calendario/index.html
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
| `rosa_pubblica` | `aggiungi_giocatore` |
| `calendario_pubblico` | `crea_giornata`, `modifica_giornata`, `annulla_giornata`, `elimina_giornata` |
| `disponibilita_pubblica` | `segna_disponibilita` |

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
├── ISTRUZIONI.md                       come è stata messa online la pagina divise
└── ISTRUZIONI-squadra-calendario.md    come attivare rosa, calendario e inviti
```

## Licenza

MIT — vedi [LICENSE](LICENSE).
