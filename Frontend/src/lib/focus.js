export const PRESETS = [
  { focus: 25, rest: 5, label: 'Clásico' },
  { focus: 50, rest: 10, label: 'Profundo' },
  { focus: 15, rest: 3, label: 'Arranque suave' },
];

// Igual que el backend (modules/pomodoros/points.js): 1 punto cada 5 min de foco.
export const pomodoroPoints = (minutes) => Math.floor(minutes / 5);

export function formatClock(ms) {
  const total = Math.ceil(ms / 1000);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}
