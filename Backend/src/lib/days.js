// Los días se manejan como texto "YYYY-MM-DD" en la zona horaria del usuario.
// El cliente envía su "hoy"; aquí solo se hace aritmética de calendario (en UTC para evitar DST).
import { z } from 'zod';

export const dayString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de día inválido (YYYY-MM-DD)')
  .refine((s) => toDate(s).toISOString().startsWith(s), 'Día inexistente');

function toDate(day) {
  return new Date(`${day}T00:00:00.000Z`);
}

export function addDays(day, n) {
  const d = toDate(day);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// Las semanas empiezan en lunes.
export function weekStart(day) {
  const dow = (toDate(day).getUTCDay() + 6) % 7;
  return addDays(day, -dow);
}

export function diffDays(from, to) {
  return Math.round((toDate(to) - toDate(from)) / 86_400_000);
}
