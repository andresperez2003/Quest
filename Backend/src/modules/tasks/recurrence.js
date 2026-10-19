import { z } from 'zod';
import { addDays } from '../../lib/days.js';

// daily | weekdays | monthly | weekly:1,3,5  (1 = lunes ... 7 = domingo)
export const recurrenceRule = z
  .string()
  .regex(/^(daily|weekdays|monthly|weekly:[1-7](,[1-7])*)$/, 'Regla de recurrencia inválida');

function isoWeekday(day) {
  return ((new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7) + 1;
}

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate(); // month: 1-12
}

function matches(rule, day) {
  if (rule === 'daily') return true;
  if (rule === 'weekdays') return isoWeekday(day) <= 5;
  const days = rule.slice('weekly:'.length).split(',').map(Number);
  return days.includes(isoWeekday(day));
}

function nextMonthly(anchorDay, after) {
  const dom = Number(anchorDay.slice(8, 10));
  let year = Number(after.slice(0, 4));
  let month = Number(after.slice(5, 7));
  for (;;) {
    const d = Math.min(dom, daysInMonth(year, month)); // el 31 cae en el último día de meses cortos
    const candidate = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    if (candidate > after) return candidate;
    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
  }
}

/**
 * Próxima fecha de una tarea recurrente al completarla.
 * Si estaba atrasada, salta a la primera ocurrencia posterior a hoy (no se acumulan atrasos).
 */
export function nextDueDay(rule, dueDay, today) {
  const anchor = dueDay ?? today;
  const after = anchor > today ? anchor : today;
  if (rule === 'monthly') return nextMonthly(anchor, after);
  let cursor = addDays(after, 1);
  while (!matches(rule, cursor)) cursor = addDays(cursor, 1);
  return cursor;
}
