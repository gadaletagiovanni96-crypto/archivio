import { useCallback, useEffect, useRef, useState } from 'react';
import { streamUrl } from '../api.js';
import { clearProgress, formatClock, getProgress, saveProgress } from '../utils.js';
import { BackIcon, ReplayIcon } from './Icons.jsx';

export default function Player({ video, onClose }) {
  const ref = useRef(null);
  const lastSave = useRef(0);
  const hideTimer = useRef(null);
  const [error, setError] = useState('');
  const [resumedAt, setResumedAt] = useState(null);
  const [chrome, setChrome] = useState(true);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState(null); // { url, mode: 'direct' | 'proxy' }
  const resumeAt = useRef(null); // punto da cui ripartire dopo il rinnovo del permesso
  const retries = useRef(0);

  const loadSource = useCallback(async (fresh = false) => {
    try {
      const res = await fetch(`/api/videos/${video.id}/source${fresh ? '?fresh=1' : ''}`);
      if (!res.ok) throw new Error(res.status === 401 ? 'sessione' : `errore ${res.status}`);
      setSource({ ...(await res.json()), loadedAt: Date.now() });
    } catch (err) {
      setLoading(false);
      setError({
        title: err.message === 'sessione' ? 'Sessione scaduta' : 'Connessione non riuscita',
        text:
          err.message === 'sessione'
            ? 'Ricarica la pagina ed entra di nuovo con la password.'
            : 'Il server non risponde. Controlla la connessione o che il sito sia acceso, poi riprova.',
        details: [],
      });
    }
  }, [video.id]);

  useEffect(() => {
    loadSource();
  }, [loadSource]);

  // Dopo un rinnovo il browser deve ricaricare il video anche se l'indirizzo è identico
  useEffect(() => {
    if (source && retries.current > 0) ref.current?.load();
  }, [source]);

  const close = useCallback(() => {
    const el = ref.current;
    if (el && el.currentTime) saveProgress(video.id, el.currentTime, el.duration);
    onClose();
  }, [video.id, onClose]);

  const poke = useCallback(() => {
    setChrome(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (ref.current && !ref.current.paused) setChrome(false);
    }, 3000);
  }, []);

  useEffect(() => {
    document.body.classList.add('no-scroll');
    const onKey = (e) => {
      if (e.key === 'Escape' && !document.fullscreenElement) close();
      const el = ref.current;
      if (!el || e.target.tagName === 'INPUT') return;
      if (e.key === ' ' || e.key === 'k') {
        e.preventDefault();
        el.paused ? el.play() : el.pause();
      } else if (e.key === 'ArrowRight') el.currentTime += 10;
      else if (e.key === 'ArrowLeft') el.currentTime -= 10;
      else if (e.key === 'f') document.fullscreenElement ? document.exitFullscreen() : el.requestFullscreen?.();
      poke();
    };
    document.addEventListener('keydown', onKey);
    poke();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('no-scroll');
      clearTimeout(hideTimer.current);
    };
  }, [close, poke]);

  function onLoadedMetadata() {
    const el = ref.current;
    if (resumeAt.current !== null) {
      // Ripresa dopo il rinnovo automatico del permesso di Google
      el.currentTime = resumeAt.current;
      resumeAt.current = null;
      el.play().catch(() => {});
      return;
    }
    const p = getProgress(video.id);
    if (p && p.time > 5 && p.time < el.duration - 15) {
      el.currentTime = p.time;
      setResumedAt(p.time);
      setTimeout(() => setResumedAt(null), 6000);
    }
  }

  function onTimeUpdate() {
    const el = ref.current;
    const now = Date.now();
    if (now - lastSave.current > 4000) {
      lastSave.current = now;
      saveProgress(video.id, el.currentTime, el.duration);
    }
  }

  async function diagnose() {
    const mediaError = ref.current?.error;
    const code = mediaError ? ` (codice ${mediaError.code}${mediaError.message ? `: ${mediaError.message}` : ''})` : '';
    try {
      const res = await fetch(streamUrl(video), { headers: { Range: 'bytes=0-63' } });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError({
          title: 'Google Drive non ha consegnato il video',
          text:
            res.status === 401
              ? 'La sessione è scaduta: ricarica la pagina ed entra di nuovo.'
              : 'Il file non è scaricabile. Controlla che sia condiviso con “Chiunque abbia il link” e che il ' +
                'proprietario non abbia disattivato l’opzione per scaricare.',
          details: data.details || [data.error || `Errore ${res.status}`],
        });
        return;
      }
      const reader = res.body.getReader();
      const { value = new Uint8Array() } = await reader.read();
      reader.cancel().catch(() => {});
      const head = value.slice(0, 64);
      const brand = new TextDecoder().decode(head.slice(8, 12));
      const probe = await fetch(`/api/videos/${video.id}/probe`).then((r) => r.json()).catch(() => null);
      const isMov = brand === 'qt  ';
      if (source?.mode === 'direct' && probe?.verdict === 'ok') {
        setError({
          title: 'Google non ha consegnato il video al browser',
          text:
            'Il file è compatibile e il server riesce a leggerlo, ma il tuo browser non è riuscito a scaricarlo ' +
            'direttamente da Google. Riprova tra qualche minuto; se succede con tutti i video, segnalalo.',
          details: [`Video: ${probe.video?.name || '?'} · Audio: ${probe.audio?.name || '?'}${code}`],
        });
        return;
      }
      setError({
        title: 'Il browser non riesce a leggere questo video',
        text:
          'Il file arriva correttamente da Drive, ma il formato non è supportato da questo browser' +
          (isMov
            ? '. È un file .MOV, probabilmente registrato con iPhone in formato HEVC: prova ad aprirlo con Safari o con un altro dispositivo, oppure convertilo in MP4 (H.264) con HandBrake.'
            : '. Prova con un altro browser (Chrome, Safari) oppure convertilo in MP4 (H.264) con HandBrake.'),
        details: [
          `Tipo file: ${video.mimeType || 'sconosciuto'}${brand.trim() ? ` · formato “${brand.trim()}”` : ''}${code}`,
          ...(probe?.video ? [`Video: ${probe.video.name} (${probe.video.codec})`] : []),
          ...(probe?.audio ? [`Audio: ${probe.audio.name} (${probe.audio.codec})`] : []),
          ...(probe?.message ? [probe.message] : []),
          ...(res.status === 200 ? ['Il server ha ricevuto il file intero invece di una parte: lo streaming non supporta lo spostamento nel video.'] : []),
        ],
      });
    } catch {
      setError({
        title: 'Connessione non riuscita',
        text: 'Il server non risponde. Controlla la connessione o che il sito sia acceso, poi riprova.',
        details: [],
      });
    }
  }

  function restart() {
    ref.current.currentTime = 0;
    clearProgress(video.id);
    setResumedAt(null);
  }

  return (
    <div className={`player ${chrome ? '' : 'player-idle'}`} onMouseMove={poke} onTouchStart={poke}>
      <video
        ref={ref}
        src={source?.url}
        controls
        autoPlay
        playsInline
        preload="auto"
        onLoadedMetadata={onLoadedMetadata}
        onTimeUpdate={onTimeUpdate}
        onWaiting={() => setLoading(true)}
        onPlaying={() => {
          setLoading(false);
          retries.current = 0;
        }}
        onCanPlay={() => setLoading(false)}
        onPause={poke}
        onEnded={() => {
          clearProgress(video.id);
          setChrome(true);
        }}
        onError={() => {
          const el = ref.current;
          if (!source?.url) return;
          // Il permesso di Google dura un'ora: se scade durante un video lungo, lo rinnova e riparte dallo stesso punto.
          if (source.mode === 'direct' && retries.current < 2) {
            retries.current += 1;
            resumeAt.current = el?.currentTime > 0 ? el.currentTime : null;
            setLoading(true);
            loadSource(true);
            return;
          }
          setLoading(false);
          setError({ title: 'Controllo in corso…', text: 'Sto cercando di capire perché il video non parte.', details: [] });
          diagnose();
        }}
      />

      <div className="player-top">
        <button className="icon-btn player-back" onClick={close} aria-label="Torna indietro">
          <BackIcon width={30} height={30} />
        </button>
        <div className="player-title">
          <span className="muted">Stai guardando</span>
          <strong>
            {video.title} <span className="muted">· {video.year}</span>
          </strong>
        </div>
      </div>

      {loading && !error && <div className="spinner" aria-label="Caricamento" />}

      {resumedAt !== null && (
        <div className="player-toast">
          Ripreso da {formatClock(resumedAt)}
          <button className="btn btn-glass btn-sm" onClick={restart}>
            <ReplayIcon width={16} height={16} /> Ricomincia
          </button>
        </div>
      )}

      {error && (
        <div className="player-error">
          <h3>{error.title}</h3>
          <p>{error.text}</p>
          {error.details?.length > 0 && (
            <ul className="player-error-details">
              {error.details.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          )}
          <button className="btn btn-light" onClick={close}>
            Torna all'archivio
          </button>
        </div>
      )}
    </div>
  );
}
