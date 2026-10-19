export default function ProgressBar({ value, max, className = 'bg-accent', height = 'h-2.5' }) {
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 1;
  return (
    <div className={`${height} overflow-hidden rounded-full bg-bg`}>
      <div className={`h-full rounded-full transition-all duration-700 ${className}`} style={{ width: `${ratio * 100}%` }} />
    </div>
  );
}
