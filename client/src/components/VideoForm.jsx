import { useState } from 'react';
import Modal from './Modal.jsx';

const currentYear = new Date().getFullYear();

export default function VideoForm({ video, onClose, onSave }) {
  const editing = Boolean(video);
  const [form, setForm] = useState({
    title: video?.title ?? '',
    year: video?.year ?? '',
    link: video?.link ?? '',
    description: video?.description ?? '',
    coverUrl: video?.coverUrl ?? '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSave({ ...form, year: Number(form.year) });
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <Modal onClose={onClose} className="form-modal">
      <form className="video-form" onSubmit={submit}>
        <h2>{editing ? 'Modifica video' : 'Aggiungi un video'}</h2>

        <label>
          <span>Titolo *</span>
          <input value={form.title} onChange={set('title')} placeholder="Es. Natale dai nonni" required autoFocus />
        </label>

        <label>
          <span>Anno *</span>
          <input
            type="number"
            min="1900"
            max={currentYear + 1}
            value={form.year}
            onChange={set('year')}
            placeholder={String(currentYear)}
            required
          />
        </label>

        <label>
          <span>Link Google Drive *</span>
          <input
            value={form.link}
            onChange={set('link')}
            placeholder="https://drive.google.com/file/d/…/view"
            required
          />
          <small className="hint">
            Su Drive: tasto destro sul video → <b>Condividi</b> → “Chiunque abbia il link” → <b>Copia link</b>.
          </small>
        </label>

        <label>
          <span>Descrizione</span>
          <textarea rows={3} value={form.description} onChange={set('description')} placeholder="Chi c'era, dove eravate…" />
        </label>

        <label>
          <span>Copertina (facoltativa)</span>
          <input value={form.coverUrl} onChange={set('coverUrl')} placeholder="Link a un'immagine (anche da Google Drive)" />
          <small className="hint">Se la lasci vuota viene usata l'anteprima generata da Google Drive.</small>
        </label>

        {error && <div className="form-error">{error}</div>}

        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Annulla
          </button>
          <button className="btn btn-primary" disabled={saving}>
            {saving ? 'Salvataggio…' : editing ? 'Salva modifiche' : 'Aggiungi'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
