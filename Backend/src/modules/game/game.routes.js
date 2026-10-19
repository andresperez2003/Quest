import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { dayString } from '../../lib/days.js';
import { syncGame } from './game.service.js';
import { summarizeWeek, weekRanges } from './summary.js';

const router = Router();

const todaySchema = z.object({ today: dayString });

// POST porque puede otorgar congeladores, logros y cofres. El cliente lo llama tras cada cambio.
router.post('/sync', async (req, res) => {
  const { today } = todaySchema.parse(req.body);
  res.json(await syncGame(req.userId, today));
});

router.get('/week', async (req, res) => {
  const { today } = todaySchema.parse(req.query);
  const { current, previous } = weekRanges(today);
  const where = { userId: req.userId, day: { gte: previous[0], lte: current[1] } };

  const [logs, focus] = await Promise.all([
    prisma.activityLog.findMany({ where, select: { day: true, points: true, source: true } }),
    prisma.pomodoroSession.groupBy({ by: ['day'], where, _sum: { actualMin: true } }),
  ]);
  const focusByDay = new Map(focus.map((f) => [f.day, f._sum.actualMin ?? 0]));

  res.json({
    current: summarizeWeek(...current, logs, focusByDay),
    previous: summarizeWeek(...previous, logs, focusByDay),
  });
});

export default router;
