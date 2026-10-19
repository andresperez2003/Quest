export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

// Se emite tras cada cambio con éxito para que el juego (XP, logros, medallas) se resincronice.
export const DATA_CHANGED = 'quest:changed';
const SILENT_PATHS = /^\/(game|auth)\//;

async function request(method, path, body) {
  const res = await fetch(`/api${path}`, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = res.status === 204 ? null : await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? 'Error de red', data.details);
  if (method !== 'GET' && !SILENT_PATHS.test(path)) window.dispatchEvent(new Event(DATA_CHANGED));
  return data;
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  patch: (path, body) => request('PATCH', path, body),
  delete: (path) => request('DELETE', path),
};
