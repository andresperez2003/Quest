import { createHash, randomBytes } from 'node:crypto';

export const RESET_MINUTES = 30;

// El token viaja en el enlace del correo; en la BD solo se guarda su hash.
export function newResetToken(now = new Date()) {
  const token = randomBytes(32).toString('base64url');
  return { token, tokenHash: hashResetToken(token), expiresAt: new Date(now.getTime() + RESET_MINUTES * 60_000) };
}

export function hashResetToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

// Un enlace sirve una sola vez y solo antes de caducar.
export function isResetUsable(reset, now = new Date()) {
  return Boolean(reset) && !reset.usedAt && reset.expiresAt > now;
}

const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export function resetEmail({ name, link }) {
  const text = [
    `Hola, ${name}:`,
    '',
    'Alguien (seguramente tú) pidió cambiar la contraseña de tu cuenta de Quest.',
    `Abre este enlace para elegir una nueva. Caduca en ${RESET_MINUTES} minutos y solo sirve una vez:`,
    '',
    link,
    '',
    'Si no lo pediste, ignora este correo: tu contraseña no cambiará.',
  ].join('\n');

  const html = `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:auto;color:#0f172a">
  <h2 style="margin:0 0 12px">Quest</h2>
  <p>Hola, ${escapeHtml(name)}:</p>
  <p>Alguien (seguramente tú) pidió cambiar la contraseña de tu cuenta de Quest.</p>
  <p style="margin:24px 0">
    <a href="${link}" style="background:#22c55e;color:#0f172a;padding:12px 20px;border-radius:8px;font-weight:600;text-decoration:none">
      Elegir una contraseña nueva
    </a>
  </p>
  <p style="color:#64748b;font-size:14px">El enlace caduca en ${RESET_MINUTES} minutos y solo sirve una vez.
  Si no lo pediste, ignora este correo: tu contraseña no cambiará.</p>
</div>`;

  return { subject: 'Recupera tu contraseña de Quest', text, html };
}
