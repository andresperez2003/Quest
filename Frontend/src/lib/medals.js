import { addDays, monthStart, weekStart } from './dates.js';

// Mismos umbrales que Backend/src/modules/game/medals.js: el servidor decide la medalla, aquí solo se dibuja.
// Los colores del metal son propios de cada medalla (como los de las categorías), no tokens del tema.
export const MEDALS = [
  { tier: 1, name: 'Bronce', minPoints: 20, honor: 1, light: '#f3c49b', base: '#c27c45', dark: '#7a4a24', ribbon: '#b45309' },
  { tier: 2, name: 'Plata', minPoints: 60, honor: 2, light: '#f8fafc', base: '#b6c2cf', dark: '#64748b', ribbon: '#475569' },
  { tier: 3, name: 'Oro', minPoints: 120, honor: 3, light: '#fef9c3', base: '#facc15', dark: '#a16207', ribbon: '#dc2626' },
  { tier: 4, name: 'Platino', minPoints: 200, honor: 4, light: '#f0fdfa', base: '#5eead4', dark: '#0f766e', ribbon: '#4338ca' },
  { tier: 5, name: 'Diamante', minPoints: 300, honor: 5, light: '#f0f9ff', base: '#7dd3fc', dark: '#6366f1', ribbon: '#db2777' },
];

export function medalOf(tier) {
  return MEDALS.find((m) => m.tier === tier) ?? null;
}

// Una semana pertenece al mes en que cae su jueves (regla ISO): así ninguna cuenta en dos meses.
export function monthOfWeek(start) {
  return monthStart(addDays(start, 3));
}

// Lunes de las semanas de un mes (`month` es su primer día).
export function weeksOfMonth(month) {
  let start = weekStart(month);
  if (monthOfWeek(start) !== month) start = addDays(start, 7);
  const weeks = [];
  for (; monthOfWeek(start) === month; start = addDays(start, 7)) weeks.push(start);
  return weeks;
}
