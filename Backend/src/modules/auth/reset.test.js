import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RESET_MINUTES, hashResetToken, isResetUsable, newResetToken, resetEmail } from './reset.js';

const NOW = new Date('2026-10-19T12:00:00Z');

test('el token es aleatorio, se guarda solo su hash y caduca a los 30 min', () => {
  const a = newResetToken(NOW);
  const b = newResetToken(NOW);
  assert.notEqual(a.token, b.token);
  assert.equal(a.tokenHash, hashResetToken(a.token));
  assert.notEqual(a.tokenHash, a.token);
  assert.equal(a.expiresAt.getTime() - NOW.getTime(), RESET_MINUTES * 60_000);
});

test('un enlace sirve una vez y solo antes de caducar', () => {
  const later = (min) => new Date(NOW.getTime() + min * 60_000);
  const reset = { usedAt: null, expiresAt: later(30) };
  assert.equal(isResetUsable(reset, later(29)), true);
  assert.equal(isResetUsable(reset, later(30)), false);
  assert.equal(isResetUsable({ ...reset, usedAt: later(1) }, later(2)), false);
  assert.equal(isResetUsable(null, NOW), false);
});

test('el correo escapa el nombre e incluye el enlace', () => {
  const { text, html } = resetEmail({ name: '<b>Ana</b>', link: 'http://x/restablecer?token=abc' });
  assert.match(text, /token=abc/);
  assert.match(html, /token=abc/);
  assert.doesNotMatch(html, /<b>Ana/);
});
