import { useState } from 'react';
import Modal from './Modal.jsx';
import Cover from './Cover.jsx';
import { EditIcon, PlayIcon, TrashIcon } from './Icons.jsx';
import { formatClock, formatDuration } from '../utils.js';

export default function DetailsModal({ video, progress, onClose, onPlay, onEdit, onDelete }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function remove() {
    setBusy(true);
    setError('');
    try {
      await onDelete(video);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <Modal onClose={onClose} className="details">
      <div className="details-media">
        <Cover video={video} showTitleFallback={false} eager />
        <div className="details-shade" />
        <div className="details-head">
          <h2>{video.title}</h2>
          <button className="btn btn-light btn-lg" onClick={() => onPlay(video)}>
            <PlayIcon /> {progress ? `Riprendi da ${formatClock(progress.time)}` : 'Riproduci'}
          </button>
        </div>
      </div>
      <div className="details-body">
        <div className="meta">
          <span className="meta-year">{video.year}</span>
          {video.durationMs ? <span>{formatDuration(video.durationMs / 1000)}</span> : null}
          {video.fileName && <span className="muted small">{video.fileName}</span>}
        </div>
        <p className={video.description ? '' : 'muted'}>{video.description || 'Nessuna descrizione.'}</p>
        {error && <div className="form-error">{error}</div>}
        <div className="details-actions">
          <button className="btn btn-glass" onClick={() => onEdit(video)}>
            <EditIcon width={18} height={18} /> Modifica
          </button>
          {confirming ? (
            <>
              <span className="muted">Eliminare dall'archivio? (il file su Drive resta)</span>
              <button className="btn btn-danger" onClick={remove} disabled={busy}>
                {busy ? 'Elimino…' : 'Sì, elimina'}
              </button>
              <button className="btn btn-ghost" onClick={() => setConfirming(false)}>
                Annulla
              </button>
            </>
          ) : (
            <button className="btn btn-ghost" onClick={() => setConfirming(true)}>
              <TrashIcon width={18} height={18} /> Elimina
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
