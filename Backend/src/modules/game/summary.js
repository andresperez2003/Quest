import { addDays, weekStart } from '../../lib/days.js';

/**
 * Resumen de una semana a partir de filas de ActivityLog y minutos de foco por día.
 * @param logs       [{ day, points, source }]
 * @param focusByDay Map<day, minutos>
 */
export function summarizeWeek(start, end, logs, focusByDay) {
  const inRange = logs.filter((l) => l.day >= start && l.day <= end);
  const perDay = new Map();
  for (const l of inRange) perDay.set(l.day, (perDay.get(l.day) ?? 0) + l.points);
  const best = [...perDay].sort((a, b) => b[1] - a[1])[0] ?? null;

  let focusMin = 0;
  const days = [];
  for (let d = start; d <= end; d = addDays(d, 1)) {
    focusMin += focusByDay.get(d) ?? 0;
    days.push({ day: d, points: perDay.get(d) ?? 0 });
  }

  return {
    start,
    end,
    points: inRange.reduce((sum, l) => sum + l.points, 0),
    activeDays: perDay.size,
    tasksDone: inRange.filter((l) => l.source === 'task').length,
    habitsDone: inRange.filter((l) => l.source === 'habit').length,
    focusMin,
    bestDay: best ? { day: best[0], points: best[1] } : null,
    days,
  };
}

// Semana en curso (lunes → hoy) y la semana anterior completa.
export function weekRanges(today) {
  const thisStart = weekStart(today);
  return { current: [thisStart, today], previous: [addDays(thisStart, -7), addDays(thisStart, -1)] };
}
