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
      const head = new Uint8Array(await res.arrayBuffer());
      const brand = new TextDecoder().decode(head.slice(8, 12));
      const isMov = brand === 'qt  ';
      setError({
        title: 'Il browser non riesce a leggere questo video',
        text:
          'Il file arriva correttamente da Drive, ma il formato non è supportato da questo browser' +
          (isMov
            ? '. È un file .MOV, probabilmente registrato con iPhone in formato HEVC: prova ad aprirlo con Safari o con un altro dispositivo, oppure convertilo in MP4 (H.264) con HandBrake.'
            : '. Prova con un altro browser (Chrome, Safari) oppure convertilo in MP4 (H.264) con HandBrake.'),
        details: [`Tipo file: ${video.mimeType || 'sconosciuto'}${brand.trim() ? ` · formato “${brand.trim()}”` : ''}${code}`],
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
        src={streamUrl(video)}
        controls
        autoPlay
        playsInline
        preload="auto"
        onLoadedMetadata={onLoadedMetadata}
        onTimeUpdate={onTimeUpdate}
        onWaiting={() => setLoading(true)}
        onPlaying={() => setLoading(false)}
        onCanPlay={() => setLoading(false)}
        onPause={poke}
        onEnded={() => {
          clearProgress(video.id);
          setChrome(true);
        }}
        onError={() => {
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
