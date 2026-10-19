import { test } from 'node:test';
import assert from 'node:assert/strict';
import { habitStats, logDayError } from './stats.js';
import { weekStart } from '../../lib/days.js';

const daily = { frequency: 'daily', targetCount: 1, targetValue: null };

test('registro: solo se acepta el día de hoy', () => {
  assert.equal(logDayError('2026-10-19', '2026-10-19', '2026-10-19'), null);
  assert.equal(logDayError('2026-10-18', '2026-10-19', '2026-10-19'), 'Solo puedes registrar los hábitos de hoy');
  assert.equal(logDayError('2026-10-20', '2026-10-19', '2026-10-19'), 'Solo puedes registrar los hábitos de hoy');
});

test('registro: el "hoy" del cliente puede ir un día por delante o por detrás del servidor', () => {
  assert.equal(logDayError('2026-10-20', '2026-10-20', '2026-10-19'), null); // zona horaria adelantada
  assert.equal(logDayError('2026-10-31', '2026-10-31', '2026-11-01'), null); // cambio de mes
  assert.equal(logDayError('2026-10-17', '2026-10-17', '2026-10-19'), 'La fecha de hoy no es válida');
});
const logs = (...days) => days.map((day) => ({ day, value: 1 }));

test('racha diaria cuenta días consecutivos hasta hoy', () => {
  const s = habitStats(daily, logs('2026-10-10', '2026-10-11', '2026-10-12'), '2026-10-12');
  assert.equal(s.streak, 3);
  assert.equal(s.doneToday, true);
});

test('no completar hoy todavía no rompe la racha', () => {
  const s = habitStats(daily, logs('2026-10-10', '2026-10-11'), '2026-10-12');
  assert.equal(s.streak, 2);
  assert.equal(s.doneToday, false);
});

test('un día saltado sí rompe la racha', () => {
  const s = habitStats(daily, logs('2026-10-08', '2026-10-09', '2026-10-11'), '2026-10-12');
  assert.equal(s.streak, 1);
  assert.equal(s.bestStreak, 2);
});

test('mejor racha cruza cambio de mes', () => {
  const s = habitStats(daily, logs('2026-09-29', '2026-09-30', '2026-10-01', '2026-10-05'), '2026-10-12');
  assert.equal(s.bestStreak, 3);
  assert.equal(s.streak, 0);
});

test('hábito con cantidad solo cuenta si llega a la meta', () => {
  const read = { frequency: 'daily', targetCount: 1, targetValue: 20 };
  const s = habitStats(read, [{ day: '2026-10-11', value: 20 }, { day: '2026-10-12', value: 5 }], '2026-10-12');
  assert.equal(s.streak, 1);
  assert.equal(s.todayValue, 5);
  assert.equal(s.doneToday, false);
});

test('semanal: 3 veces por semana', () => {
  const gym = { frequency: 'weekly', targetCount: 3, targetValue: null };
  // semana del 28-sep (3), semana del 5-oct (3), semana del 12-oct (1, en curso)
  const s = habitStats(
    gym,
    logs('2026-09-28', '2026-09-30', '2026-10-02', '2026-10-05', '2026-10-07', '2026-10-09', '2026-10-12'),
    '2026-10-12',
  );
  assert.equal(s.streak, 2);
  assert.equal(s.streakUnit, 'weeks');
  assert.equal(s.periodProgress, 1);
  assert.equal(s.periodTarget, 3);
});

test('las semanas empiezan en lunes', () => {
  assert.equal(weekStart('2026-10-12'), '2026-10-12'); // lunes
  assert.equal(weekStart('2026-10-18'), '2026-10-12'); // domingo
});
