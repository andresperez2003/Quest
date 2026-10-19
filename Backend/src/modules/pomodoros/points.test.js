import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pomodoroPoints } from './points.js';

test('un pomodoro de 25 min da 5 puntos', () => {
  assert.equal(pomodoroPoints(25), 5);
  assert.equal(pomodoroPoints(50), 10);
});

test('parar antes también suma, por bloques de 5 min', () => {
  assert.equal(pomodoroPoints(12), 2);
  assert.equal(pomodoroPoints(4), 0);
});
