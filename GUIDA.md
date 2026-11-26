# 📖 Guida passo passo — Archivio Gadaleta

Questa guida parte da zero e arriva al sito online, funzionante su telefono, tablet e computer.
Seguila nell'ordine: ogni parte usa qualcosa preparato in quella prima.

**Tempo totale:** circa 1 ora la prima volta.

| Parte | Cosa fai | Tempo |
|---|---|---|
| 1 | Installi i programmi sul computer | 15 min |
| 2 | Prepari i video su Google Drive (ognuno dal proprio account) | 5 min a persona |
| 3 | Crei la chiave API di Google | 10 min |
| 4 | Crei il "Gist" dove viene salvato l'elenco dei video | 5 min |
| 5 | Provi il sito sul tuo computer con VS Code | 10 min |
| 6 | Lo metti online su Render | 15 min |
| 7 | Lo usi tutti i giorni | — |

> 📝 **Tieni aperto un file di appunti** (Blocco note, Note…). Durante la guida copierai 4 valori
> che servono più avanti: **password di famiglia**, **chiave Google**, **token GitHub**, **ID del Gist**.
> Non condividerli con nessuno fuori dalla famiglia e non pubblicarli su internet.

---

## Parte 1 — Installare i programmi (una volta sola)

Ti servono tre programmi gratuiti. Installali con le opzioni predefinite (basta premere "Avanti").

1. **Node.js** → <https://nodejs.org/> → scarica la versione **LTS** (pulsante verde a sinistra) e installala.
2. **Git** → <https://git-scm.com/downloads> → scarica la versione per il tuo sistema e installala.
3. **Visual Studio Code** → <https://code.visualstudio.com/> → scarica e installa.

**Controllo:** apri VS Code → menu **Terminale → Nuovo terminale** e scrivi, premendo Invio dopo ciascuno:

```bash
node -v
```

```bash
git --version
```

Devi vedere due numeri di versione: per Node deve essere **v20** o superiore, per esempio `v22.12.0`.
Se compare "comando non riconosciuto", chiudi e riapri VS Code (o riavvia il computer) e riprova.

---

## Parte 2 — Preparare i video su Google Drive

I video possono stare su **account Google diversi** (tuo, dei genitori, dei fratelli…): va benissimo.
L'unica regola è che **ogni video sia condiviso con "Chiunque abbia il link"**. Il sito non entra negli
account di nessuno: legge solo i file che hanno questo tipo di condivisione.

### Il modo più comodo: una cartella per persona

Ogni membro della famiglia, **dal proprio account**:

1. Apre <https://drive.google.com/> e crea una cartella, per esempio **"Video famiglia"**.
2. Ci carica dentro i video.
3. Tasto destro sulla cartella → **Condividi** → **Condividi**.
4. In basso, alla voce **"Accesso generale"**, cambia "Con limitazioni" in **"Chiunque abbia il link"**.
   A destra il ruolo deve essere **"Visualizzatore"**.
5. Clicca **Fine**.

Tutti i video dentro la cartella, anche quelli aggiunti in futuro, diventano accessibili col link.

### Prendere il link di un singolo video

Per aggiungere un video al sito serve il link **del video** (non della cartella):

- Da computer: tasto destro sul video → **Condividi** → **Copia link**.
- Da telefono (app Drive): i tre puntini ⋮ accanto al video → **Copia link**.

Il link ha questo aspetto: `https://drive.google.com/file/d/1AbC…xyz/view?usp=sharing` ✅

### ⚠️ Attenzione a questi casi

| Situazione | Cosa fare |
|---|---|
| Account di **lavoro o scuola** (Google Workspace) | Spesso l'azienda o la scuola vieta "Chiunque abbia il link". Meglio caricare i video su un account Gmail personale. |
| Nelle impostazioni di condivisione (icona ⚙️) è attivo **"I visualizzatori e i commentatori possono vedere l'opzione per scaricare, stampare e copiare" = disattivato** | Riattivalo, altrimenti il sito non riesce a leggere il video. |
| Hai copiato il link di una **scorciatoia** (freccina sull'icona) | Copia il link dal file originale, non dalla scorciatoia. |
| Video appena caricato | Aspetta che Drive finisca di elaborarlo (anche qualche ora per i video lunghi): fino ad allora mancano anteprima e copertina. |

### Formato dei video

- ✅ **MP4** funziona ovunque.
- 🟡 **MOV dell'iPhone**: di solito funzionano. Gli iPhone recenti però registrano in "HEVC", che non tutti i
  browser leggono (soprattutto Firefox e alcuni PC Windows). Se un video non parte, convertilo in MP4 con
  **HandBrake** (gratuito: <https://handbrake.fr/>, preset "Fast 1080p30") e ricaricalo.
  Per il futuro, su iPhone: Impostazioni → Fotocamera → Formati → **Più compatibile**.
- ❌ **AVI, MKV, WMV, MPG** (tipici delle vecchie videocamere): vanno convertiti in MP4 con HandBrake.

---

## Parte 3 — La chiave API di Google

La chiave permette al sito di leggere i video da Drive in modo affidabile, anche quelli **di account diversi**:
basta una sola chiave, che crei tu, perché i video sono condivisi pubblicamente col link.
È **gratuita** e non serve inserire una carta di credito.

1. Vai su <https://console.cloud.google.com/> e accedi con il tuo account Google.
   La prima volta accetta i Termini di servizio (scegli "Italia" e spunta la casella).
2. **Crea un progetto:** in alto a sinistra, accanto al logo "Google Cloud", clicca sul selettore dei progetti
   → **Nuovo progetto** → Nome: `archivio-gadaleta` → **Crea**.
   Attendi qualche secondo, poi assicurati che il progetto selezionato in alto sia `archivio-gadaleta`.
3. **Abilita Google Drive:** nella barra di ricerca in alto scrivi **Google Drive API** → apri il risultato
   → clicca **Abilita**.
4. **Crea la chiave:** menu ☰ in alto a sinistra → **API e servizi** → **Credenziali**
   → in alto **+ Crea credenziali** → **Chiave API**.
5. Compare la chiave (inizia con `AIza…`). **Copiala nei tuoi appunti** come *chiave Google*.
6. **Proteggi la chiave (consigliato):** nella lista delle chiavi clicca sul nome della chiave appena creata.
   Si apre la pagina **"Modifica chiave API"**:
   - nella sezione **"API accessibili utilizzando questa chiave"**, nel menu **"Seleziona limitazioni dell'API"**,
     spunta solo **Google Drive API**. Sotto "API selezionate" deve comparire **Google Drive API**;
   - il riquadro blu che parla di "Service account" **non ti riguarda**: ignoralo;
   - in **"Restrizioni delle applicazioni"** lascia **Nessuna**. Non scegliere "Siti web" né "Indirizzi IP",
     altrimenti il server non riesce a usare la chiave. Il riquadro giallo di avviso puoi ignorarlo;
   - premi **Salva**. Le modifiche possono impiegare fino a 5 minuti per diventare attive.

> La chiave resta solo sul server: non viene mai mostrata nel sito né salvata su GitHub.

---

## Parte 4 — Il Gist (dove viene salvato l'elenco dei video)

Il sito non usa un database: l'elenco dei video (titolo, anno, link) è un piccolo file.
Su Render gratuito però i file del server si cancellano a ogni riavvio, quindi lo salviamo in un
**Gist segreto** su GitHub. I video veri restano su Drive.

### 4a. Creare il Gist

1. Vai su <https://gist.github.com/> e accedi con il tuo account GitHub (lo stesso del progetto).
2. In **"Filename including extension…"** scrivi esattamente: `videos.json`
3. Nel riquadro grande scrivi solo: `[]` (una parentesi quadra aperta e una chiusa)
4. Clicca la freccina accanto al pulsante verde e scegli **Create secret gist**.
5. Guarda l'indirizzo nella barra del browser, per esempio:
   `https://gist.github.com/gadaletagiovanni96-crypto/`**`8f3a1c2b9d...`**
   La parte finale, dopo l'ultima `/`, è l'**ID del Gist**: copiala nei tuoi appunti.

### 4b. Creare il token

1. Vai su <https://github.com/settings/tokens/new>
   (oppure: foto profilo → Settings → Developer settings → Personal access tokens → **Tokens (classic)** → Generate new token (classic)).
2. **Note:** `archivio-gadaleta`
3. **Expiration:** scegli **No expiration**, così il sito non smette di funzionare. Se preferisci una scadenza, segnati la data per rinnovarlo.
4. Nella lista dei permessi spunta **solo `gist`**.
5. In fondo clicca **Generate token**.
6. Copia subito il token (inizia con `ghp_…`): GitHub lo mostra **una volta sola**. Mettilo negli appunti come *token GitHub*.

---

## Parte 5 — Provare il sito sul computer con VS Code

### 5a. Scaricare il progetto

1. Apri VS Code.
2. Premi `Ctrl+Shift+P` (su Mac `Cmd+Shift+P`) e scrivi **Git: Clone**, poi Invio.
3. Incolla: `https://github.com/gadaletagiovanni96-crypto/archivio.git` e premi Invio.
4. Scegli una cartella (per esempio Documenti) → **Seleziona come destinazione del repository**.
5. Quando VS Code chiede, clicca **Apri**. Se chiede "Ti fidi degli autori?" rispondi **Sì**.

### 5b. Installare le dipendenze

Menu **Terminale → Nuovo terminale**, poi scrivi:

```bash
npm run setup
```

Attendi la fine (1-2 minuti). Qualche "warning" giallo è normale; l'importante è che non finisca con "ERR!".

> **Windows:** se compare un errore rosso con *"l'esecuzione di script è disabilitata nel sistema"*,
> nel terminale clicca la freccina accanto al **+** in alto a destra, scegli **Command Prompt**
> e ripeti il comando lì.

### 5c. Creare il file `.env` con le impostazioni

1. Nella colonna a sinistra di VS Code trovi il file **`.env.example`**.
   Tasto destro → **Copia**, poi tasto destro nello spazio vuoto → **Incolla**: ottieni `.env copy.example`.
   Tasto destro → **Rinomina** → chiamalo esattamente **`.env`**.
2. Aprilo e compila così (sostituendo i valori con i tuoi):

```ini
FAMILY_PASSWORD=la-password-che-darai-alla-famiglia
SESSION_SECRET=una-frase-lunga-e-a-caso-tipo-pizza-mare-1998-zio-nino
GOOGLE_API_KEY=AIza...la-tua-chiave
GITHUB_TOKEN=ghp_...il-tuo-token
GIST_ID=8f3a1c2b9d...
PORT=3001
```

3. Salva con `Ctrl+S`.

> Il file `.env` resta solo sul tuo computer: il progetto è già impostato per non caricarlo mai su GitHub.
> Inserendo anche `GITHUB_TOKEN` e `GIST_ID`, i video che aggiungi in prova compariranno anche sul sito online.

### 5d. Avviare

```bash
npm run dev
```

Quando nel terminale compare `✔ Archivio Gadaleta in ascolto` e un indirizzo `Local: http://localhost:5173/`:

1. Apri il browser su **<http://localhost:5173>**
2. Inserisci la password di famiglia → **Entra**.
3. Clicca **+ Aggiungi video**, inserisci titolo, anno e link di Drive → **Aggiungi**.
4. Clicca sulla copertina: il video deve partire dentro il sito. 🎉

**Dal telefono o dal tablet (stessa rete Wi‑Fi):** nel terminale compare anche un indirizzo
`Network: http://192.168.x.x:5173/`. Aprilo dal telefono. Se Windows chiede di consentire l'accesso
alla rete a Node.js, scegli **Consenti** (rete privata).

**Per fermare il sito:** clicca nel terminale e premi `Ctrl+C`. Per riavviarlo: `npm run dev`.

### Cosa controllare in questa prova

- [ ] Prova un video **da ogni account** della famiglia
- [ ] La copertina compare (se il video è appena caricato può volerci un po')
- [ ] Puoi saltare avanti e indietro nella barra del video
- [ ] Chiudendo e riaprendo un video, riparte da dove eri rimasto
- [ ] Il sito funziona anche dal telefono

Se qualcosa non va, guarda la sezione **Problemi comuni** in fondo.

---

## Parte 6 — Mettere il sito online su Render

1. Vai su <https://render.com/> → **Get Started** → accedi con **GitHub**
   e autorizza Render ad accedere al repository `archivio` (o a tutti i repository).
2. In alto a destra **+ New** → **Web Service**.
3. Scegli il repository **archivio** → **Connect**.
4. Compila:

   | Campo | Valore |
   |---|---|
   | Name | `archivio-gadaleta` (diventerà l'indirizzo del sito) |
   | Language | **Node** |
   | Branch | lascia quello proposto |
   | Region | **Frankfurt (EU Central)** (la più vicina all'Italia) |
   | Build Command | `npm install && npm run build` |
   | Start Command | `npm start` |
   | Instance Type | **Free** |

5. Più in basso, in **Environment Variables**, aggiungi una riga per ciascuna variabile con **+ Add Environment Variable**:

   | NAME | VALUE |
   |---|---|
   | `FAMILY_PASSWORD` | la password di famiglia |
   | `SESSION_SECRET` | la stessa frase lunga del `.env` |
   | `GOOGLE_API_KEY` | la chiave Google |
   | `GITHUB_TOKEN` | il token GitHub |
   | `GIST_ID` | l'ID del Gist |
   | `NODE_VERSION` | `22` |

6. Apri **Advanced** e in **Health Check Path** scrivi `/healthz`.
7. Clicca **Deploy Web Service**. Nel log vedrai la costruzione del sito: dopo 3-5 minuti compare **"Your service is live 🎉"**.
8. In alto c'è l'indirizzo, del tipo **`https://archivio-gadaleta.onrender.com`**. Aprilo, entra con la password e controlla che ci siano i video aggiunti in prova.

**Da sapere sul piano gratuito**

- Se nessuno lo apre per 15 minuti, il sito "si addormenta": la prima apertura dopo una pausa richiede **30-60 secondi**. Poi è veloce.
- I video passano attraverso il server. Il piano gratuito include una quota mensile di traffico che basta per un uso familiare normale.
- Se un giorno vuoi cambiare password: Render → il tuo servizio → **Environment** → modifica `FAMILY_PASSWORD` → **Save changes**. Il sito si riavvia e tutti dovranno rientrare con la nuova password.

---

## Parte 7 — Uso di tutti i giorni

### Condividere il sito con la famiglia
Mandate a tutti l'indirizzo `https://archivio-gadaleta.onrender.com` e la password.

### Metterlo sulla schermata Home come un'app
- **iPhone/iPad (Safari):** apri il sito → pulsante Condividi ⬆️ → **Aggiungi alla schermata Home**.
- **Android (Chrome):** apri il sito → menu ⋮ → **Aggiungi a schermata Home**.

### Aggiungere un nuovo video (anche da telefono)
1. Chi possiede il video lo carica nella sua cartella Drive già condivisa (o condivide il singolo file con "Chiunque abbia il link").
2. Copia il link del video.
3. Sul sito: **+** → titolo, anno, link → **Aggiungi**.

### Modificare o eliminare
Passa sopra a un video (su telefono tocca la ⓘ) → **Altre info** → **Modifica** o **Elimina**.
Eliminare dal sito **non** cancella il file da Drive.

### Copertina personalizzata
Se l'anteprima di Drive non vi piace, caricate una foto su Drive, condividetela con
"Chiunque abbia il link", e incollate il suo link nel campo **Copertina** del video.

### Il sito in TV
Da Chrome sul computer: menu ⋮ → **Trasmetti** per mandarlo a un Chromecast; da iPhone usate AirPlay.

---

## Problemi comuni

| Problema | Soluzione |
|---|---|
| Aggiungendo un video: *"File non trovato o non accessibile"* | Il video non è condiviso con "Chiunque abbia il link", oppure è un account di lavoro/scuola che lo vieta. Ricontrolla la Parte 2. |
| Aggiungendo un video: *"Google Drive ha risposto con errore 403"* | La chiave Google non è valida, la Google Drive API non è abilitata, oppure nelle limitazioni della chiave manca "Google Drive API". Ricontrolla la Parte 3. |
| Aggiungendo un video: *"non sembra un video"* | Hai copiato il link di una cartella o di un'immagine. Serve il link del singolo video. |
| Il video non parte (*"Impossibile riprodurre"*) | Controlla la condivisione. Se un video funziona e un altro no, è quasi sempre il formato: convertilo in MP4 (vedi "Formato dei video"). |
| C'è l'audio ma non l'immagine | È un video HEVC che quel browser non legge. Prova con Safari o Chrome, oppure convertilo in MP4. |
| Invece della copertina vedo un riquadro colorato col titolo | Drive non ha ancora creato l'anteprima (video appena caricato) oppure il file non è pubblico. Puoi mettere una copertina a mano. |
| Online la lista è vuota dopo qualche giorno | Su Render mancano o sono sbagliati `GITHUB_TOKEN` e `GIST_ID`, oppure il token è scaduto. Rifai la Parte 4b e aggiorna la variabile su Render. |
| Su Render il deploy fallisce | Apri **Logs** su Render e cerca la riga in rosso. Spesso manca una variabile o c'è uno spazio di troppo copiandola. |
| In locale: *"Manca la variabile FAMILY_PASSWORD"* | Il file `.env` non esiste, non si chiama esattamente `.env`, oppure non è nella cartella principale del progetto. |
| In locale: *"EADDRINUSE"* | Il sito è già acceso in un altro terminale: chiudilo con `Ctrl+C` oppure chiudi e riapri VS Code. |
| Un video che prima funzionava all'improvviso non parte più, mentre gli altri sì | Raramente Google limita per un giorno un file guardato moltissime volte. Aspettate 24 ore. |

---

## Promemoria dei valori (non condividerli fuori dalla famiglia)

| Valore | Dove si crea | Dove si usa |
|---|---|---|
| Password di famiglia | La scegli tu | `.env` e Render → `FAMILY_PASSWORD` |
| Frase segreta | La inventi tu | `.env` e Render → `SESSION_SECRET` |
| Chiave Google (`AIza…`) | Parte 3 | `.env` e Render → `GOOGLE_API_KEY` |
| Token GitHub (`ghp_…`) | Parte 4b | `.env` e Render → `GITHUB_TOKEN` |
| ID del Gist | Parte 4a | `.env` e Render → `GIST_ID` |
