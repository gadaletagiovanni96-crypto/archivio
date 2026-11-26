import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from './api.js';
import { getAllProgress } from './utils.js';
import Login from './components/Login.jsx';
import Navbar from './components/Navbar.jsx';
import Hero from './components/Hero.jsx';
import Row from './components/Row.jsx';
import VideoCard from './components/VideoCard.jsx';
import Player from './components/Player.jsx';
import DetailsModal from './components/DetailsModal.jsx';
import VideoForm from './components/VideoForm.jsx';
import Logo from './components/Logo.jsx';
import { PlusIcon } from './components/Icons.jsx';

const byNewest = (a, b) => (b.createdAt || '').localeCompare(a.createdAt || '');

export default function App() {
  const [auth, setAuth] = useState(null); // null = verifica in corso
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [playing, setPlaying] = useState(null);
  const [details, setDetails] = useState(null);
  const [form, setForm] = useState(null); // { video?: object }
  const [progress, setProgress] = useState(getAllProgress);
  const [featuredSeed] = useState(() => Math.random());

  const handleError = useCallback((err) => {
    if (err.status === 401) setAuth(false);
    else throw err;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      setVideos(await api.listVideos());
    } catch (err) {
      if (err.status === 401) setAuth(false);
      else setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    api
      .session()
      .then((s) => setAuth(s.authenticated))
      .catch(() => setAuth(false));
  }, []);

  useEffect(() => {
    if (auth) load();
  }, [auth, load]);

  // --- Azioni ---------------------------------------------------------------

  const play = (video) => {
    setDetails(null);
    setPlaying(video);
  };

  const closePlayer = useCallback(() => {
    setPlaying(null);
    setProgress(getAllProgress());
  }, []);

  async function saveVideo(data) {
    try {
      if (form?.video) {
        const updated = await api.updateVideo(form.video.id, data);
        setVideos((vs) => vs.map((v) => (v.id === updated.id ? updated : v)));
      } else {
        const created = await api.createVideo(data);
        setVideos((vs) => [...vs, created]);
      }
      setForm(null);
    } catch (err) {
      handleError(err);
    }
  }

  async function deleteVideo(video) {
    try {
      await api.deleteVideo(video.id);
      setVideos((vs) => vs.filter((v) => v.id !== video.id));
      setDetails(null);
    } catch (err) {
      handleError(err);
    }
  }

  async function logout() {
    await api.logout().catch(() => {});
    setAuth(false);
    setVideos([]);
  }

  // --- Dati derivati --------------------------------------------------------

  const featured = useMemo(() => {
    if (!videos.length) return null;
    const recent = [...videos].sort(byNewest).slice(0, 8);
    return recent[Math.floor(featuredSeed * recent.length)];
  }, [videos, featuredSeed]);

  const rows = useMemo(() => {
    const result = [];
    const continueWatching = videos
      .filter((v) => progress[v.id])
      .sort((a, b) => progress[b.id].at - progress[a.id].at);
    if (continueWatching.length) result.push({ title: 'Continua a guardare', videos: continueWatching });

    if (videos.length > 4) result.push({ title: 'Aggiunti di recente', videos: [...videos].sort(byNewest).slice(0, 15) });

    const byYear = new Map();
    for (const v of videos) {
      if (!byYear.has(v.year)) byYear.set(v.year, []);
      byYear.get(v.year).push(v);
    }
    [...byYear.keys()]
      .sort((a, b) => b - a)
      .forEach((year) =>
        result.push({ title: String(year), videos: byYear.get(year).sort((a, b) => a.title.localeCompare(b.title)) })
      );
    return result;
  }, [videos, progress]);

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return null;
    return videos
      .filter((v) => [v.title, String(v.year), v.description].some((f) => f?.toLowerCase().includes(q)))
      .sort((a, b) => b.year - a.year);
  }, [videos, search]);

  // --- Render ---------------------------------------------------------------

  if (auth === null) {
    return (
      <div className="splash">
        <Logo size="lg" />
      </div>
    );
  }

  if (!auth) return <Login onLogin={() => setAuth(true)} />;

  return (
    <div className="app">
      <Navbar
        search={search}
        onSearch={setSearch}
        onAdd={() => setForm({})}
        onLogout={logout}
        onHome={() => {
          setSearch('');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {loading ? (
        <div className="page-center">
          <div className="spinner" />
        </div>
      ) : loadError ? (
        <div className="page-center">
          <p>{loadError}</p>
          <button className="btn btn-light" onClick={load}>
            Riprova
          </button>
        </div>
      ) : results ? (
        <main className="search-results">
          <h2 className="row-title">
            {results.length ? `Risultati per “${search}”` : `Nessun risultato per “${search}”`}
          </h2>
          <div className="grid">
            {results.map((v) => (
              <VideoCard key={v.id} video={v} progress={progress[v.id]} onPlay={play} onInfo={setDetails} />
            ))}
          </div>
        </main>
      ) : videos.length === 0 ? (
        <div className="page-center empty">
          <h1>L'archivio è ancora vuoto</h1>
          <p className="muted">Aggiungi il primo video di famiglia caricato su Google Drive.</p>
          <button className="btn btn-primary btn-lg" onClick={() => setForm({})}>
            <PlusIcon /> Aggiungi il primo video
          </button>
        </div>
      ) : (
        <>
          {featured && <Hero video={featured} onPlay={play} onInfo={setDetails} />}
          <main className="rows">
            {rows.map((r) => (
              <Row key={r.title} title={r.title} videos={r.videos} progress={progress} onPlay={play} onInfo={setDetails} />
            ))}
          </main>
        </>
      )}

      <footer className="footer muted">I ricordi di famiglia, sempre a portata di click.</footer>

      {details && (
        <DetailsModal
          video={details}
          progress={progress[details.id]}
          onClose={() => setDetails(null)}
          onPlay={play}
          onEdit={(v) => {
            setDetails(null);
            setForm({ video: v });
          }}
          onDelete={deleteVideo}
        />
      )}
      {form && <VideoForm video={form.video} onClose={() => setForm(null)} onSave={saveVideo} />}
      {playing && <Player video={playing} onClose={closePlayer} />}
    </div>
  );
}
