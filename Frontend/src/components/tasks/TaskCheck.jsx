import { useCelebrate } from '../../hooks/useCelebrate.js';
import PointsBurst from '../PointsBurst.jsx';

// Círculo para completar, con el color de la prioridad y celebración al marcar.
export default function TaskCheck({ done, color, points, onToggle, size = 'size-7', label }) {
  const [celebrating, celebrate] = useCelebrate();

  function handleClick() {
    if (!done) celebrate();
    onToggle();
  }

  return (
    <span className="relative shrink-0">
      {celebrating && <PointsBurst points={points} />}
      <button
        onClick={handleClick}
        aria-pressed={done}
        aria-label={done ? `Desmarcar ${label}` : `Completar ${label}`}
        className={`grid ${size} place-items-center rounded-full border-2 text-sm font-bold transition ${celebrating ? 'animate-pop' : ''}`}
        style={done ? { background: color, borderColor: color, color: '#0f172a' } : { borderColor: color }}
      >
        {done ? '✓' : ''}
      </button>
    </span>
  );
}
