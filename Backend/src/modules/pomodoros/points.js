// 1 punto por cada 5 minutos de foco real: un pomodoro de 25 min da 5. Parar antes también cuenta.
export const MIN_PER_POINT = 5;

export function pomodoroPoints(actualMin) {
  return Math.floor(Math.max(0, actualMin) / MIN_PER_POINT);
}
