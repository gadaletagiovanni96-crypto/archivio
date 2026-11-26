import Cover from './Cover.jsx';
import { InfoIcon, PlayIcon } from './Icons.jsx';
import { formatDuration } from '../utils.js';

export default function Hero({ video, onPlay, onInfo }) {
  return (
    <section className="hero">
      <div className="hero-media">
        <Cover video={video} className="hero-cover" showTitleFallback={false} eager />
        <div className="hero-shade" />
      </div>
      <div className="hero-content">
        <div className="hero-tag">In evidenza</div>
        <h1 className="hero-title">{video.title}</h1>
        <div className="meta">
          <span className="meta-year">{video.year}</span>
          {video.durationMs ? <span>{formatDuration(video.durationMs / 1000)}</span> : null}
          <span className="badge">HD</span>
        </div>
        {video.description && <p className="hero-desc">{video.description}</p>}
        <div className="hero-buttons">
          <button className="btn btn-light btn-lg" onClick={() => onPlay(video)}>
            <PlayIcon /> Riproduci
          </button>
          <button className="btn btn-glass btn-lg" onClick={() => onInfo(video)}>
            <InfoIcon /> Altre info
          </button>
        </div>
      </div>
    </section>
  );
}
