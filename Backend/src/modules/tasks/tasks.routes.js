import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../lib/errors.js';
import { dayString } from '../../lib/days.js';
import { nextDueDay, recurrenceRule } from './recurrence.js';
import { suggestTasks } from './suggest.js';
import { deleteEventsLater, syncTasksLater } from '../google/google.service.js';

const router = Router();

export const TASK_POINTS = 10;
export const SUBTASK_POINTS = 2;

const taskFields = {
  title: z.string().trim().min(1).max(200),
  notes: z.string().trim().max(2000).nullable(),
  categoryId: z.string().nullable(),
  priority: z.int().min(1).max(3),
  energy: z.enum(['low', 'medium', 'high']).nullable(),
  dueDay: dayString.nullable(),
  dueTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Hora inválida (HH:MM)').nullable(),
  estimatedMin: z.int().min(1).max(1440).nullable(),
  recurrence: recurrenceRule.nullable(),
};

const createSchema = z.object(taskFields).partial().extend({
  title: taskFields.title,
  parentId: z.string().optional(),
});
const updateSchema = z.object(taskFields).partial();
const todaySchema = z.object({ today: dayString });
const listQuery = z.object({
  view: z.enum(['today', 'inbox', 'upcoming', 'range']),
  today: dayString,
  from: dayString.optional(),
  to: dayString.optional(),
});
const suggestQuery = z.object({
  today: dayString,
  energy: z.enum(['low', 'medium', 'high']).optional(),
  minutes: z.coerce.number().int().positive().optional(),
});

const include = {
  category: true,
  subtasks: { where: { status: { not: 'archived' } }, orderBy: { createdAt: 'asc' } },
};

async function findTask(userId, id) {
  const task = await prisma.task.findFirst({ where: { id, userId, status: { not: 'archived' } } });
  if (!task) throw new HttpError(404, 'Tarea no encontrada');
  return task;
}

async function assertCategory(userId, categoryId) {
  if (!categoryId) return;
  const found = await prisma.category.findFirst({ where: { id: categoryId, userId } });
  if (!found) throw new HttpError(400, 'Categoría inválida');
}

// Reglas entre campos, aplicadas sobre el estado final de la tarea.
function normalize(task) {
  if (!task.dueDay) task.dueTime = null;
  if (task.parentId) task.recurrence = null; // las subtareas no se repiten solas
  if (task.recurrence && !task.dueDay) throw new HttpError(400, 'Una tarea recurrente necesita fecha');
  return task;
}

// Minutos de foco (pomodoros) acumulados por tarea, para comparar estimado vs. real.
async function withFocus(userId, tasks) {
  const rows = await prisma.pomodoroSession.groupBy({
    by: ['taskId'],
    where: { userId, taskId: { in: tasks.map((t) => t.id) } },
    _sum: { actualMin: true },
  });
  const byTask = new Map(rows.map((r) => [r.taskId, r._sum.actualMin ?? 0]));
  return tasks.map((t) => ({ ...t, focusMin: byTask.get(t.id) ?? 0 }));
}

// Pendientes primero; luego por fecha (las atrasadas quedan arriba), prioridad, hora y antigüedad.
function compareTasks(a, b) {
  return (
    (a.status === 'done') - (b.status === 'done') ||
    (a.dueDay ?? '9999-99-99').localeCompare(b.dueDay ?? '9999-99-99') ||
    a.priority - b.priority ||
    (a.dueTime ?? '99:99').localeCompare(b.dueTime ?? '99:99') ||
    a.createdAt - b.createdAt
  );
}

router.get('/', async (req, res) => {
  const { view, today, from, to } = listQuery.parse(req.query);
  const where = { userId: req.userId, parentId: null };

  if (view === 'today') {
    where.OR = [
      { status: 'pending', dueDay: { lte: today } },
      { status: 'done', completedDay: today },
    ];
  } else if (view === 'range') {
    if (!from || !to || from > to) throw new HttpError(400, 'Rango de días inválido');
    Object.assign(where, { status: { in: ['pending', 'done'] }, dueDay: { gte: from, lte: to } });
  } else if (view === 'inbox') {
    Object.assign(where, { status: 'pending', dueDay: null });
  } else {
    Object.assign(where, { status: 'pending', dueDay: { gt: today } });
  }

  const tasks = await prisma.task.findMany({ where, include });
  res.json({ tasks: (await withFocus(req.userId, tasks)).sort(compareTasks) });
});

router.get('/suggest', async (req, res) => {
  const { today, energy, minutes } = suggestQuery.parse(req.query);
  const tasks = await prisma.task.findMany({
    where: {
      userId: req.userId,
      parentId: null,
      status: 'pending',
      OR: [{ dueDay: null }, { dueDay: { lte: today } }],
    },
    include,
  });
  res.json({ suggestions: suggestTasks(tasks, { today, energy, minutes }) });
});

router.get('/:id', async (req, res) => {
  const { id } = await findTask(req.userId, req.params.id);
  const task = await prisma.task.findUnique({ where: { id }, include });
  const [withMinutes] = await withFocus(req.userId, [task]);
  res.json({ task: withMinutes });
});

router.post('/', async (req, res) => {
  const { parentId, ...data } = createSchema.parse(req.body);
  await assertCategory(req.userId, data.categoryId);

  if (parentId) {
    const parent = await findTask(req.userId, parentId);
    if (parent.parentId) throw new HttpError(400, 'Las subtareas no pueden tener subtareas');
  }

  const task = await prisma.task.create({
    data: { ...normalize({ ...data, parentId }), userId: req.userId },
    include,
  });
  if (!parentId) syncTasksLater(req.userId, task.id);
  res.status(201).json({ task });
});

router.patch('/:id', async (req, res) => {
  const current = await findTask(req.userId, req.params.id);
  const changes = updateSchema.parse(req.body);
  await assertCategory(req.userId, changes.categoryId);

  const merged = normalize({ ...current, ...changes });
  const data = Object.fromEntries(Object.keys(taskFields).map((k) => [k, merged[k]]));
  const task = await prisma.task.update({ where: { id: current.id }, data, include });
  syncTasksLater(req.userId, task.id);
  res.json({ task });
});

router.post('/:id/complete', async (req, res) => {
  const task = await findTask(req.userId, req.params.id);
  const { today } = todaySchema.parse(req.body);
  if (task.status === 'done') return res.json({ task, points: 0, next: null });

  const points = task.parentId ? SUBTASK_POINTS : TASK_POINTS;

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.task.update({
      where: { id: task.id },
      data: { status: 'done', completedDay: today, completedAt: new Date() },
      include,
    });
    await tx.activityLog.upsert({
      where: { source_sourceId: { source: 'task', sourceId: task.id } },
      create: { userId: req.userId, day: today, points, source: 'task', sourceId: task.id },
      update: {},
    });

    // Recurrente: crea la siguiente instancia con sus subtareas sin completar.
    let next = null;
    if (task.recurrence && !task.parentId) {
      const { title, notes, categoryId, priority, energy, dueTime, estimatedMin, recurrence } = task;
      next = await tx.task.create({
        data: {
          title, notes, categoryId, priority, energy, dueTime, estimatedMin, recurrence,
          dueDay: nextDueDay(task.recurrence, task.dueDay, today),
          spawnedFromId: task.id,
          userId: req.userId,
          subtasks: {
            create: updated.subtasks.map((s) => ({ title: s.title, userId: req.userId })),
          },
        },
      });
    }
    return { task: updated, next };
  });

  syncTasksLater(req.userId, result.task.id, result.next?.id);
  res.json({ ...result, points });
});

// Deshacer: devuelve la tarea a pendiente, retira los puntos y la siguiente instancia recurrente (si no se tocó).
router.post('/:id/reopen', async (req, res) => {
  const task = await findTask(req.userId, req.params.id);
  const spawnedWhere = { spawnedFromId: task.id, status: 'pending', userId: req.userId };
  const { updated, discarded } = await prisma.$transaction(async (tx) => {
    await tx.activityLog.deleteMany({ where: { source: 'task', sourceId: task.id } });
    const discarded = await tx.task.findMany({ where: spawnedWhere, select: { googleEventId: true } });
    await tx.task.deleteMany({ where: spawnedWhere });
    const updated = await tx.task.update({
      where: { id: task.id },
      data: { status: 'pending', completedDay: null, completedAt: null },
      include,
    });
    return { updated, discarded };
  });
  syncTasksLater(req.userId, task.id);
  deleteEventsLater(req.userId, discarded.map((t) => t.googleEventId));
  res.json({ task: updated });
});

// Archivar: desaparece de las listas pero los puntos ya ganados se conservan.
router.delete('/:id', async (req, res) => {
  const task = await findTask(req.userId, req.params.id);
  await prisma.task.update({ where: { id: task.id }, data: { status: 'archived' } });
  syncTasksLater(req.userId, task.id);
  res.status(204).end();
});

export default router;
