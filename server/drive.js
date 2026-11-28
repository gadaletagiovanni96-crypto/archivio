import { Readable } from 'node:stream';
import { accessTokenExpiry, getAccessToken, serviceAccountEmail } from './google-auth.js';

const API_KEY = () => process.env.GOOGLE_API_KEY;
const API = 'https://www.googleapis.com/drive/v3/files';

/** Estrae l'ID di un file Google Drive dai vari formati di link. */
export function extractDriveId(link) {
  if (!link) return null;
  const s = String(link).trim();
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]{10,})/,
    /\/d\/([a-zA-Z0-9_-]{10,})/,
    /[?&]id=([a-zA-Z0-9_-]{10,})/,
  ];
  for (const re of patterns) {
    const m = s.match(re);
    if (m) return m[1];
  }
  if (/^[a-zA-Z0-9_-]{20,}$/.test(s)) return s;
  return null;
}

/** Modalità di accesso disponibili, in ordine di affidabilità. */
async function apiAccess() {
  const list = [];
  try {
    const token = await getAccessToken();
    if (token) list.push({ name: 'account di servizio', query: '', headers: { Authorization: `Bearer ${token}` } });
  } catch (err) {
    console.error(`✖ ${err.message}`);
  }
  const key = API_KEY();
  if (key) list.push({ name: 'chiave API', query: `&key=${key}`, headers: {} });
  return list;
}

export function describeAccessMode() {
  if (serviceAccountEmail()) return `account di servizio (${serviceAccountEmail()})`;
  if (API_KEY()) return 'chiave API (accesso anonimo: Google può bloccarlo sui server cloud)';
  return 'download diretto senza chiave (poco affidabile)';
}

function describeGoogleError(text) {
  try {
    const e = JSON.parse(text).error || {};
    const reason = e.errors?.[0]?.reason || e.status || '';
    return [reason, e.message].filter(Boolean).join(': ');
  } catch {
    return text
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 160);
  }
}

const isBadResponse = (res) => {
  const type = res.headers.get('content-type') || '';
  return !res.ok || type.includes('text/html') || type.includes('application/json');
};

/**
 * Legge i metadati del file. Restituisce null se non c'è alcun accesso all'API configurato.
 */
export async function getDriveMetadata(fileId) {
  const access = await apiAccess();
  if (!access.length) return null;
  const fields = 'id,name,mimeType,size,videoMediaMetadata,thumbnailLink';
  let lastStatus = 0;
  for (const a of access) {
    const res = await fetch(`${API}/${fileId}?fields=${fields}&supportsAllDrives=true${a.query}`, { headers: a.headers });
    if (res.ok) return res.json();
    lastStatus = res.status;
  }
  const email = serviceAccountEmail();
  const err = new Error(
    lastStatus === 404
      ? 'File non trovato o non accessibile. Su Google Drive condividi il video (o la sua cartella) con ' +
        (email ? `l'indirizzo ${email} oppure con ` : '') +
        '"Chiunque abbia il link".'
      : `Google Drive ha risposto con errore ${lastStatus}. Controlla la configurazione di accesso a Google e la condivisione del file.`
  );
  err.status = 400;
  throw err;
}

async function mediaSources(fileId) {
  const sources = (await apiAccess()).map((a) => ({
    name: a.name,
    url: `${API}/${fileId}?alt=media&supportsAllDrives=true&acknowledgeAbuse=true${a.query}`,
    headers: a.headers,
  }));
  // Ultima risorsa: download diretto anonimo dei file pubblici
  sources.push({
    name: 'download diretto',
    url: `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`,
    headers: {},
  });
  return sources;
}

const CHUNK_SIZE = 16 * 1024 * 1024; // 16 MB per richiesta a Google

/**
 * Trasforma la richiesta del browser (di solito "dal byte X fino alla fine")
 * in una richiesta di un pezzo limitato: il browser chiede da solo il pezzo successivo.
 */
function boundedRange(header) {
  const m = /^bytes=(\d*)-(\d*)$/.exec((header || '').trim());
  if (!m) return `bytes=0-${CHUNK_SIZE - 1}`;
  if (m[1] === '') return header; // ultimi N byte: lascia com'è
  const start = Number(m[1]);
  const maxEnd = start + CHUNK_SIZE - 1;
  const end = m[2] === '' ? maxEnd : Math.min(Number(m[2]), maxEnd);
  return `bytes=${start}-${end}`;
}

/**
 * Indirizzo con cui il BROWSER scarica il video direttamente da Google,
 * senza passare dal server (che così non consuma traffico).
 * Con l'account di servizio include un permesso temporaneo (1 ora, sola lettura).
 */
export async function directVideoUrl(fileId, { fresh = false } = {}) {
  const base = `${API}/${fileId}?alt=media&supportsAllDrives=true&acknowledgeAbuse=true`;
  const token = await getAccessToken(fresh ? Infinity : 40 * 60 * 1000).catch((err) => {
    console.error(`✖ ${err.message}`);
    return null;
  });
  if (token) return { url: `${base}&access_token=${encodeURIComponent(token)}`, expiresAt: accessTokenExpiry() };
  if (API_KEY()) return { url: `${base}&key=${API_KEY()}`, expiresAt: null };
  return {
    url: `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`,
    expiresAt: null,
  };
}

/**
 * Inoltra il video da Google Drive al browser, a pezzi, supportando le richieste "Range".
 * `maxBytes` limita la dimensione di ogni risposta (usato in modalità diretta, dove il
 * passaggio dal server serve solo per piccoli controlli).
 */
export async function streamDriveFile(req, res, fileId, { maxBytes } = {}) {
  const controller = new AbortController();
  res.on('close', () => controller.abort());
  let range = boundedRange(req.headers.range);
  if (maxBytes) {
    const m = /^bytes=(\d+)-(\d+)$/.exec(range);
    if (m && Number(m[2]) - Number(m[1]) + 1 > maxBytes) range = `bytes=${m[1]}-${Number(m[1]) + maxBytes - 1}`;
  }

  const failures = [];
  for (const source of await mediaSources(fileId)) {
    let upstream;
    try {
      upstream = await fetch(source.url, {
        headers: { ...source.headers, Range: range },
        signal: controller.signal,
        redirect: 'follow',
      });
    } catch (err) {
      if (controller.signal.aborted) return;
      failures.push(`${source.name}: ${err.message}`);
      continue;
    }

    if (upstream.status === 416) {
      upstream.body?.cancel();
      return res.status(416).end();
    }
    if (isBadResponse(upstream)) {
      const detail = describeGoogleError(await upstream.text().catch(() => ''));
      failures.push(`${source.name} (${upstream.status}): ${detail || 'risposta non valida'}`);
      continue;
    }

    if (failures.length) console.warn(`Avviso: per ${fileId} uso "${source.name}" perché: ${failures.join(' | ')}`);

    const type = upstream.headers.get('content-type') || '';
    res.status(upstream.status);
    for (const h of ['content-length', 'content-range', 'accept-ranges', 'last-modified', 'etag']) {
      const v = upstream.headers.get(h);
      if (v) res.setHeader(h, v);
    }
    if (!upstream.headers.get('accept-ranges')) res.setHeader('Accept-Ranges', 'bytes');
    // I file .mov (H.264) vengono riprodotti dai browser se dichiarati come mp4
    const playableType = !type || type.includes('octet-stream') || type.includes('quicktime') ? 'video/mp4' : type;
    res.setHeader('Content-Type', playableType);
    res.setHeader('Cache-Control', 'private, max-age=0');

    Readable.fromWeb(upstream.body)
      .on('error', () => res.destroy())
      .pipe(res);
    return;
  }

  console.error(`Stream Drive fallito per ${fileId}:\n  - ${failures.join('\n  - ')}`);
  res.status(502).json({ error: 'Google Drive non ha restituito il video.', details: failures });
}

/** Scarica un intervallo di byte del file (per analizzarne il formato). */
export async function fetchDriveRange(fileId, start, end) {
  const failures = [];
  for (const source of await mediaSources(fileId)) {
    try {
      const res = await fetch(source.url, {
        headers: { ...source.headers, Range: `bytes=${start}-${end}` },
        redirect: 'follow',
      });
      if (isBadResponse(res)) {
        failures.push(`${source.name} (${res.status})`);
        await res.body?.cancel();
        continue;
      }
      const buffer = Buffer.from(await res.arrayBuffer());
      const total = Number((res.headers.get('content-range') || '').split('/')[1]) || null;
      return { buffer, total, partial: res.status === 206 };
    } catch (err) {
      failures.push(`${source.name}: ${err.message}`);
    }
  }
  throw new Error(`Impossibile leggere il file: ${failures.join('; ')}`);
}

// --- Copertine ---------------------------------------------------------------

const coverCache = new Map(); // fileId -> { buffer, type, at }
const COVER_TTL_MS = 12 * 60 * 60 * 1000;
const COVER_CACHE_MAX = 300;

async function fetchImage(url, headers = {}) {
  try {
    const res = await fetch(url, { headers, redirect: 'follow' });
    const type = res.headers.get('content-type') || '';
    if (!res.ok || !type.startsWith('image/')) return null;
    return { buffer: Buffer.from(await res.arrayBuffer()), type };
  } catch {
    return null;
  }
}

/** Restituisce l'anteprima generata da Google Drive per il file (o null). */
export async function getDriveCover(fileId) {
  const cached = coverCache.get(fileId);
  if (cached && Date.now() - cached.at < COVER_TTL_MS) return cached;

  let image = null;
  for (const a of await apiAccess()) {
    try {
      const res = await fetch(`${API}/${fileId}?fields=thumbnailLink&supportsAllDrives=true${a.query}`, {
        headers: a.headers,
      });
      if (!res.ok) continue;
      const { thumbnailLink } = await res.json();
      if (!thumbnailLink) continue;
      const big = thumbnailLink.replace(/=s\d+(-[a-z]+)?$/, '=s1280');
      image = (await fetchImage(big, a.headers)) || (await fetchImage(big));
      if (image) break;
    } catch {
      /* si prova il metodo successivo */
    }
  }
  if (!image) image = await fetchImage(`https://drive.google.com/thumbnail?id=${fileId}&sz=w1280`);
  if (!image) return null;

  if (coverCache.size >= COVER_CACHE_MAX) coverCache.delete(coverCache.keys().next().value);
  const entry = { ...image, at: Date.now() };
  coverCache.set(fileId, entry);
  return entry;
}

export function forgetCover(fileId) {
  coverCache.delete(fileId);
}
