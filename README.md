# Green Lions

Il sito della squadra. Sono pagine statiche — HTML, un foglio di stile, qualche
immagine — pubblicate su Netlify. Non c'è niente da compilare e non servono
programmi installati: si aprono i file con un editor di testo e si salvano.

## Le pagine

| Indirizzo | File | Stato |
|---|---|---|
| `/` | `index.html` | home, elenco delle pagine |
| `/divise/` | `divise/index.html` | **attiva** — prenotazione delle divise, collegata a Supabase |
| `/squadra/` | `squadra/index.html` | scheletro da riempire |
| `/calendario/` | `calendario/index.html` | scheletro da riempire |

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
│   ├── js/supabase.js    lettura del database, per le pagine nuove
│   └── img/              logo, favicon, immagine per WhatsApp
├── netlify.toml          configurazione del deploy
└── robots.txt            indicazioni per i motori di ricerca
```

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

Le divise stanno su [Supabase](https://supabase.com). La pagina legge quali
numeri sono già presi e scrive le prenotazioni; nome, indirizzo, email e
telefono non sono leggibili dal sito, si vedono solo dalla dashboard.

La chiave scritta nelle pagine è quella **pubblica** (`anon`): da sola può fare
soltanto quello che le policy del database permettono, quindi può stare in
chiaro. La chiave `service_role` non va messa in una pagina web, mai.

Per far leggere una tabella a una pagina nuova serve una vista con il permesso
di lettura per `anon` (in `Confident/schema.sql` c'è l'esempio di `kit_presi`),
poi dalla pagina:

```html
<script src="/assets/js/supabase.js"></script>
<script>
  glLeggi('nome_vista', 'select=*&order=numero').then(righe => {
    // ...
  });
</script>
```

### La cartella `Confident/`

Contiene lo schema SQL e le istruzioni operative, **codice squadra compreso**.
È esclusa da git (`.gitignore`) e resta solo sul computer: la repository è
pubblica, quel codice è la sola cosa che impedisce a un estraneo di prenotare
una divisa. Chi deve metterci mano se la fa passare per un'altra via.

## Licenza

MIT — vedi [LICENSE](LICENSE).
