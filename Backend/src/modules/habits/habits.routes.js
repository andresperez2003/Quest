import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../lib/errors.js';
import { addDays, dayString } from '../../lib/days.js';
import { HABIT_POINTS, habitStats, isDone, logDayError } from './stats.js';

const router = Router();

const RECENT_DAYS = 7;

const habitFields = {
  name: z.string().trim().min(1).max(60),
  icon: z.string().trim().min(1).max(30), // nombre de ícono de Lucide (o emoji en datos antiguos)
  categoryId: z.string().nullable(),
  frequency: z.enum(['daily', 'weekly']),
  targetCount: z.int().min(1).max(7),
  unit: z.string().trim().max(20).nullable(),
  targetValue: z.int().min(1).max(100000).nullable(),
};

const createSchema = z.object({
  ...habitFields,
  icon: habitFields.icon.default('circle-check'),
  categoryId: habitFields.categoryId.optional(),
  frequency: habitFields.frequency.default('daily'),
  targetCount: habitFields.targetCount.default(1),
  unit: habitFields.unit.optional(),
  targetValue: habitFields.targetValue.optional(),
});

const updateSchema = z.object(habitFields).partial();

const todayQuery = z.object({ today: dayString });
const rangeQuery = z.object({ from: dayString, to: dayString });
const logSchema = z.object({ value: z.int().min(0).max(100000), today: dayString });

async function findHabit(userId, id) {
  const habit = await prisma.habit.findFirst({ where: { id, userId } });
  if (!habit) throw new HttpError(404, 'Hábito no encontrado');
  return habit;
}

async function assertCategory(userId, categoryId) {
  if (!categoryId) return;
  const found = await prisma.category.findFirst({ where: { id: categoryId, userId } });
  if (!found) throw new HttpError(400, 'Categoría inválida');
}

function normalize(data) {
  // Un hábito diario siempre es "1 vez por día"; sin meta numérica no tiene unidad.
  if (data.frequency === 'daily') data.targetCount = 1;
  if (data.targetValue === null) data.unit = null;
  return data;
}

// Lista de hábitos activos con sus estadísticas y los últimos 7 días.
router.get('/', async (req, res) => {
  const { today } = todayQuery.parse(req.query);
  const habits = await prisma.habit.findMany({
    where: { userId: req.userId, archived: false },
    include: { logs: { select: { day: true, value: true } }, category: true },
    orderBy: { createdAt: 'asc' },
  });

  const recentDays = Array.from({ length: RECENT_DAYS }, (_, i) => addDays(today, i - RECENT_DAYS + 1));

  res.json({
    habits: habits.map(({ logs, ...habit }) => {
      const byDay = new Map(logs.map((l) => [l.day, l.value]));
      return {
        ...habit,
        stats: habitStats(habit, logs, today),
        recent: recentDays.map((day) => ({ day, value: byDay.get(day) ?? 0 })),
      };
    }),
  });
});

router.post('/', async (req, res) => {
  const data = normalize(createSchema.parse(req.body));
  await assertCategory(req.userId, data.categoryId);
  const habit = await prisma.habit.create({ data: { ...data, userId: req.userId } });
  res.status(201).json({ habit });
});

router.patch('/:id', async (req, res) => {
  const current = await findHabit(req.userId, req.params.id);
  const data = normalize({ ...current, ...updateSchema.parse(req.body) });
  await assertCategory(req.userId, data.categoryId);
  const { name, icon, categoryId, frequency, targetCount, unit, targetValue } = data;
  const habit = await prisma.habit.update({
    where: { id: current.id },
    data: { name, icon, categoryId, frequency, targetCount, unit, targetValue },
  });
  res.json({ habit });
});

// Archivar en vez de borrar: el historial sigue contando en el mapa de calor.
router.delete('/:id', async (req, res) => {
  const habit = await findHabit(req.userId, req.params.id);
  await prisma.habit.update({ where: { id: habit.id }, data: { archived: true } });
  res.status(204).end();
});

router.get('/:id/logs', async (req, res) => {
  const habit = await findHabit(req.userId, req.params.id);
  const { from, to } = rangeQuery.parse(req.query);
  const logs = await prisma.habitLog.findMany({
    where: { habitId: habit.id, day: { gte: from, lte: to } },
    select: { day: true, value: true },
    orderBy: { day: 'asc' },
  });
  res.json({ logs });
});

// Registra el valor de hoy (0 lo borra). Otorga o retira los puntos de actividad.
router.put('/:id/logs/:day', async (req, res) => {
  const habit = await findHabit(req.userId, req.params.id);
  const day = dayString.parse(req.params.day);
  const { value, today } = logSchema.parse(req.body);

  const error = logDayError(day, today, new Date().toISOString().slice(0, 10));
  if (error) throw new HttpError(400, error);

  const sourceId = `${habit.id}:${day}`;
  const where = { habitId_day: { habitId: habit.id, day } };

  const log = await prisma.$transaction(async (tx) => {
    const saved =
      value === 0
        ? await tx.habitLog.deleteMany({ where: { habitId: habit.id, day } }).then(() => null)
        : await tx.habitLog.upsert({ where, create: { habitId: habit.id, day, value }, update: { value } });

    if (isDone(habit, value)) {
      await tx.activityLog.upsert({
        where: { source_sourceId: { source: 'habit', sourceId } },
        create: { userId: req.userId, day, points: HABIT_POINTS, source: 'habit', sourceId },
        update: {},
      });
    } else {
      await tx.activityLog.deleteMany({ where: { source: 'habit', sourceId } });
    }
    return saved;
  });

  res.json({ log, done: isDone(habit, value), points: isDone(habit, value) ? HABIT_POINTS : 0 });
});

export default router;
