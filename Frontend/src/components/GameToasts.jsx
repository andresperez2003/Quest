import { useEffect } from 'react';
import { useGame } from '../game/GameContext.jsx';
import Icon from './Icon.jsx';

const DURATION_MS = 4500;

function message(n) {
  switch (n.type) {
    case 'achievement':
      return { icon: n.icon, title: `¡Logro: ${n.title}!`, detail: `${n.description} · +${n.points} XP` };
    case 'level_up':
      return { icon: 'chevrons-up', title: `¡Subiste al nivel ${n.level}!`, detail: 'Sigue así' };
    case 'surprise':
      return { icon: 'gift', title: '¡Cofre sorpresa!', detail: `+${n.points} XP por tu esfuerzo de hoy` };
    case 'medal':
      return { icon: 'medal', title: `¡Medalla de ${n.name} esta semana!`, detail: 'Cada punto extra cuenta para la siguiente' };
    case 'rank_up':
      return { icon: n.icon, title: `¡Nuevo rango: ${n.name}!`, detail: 'Tu constancia semana a semana da sus frutos' };
    case 'freeze_used':
      return { icon: 'snowflake', title: 'Racha a salvo', detail: `Un congelador cubrió ${n.days === 1 ? 'el día' : `${n.days} días`} sin actividad` };
    case 'freeze_earned':
      return { icon: 'snowflake', title: '¡Congelador ganado!', detail: 'Protegerá tu racha si un día no puedes' };
    default:
      return null;
  }
}

function Toast({ item, onDismiss }) {
  useEffect(() => {
    const id = setTimeout(() => onDismiss(item.id), DURATION_MS);
    return () => clearTimeout(id);
  }, [item.id, onDismiss]);

  const m = message(item);
  if (!m) return null;
  return (
    <button
      onClick={() => onDismiss(item.id)}
      className="pointer-events-auto flex w-full animate-sheet items-center gap-3 rounded-2xl border border-gold/40 bg-surface p-3 text-left shadow-lg shadow-black/40"
    >
      <span className="animate-pop text-3xl text-gold">
        <Icon name={m.icon} />
      </span>
      <span className="min-w-0">
        <span className="block font-semibold text-gold">{m.title}</span>
        <span className="block text-sm text-muted">{m.detail}</span>
      </span>
    </button>
  );
}

// Avisos de recompensa (logros, nivel, cofres, medallas, rango) en la parte superior.
export default function GameToasts() {
  const { toasts, dismiss } = useGame();
  return (
    <div className="pointer-events-none fixed inset-x-0 top-2 z-[60] mx-auto flex max-w-md flex-col gap-2 px-4" aria-live="polite">
      {toasts.slice(0, 3).map((t) => (
        <Toast key={t.id} item={t} onDismiss={dismiss} />
      ))}
    </div>
  );
}
