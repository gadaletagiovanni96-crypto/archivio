import { Readable } from 'node:stream';

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

/**
 * Legge i metadati del file (solo con GOOGLE_API_KEY).
 * Restituisce null se la chiave non è configurata.
 */
export async function getDriveMetadata(fileId) {
  const key = API_KEY();
  if (!key) return null;
  const fields = 'id,name,mimeType,size,videoMediaMetadata,thumbnailLink';
  const res = await fetch(`${API}/${fileId}?fields=${fields}&supportsAllDrives=true&key=${key}`);
  if (!res.ok) {
    const err = new Error(
      res.status === 404
        ? 'File non trovato o non accessibile. Su Google Drive imposta la condivisione su "Chiunque abbia il link".'
        : `Google Drive ha risposto con errore ${res.status}. Controlla la chiave API e la condivisione del file.`
    );
    err.status = 400;
    throw err;
  }
  return res.json();
}

function mediaUrl(fileId) {
  const key = API_KEY();
  if (key) return `${API}/${fileId}?alt=media&supportsAllDrives=true&acknowledgeAbuse=true&key=${key}`;
  // Senza chiave API: download diretto (funziona per i file pubblici, meno affidabile)
  return `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`;
}

/** Inoltra lo stream del video da Google Drive al browser, supportando le richieste "Range". */
export async function streamDriveFile(req, res, fileId) {
  const controller = new AbortController();
  res.on('close', () => controller.abort());

  const headers = {};
  if (req.headers.range) headers.Range = req.headers.range;

  let upstream;
  try {
    upstream = await fetch(mediaUrl(fileId), { headers, signal: controller.signal, redirect: 'follow' });
  } catch (err) {
    if (controller.signal.aborted) return;
    console.error('Errore stream Drive:', err.message);
    return res.status(502).json({ error: 'Impossibile contattare Google Drive' });
  }

  const type = upstream.headers.get('content-type') || '';
  const isError = !upstream.ok || type.includes('text/html') || type.includes('application/json');
  if (isError) {
    const detail = await upstream.text().catch(() => '');
    console.error(`Stream Drive fallito (${upstream.status}) per ${fileId}: ${detail.slice(0, 300)}`);
    const status = upstream.status === 416 ? 416 : upstream.status === 404 ? 404 : 502;
    return res.status(status).json({
      error:
        'Google Drive non ha restituito il video. Verifica che sia condiviso con "Chiunque abbia il link" ' +
        'e che la GOOGLE_API_KEY sia configurata.',
    });
  }

  res.status(upstream.status);
  for (const h of ['content-length', 'content-range', 'accept-ranges', 'last-modified', 'etag']) {
    const v = upstream.headers.get(h);
    if (v) res.setHeader(h, v);
  }
  if (!upstream.headers.get('accept-ranges')) res.setHeader('Accept-Ranges', 'bytes');
  // I file .mov (H.264) vengono riprodotti dai browser se dichiarati come mp4
  const playableType =
    !type || type.includes('octet-stream') || type.includes('quicktime') ? 'video/mp4' : type;
  res.setHeader('Content-Type', playableType);
  res.setHeader('Cache-Control', 'private, max-age=0');

  Readable.fromWeb(upstream.body)
    .on('error', () => res.destroy())
    .pipe(res);
}

// --- Copertine ---------------------------------------------------------------

const coverCache = new Map(); // fileId -> { buffer, type, at }
const COVER_TTL_MS = 12 * 60 * 60 * 1000;
const COVER_CACHE_MAX = 300;

async function fetchImage(url) {
  try {
    const res = await fetch(url, { redirect: 'follow' });
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
  const key = API_KEY();
  if (key) {
    try {
      const res = await fetch(`${API}/${fileId}?fields=thumbnailLink&supportsAllDrives=true&key=${key}`);
      if (res.ok) {
        const { thumbnailLink } = await res.json();
        if (thumbnailLink) image = await fetchImage(thumbnailLink.replace(/=s\d+(-[a-z]+)?$/, '=s1280'));
      }
    } catch {
      /* si prova il metodo alternativo */
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
