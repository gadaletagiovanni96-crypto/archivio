import Cover from './Cover.jsx';
import { InfoIcon, PlayIcon } from './Icons.jsx';
import { formatDuration } from '../utils.js';

export default function VideoCard({ video, progress, onPlay, onInfo }) {
  const pct = progress ? Math.min(100, (progress.time / progress.duration) * 100) : 0;
  return (
    <div
      className="card"
      role="button"
      tabIndex={0}
      onClick={() => onPlay(video)}
      onKeyDown={(e) => e.key === 'Enter' && onPlay(video)}
      title={video.title}
    >
      <div className="card-media">
        <Cover video={video} />
        <div className="card-play">
          <PlayIcon width={34} height={34} />
        </div>
        {pct > 0 && (
          <div className="card-progress">
            <div style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>
      <div className="card-info">
        <div className="card-text">
          <div className="card-title">{video.title}</div>
          <div className="card-meta">
            <span className="meta-year">{video.year}</span>
            {video.durationMs ? <span>{formatDuration(video.durationMs / 1000)}</span> : null}
          </div>
        </div>
        <button
          className="icon-btn icon-btn-ring"
          aria-label="Dettagli"
          onClick={(e) => {
            e.stopPropagation();
            onInfo(video);
          }}
        >
          <InfoIcon width={20} height={20} />
        </button>
      </div>
    </div>
  );
}
