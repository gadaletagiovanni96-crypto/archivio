export default function Logo({ size = 'md' }) {
  return (
    <div className={`logo logo-${size}`}>
      <span className="logo-main">ARCHIVIO</span>
      <span className="logo-sub">di famiglia</span>
    </div>
  );
}
