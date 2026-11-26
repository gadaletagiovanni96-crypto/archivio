import { useRef } from 'react';
import VideoCard from './VideoCard.jsx';
import { ChevronIcon } from './Icons.jsx';

export default function Row({ title, videos, progress, onPlay, onInfo }) {
  const trackRef = useRef(null);
  const scroll = (dir) => {
    const el = trackRef.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: 'smooth' });
  };

  return (
    <section className="row">
      <h2 className="row-title">
        {title} <span className="row-count">{videos.length}</span>
      </h2>
      <div className="row-wrap">
        <button className="row-arrow row-arrow-left" onClick={() => scroll(-1)} aria-label="Indietro">
          <ChevronIcon dir="left" width={36} height={36} />
        </button>
        <div className="row-track" ref={trackRef}>
          {videos.map((v) => (
            <VideoCard key={v.id} video={v} progress={progress[v.id]} onPlay={onPlay} onInfo={onInfo} />
          ))}
        </div>
        <button className="row-arrow row-arrow-right" onClick={() => scroll(1)} aria-label="Avanti">
          <ChevronIcon width={36} height={36} />
        </button>
      </div>
    </section>
  );
}
