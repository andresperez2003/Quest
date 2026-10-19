// Conversión entre eventos de Google Calendar y tareas de Quest (funciones puras).
// La zona horaria la manda el cliente: el servidor nunca deduce la hora local.
import { addDays } from '../../lib/days.js';

export const DEFAULT_EVENT_MIN = 30;
const DONE_PREFIX = '✅ ';

export function isTimeZone(tz) {
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

// Día y hora locales ("YYYY-MM-DD", "HH:MM") de un instante en una zona horaria.
export function localParts(dateTime, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(dateTime));
  const get = (type) => parts.find((p) => p.type === type).value;
  return { day: `${get('year')}-${get('month')}-${get('day')}`, time: `${get('hour')}:${get('minute')}` };
}

const hhmm = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

export function eventToItem(event, timeZone) {
  const allDay = Boolean(event.start?.date);
  // En Google, el fin de un evento de día completo es exclusivo.
  const start = allDay ? { day: event.start.date, time: null } : localParts(event.start.dateTime, timeZone);
  const end = allDay ? { day: addDays(event.end.date, -1), time: null } : localParts(event.end.dateTime, timeZone);
  return {
    id: event.id,
    title: event.summary || '(Sin título)',
    allDay,
    startDay: start.day,
    startTime: start.time,
    endDay: end.day,
    endTime: end.time,
    durationMin: allDay ? null : Math.round((Date.parse(event.end.dateTime) - Date.parse(event.start.dateTime)) / 60_000),
    htmlLink: event.htmlLink ?? null,
    taskId: event.extendedProperties?.private?.questTaskId ?? null,
  };
}

// Solo las tareas con fecha y hora se convierten en eventos (time-blocking).
export function taskToEvent(task, timeZone) {
  const [h, m] = task.dueTime.split(':').map(Number);
  const endTotal = h * 60 + m + (task.estimatedMin ?? DEFAULT_EVENT_MIN);
  const endDay = addDays(task.dueDay, Math.floor(endTotal / 1440));
  return {
    summary: task.status === 'done' ? `${DONE_PREFIX}${task.title}` : task.title,
    description: [task.notes, 'Creado desde Quest'].filter(Boolean).join('\n\n'),
    start: { dateTime: `${task.dueDay}T${task.dueTime}:00`, timeZone },
    end: { dateTime: `${endDay}T${hhmm(endTotal % 1440)}:00`, timeZone },
    extendedProperties: { private: { questTaskId: task.id } },
  };
}

export function shouldHaveEvent(task) {
  return task.status !== 'archived' && !task.parentId && Boolean(task.dueDay && task.dueTime);
}

// Cambios a aplicar en la tarea si su evento se movió o renombró en Google. null = nada que hacer.
export function taskChangesFromEvent(item, task) {
  if (item.allDay) return null;
  const changes = {};
  if (item.startDay !== task.dueDay) changes.dueDay = item.startDay;
  if (item.startTime !== task.dueTime) changes.dueTime = item.startTime;
  const duration = Math.min(1440, Math.max(1, item.durationMin));
  if (duration !== (task.estimatedMin ?? DEFAULT_EVENT_MIN)) changes.estimatedMin = duration;
  const title = item.title.startsWith(DONE_PREFIX) ? item.title.slice(DONE_PREFIX.length) : item.title;
  if (title.trim() && title !== task.title) changes.title = title.trim().slice(0, 200);
  return Object.keys(changes).length ? changes : null;
}
