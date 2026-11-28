# 🎬 Archivio Gadaleta

Web app in stile piattaforma di streaming per guardare i video della famiglia Gadaleta salvati su Google Drive.
Funziona su telefono, tablet e computer.

- Accesso con **una sola password** di famiglia
- Pulsante **“Aggiungi video”** con titolo, anno, link di Google Drive (più descrizione e copertina facoltative)
- **Copertine** automatiche prese dall'anteprima di Google Drive (oppure un'immagine a scelta)
- Riproduzione **dentro il sito** con un player proprio: il video arriva direttamente da Google al browser (nessun traffico sul server), con avanti/indietro
- Righe per anno, “Aggiunti di recente”, **“Continua a guardare”** (riprende da dove avevi lasciato), ricerca
- Modifica ed eliminazione dei video (il file su Drive non viene mai toccato)

> 👉 **Per configurare tutto da zero segui la [GUIDA passo passo](GUIDA.md).**

**Tecnologie:** React + Vite (frontend), Node.js + Express (backend). Nessun database: l'elenco dei video è un semplice file JSON.

---

## 1. Preparare i video su Google Drive

Per ogni video (o per l'intera cartella):

1. Tasto destro → **Condividi** → in “Accesso generale” scegli **Chiunque abbia il link** (ruolo: Visualizzatore).
2. **Copia link**: è quello da incollare nel sito.

> Formato consigliato: **MP4 (H.264)**. Anche i `.mov` dell'iPhone di solito funzionano. AVI/MKV/WMV spesso non sono riproducibili nei browser: vanno convertiti (es. con HandBrake, gratuito).

## 2. Creare la chiave API di Google (gratuita, ~5 minuti)

È fortemente consigliata: rende lo streaming affidabile, permette di saltare avanti/indietro e controlla che il link sia condiviso bene.

1. Vai su <https://console.cloud.google.com/> e crea un progetto (es. “archivio-famiglia”).
2. Menu → **API e servizi → Libreria** → cerca **Google Drive API** → **Abilita**.
3. **API e servizi → Credenziali → Crea credenziali → Chiave API**. Copia la chiave.
4. (Consigliato) Clicca sulla chiave → **Limitazioni API** → “Limita chiave” → seleziona solo **Google Drive API** → Salva.

La chiave resta solo sul server: non arriva mai al browser.

---

## 3. Provarlo in locale con VS Code (passo passo)

### Requisiti
- **Node.js 20 o superiore** → scarica la versione LTS da <https://nodejs.org/> e installala.
  Verifica aprendo un terminale: `node -v`
- **Git** → <https://git-scm.com/>
- **VS Code** → <https://code.visualstudio.com/>

### Passi
1. **Scarica il progetto.** In VS Code: `Ctrl+Shift+P` (su Mac `Cmd+Shift+P`) → “Git: Clone” → incolla
   `https://github.com/gadaletagiovanni96-crypto/archivio.git` → scegli una cartella → “Apri”.
   Poi passa al ramo giusto: in basso a sinistra clicca sul nome del ramo e scegli `origin/claude/dreamy-gauss-noqswo`
   (oppure, dopo aver unito il ramo in `main`, resta su `main`).
2. **Apri il terminale integrato:** menu *Terminale → Nuovo terminale*.
3. **Installa le dipendenze** (solo la prima volta):
   ```bash
   npm run setup
   ```
4. **Crea il file di configurazione:** copia `.env.example` in un nuovo file chiamato `.env`
   (o da terminale: `cp .env.example .env`, su Windows `copy .env.example .env`) e compila:
   - `FAMILY_PASSWORD` → la password di famiglia
   - `SESSION_SECRET` → una frase casuale lunga qualsiasi
   - `GOOGLE_API_KEY` → la chiave del punto 2
   - lascia vuoti `GITHUB_TOKEN` e `GIST_ID`: in locale i video vengono salvati in `data/videos.json`
5. **Avvia:**
   ```bash
   npm run dev
   ```
6. Apri il browser su **<http://localhost:5173>**, inserisci la password e aggiungi il primo video. 🎉
   Le modifiche al codice si aggiornano da sole. Per fermare: `Ctrl+C` nel terminale.

**Vederlo dal telefono o dal tablet in casa:** con `npm run dev` attivo, nel terminale compare anche un indirizzo
“Network” (es. `http://192.168.1.20:5173`): aprilo dal telefono collegato allo stesso Wi‑Fi.
Se non si apre, consenti a Node.js l'accesso alla rete nel firewall del computer.

**Provare la versione “di produzione” in locale:** `npm run build` e poi `npm start` → <http://localhost:3001>.

---

## 4. Salvare l'elenco dei video online (GitHub Gist) — necessario su Render gratuito

Sul piano gratuito di Render il disco **si azzera a ogni riavvio/deploy**: un file locale andrebbe perso.
Per questo l'app può salvare l'elenco (`videos.json`) in un **Gist segreto di GitHub** (gratuito, nessun database):

1. Vai su <https://gist.github.com/>, nome file **`videos.json`**, contenuto **`[]`**, clicca **Create secret gist**.
2. Dall'indirizzo del gist copia l'ID (la parte finale): `https://gist.github.com/tuonome/`**`a1b2c3d4e5...`**
3. Crea un token: <https://github.com/settings/tokens> → **Generate new token (classic)** → spunta solo **gist** →
   scadenza “No expiration” (o lunga) → copia il token.
4. Queste due cose diventano `GIST_ID` e `GITHUB_TOKEN`.

> Puoi usarle anche in locale nel `.env`: così locale e online condividono lo stesso elenco.
> Il gist contiene solo titoli, anni e link: i video restano su Drive.

---

## 5. Mettere online su Render

1. Assicurati che il codice sia su GitHub nel ramo che vuoi pubblicare (consigliato: unire questo ramo in `main`).
2. Vai su <https://render.com/>, accedi con GitHub.
3. **New → Web Service** → collega il repository `archivio` → scegli il ramo.
4. Impostazioni:
   | Campo | Valore |
   |---|---|
   | Runtime | Node |
   | Build Command | `npm install && npm run build` |
   | Start Command | `npm start` |
   | Instance Type | Free |
5. **Environment Variables** (Environment → Add):
   | Nome | Valore |
   |---|---|
   | `FAMILY_PASSWORD` | la password di famiglia |
   | `SESSION_SECRET` | una frase casuale lunga |
   | `GOOGLE_API_KEY` | la chiave API di Google |
   | `GITHUB_TOKEN` | il token GitHub (permesso `gist`) |
   | `GIST_ID` | l'ID del gist |
   | `NODE_VERSION` | `22` |
6. (Facoltativo) **Advanced → Health Check Path**: `/healthz`
7. **Create Web Service**. Dopo qualche minuto il sito è su `https://<nome>.onrender.com`.

In alternativa puoi usare **New → Blueprint**: il file `render.yaml` incluso compila già tutto e ti chiede solo i valori segreti.

**Da sapere sul piano gratuito**
- Dopo ~15 minuti senza visite il server “si addormenta”: la prima apertura può richiedere ~30–60 secondi.
- I video **non passano dal server**: il browser li scarica direttamente da Google con un permesso temporaneo fornito dal server. Il piano gratuito di Render include solo 5 GB di traffico al mese, che così bastano per pagine e copertine.
- Ogni `git push` sul ramo collegato ripubblica automaticamente il sito.

**Sul telefono** puoi aggiungere il sito alla schermata Home (Safari: Condividi → “Aggiungi alla schermata Home”; Chrome: menu ⋮ → “Aggiungi a schermata Home”) per aprirlo come un'app.

---

## Problemi comuni

| Problema | Soluzione |
|---|---|
| “File non trovato o non accessibile” quando aggiungo un video | Il file non è condiviso con “Chiunque abbia il link”. |
| Il video non parte / “Impossibile riprodurre” | Controlla condivisione e `GOOGLE_API_KEY`; verifica il formato (MP4 consigliato). |
| Copertina colorata con il titolo invece dell'anteprima | Drive non ha ancora generato l'anteprima (succede per video appena caricati) oppure il file non è pubblico. Puoi indicare un'immagine di copertina a mano. |
| Dopo un riavvio su Render la lista è vuota | Mancano `GITHUB_TOKEN`/`GIST_ID`. |
| “Manca la variabile FAMILY_PASSWORD” | Non hai creato il file `.env` (in locale) o la variabile su Render. |

## Struttura

```
server/        backend Express (accesso, elenco video, streaming e copertine da Drive)
client/        frontend React (Vite)
render.yaml    configurazione per Render
.env.example   modello delle variabili di configurazione
```
