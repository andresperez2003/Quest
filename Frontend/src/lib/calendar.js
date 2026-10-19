import { addDays, addMonths, formatDay, minutesOf, monthStart, weekStart } from './dates.js';
import { priorityOf } from './tasks.js';

// Duración por defecto de una tarea sin estimación al ponerla en el calendario (igual que el backend).
export const DEFAULT_BLOCK_MIN = 30;
// Altura mínima de un bloque, en minutos: una franja, para que nunca invada la siguiente.
const VISUAL_MIN = 15;

export const CALENDAR_VIEWS = [
  { value: 'day', label: 'Día' },
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mes' },
];

export function rangeFor(view, cursor) {
  if (view === 'day') return { from: cursor, to: cursor };
  if (view === 'week') {
    const from = weekStart(cursor);
    return { from, to: addDays(from, 6) };
  }
  // Mes: semanas completas, para rellenar la cuadrícula.
  const last = addDays(addMonths(cursor, 1), -1);
  return { from: weekStart(monthStart(cursor)), to: addDays(weekStart(last), 6) };
}

export function shiftCursor(view, cursor, direction) {
  if (view === 'day') return addDays(cursor, direction);
  if (view === 'week') return addDays(cursor, 7 * direction);
  return addMonths(cursor, direction);
}

export function rangeLabel(view, cursor) {
  if (view === 'day') return formatDay(cursor);
  if (view === 'week') {
    const { from, to } = rangeFor('week', cursor);
    const short = { day: 'numeric', month: 'short' };
    return `${formatDay(from, short)} – ${formatDay(to, short)}`;
  }
  return formatDay(monthStart(cursor), { month: 'long', year: 'numeric' });
}

/**
 * Une tareas y eventos de Google en "bloques" { kind, id, title, day, time, durationMin, color, done, task | event }.
 * Los eventos de día completo que abarcan varios días se repiten en cada uno.
 */
export function toItems(tasks, events, range) {
  const items = tasks.map((task) => ({
    kind: 'task',
    id: task.id,
    title: task.title,
    day: task.dueDay,
    time: task.dueTime,
    durationMin: task.estimatedMin ?? DEFAULT_BLOCK_MIN,
    color: task.category?.color ?? priorityOf(task.priority).color,
    done: task.status === 'done',
    task,
  }));
  for (const event of events) {
    const base = { kind: 'event', title: event.title, color: 'var(--color-event)', done: false, event };
    if (event.allDay) {
      const first = event.startDay < range.from ? range.from : event.startDay;
      for (let d = first; d <= event.endDay && d <= range.to; d = addDays(d, 1)) {
        items.push({ ...base, id: `${event.id}:${d}`, day: d, time: null, durationMin: null });
      }
    } else {
      items.push({ ...base, id: event.id, day: event.startDay, time: event.startTime, durationMin: event.durationMin });
    }
  }
  return items;
}

// Map<día, bloques>: primero los de todo el día, luego por hora.
export function groupByDay(items) {
  const byDay = new Map();
  for (const item of items) byDay.set(item.day, [...(byDay.get(item.day) ?? []), item]);
  for (const list of byDay.values()) {
    list.sort((a, b) => (a.time ?? '').localeCompare(b.time ?? '') || a.done - b.done);
  }
  return byDay;
}

/**
 * Reparte en columnas los bloques con hora que se solapan.
 * Devuelve [{ item, start, end, lane, lanes }] con start/end en minutos desde medianoche.
 */
export function layoutTimed(items) {
  const sorted = [...items].sort((a, b) => minutesOf(a.time) - minutesOf(b.time) || b.durationMin - a.durationMin);
  const result = [];
  let cluster = [];
  let clusterEnd = -1;

  const flush = () => {
    const lanes = Math.max(...cluster.map((c) => c.lane)) + 1;
    for (const c of cluster) result.push({ ...c, lanes });
    cluster = [];
  };

  for (const item of sorted) {
    const start = minutesOf(item.time);
    const end = start + Math.max(item.durationMin ?? DEFAULT_BLOCK_MIN, VISUAL_MIN);
    if (cluster.length && start >= clusterEnd) flush();
    const used = new Set(cluster.filter((c) => c.end > start).map((c) => c.lane));
    let lane = 0;
    while (used.has(lane)) lane++;
    cluster.push({ item, start, end, lane });
    clusterEnd = cluster.length === 1 ? end : Math.max(clusterEnd, end);
  }
  if (cluster.length) flush();
  return result;
}
