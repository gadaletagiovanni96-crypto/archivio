import { useEffect, useState } from 'react';
import { coverUrl } from '../api.js';
import { hueFromString } from '../utils.js';

/** Copertina del video: anteprima di Drive, link personalizzato o segnaposto colorato. */
export default function Cover({ video, className = '', showTitleFallback = true, eager = false }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [video.id, video.updatedAt]);

  if (failed) {
    const hue = hueFromString(video.title);
    return (
      <div
        className={`cover cover-fallback ${className}`}
        style={{
          background: `radial-gradient(circle at 30% 20%, hsl(${hue} 60% 38%), hsl(${(hue + 35) % 360} 55% 14%) 70%)`,
        }}
      >
        {showTitleFallback && (
          <span className="cover-fallback-text">
            {video.title}
            <small>{video.year}</small>
          </span>
        )}
      </div>
    );
  }
  return (
    <img
      className={`cover ${className}`}
      src={coverUrl(video)}
      alt={video.title}
      loading={eager ? 'eager' : 'lazy'}
      draggable="false"
      onError={() => setFailed(true)}
    />
  );
}
