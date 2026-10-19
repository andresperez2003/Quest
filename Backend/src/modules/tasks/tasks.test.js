import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextDueDay, recurrenceRule } from './recurrence.js';
import { suggestTasks } from './suggest.js';

// 2026-10-12 es lunes.
const TODAY = '2026-10-12';

test('diaria: al completarla hoy pasa a mañana', () => {
  assert.equal(nextDueDay('daily', TODAY, TODAY), '2026-10-13');
});

test('diaria atrasada: salta a mañana, no al día siguiente del atraso', () => {
  assert.equal(nextDueDay('daily', '2026-10-01', TODAY), '2026-10-13');
});

test('completada antes de tiempo: avanza desde su fecha', () => {
  assert.equal(nextDueDay('daily', '2026-10-15', TODAY), '2026-10-16');
});

test('días laborables: el viernes salta al lunes', () => {
  assert.equal(nextDueDay('weekdays', '2026-10-16', '2026-10-16'), '2026-10-19');
});

test('semanal en lunes, miércoles y viernes', () => {
  assert.equal(nextDueDay('weekly:1,3,5', TODAY, TODAY), '2026-10-14');
  assert.equal(nextDueDay('weekly:1,3,5', '2026-10-16', '2026-10-16'), '2026-10-19');
});

test('mensual: el día 31 cae en el último día de meses cortos', () => {
  assert.equal(nextDueDay('monthly', '2026-10-31', '2026-10-31'), '2026-11-30');
  assert.equal(nextDueDay('monthly', '2027-01-31', '2027-01-31'), '2027-02-28');
});

test('mensual sin fecha usa hoy como ancla', () => {
  assert.equal(nextDueDay('monthly', null, TODAY), '2026-11-12');
});

test('valida reglas de recurrencia', () => {
  assert.ok(recurrenceRule.safeParse('weekly:1,3').success);
  assert.ok(!recurrenceRule.safeParse('weekly:8').success);
  assert.ok(!recurrenceRule.safeParse('yearly').success);
});

const task = (id, fields) => ({ id, priority: 2, dueDay: null, energy: null, estimatedMin: null, createdAt: id, ...fields });

test('sugiere primero lo atrasado y luego lo de hoy', () => {
  const [first, second] = suggestTasks(
    [task('a', {}), task('b', { dueDay: TODAY }), task('c', { dueDay: '2026-10-10' })],
    { today: TODAY },
  );
  assert.equal(first.task.id, 'c');
  assert.equal(second.task.id, 'b');
  assert.ok(first.reasons.includes('Está atrasada'));
});

test('con poca energía evita tareas de energía alta', () => {
  const [first] = suggestTasks(
    [task('hard', { priority: 1, energy: 'high' }), task('easy', { energy: 'low' })],
    { today: TODAY, energy: 'low' },
  );
  assert.equal(first.task.id, 'easy');
});

test('descarta lo que no cabe en el tiempo disponible', () => {
  const [first] = suggestTasks(
    [task('long', { dueDay: TODAY, estimatedMin: 120 }), task('short', { estimatedMin: 10 })],
    { today: TODAY, minutes: 30 },
  );
  assert.equal(first.task.id, 'short');
});
