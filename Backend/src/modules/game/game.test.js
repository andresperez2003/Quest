import { test } from 'node:test';
import assert from 'node:assert/strict';
import { coinsFor, levelInfo, xpForLevel } from './levels.js';
import { bestStreak, currentStreak, freezeMilestone, gapToFreeze } from './streak.js';
import { newlyUnlocked } from './achievements.js';
import { honorOf, honorRank, medalFor, weekProgress, weeklyMedals } from './medals.js';
import { dailySurprise } from './surprise.js';
import { summarizeWeek, weekRanges } from './summary.js';

const TODAY = '2026-10-16'; // viernes
const set = (...days) => new Set(days);

test('curva de niveles', () => {
  assert.deepEqual([1, 2, 3, 4, 5].map(xpForLevel), [0, 50, 150, 300, 500]);
  assert.equal(levelInfo(0).level, 1);
  assert.equal(levelInfo(49).level, 1);
  assert.equal(levelInfo(50).level, 2);
  const l = levelInfo(200);
  assert.equal(l.level, 3);
  assert.equal(l.levelXp, 50);
  assert.equal(l.levelSize, 150);
  assert.equal(coinsFor(199), 19);
});

test('racha global: hoy sin actividad no la rompe', () => {
  const s = currentStreak(set('2026-10-14', '2026-10-15'), set(), TODAY);
  assert.equal(s.length, 2);
  assert.equal(s.start, '2026-10-14');
});

test('racha global: un día congelado mantiene la racha', () => {
  const s = currentStreak(set('2026-10-13', '2026-10-15', TODAY), set('2026-10-14'), TODAY);
  assert.equal(s.length, 4);
  assert.equal(bestStreak(set('2026-10-13', '2026-10-15', TODAY), set('2026-10-14')), 4);
});

test('congelador: cubre el hueco de ayer si hay racha detrás', () => {
  assert.deepEqual(gapToFreeze(set('2026-10-14'), set(), TODAY, 1), ['2026-10-15']);
  assert.deepEqual(gapToFreeze(set('2026-10-13'), set(), TODAY, 2), ['2026-10-15', '2026-10-14']);
});

test('congelador: no se gasta si el hueco no cabe, no hay racha o no hay hueco', () => {
  assert.deepEqual(gapToFreeze(set('2026-10-12'), set(), TODAY, 2), []); // hueco de 3
  assert.deepEqual(gapToFreeze(set(), set(), TODAY, 2), []); // sin racha que salvar
  assert.deepEqual(gapToFreeze(set('2026-10-15'), set(), TODAY, 2), []); // ayer hubo actividad
  assert.deepEqual(gapToFreeze(set('2026-10-14'), set(), TODAY, 0), []); // sin congeladores
});

test('congelador: se gana cada 7 días de racha, sin pasar del máximo', () => {
  assert.equal(freezeMilestone({ length: 6, start: '2026-10-10' }, 0), null);
  assert.equal(freezeMilestone({ length: 9, start: '2026-10-01' }, 1), '2026-10-01:7');
  assert.equal(freezeMilestone({ length: 14, start: '2026-10-01' }, 2), null);
});

test('logros: solo los nuevos que se cumplen', () => {
  const stats = { tasksDone: 12, habitsDone: 0, pomodoros: 0, focusMin: 0, bestStreak: 3, level: 1 };
  const keys = newlyUnlocked(stats, set('first_task')).map((a) => a.key);
  assert.deepEqual(keys, ['tasks_10', 'streak_3']);
});

test('medalla semanal: umbrales', () => {
  assert.equal(medalFor(19), null);
  assert.equal(medalFor(20).name, 'Bronce');
  assert.equal(medalFor(160).name, 'Oro');
  assert.equal(medalFor(5000).name, 'Diamante');
});

test('medalla semanal: agrupa por semana de lunes a domingo e ignora semanas vacías', () => {
  const rows = [
    { day: '2026-10-05', points: 100 }, // lunes
    { day: '2026-10-11', points: 60 }, // domingo de la misma semana
    { day: '2026-10-12', points: 85 },
    { day: '2026-09-28', points: 0 },
  ];
  assert.deepEqual(weeklyMedals(rows), [
    { start: '2026-10-05', points: 160, tier: 3 },
    { start: '2026-10-12', points: 85, tier: 2 },
  ]);
});

test('medalla semanal: progreso hacia la siguiente', () => {
  const p = weekProgress('2026-10-12', 85);
  assert.equal(p.tier, 2);
  assert.equal(p.minPoints, 60);
  assert.equal(p.nextTier, 3);
  assert.equal(p.nextMinPoints, 120);
  assert.equal(weekProgress('2026-10-12', 0).tier, 0);
  assert.equal(weekProgress('2026-10-12', 999).nextTier, null);
});

test('rango de honor: suma las medallas y sube por umbrales', () => {
  const honor = honorOf([{ tier: 3 }, { tier: 2 }, { tier: 0 }]);
  assert.equal(honor, 5);
  const r = honorRank(honor);
  assert.equal(r.name, 'Explorador');
  assert.equal(r.nextName, 'Aventurero');
  assert.equal(r.nextMinHonor, 12);
  assert.equal(honorRank(0).name, 'Novato');
  assert.equal(honorRank(9999).nextMinHonor, null);
});

test('cofre sorpresa: estable por usuario y día, dentro de rango', () => {
  const a = dailySurprise('user1', TODAY);
  assert.deepEqual(a, dailySurprise('user1', TODAY));
  for (let i = 1; i <= 28; i++) {
    const { threshold, points } = dailySurprise('user1', `2026-02-${String(i).padStart(2, '0')}`);
    assert.ok(threshold >= 20 && threshold <= 50);
    assert.ok([10, 15, 20, 25].includes(points));
  }
});

test('resumen semanal', () => {
  const { current, previous } = weekRanges(TODAY);
  assert.deepEqual(current, ['2026-10-12', TODAY]);
  assert.deepEqual(previous, ['2026-10-05', '2026-10-11']);
  const logs = [
    { day: '2026-10-12', points: 10, source: 'task' },
    { day: '2026-10-12', points: 10, source: 'habit' },
    { day: '2026-10-14', points: 5, source: 'pomodoro' },
    { day: '2026-10-08', points: 10, source: 'task' },
  ];
  const s = summarizeWeek(...current, logs, new Map([['2026-10-14', 25]]));
  assert.equal(s.points, 25);
  assert.equal(s.activeDays, 2);
  assert.equal(s.tasksDone, 1);
  assert.equal(s.focusMin, 25);
  assert.deepEqual(s.bestDay, { day: '2026-10-12', points: 20 });
  assert.equal(s.days.length, 5);
  assert.deepEqual(s.days[2], { day: '2026-10-14', points: 5 });
});
