// Llamadas HTTP a Google (OAuth 2.0 y Calendar API v3) con fetch, sin dependencias extra.
import { config } from '../../config.js';
import { HttpError } from '../../lib/errors.js';

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const REVOKE_URL = 'https://oauth2.googleapis.com/revoke';
const API_URL = 'https://www.googleapis.com/calendar/v3';

export const READ_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';
export const WRITE_SCOPE = 'https://www.googleapis.com/auth/calendar.events';

export function isConfigured() {
  return Boolean(config.google.clientId && config.google.clientSecret);
}

// Lectura y escritura en un solo consentimiento: ver los eventos y enviar las tareas con hora.
export function authUrl(state) {
  const params = new URLSearchParams({
    client_id: config.google.clientId,
    redirect_uri: config.google.redirectUri,
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    scope: ['openid', 'email', READ_SCOPE, WRITE_SCOPE].join(' '),
    state,
  });
  return `${AUTH_URL}?${params}`;
}

async function tokenRequest(body) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.google.clientId,
      client_secret: config.google.clientSecret,
      ...body,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new HttpError(502, `Google rechazó la autorización (${data.error ?? res.status}). Vuelve a conectar.`);
  return data;
}

export function exchangeCode(code) {
  return tokenRequest({ code, grant_type: 'authorization_code', redirect_uri: config.google.redirectUri });
}

export function refreshAccessToken(refreshToken) {
  return tokenRequest({ refresh_token: refreshToken, grant_type: 'refresh_token' });
}

export async function revokeToken(token) {
  await fetch(`${REVOKE_URL}?token=${encodeURIComponent(token)}`, { method: 'POST' }).catch(() => {});
}

// El id_token viene directo del endpoint de tokens por TLS, así que basta con leer el email.
export function emailFromIdToken(idToken) {
  try {
    return JSON.parse(Buffer.from(idToken.split('.')[1], 'base64url').toString()).email ?? null;
  } catch {
    return null;
  }
}

export async function calendarRequest(accessToken, method, path, body) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(body && { 'Content-Type': 'application/json' }),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new HttpError(502, `Error de Google Calendar (${res.status})`);
    err.googleStatus = res.status;
    throw err;
  }
  return data;
}
