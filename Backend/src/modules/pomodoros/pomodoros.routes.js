import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../lib/errors.js';
import { addDays, dayString } from '../../lib/days.js';
import { pomodoroPoints } from './points.js';

const router = Router();

const RECENT_DAYS = 7;

// La sesión se registra al terminar (o al pararla): el temporizador vive en el cliente.
const createSchema = z.object({
  day: dayString,
  plannedMin: z.int().min(1).max(180),
  actualMin: z.int().min(1).max(180),
  completed: z.boolean(),
  startedAt: z.iso.datetime().optional(),
  taskId: z.string().nullable().optional(),
  habitId: z.string().nullable().optional(),
});
const todayQuery = z.object({ today: dayString });

router.post('/', async (req, res) => {
  const { day, plannedMin, actualMin, completed, startedAt, taskId, habitId } = createSchema.parse(req.body);
  if (actualMin > plannedMin) throw new HttpError(400, 'El tiempo real no puede superar al planificado');
  if (taskId && !(await prisma.task.findFirst({ where: { id: taskId, userId: req.userId } }))) {
    throw new HttpError(400, 'Tarea inválida');
  }
  if (habitId && !(await prisma.habit.findFirst({ where: { id: habitId, userId: req.userId } }))) {
    throw new HttpError(400, 'Hábito inválido');
  }

  const points = pomodoroPoints(actualMin);
  const session = await prisma.$transaction(async (tx) => {
    const created = await tx.pomodoroSession.create({
      data: {
        day,
        durationMin: plannedMin,
        actualMin,
        completed,
        startedAt: startedAt ? new Date(startedAt) : undefined,
        taskId: taskId ?? null,
        habitId: habitId ?? null,
        userId: req.userId,
      },
    });
    if (points > 0) {
      await tx.activityLog.create({
        data: { userId: req.userId, day, points, source: 'pomodoro', sourceId: created.id },
      });
    }
    return created;
  });

  res.status(201).json({ session, points });
});

// Resumen para la pantalla de foco: hoy y los últimos 7 días.
router.get('/stats', async (req, res) => {
  const { today } = todayQuery.parse(req.query);
  const from = addDays(today, -(RECENT_DAYS - 1));
  const rows = await prisma.pomodoroSession.groupBy({
    by: ['day'],
    where: { userId: req.userId, day: { gte: from, lte: today } },
    _sum: { actualMin: true },
    _count: true,
  });
  const byDay = new Map(rows.map((r) => [r.day, r]));
  const completedToday = await prisma.pomodoroSession.count({
    where: { userId: req.userId, day: today, completed: true },
  });

  res.json({
    today: { minutes: byDay.get(today)?._sum.actualMin ?? 0, sessions: byDay.get(today)?._count ?? 0, completed: completedToday },
    recent: Array.from({ length: RECENT_DAYS }, (_, i) => {
      const day = addDays(from, i);
      return { day, minutes: byDay.get(day)?._sum.actualMin ?? 0 };
    }),
  });
});

export default router;
