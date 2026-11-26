import { useEffect, useRef, useState } from 'react';
import Logo from './Logo.jsx';
import { CloseIcon, LogoutIcon, PlusIcon, SearchIcon } from './Icons.jsx';

export default function Navbar({ search, onSearch, onAdd, onLogout, onHome }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(Boolean(search));
  const inputRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  return (
    <nav className={`navbar ${scrolled ? 'navbar-solid' : ''}`}>
      <button className="navbar-logo" onClick={onHome} aria-label="Home">
        <Logo />
      </button>
      <div className="navbar-actions">
        <div className={`search ${open ? 'search-open' : ''}`}>
          <button className="icon-btn" onClick={() => setOpen(true)} aria-label="Cerca">
            <SearchIcon />
          </button>
          <input
            ref={inputRef}
            value={search}
            placeholder="Titoli, anni, descrizioni"
            onChange={(e) => onSearch(e.target.value)}
            onBlur={() => !search && setOpen(false)}
            onKeyDown={(e) => e.key === 'Escape' && (onSearch(''), setOpen(false))}
          />
          {search && (
            <button className="icon-btn" onClick={() => onSearch('')} aria-label="Cancella ricerca">
              <CloseIcon width={18} height={18} />
            </button>
          )}
        </div>
        <button className="btn btn-primary btn-add" onClick={onAdd}>
          <PlusIcon width={20} height={20} />
          <span>Aggiungi video</span>
        </button>
        <button className="icon-btn" onClick={onLogout} title="Esci" aria-label="Esci">
          <LogoutIcon />
        </button>
      </div>
    </nav>
  );
}
