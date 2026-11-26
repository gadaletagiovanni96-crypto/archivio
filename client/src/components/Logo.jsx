export default function Logo({ size = 'md' }) {
  return (
    <div className={`logo logo-${size}`}>
      <span className="logo-main">GADALETA</span>
      <span className="logo-sub">archivio di famiglia</span>
    </div>
  );
}
