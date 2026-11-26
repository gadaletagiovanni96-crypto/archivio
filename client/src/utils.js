const KEY = 'archivio:progress';

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

function writeAll(all) {
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* memoria del browser non disponibile */
  }
}

export function getProgress(id) {
  return readAll()[id] || null;
}

export function getAllProgress() {
  return readAll();
}

export function saveProgress(id, time, duration) {
  const all = readAll();
  if (!duration || time < 5 || time > duration - 15) delete all[id];
  else all[id] = { time, duration, at: Date.now() };
  writeAll(all);
}

export function clearProgress(id) {
  const all = readAll();
  delete all[id];
  writeAll(all);
}

export function formatDuration(seconds) {
  if (!seconds || !Number.isFinite(seconds)) return '';
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h) return `${h} h ${m} min`;
  if (m) return `${m} min`;
  return `${sec} s`;
}

export function formatClock(seconds) {
  const s = Math.max(0, Math.floor(seconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

export function hueFromString(str = '') {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 360;
  return h;
}
