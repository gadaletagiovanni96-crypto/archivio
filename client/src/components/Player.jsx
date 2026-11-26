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
          setError(
            'Impossibile riprodurre il video. Controlla che su Google Drive sia condiviso con “Chiunque abbia il link” ' +
              'e che il formato sia compatibile con il browser (MP4 consigliato).'
          );
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
          <h3>Ops!</h3>
          <p>{error}</p>
          <button className="btn btn-light" onClick={close}>
            Torna all'archivio
          </button>
        </div>
      )}
    </div>
  );
}
