import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { config } from '../../config.js';
import { encrypt, decrypt } from '../../lib/crypto.js';
import { HttpError } from '../../lib/errors.js';
import { dayString } from '../../lib/days.js';
import { authUrl, emailFromIdToken, exchangeCode, isConfigured, revokeToken, WRITE_SCOPE } from './google.client.js';
import { canWrite, listEvents, syncTasksLater } from './google.service.js';
import { eventToItem, isTimeZone, taskChangesFromEvent } from './mapping.js';

const router = Router();

const timeZone = z.string().refine(isTimeZone, 'Zona horaria inválida');
const connectQuery = z.object({ tz: timeZone.default('UTC'), today: dayString });
const callbackQuery = z.object({ code: z.string().optional(), state: z.string().optional(), error: z.string().optional() });
const eventsQuery = z.object({ timeMin: z.iso.datetime({ offset: true }), timeMax: z.iso.datetime({ offset: true }), tz: timeZone });
const settingsSchema = z.object({ syncTasks: z.boolean(), timeZone: timeZone.optional(), today: dayString });

function status(account) {
  return {
    configured: isConfigured(),
    connected: Boolean(account),
    email: account?.email ?? null,
    canWrite: account ? canWrite(account) : false,
    syncTasks: account?.syncTasks ?? false,
  };
}

// Envía a Google las tareas con hora de hoy en adelante (al activar la sincronización).
async function pushUpcomingTasks(userId, today) {
  const tasks = await prisma.task.findMany({
    where: { userId, parentId: null, status: { not: 'archived' }, dueDay: { gte: today }, dueTime: { not: null } },
    select: { id: true },
  });
  syncTasksLater(userId, ...tasks.map((t) => t.id));
}

router.get('/status', async (req, res) => {
  const account = await prisma.googleAccount.findUnique({ where: { userId: req.userId } });
  res.json(status(account));
});

// Navegación de página completa (no fetch): redirige a la pantalla de permisos de Google.
// Pide lectura y escritura a la vez para que el usuario acepte una sola vez.
router.get('/connect', (req, res) => {
  if (!isConfigured()) throw new HttpError(400, 'Google Calendar no está configurado en el servidor');
  const { tz, today } = connectQuery.parse(req.query);
  const state = jwt.sign({ sub: req.userId, tz, today }, config.jwtSecret, { expiresIn: '10m' });
  res.redirect(authUrl(state));
});

// Es una página que ve el usuario: los fallos se muestran en /calendario, no como JSON.
router.get('/callback', async (req, res) => {
  const { code, state, error } = callbackQuery.parse(req.query);
  if (error || !code || !state) return res.redirect('/calendario?google=cancelado');

  let payload;
  try {
    payload = jwt.verify(state, config.jwtSecret);
  } catch {
    return res.redirect('/calendario?google=caducado');
  }
  if (payload.sub !== req.userId) return res.redirect('/calendario?google=error');

  let tokens;
  try {
    tokens = await exchangeCode(code);
  } catch (err) {
    console.error('Google OAuth:', err.message);
    return res.redirect('/calendario?google=error');
  }
  const data = {
    email: tokens.id_token ? emailFromIdToken(tokens.id_token) : null,
    scope: tokens.scope ?? '',
    accessToken: encrypt(tokens.access_token),
    expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    timeZone: payload.tz,
    // Google solo devuelve refresh_token la primera vez (o con prompt=consent): no perder el anterior.
    ...(tokens.refresh_token && { refreshToken: encrypt(tokens.refresh_token) }),
  };
  // La sincronización de tareas se activa sola si Google concedió la escritura (el usuario puede desmarcarla).
  data.syncTasks = data.scope.split(' ').includes(WRITE_SCOPE);
  const before = await prisma.googleAccount.findUnique({ where: { userId: req.userId } });
  await prisma.googleAccount.upsert({
    where: { userId: req.userId },
    create: { ...data, userId: req.userId },
    update: data,
  });
  if (data.syncTasks && !before?.syncTasks && payload.today) await pushUpcomingTasks(req.userId, payload.today);
  res.redirect('/calendario?google=ok');
});

router.post('/disconnect', async (req, res) => {
  const account = await prisma.googleAccount.findUnique({ where: { userId: req.userId } });
  if (account) {
    await revokeToken(decrypt(account.refreshToken ?? account.accessToken));
    await prisma.googleAccount.delete({ where: { id: account.id } });
  }
  res.json(status(null));
});

router.patch('/settings', async (req, res) => {
  const { syncTasks, timeZone: tz, today } = settingsSchema.parse(req.body);
  const account = await prisma.googleAccount.findUnique({ where: { userId: req.userId } });
  if (!account) throw new HttpError(400, 'Primero conecta Google Calendar');
  if (syncTasks && !canWrite(account)) throw new HttpError(400, 'Falta el permiso de escritura en Google Calendar');

  const updated = await prisma.googleAccount.update({
    where: { id: account.id },
    data: { syncTasks, ...(tz && { timeZone: tz }) },
  });

  // Al activarlo, se envían las tareas con hora de hoy en adelante.
  if (syncTasks && !account.syncTasks) await pushUpcomingTasks(req.userId, today);
  res.json(status(updated));
});

/**
 * Eventos de Google en un rango. Los eventos que son tareas de Quest no se devuelven (ya se muestran como
 * tareas), pero si se movieron o renombraron en Google, la tarea se actualiza: sincronización bidireccional.
 */
router.get('/events', async (req, res) => {
  const { timeMin, timeMax, tz } = eventsQuery.parse(req.query);
  const account = await prisma.googleAccount.findUnique({ where: { userId: req.userId } });
  if (!account) return res.json({ events: [], tasksUpdated: 0 });

  const items = (await listEvents(account, timeMin, timeMax)).map((e) => eventToItem(e, tz));
  const linked = items.filter((i) => i.taskId);

  let tasksUpdated = 0;
  if (account.syncTasks && linked.length) {
    const tasks = await prisma.task.findMany({
      where: { userId: req.userId, id: { in: linked.map((i) => i.taskId) }, status: 'pending' },
    });
    for (const task of tasks) {
      const changes = taskChangesFromEvent(linked.find((i) => i.taskId === task.id), task);
      if (!changes) continue;
      await prisma.task.update({ where: { id: task.id }, data: changes });
      tasksUpdated++;
    }
  }

  res.json({ events: items.filter((i) => !i.taskId), tasksUpdated });
});

export default router;
