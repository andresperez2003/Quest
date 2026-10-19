import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { HttpError } from '../lib/errors.js';

export const AUTH_COOKIE = 'token';

export function requireAuth(req, _res, next) {
  const token = req.cookies?.[AUTH_COOKIE];
  if (!token) throw new HttpError(401, 'No autenticado');
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.userId = payload.sub;
    next();
  } catch {
    throw new HttpError(401, 'Sesión inválida o expirada');
  }
}
