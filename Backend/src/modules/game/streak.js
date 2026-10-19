import { addDays } from '../../lib/days.js';

// Racha global: días seguidos con cualquier actividad. Un día "congelado" mantiene la racha.
export const MAX_FREEZES = 2;
export const STREAK_DAYS_PER_FREEZE = 7;

const counts = (active, frozen) => (day) => active.has(day) || frozen.has(day);

/**
 * @param active  Set de días con actividad
 * @param frozen  Set de días cubiertos por un congelador
 * Hoy sin actividad todavía no rompe la racha (se cuenta desde ayer).
 */
export function currentStreak(active, frozen, today) {
  const has = counts(active, frozen);
  let cursor = active.has(today) ? today : addDays(today, -1);
  let length = 0;
  while (has(cursor)) {
    length++;
    cursor = addDays(cursor, -1);
  }
  return { length, start: length ? addDays(cursor, 1) : null };
}

export function bestStreak(active, frozen) {
  const days = [...new Set([...active, ...frozen])].sort();
  let best = 0;
  let run = 0;
  let prev = null;
  for (const day of days) {
    run = prev && addDays(prev, 1) === day ? run + 1 : 1;
    best = Math.max(best, run);
    prev = day;
  }
  return best;
}

/**
 * Días sin actividad justo antes de hoy que se pueden cubrir con congeladores.
 * Solo si el hueco cabe entero en los disponibles y hay una racha detrás que salvar.
 */
export function gapToFreeze(active, frozen, today, available) {
  if (available <= 0) return [];
  const has = counts(active, frozen);
  const gap = [];
  let cursor = addDays(today, -1);
  while (!has(cursor) && gap.length <= available) {
    gap.push(cursor);
    cursor = addDays(cursor, -1);
  }
  if (gap.length === 0 || gap.length > available || !has(cursor)) return [];
  return gap;
}

// Cada 7 días de racha se gana un congelador (sin pasar del máximo). La clave evita darlo dos veces.
export function freezeMilestone(streak, available) {
  if (available >= MAX_FREEZES || streak.length < STREAK_DAYS_PER_FREEZE) return null;
  const milestone = Math.floor(streak.length / STREAK_DAYS_PER_FREEZE) * STREAK_DAYS_PER_FREEZE;
  return `${streak.start}:${milestone}`;
}
