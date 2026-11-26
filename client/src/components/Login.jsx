import { useState } from 'react';
import { api } from '../api.js';
import Logo from './Logo.jsx';

export default function Login({ onLogin }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.login(password);
      onLogin();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-backdrop" />
      <header className="login-header">
        <Logo size="lg" />
      </header>
      <form className="login-box" onSubmit={submit}>
        <h1>Bentornati a casa</h1>
        <p className="muted">Inserisci la password di famiglia per guardare i vostri ricordi.</p>
        <input
          type="password"
          autoFocus
          autoComplete="current-password"
          placeholder="Password di famiglia"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <div className="form-error">{error}</div>}
        <button className="btn btn-primary btn-block" disabled={loading || !password}>
          {loading ? 'Accesso…' : 'Entra'}
        </button>
      </form>
    </div>
  );
}
