import { addDays, formatDay } from './dates.js';

export const TASK_POINTS = 10;
export const SUBTASK_POINTS = 2;

export const PRIORITIES = [
  { value: 1, label: 'Alta', color: '#ef4444' },
  { value: 2, label: 'Media', color: '#f59e0b' },
  { value: 3, label: 'Baja', color: '#64748b' },
];

export const ENERGIES = [
  { value: 'low', label: 'Baja', icon: 'battery-low' },
  { value: 'medium', label: 'Media', icon: 'battery-medium' },
  { value: 'high', label: 'Alta', icon: 'zap' },
];

export const WEEKDAYS = [
  { value: 1, label: 'L' },
  { value: 2, label: 'M' },
  { value: 3, label: 'X' },
  { value: 4, label: 'J' },
  { value: 5, label: 'V' },
  { value: 6, label: 'S' },
  { value: 7, label: 'D' },
];

export const priorityOf = (p) => PRIORITIES.find((x) => x.value === p) ?? PRIORITIES[1];
export const energyOf = (e) => ENERGIES.find((x) => x.value === e);

export function recurrenceLabel(rule) {
  if (!rule) return null;
  if (rule === 'daily') return 'Cada día';
  if (rule === 'weekdays') return 'Lunes a viernes';
  if (rule === 'monthly') return 'Cada mes';
  const days = rule.slice('weekly:'.length).split(',').map(Number);
  return `Cada ${days.map((d) => WEEKDAYS[d - 1].label).join(', ')}`;
}

// "Hoy", "Mañana", "Ayer", o la fecha corta. `overdue` para pintarla en rojo.
export function dueLabel(dueDay, today) {
  if (!dueDay) return null;
  const overdue = dueDay < today;
  let text;
  if (dueDay === today) text = 'Hoy';
  else if (dueDay === addDays(today, 1)) text = 'Mañana';
  else if (dueDay === addDays(today, -1)) text = 'Ayer';
  else text = formatDay(dueDay, { weekday: 'short', day: 'numeric', month: 'short' });
  return { text, overdue };
}

export function formatMinutes(min) {
  if (!min) return null;
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}
