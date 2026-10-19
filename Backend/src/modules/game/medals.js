import { weekStart } from '../../lib/days.js';

// Medalla semanal (lunes → domingo) según los puntos de trabajo real de la semana: tareas, hábitos y pomodoros.
// Los bonus (logros, cofres) no cuentan: la medalla debe reflejar cómo fue la semana, no un premio puntual.
export const MEDALS = [
  { tier: 1, key: 'bronze', name: 'Bronce', minPoints: 20, honor: 1 },
  { tier: 2, key: 'silver', name: 'Plata', minPoints: 60, honor: 2 },
  { tier: 3, key: 'gold', name: 'Oro', minPoints: 120, honor: 3 },
  { tier: 4, key: 'platinum', name: 'Platino', minPoints: 200, honor: 4 },
  { tier: 5, key: 'diamond', name: 'Diamante', minPoints: 300, honor: 5 },
];

// El rango mide constancia: suma el honor de todas las medallas ganadas y nunca baja.
export const RANKS = [
  { key: 'novice', name: 'Novato', icon: 'sprout', minHonor: 0 },
  { key: 'explorer', name: 'Explorador', icon: 'compass', minHonor: 4 },
  { key: 'adventurer', name: 'Aventurero', icon: 'map', minHonor: 12 },
  { key: 'veteran', name: 'Veterano', icon: 'shield', minHonor: 30 },
  { key: 'master', name: 'Maestro', icon: 'swords', minHonor: 60 },
  { key: 'grandmaster', name: 'Gran Maestro', icon: 'crown', minHonor: 100 },
  { key: 'legend', name: 'Leyenda', icon: 'trophy', minHonor: 160 },
];

export function medalFor(points) {
  return MEDALS.findLast((m) => points >= m.minPoints) ?? null;
}

// Semanas con actividad (clave: su lunes), de la más antigua a la más reciente.
// @param rows [{ day, points }]
export function weeklyMedals(rows) {
  const byWeek = new Map();
  for (const r of rows) {
    const start = weekStart(r.day);
    byWeek.set(start, (byWeek.get(start) ?? 0) + r.points);
  }
  return [...byWeek]
    .filter(([, points]) => points > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([start, points]) => ({ start, points, tier: medalFor(points)?.tier ?? 0 }));
}

// Progreso de una semana hacia la siguiente medalla.
export function weekProgress(start, points) {
  const medal = medalFor(points);
  const next = MEDALS.find((m) => m.minPoints > points) ?? null;
  return {
    start,
    points,
    tier: medal?.tier ?? 0,
    minPoints: medal?.minPoints ?? 0,
    nextTier: next?.tier ?? null,
    nextMinPoints: next?.minPoints ?? null,
  };
}

export function honorOf(weeks) {
  return weeks.reduce((sum, w) => sum + (MEDALS.find((m) => m.tier === w.tier)?.honor ?? 0), 0);
}

export function honorRank(honor) {
  const current = RANKS.findLast((r) => honor >= r.minHonor);
  const next = RANKS.find((r) => r.minHonor > honor) ?? null;
  return { ...current, honor, nextName: next?.name ?? null, nextMinHonor: next?.minHonor ?? null };
}
