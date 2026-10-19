import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { dayString } from '../../lib/days.js';

const router = Router();

const rangeQuery = z.object({ from: dayString, to: dayString });

// Puntos por día en un rango: los datos del mapa de calor global.
router.get('/heatmap', async (req, res) => {
  const { from, to } = rangeQuery.parse(req.query);
  const rows = await prisma.activityLog.groupBy({
    by: ['day'],
    where: { userId: req.userId, day: { gte: from, lte: to } },
    _sum: { points: true },
    _count: true,
    orderBy: { day: 'asc' },
  });
  res.json({
    days: rows.map((r) => ({ day: r.day, points: r._sum.points ?? 0, count: r._count })),
  });
});

export default router;
