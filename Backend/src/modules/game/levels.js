// XP total = suma de puntos de ActivityLog. Las monedas se derivan de la XP (las gastará la tienda de la Fase 6).
export const XP_PER_COIN = 10;

// XP acumulada necesaria para llegar a `level`: 0, 50, 150, 300, 500, 750...
export function xpForLevel(level) {
  return 25 * level * (level - 1);
}

export function levelInfo(xp) {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  const floor = xpForLevel(level);
  return { level, xp, levelXp: xp - floor, levelSize: xpForLevel(level + 1) - floor };
}

export function coinsFor(xp) {
  return Math.floor(xp / XP_PER_COIN);
}
