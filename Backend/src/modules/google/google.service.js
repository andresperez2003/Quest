import { prisma } from '../../lib/prisma.js';
import { decrypt, encrypt } from '../../lib/crypto.js';
import { HttpError } from '../../lib/errors.js';
import { calendarRequest, refreshAccessToken, WRITE_SCOPE } from './google.client.js';
import { shouldHaveEvent, taskToEvent } from './mapping.js';

const CALENDAR = '/calendars/primary/events';
const EXPIRY_MARGIN_MS = 60_000;

export function canWrite(account) {
  return account.scope.split(' ').includes(WRITE_SCOPE);
}

export async function accessTokenFor(account) {
  if (account.expiresAt.getTime() > Date.now() + EXPIRY_MARGIN_MS) return decrypt(account.accessToken);
  if (!account.refreshToken) throw new HttpError(409, 'La conexión con Google caducó. Vuelve a conectar.');
  const tokens = await refreshAccessToken(decrypt(account.refreshToken));
  await prisma.googleAccount.update({
    where: { id: account.id },
    data: {
      accessToken: encrypt(tokens.access_token),
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      ...(tokens.scope && { scope: tokens.scope }),
    },
  });
  return tokens.access_token;
}

export async function listEvents(account, timeMin, timeMax) {
  const token = await accessTokenFor(account);
  const params = new URLSearchParams({ timeMin, timeMax, singleEvents: 'true', orderBy: 'startTime', maxResults: '250' });
  const data = await calendarRequest(token, 'GET', `${CALENDAR}?${params}`);
  return (data.items ?? []).filter((e) => e.status !== 'cancelled');
}

async function writableAccount(userId) {
  const account = await prisma.googleAccount.findUnique({ where: { userId } });
  return account?.syncTasks && canWrite(account) ? account : null;
}

// Crea, actualiza o borra el evento de una tarea para que refleje su estado actual.
async function syncTask(account, task) {
  const token = await accessTokenFor(account);
  const path = (id) => `${CALENDAR}/${encodeURIComponent(id)}`;

  if (!shouldHaveEvent(task)) {
    if (!task.googleEventId) return;
    await calendarRequest(token, 'DELETE', path(task.googleEventId)).catch((err) => {
      if (![404, 410].includes(err.googleStatus)) throw err;
    });
    await prisma.task.update({ where: { id: task.id }, data: { googleEventId: null } });
    return;
  }

  const body = taskToEvent(task, account.timeZone);
  if (task.googleEventId) {
    try {
      await calendarRequest(token, 'PATCH', path(task.googleEventId), body);
      return;
    } catch (err) {
      if (![404, 410].includes(err.googleStatus)) throw err; // lo borraron en Google: se vuelve a crear
    }
  }
  const created = await calendarRequest(token, 'POST', CALENDAR, body);
  await prisma.task.update({ where: { id: task.id }, data: { googleEventId: created.id } });
}

export async function syncTasks(userId, taskIds) {
  const account = await writableAccount(userId);
  if (!account || taskIds.length === 0) return;
  const tasks = await prisma.task.findMany({ where: { id: { in: taskIds }, userId } });
  for (const task of tasks) await syncTask(account, task);
}

// Borra eventos de tareas que ya no existen (p. ej. la instancia recurrente descartada al reabrir).
export async function deleteEvents(userId, eventIds) {
  const account = await writableAccount(userId);
  if (!account || eventIds.length === 0) return;
  const token = await accessTokenFor(account);
  for (const id of eventIds) {
    await calendarRequest(token, 'DELETE', `${CALENDAR}/${encodeURIComponent(id)}`).catch(() => {});
  }
}

// En segundo plano: la respuesta al usuario nunca espera a Google ni falla por su culpa.
export function syncTasksLater(userId, ...taskIds) {
  syncTasks(userId, taskIds.filter(Boolean)).catch((err) => console.error('Google Calendar:', err.message));
}

export function deleteEventsLater(userId, eventIds) {
  deleteEvents(userId, eventIds.filter(Boolean)).catch((err) => console.error('Google Calendar:', err.message));
}
