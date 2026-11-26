import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Accesso a Google Drive con un "account di servizio" (utente robot del progetto Google Cloud).
 * Le richieste autenticate non vengono bloccate come quelle anonime ("automated queries",
 * "Quota exceeded").
 *
 * Configurazione (una delle due):
 *   GOOGLE_SERVICE_ACCOUNT_FILE = percorso del file .json scaricato da Google Cloud
 *   GOOGLE_SERVICE_ACCOUNT      = contenuto del file .json (anche codificato in base64)
 */
const SCOPE = 'https://www.googleapis.com/auth/drive.readonly';
let credentials;
let tokenPromise = null;
let token = { value: null, expires: 0 };

function parseCredentials(text) {
  const json = JSON.parse(text);
  if (!json.client_email || !json.private_key) throw new Error('nel file mancano "client_email" o "private_key"');
  return json;
}

/** Cerca un file .json di account di servizio nelle cartelle dei file segreti (es. Render). */
function findCredentialFile() {
  const dirs = ['/etc/secrets', process.cwd()];
  for (const dir of dirs) {
    let names = [];
    try {
      names = fs.readdirSync(dir).filter((n) => n.endsWith('.json') && !n.startsWith('package'));
    } catch {
      continue;
    }
    for (const name of names) {
      const file = path.join(dir, name);
      try {
        const json = parseCredentials(fs.readFileSync(file, 'utf8'));
        if (json.type === 'service_account' || json.client_email.endsWith('.gserviceaccount.com')) return file;
      } catch {
        /* non è un file di account di servizio */
      }
    }
  }
  return null;
}

function loadCredentials() {
  if (credentials !== undefined) return credentials;
  credentials = null;
  const configured = process.env.GOOGLE_SERVICE_ACCOUNT_FILE?.trim();
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT?.trim();
  try {
    if (raw) {
      credentials = parseCredentials(raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8'));
      return credentials;
    }
    let file = configured ? path.resolve(configured) : null;
    if (!file || !fs.existsSync(file)) {
      const found = findCredentialFile();
      if (configured && !found) {
        let secrets = '';
        try {
          secrets = fs.readdirSync('/etc/secrets').join(', ');
        } catch {
          /* cartella assente */
        }
        throw new Error(
          `il file "${configured}" non esiste` + (secrets ? ` (file segreti presenti: ${secrets})` : ' e non ci sono file segreti')
        );
      }
      if (found && configured) console.warn(`⚠ "${configured}" non trovato: uso l'account di servizio in ${found}`);
      file = found;
    }
    if (file) credentials = parseCredentials(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    console.error(`✖ Account di servizio Google non valido: ${err.message}`);
  }
  return credentials;
}

export function serviceAccountEmail() {
  return loadCredentials()?.client_email || null;
}

async function requestToken(creds) {
  const now = Math.floor(Date.now() / 1000);
  const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({
    iss: creds.client_email,
    scope: SCOPE,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })}`;
  const signature = crypto.sign('RSA-SHA256', Buffer.from(unsigned), creds.private_key).toString('base64url');
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsigned}.${signature}`,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`accesso dell'account di servizio rifiutato: ${data.error_description || data.error || res.status}`);
  token = { value: data.access_token, expires: Date.now() + (data.expires_in || 3600) * 1000 };
  return token.value;
}

/** Restituisce un token di accesso valido, o null se l'account di servizio non è configurato. */
export async function getAccessToken() {
  const creds = loadCredentials();
  if (!creds) return null;
  if (token.value && Date.now() < token.expires - 120_000) return token.value;
  tokenPromise ??= requestToken(creds).finally(() => {
    tokenPromise = null;
  });
  return tokenPromise;
}
