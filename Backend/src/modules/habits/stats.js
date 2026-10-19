import { addDays, diffDays, weekStart } from '../../lib/days.js';

export const HABIT_POINTS = 10;

export function isDone(habit, value) {
  return value >= (habit.targetValue ?? 1);
}

/**
 * Los hábitos solo se registran el mismo día: nada de rellenar días pasados ni futuros.
 * `today` lo envía el cliente; `serverDay` (fecha UTC del servidor) acota ese "hoy" a ±1 día,
 * margen suficiente para cualquier zona horaria. Devuelve el mensaje de error o null.
 */
export function logDayError(day, today, serverDay) {
  if (diffDays(serverDay, today) > 1 || diffDays(today, serverDay) > 1) return 'La fecha de hoy no es válida';
  if (day !== today) return 'Solo puedes registrar los hábitos de hoy';
  return null;
}

// Cuenta periodos consecutivos cumplidos hacia atrás desde `current`.
// Si el periodo actual aún no se cumple, la racha no se rompe: se cuenta desde el anterior.
function countBack(isPeriodDone, current, step) {
  let cursor = isPeriodDone(current) ? current : step(current, -1);
  let count = 0;
  while (isPeriodDone(cursor)) {
    count++;
    cursor = step(cursor, -1);
  }
  return count;
}

function longestRun(sortedPeriods, step) {
  let best = 0;
  let run = 0;
  let prev = null;
  for (const p of sortedPeriods) {
    run = prev && step(prev, 1) === p ? run + 1 : 1;
    best = Math.max(best, run);
    prev = p;
  }
  return best;
}

const dayStep = (day, n) => addDays(day, n);
const weekStep = (week, n) => addDays(week, n * 7);

/**
 * @param habit  { frequency, targetCount, targetValue }
 * @param logs   [{ day, value }]
 * @param today  "YYYY-MM-DD"
 */
export function habitStats(habit, logs, today) {
  const doneDays = new Set(logs.filter((l) => isDone(habit, l.value)).map((l) => l.day));
  const todayValue = logs.find((l) => l.day === today)?.value ?? 0;

  if (habit.frequency === 'weekly') {
    const perWeek = new Map();
    for (const day of doneDays) {
      const w = weekStart(day);
      perWeek.set(w, (perWeek.get(w) ?? 0) + 1);
    }
    const weekDone = (w) => (perWeek.get(w) ?? 0) >= habit.targetCount;
    const thisWeek = weekStart(today);
    return {
      streak: countBack(weekDone, thisWeek, weekStep),
      bestStreak: longestRun([...perWeek.keys()].filter(weekDone).sort(), weekStep),
      streakUnit: 'weeks',
      todayValue,
      doneToday: isDone(habit, todayValue),
      periodProgress: perWeek.get(thisWeek) ?? 0,
      periodTarget: habit.targetCount,
    };
  }

  return {
    streak: countBack((d) => doneDays.has(d), today, dayStep),
    bestStreak: longestRun([...doneDays].sort(), dayStep),
    streakUnit: 'days',
    todayValue,
    doneToday: isDone(habit, todayValue),
    periodProgress: isDone(habit, todayValue) ? 1 : 0,
    periodTarget: 1,
  };
}
