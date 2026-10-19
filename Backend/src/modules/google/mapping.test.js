import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eventToItem, isTimeZone, localParts, taskChangesFromEvent, taskToEvent } from './mapping.js';

const TZ = 'America/Bogota'; // UTC-5, sin horario de verano

test('convierte un instante a día y hora locales', () => {
  assert.deepEqual(localParts('2026-10-17T03:30:00Z', TZ), { day: '2026-10-16', time: '22:30' });
  assert.ok(isTimeZone('Europe/Madrid'));
  assert.ok(!isTimeZone('Marte/Olympus'));
});

test('evento con hora', () => {
  const item = eventToItem(
    {
      id: 'e1',
      summary: 'Dentista',
      start: { dateTime: '2026-10-16T15:00:00-05:00' },
      end: { dateTime: '2026-10-16T16:30:00-05:00' },
    },
    TZ,
  );
  assert.equal(item.startDay, '2026-10-16');
  assert.equal(item.startTime, '15:00');
  assert.equal(item.endTime, '16:30');
  assert.equal(item.durationMin, 90);
  assert.equal(item.allDay, false);
});

test('evento de día completo: el fin es exclusivo', () => {
  const item = eventToItem({ id: 'e2', start: { date: '2026-10-16' }, end: { date: '2026-10-18' } }, TZ);
  assert.equal(item.allDay, true);
  assert.equal(item.endDay, '2026-10-17');
  assert.equal(item.title, '(Sin título)');
});

const task = { id: 't1', title: 'Informe', notes: null, status: 'pending', dueDay: '2026-10-16', dueTime: '23:30', estimatedMin: 60 };

test('tarea a evento, cruzando la medianoche', () => {
  const ev = taskToEvent(task, TZ);
  assert.equal(ev.start.dateTime, '2026-10-16T23:30:00');
  assert.equal(ev.end.dateTime, '2026-10-17T00:30:00');
  assert.equal(ev.extendedProperties.private.questTaskId, 't1');
  assert.equal(taskToEvent({ ...task, status: 'done' }, TZ).summary, '✅ Informe');
});

test('detecta cambios hechos en Google', () => {
  const item = { allDay: false, title: 'Informe final', startDay: '2026-10-17', startTime: '09:00', durationMin: 60 };
  assert.deepEqual(taskChangesFromEvent(item, task), { dueDay: '2026-10-17', dueTime: '09:00', title: 'Informe final' });
  const same = { allDay: false, title: '✅ Informe', startDay: '2026-10-16', startTime: '23:30', durationMin: 60 };
  assert.equal(taskChangesFromEvent(same, task), null);
});
