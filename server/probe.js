import { fetchDriveRange } from './drive.js';

// Codifiche e compatibilità con i browser più diffusi
const VIDEO_CODECS = {
  avc1: { name: 'H.264', ok: true },
  avc3: { name: 'H.264', ok: true },
  hvc1: { name: 'HEVC / H.265 (tipico degli iPhone)', ok: 'partial' },
  hev1: { name: 'HEVC / H.265', ok: 'partial' },
  av01: { name: 'AV1', ok: true },
  vp09: { name: 'VP9', ok: true },
  vp08: { name: 'VP8', ok: true },
  mp4v: { name: 'MPEG-4 Part 2 (DivX/Xvid, tipico delle vecchie videocamere e conversioni)', ok: false },
  s263: { name: 'H.263 (vecchi cellulari)', ok: false },
  mjpa: { name: 'Motion JPEG', ok: false },
  jpeg: { name: 'Motion JPEG (vecchie fotocamere digitali)', ok: false },
  mjp2: { name: 'Motion JPEG 2000', ok: false },
  'dvc ': { name: 'DV (videocamere MiniDV)', ok: false },
  dvcp: { name: 'DV (videocamere MiniDV)', ok: false },
  dvpp: { name: 'DV (videocamere MiniDV)', ok: false },
  apcn: { name: 'Apple ProRes', ok: false },
  apch: { name: 'Apple ProRes', ok: false },
  mp2v: { name: 'MPEG-2', ok: false },
  xdvc: { name: 'XDCAM / MPEG-2', ok: false },
};
const AUDIO_CODECS = {
  mp4a: { name: 'AAC / MP3', ok: true },
  '.mp3': { name: 'MP3', ok: true },
  Opus: { name: 'Opus', ok: true },
  fLaC: { name: 'FLAC', ok: true },
  'ac-3': { name: 'Dolby AC-3', ok: false },
  'ec-3': { name: 'Dolby E-AC-3', ok: false },
  samr: { name: 'AMR (vecchi cellulari)', ok: false },
  sowt: { name: 'PCM non compresso', ok: false },
  twos: { name: 'PCM non compresso', ok: false },
  lpcm: { name: 'PCM non compresso', ok: false },
  ulaw: { name: 'PCM µ-law', ok: false },
  ima4: { name: 'IMA ADPCM', ok: false },
};

const CONTAINERS = new Set(['moov', 'trak', 'mdia', 'minf', 'stbl']);
const MAX_BOXES = 64;
const MAX_MOOV = 64 * 1024 * 1024;

function walk(buf, start, end, track, tracks) {
  let pos = start;
  while (pos + 8 <= end) {
    let size = buf.readUInt32BE(pos);
    const type = buf.toString('latin1', pos + 4, pos + 8);
    let header = 8;
    if (size === 1) {
      size = Number(buf.readBigUInt64BE(pos + 8));
      header = 16;
    } else if (size === 0) size = end - pos;
    if (size < header || pos + size > end) break;
    const body = pos + header;
    if (type === 'trak') {
      const t = {};
      walk(buf, body, pos + size, t, tracks);
      tracks.push(t);
    } else if (CONTAINERS.has(type)) {
      walk(buf, body, pos + size, track, tracks);
    } else if (type === 'hdlr' && track) {
      track.handler = buf.toString('latin1', body + 8, body + 12);
    } else if (type === 'stsd' && track) {
      // fullbox (4) + numero voci (4) + dimensione voce (4) + codifica (4)
      track.codec = buf.toString('latin1', body + 12, body + 16);
    }
    pos += size;
  }
}

/** Analizza la struttura di un file MP4/MOV su Drive e indica se è riproducibile nel browser. */
export async function probeDriveVideo(fileId) {
  let pos = 0;
  let total = null;
  let moov = null;
  let moovAfterData = false;
  let sawData = false;
  let brand = null;

  for (let i = 0; i < MAX_BOXES; i++) {
    if (total !== null && pos >= total) break;
    const { buffer: head, total: t } = await fetchDriveRange(fileId, pos, pos + 15);
    total ??= t;
    if (head.length < 8) break;
    let size = head.readUInt32BE(0);
    const type = head.toString('latin1', 4, 8);
    if (size === 1) size = Number(head.readBigUInt64BE(8));
    else if (size === 0) size = (total ?? pos) - pos;
    if (!/^[\x20-\x7e]{4}$/.test(type) || size < 8) {
      return { container: 'sconosciuto', verdict: 'unknown', message: 'Il file non sembra un MP4/MOV valido.' };
    }
    if (type === 'ftyp') brand = head.toString('latin1', 8, 12);
    if (type === 'mdat') sawData = true;
    if (type === 'moov') {
      if (size > MAX_MOOV) break;
      moov = (await fetchDriveRange(fileId, pos, pos + size - 1)).buffer;
      moovAfterData = sawData;
      break;
    }
    pos += size;
  }

  if (!moov) {
    return {
      brand,
      verdict: 'unknown',
      message: 'Non sono riuscito a trovare le informazioni sul formato dentro il file.',
    };
  }

  const tracks = [];
  walk(moov, 8, moov.length, null, tracks);
  const video = tracks.find((t) => t.handler === 'vide');
  const audio = tracks.find((t) => t.handler === 'soun');
  const vInfo = video ? VIDEO_CODECS[video.codec] || { name: video.codec, ok: 'unknown' } : null;
  const aInfo = audio ? AUDIO_CODECS[audio.codec] || { name: audio.codec, ok: 'unknown' } : null;

  let verdict = 'ok';
  const problems = [];
  if (vInfo && vInfo.ok === false) {
    verdict = 'unsupported';
    problems.push(`la codifica video ${vInfo.name} non è supportata dai browser`);
  } else if (vInfo && vInfo.ok === 'partial') {
    verdict = 'partial';
    problems.push(`la codifica video ${vInfo.name} funziona solo su alcuni dispositivi (Safari, Mac, iPhone, alcuni PC)`);
  }
  if (aInfo && aInfo.ok === false) {
    if (verdict === 'ok') verdict = 'unsupported';
    problems.push(`l'audio ${aInfo.name} non è supportato dai browser`);
  }

  return {
    brand,
    size: total,
    video: vInfo ? { codec: video.codec, name: vInfo.name } : null,
    audio: aInfo ? { codec: audio.codec, name: aInfo.name } : null,
    moovAfterData,
    verdict,
    message: problems.length
      ? `Il file non è compatibile: ${problems.join('; ')}. Convertilo in MP4 (H.264 + AAC) con HandBrake.`
      : 'Il formato è compatibile con i browser.',
  };
}
