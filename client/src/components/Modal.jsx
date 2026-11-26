import { useEffect } from 'react';
import { CloseIcon } from './Icons.jsx';

export default function Modal({ onClose, children, className = '' }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.classList.add('no-scroll');
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('no-scroll');
    };
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${className}`} role="dialog" aria-modal="true">
        <button className="icon-btn modal-close" onClick={onClose} aria-label="Chiudi">
          <CloseIcon />
        </button>
        {children}
      </div>
    </div>
  );
}
