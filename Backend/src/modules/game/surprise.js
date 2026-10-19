// Cofre sorpresa diario: al pasar un umbral de puntos que el usuario no conoce, recibe XP extra.
// Es pseudoaleatorio pero estable por (usuario, día), así no depende de cuántas veces se sincronice.

function fnv1a(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const PRIZES = [10, 15, 20, 25];

export function dailySurprise(userId, day) {
  const h = fnv1a(`${userId}:${day}`);
  return { threshold: 20 + (h % 31), points: PRIZES[(h >>> 8) % PRIZES.length] };
}
