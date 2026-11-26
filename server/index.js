import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cookieParser from 'cookie-parser';
import { createAuth } from './auth.js';
import { createCatalog } from './storage.js';
import { extractDriveId, forgetCover, getDriveCover, getDriveMetadata, streamDriveFile } from './drive.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT) || 3001;
const PASSWORD = process.env.FAMILY_PASSWORD;

if (!PASSWORD) {
  console.error('\n✖ Manca la variabile FAMILY_PASSWORD. Crea il file .env partendo da .env.example.\n');
  process.exit(1);
}
if (!process.env.SESSION_SECRET) {
  console.warn('⚠ SESSION_SECRET non impostata: ne uso una derivata dalla password (consigliato impostarla).');
}
if (!process.env.GOOGLE_API_KEY) {
  console.warn('⚠ GOOGLE_API_KEY non impostata: lo streaming userà il download diretto di Drive (meno affidabile).');
}

const auth = createAuth({ password: PASSWORD, secret: process.env.SESSION_SECRET || `archivio:${PASSWORD}` });
const catalog = await createCatalog({ rootDir });

const app = express();
app.set('trust proxy', 1); // Render è dietro un proxy HTTPS
app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

const asyncRoute = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// --- Accesso -----------------------------------------------------------------

app.get('/healthz', (_req, res) => res.send('ok'));

app.get('/api/session', (req, res) => res.json({ authenticated: auth.isAuthenticated(req) }));

app.post('/api/login', (req, res) => {
  if (auth.tooManyAttempts(req.ip)) {
    return res.status(429).json({ error: 'Troppi tentativi. Riprova tra qualche minuto.' });
  }
  if (!auth.checkPassword(req.body?.password)) {
    return res.status(401).json({ error: 'Password errata' });
  }
  auth.issueSession(req, res);
  res.json({ authenticated: true });
});

app.post('/api/logout', (_req, res) => {
  auth.clearSession(res);
  res.json({ authenticated: false });
});

// --- Video ---------------------------------------------------------------------

function parseVideoInput(body, { partial = false } = {}) {
  const out = {};
  const errors = [];
  const maxYear = new Date().getFullYear() + 1;

  if (!partial || body.title !== undefined) {
    const title = String(body.title ?? '').trim();
    if (!title) errors.push('Il titolo è obbligatorio');
    else if (title.length > 200) errors.push('Il titolo è troppo lungo');
    out.title = title;
  }
  if (!partial || body.year !== undefined) {
    const year = Number(body.year);
    if (!Number.isInteger(year) || year < 1900 || year > maxYear) errors.push(`Anno non valido (1900–${maxYear})`);
    out.year = year;
  }
  if (!partial || body.link !== undefined) {
    const driveId = extractDriveId(body.link);
    if (!driveId) errors.push('Link di Google Drive non valido');
    out.link = String(body.link ?? '').trim();
    out.driveId = driveId;
  }
  if (body.description !== undefined) {
    out.description = String(body.description ?? '').trim().slice(0, 2000);
  }
  if (body.coverUrl !== undefined) {
    const coverUrl = String(body.coverUrl ?? '').trim();
    if (coverUrl && !/^https?:\/\//i.test(coverUrl)) errors.push('Il link della copertina deve iniziare con http(s)://');
    out.coverUrl = coverUrl;
    out.coverDriveId = coverUrl.includes('google.com') ? extractDriveId(coverUrl) : null;
  }
  if (errors.length) {
    const err = new Error(errors.join('. '));
    err.status = 400;
    throw err;
  }
  return out;
}

async function enrichFromDrive(data) {
  if (!data.driveId) return data;
  const meta = await getDriveMetadata(data.driveId); // null se manca la chiave API
  if (!meta) return data;
  if (meta.mimeType && !meta.mimeType.startsWith('video/')) {
    const err = new Error(`Il file "${meta.name}" non sembra un video (${meta.mimeType}).`);
    err.status = 400;
    throw err;
  }
  return {
    ...data,
    fileName: meta.name,
    mimeType: meta.mimeType,
    size: meta.size ? Number(meta.size) : undefined,
    durationMs: meta.videoMediaMetadata?.durationMillis ? Number(meta.videoMediaMetadata.durationMillis) : undefined,
  };
}

app.use('/api/videos', auth.requireAuth);

app.get('/api/videos', (_req, res) => {
  res.json(catalog.list());
});

app.post(
  '/api/videos',
  asyncRoute(async (req, res) => {
    const data = await enrichFromDrive(parseVideoInput(req.body ?? {}));
    const now = new Date().toISOString();
    const video = { id: crypto.randomUUID(), description: '', coverUrl: '', ...data, createdAt: now, updatedAt: now };
    await catalog.mutate((videos) => videos.push(video));
    res.status(201).json(video);
  })
);

app.put(
  '/api/videos/:id',
  asyncRoute(async (req, res) => {
    const existing = catalog.get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Video non trovato' });
    let data = parseVideoInput(req.body ?? {}, { partial: true });
    if (data.driveId && data.driveId !== existing.driveId) data = await enrichFromDrive(data);
    const updated = await catalog.mutate((videos) => {
      const i = videos.findIndex((v) => v.id === req.params.id);
      if (i === -1) return null;
      videos[i] = { ...videos[i], ...data, updatedAt: new Date().toISOString() };
      return videos[i];
    });
    if (!updated) return res.status(404).json({ error: 'Video non trovato' });
    forgetCover(existing.driveId);
    if (existing.coverDriveId) forgetCover(existing.coverDriveId);
    res.json(updated);
  })
);

app.delete(
  '/api/videos/:id',
  asyncRoute(async (req, res) => {
    const removed = await catalog.mutate((videos) => {
      const i = videos.findIndex((v) => v.id === req.params.id);
      return i === -1 ? null : videos.splice(i, 1)[0];
    });
    if (!removed) return res.status(404).json({ error: 'Video non trovato' });
    res.status(204).end();
  })
);

app.get(
  '/api/videos/:id/stream',
  asyncRoute(async (req, res) => {
    const video = catalog.get(req.params.id);
    if (!video) return res.status(404).json({ error: 'Video non trovato' });
    await streamDriveFile(req, res, video.driveId);
  })
);

app.get(
  '/api/videos/:id/cover',
  asyncRoute(async (req, res) => {
    const video = catalog.get(req.params.id);
    if (!video) return res.status(404).end();
    if (video.coverUrl && !video.coverDriveId) return res.redirect(302, video.coverUrl);
    const image = await getDriveCover(video.coverDriveId || video.driveId);
    if (!image) return res.status(404).end();
    res.setHeader('Content-Type', image.type);
    res.setHeader('Cache-Control', 'private, max-age=86400');
    res.send(image.buffer);
  })
);

app.use('/api', (_req, res) => res.status(404).json({ error: 'Risorsa non trovata' }));

// --- Frontend React (build di produzione) -------------------------------------

const distDir = path.join(rootDir, 'client', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir, { index: false, maxAge: '7d' }));
  app.get('*', (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(distDir, 'index.html'));
  });
} else {
  app.get('/', (_req, res) =>
    res.send('Server attivo. In sviluppo apri il frontend su <a href="http://localhost:5173">http://localhost:5173</a>.')
  );
}

app.use((err, _req, res, _next) => {
  if (!err.status) console.error(err);
  res.status(err.status || 500).json({ error: err.status ? err.message : 'Errore interno del server' });
});

app.listen(PORT, () => {
  console.log(`✔ Archivio Gadaleta in ascolto su http://localhost:${PORT}`);
});
