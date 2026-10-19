// Días como texto "YYYY-MM-DD" (igual que el backend). La aritmética se hace en UTC para evitar líos de DST.

export function toDayString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function toDate(day) {
  return new Date(`${day}T00:00:00.000Z`);
}

export function addDays(day, n) {
  const d = toDate(day);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// Semanas de lunes a domingo.
export function weekStart(day) {
  return addDays(day, -((toDate(day).getUTCDay() + 6) % 7));
}

export function formatDay(day, options = { weekday: 'long', day: 'numeric', month: 'long' }) {
  return new Intl.DateTimeFormat('es', { ...options, timeZone: 'UTC' }).format(toDate(day));
}

export function monthStart(day) {
  return `${day.slice(0, 7)}-01`;
}

// Primer día del mes desplazado `n` meses.
export function addMonths(day, n) {
  const d = toDate(monthStart(day));
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 10);
}

// Instante real (hora local del navegador) de un día y hora: para temporizadores, avisos y la API de Google.
export function localDateTime(day, time = '00:00') {
  return new Date(`${day}T${time}:00`);
}

export function minutesOf(time) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function timeOf(minutes) {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}
