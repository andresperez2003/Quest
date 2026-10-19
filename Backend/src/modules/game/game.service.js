import { prisma } from '../../lib/prisma.js';
import { weekStart } from '../../lib/days.js';
import { ACHIEVEMENTS, newlyUnlocked, publicAchievement } from './achievements.js';
import { coinsFor, levelInfo } from './levels.js';
import { honorOf, honorRank, MEDALS, RANKS, weeklyMedals, weekProgress } from './medals.js';
import { bestStreak, currentStreak, freezeMilestone, gapToFreeze, MAX_FREEZES } from './streak.js';
import { dailySurprise } from './surprise.js';

// Fuentes que cuentan como "actividad propia" (los bonus no disparan el cofre sorpresa).
const EARNED_SOURCES = ['task', 'habit', 'pomodoro'];

async function totalXp(userId) {
  const { _sum } = await prisma.activityLog.aggregate({ where: { userId }, _sum: { points: true } });
  return _sum.points ?? 0;
}

// Crea un GameEvent (y opcionalmente sus puntos) solo si no existía. Idempotente ante dos sync a la vez.
async function award(userId, today, { kind, key, points = 0, source }) {
  const ops = [
    prisma.gameEvent.upsert({
      where: { userId_kind_key: { userId, kind, key } },
      create: { userId, kind, key, day: today, value: points },
      update: {},
    }),
  ];
  if (points > 0) {
    const sourceId = `${userId}:${key}`;
    ops.push(
      prisma.activityLog.upsert({
        where: { source_sourceId: { source, sourceId } },
        create: { userId, day: today, points, source, sourceId },
        update: {},
      }),
    );
  }
  const [event] = await prisma.$transaction(ops);
  return event;
}

/**
 * Recalcula todo el estado del juego a partir del historial y otorga lo que corresponda
 * (congeladores, logros, cofre sorpresa, medallas, rango). Devuelve el perfil y las novedades para celebrarlas.
 */
export async function syncGame(userId, today) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const events = await prisma.gameEvent.findMany({ where: { userId } });
  const news = [];

  const has = (kind, key) => events.some((e) => e.kind === kind && e.key === key);
  const count = (kind) => events.filter((e) => e.kind === kind).length;
  const freezesAvailable = () => count('freeze_earned') - count('freeze_used');
  const add = async (data) => events.push(await award(userId, today, data));

  // Todo el mundo empieza con un congelador: un mal día no debería borrar el progreso.
  if (!has('freeze_earned', 'welcome')) await add({ kind: 'freeze_earned', key: 'welcome' });

  const dayRows = await prisma.activityLog.groupBy({
    by: ['day'],
    where: { userId, day: { lte: today } },
    _sum: { points: true },
  });
  const active = new Set(dayRows.filter((r) => (r._sum.points ?? 0) > 0).map((r) => r.day));
  const frozen = new Set(events.filter((e) => e.kind === 'freeze_used').map((e) => e.key));

  const gap = gapToFreeze(active, frozen, today, freezesAvailable());
  for (const day of gap) {
    await add({ kind: 'freeze_used', key: day });
    frozen.add(day);
  }
  if (gap.length) news.push({ type: 'freeze_used', days: gap.length });

  const streak = currentStreak(active, frozen, today);
  const milestone = freezeMilestone(streak, freezesAvailable());
  if (milestone && !has('freeze_earned', milestone)) {
    await add({ kind: 'freeze_earned', key: milestone });
    news.push({ type: 'freeze_earned' });
  }

  const [tasksDone, habitsDone, pomodoros, focus, earnedToday] = await Promise.all([
    prisma.task.count({ where: { userId, parentId: null, status: 'done' } }),
    prisma.activityLog.count({ where: { userId, source: 'habit' } }),
    prisma.pomodoroSession.count({ where: { userId, completed: true } }),
    prisma.pomodoroSession.aggregate({ where: { userId }, _sum: { actualMin: true } }),
    prisma.activityLog.aggregate({
      where: { userId, day: today, source: { in: EARNED_SOURCES } },
      _sum: { points: true },
    }),
  ]);
  const todayPoints = earnedToday._sum.points ?? 0;
  const best = bestStreak(active, frozen);

  let xp = await totalXp(userId);
  const stats = { tasksDone, habitsDone, pomodoros, focusMin: focus._sum.actualMin ?? 0, bestStreak: best, level: levelInfo(xp).level };
  const unlocked = new Set(events.filter((e) => e.kind === 'achievement').map((e) => e.key));
  for (const a of newlyUnlocked(stats, unlocked)) {
    await add({ kind: 'achievement', key: a.key, points: a.points, source: 'achievement' });
    xp += a.points;
    news.push({ type: 'achievement', ...publicAchievement(a) });
  }

  if (!has('surprise', today)) {
    const surprise = dailySurprise(userId, today);
    if (todayPoints >= surprise.threshold) {
      await add({ kind: 'surprise', key: today, points: surprise.points, source: 'surprise' });
      xp += surprise.points;
      news.push({ type: 'surprise', points: surprise.points });
    }
  }

  const level = levelInfo(xp);
  if (level.level > user.level) news.push({ type: 'level_up', level: level.level });

  // Medallas: se recalculan desde el historial; los hitos solo se guardan para avisar una vez de cada subida.
  const earnedRows = await prisma.activityLog.groupBy({
    by: ['day'],
    where: { userId, day: { lte: today }, source: { in: EARNED_SOURCES } },
    _sum: { points: true },
  });
  const weeks = weeklyMedals(earnedRows.map((r) => ({ day: r.day, points: r._sum.points ?? 0 })));
  const thisWeek = weekStart(today);
  const week = weekProgress(thisWeek, weeks.find((w) => w.start === thisWeek)?.points ?? 0);

  const newMedals = MEDALS.filter((m) => m.tier <= week.tier && !has('medal', `${thisWeek}:${m.tier}`));
  for (const m of newMedals) await add({ kind: 'medal', key: `${thisWeek}:${m.tier}` });
  const topMedal = newMedals.at(-1);
  if (topMedal) news.push({ type: 'medal', key: `${thisWeek}:${topMedal.tier}`, tier: topMedal.tier, name: topMedal.name });

  const rank = honorRank(honorOf(weeks));
  const newRanks = RANKS.filter((r) => r.minHonor > 0 && r.minHonor <= rank.honor && !has('rank', r.key));
  for (const r of newRanks) await add({ kind: 'rank', key: r.key });
  const topRank = newRanks.at(-1);
  if (topRank) news.push({ type: 'rank_up', key: topRank.key, name: topRank.name, icon: topRank.icon });

  const coins = coinsFor(xp);
  const freezes = freezesAvailable();

  await prisma.user.update({ where: { id: userId }, data: { xp, level: level.level, coins, streakFreezes: freezes } });

  const unlockedDays = new Map(events.filter((e) => e.kind === 'achievement').map((e) => [e.key, e.day]));

  return {
    profile: {
      ...level,
      coins,
      todayPoints,
      streak: { current: streak.length, best, freezes, maxFreezes: MAX_FREEZES, frozenDays: [...frozen].sort().slice(-7) },
      week,
      rank,
    },
    weeks,
    achievements: ACHIEVEMENTS.map((a) => ({ ...publicAchievement(a), unlockedDay: unlockedDays.get(a.key) ?? null })),
    news,
  };
}
