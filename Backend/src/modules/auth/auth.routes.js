import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { config } from '../../config.js';
import { HttpError } from '../../lib/errors.js';
import { mailEnabled, sendMail } from '../../lib/mail.js';
import { AUTH_COOKIE, requireAuth } from '../../middleware/auth.js';
import { hashResetToken, isResetUsable, newResetToken, resetEmail } from './reset.js';

const router = Router();

const SESSION_DAYS = 30;

const DEFAULT_CATEGORIES = [
  { name: 'Personal', color: '#8b5cf6', icon: 'sprout' },
  { name: 'Trabajo', color: '#3b82f6', icon: 'briefcase' },
  { name: 'Estudio', color: '#f59e0b', icon: 'book-open' },
  { name: 'Salud', color: '#22c55e', icon: 'dumbbell' },
  { name: 'Casa', color: '#ec4899', icon: 'house' },
];

const registerSchema = z.object({
  name: z.string().trim().min(1).max(50),
  email: z.email().toLowerCase(),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(100),
});

const loginSchema = z.object({
  email: z.email().toLowerCase(),
  password: z.string().min(1),
});

const profileSchema = z.object({
  name: z.string().trim().min(1, 'El nombre no puede estar vacío').max(50),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: registerSchema.shape.password,
});

const forgotSchema = z.object({ email: z.email('Ese email no parece válido').toLowerCase() });

const resetSchema = z.object({
  token: z.string().min(1),
  password: registerSchema.shape.password,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: { error: 'Demasiados intentos, espera unos minutos' },
});

// Contador propio: los cambios de contraseña no deben gastar los intentos de login.
const passwordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: { error: 'Demasiados intentos, espera unos minutos' },
});

// Pocos correos por IP: evita usar el formulario para inundar el buzón de alguien.
const forgotLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  message: { error: 'Demasiadas solicitudes, espera unos minutos' },
});

function publicUser(user) {
  const { passwordHash: _, ...rest } = user;
  return rest;
}

function setSessionCookie(res, userId) {
  const token = jwt.sign({ sub: userId }, config.jwtSecret, { expiresIn: `${SESSION_DAYS}d` });
  res.cookie(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProd,
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
  });
}

async function isRegistrationOpen() {
  if (config.allowRegistration) return true;
  return (await prisma.user.count()) === 0;
}

// El frontend lo usa para saber si mostrar "Crear cuenta" y "¿Olvidaste tu contraseña?".
// `firstRun`: aún no hay cuentas, así que se abre directo en "Crear cuenta".
router.get('/status', async (_req, res) => {
  const firstRun = (await prisma.user.count()) === 0;
  res.json({ registrationOpen: firstRun || config.allowRegistration, firstRun, passwordReset: mailEnabled });
});

router.post('/register', loginLimiter, async (req, res) => {
  if (!(await isRegistrationOpen())) throw new HttpError(403, 'El registro está cerrado');

  const { name, email, password } = registerSchema.parse(req.body);
  if (await prisma.user.findUnique({ where: { email } })) {
    throw new HttpError(409, 'Ya existe una cuenta con ese email');
  }

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await bcrypt.hash(password, 12),
      categories: { create: DEFAULT_CATEGORIES },
    },
  });

  setSessionCookie(res, user.id);
  res.status(201).json({ user: publicUser(user) });
});

router.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new HttpError(401, 'Email o contraseña incorrectos');
  }
  setSessionCookie(res, user.id);
  res.json({ user: publicUser(user) });
});

router.post('/logout', (_req, res) => {
  res.clearCookie(AUTH_COOKIE);
  res.status(204).end();
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) throw new HttpError(401, 'Usuario no encontrado');
  res.json({ user: publicUser(user) });
});

router.patch('/me', requireAuth, async (req, res) => {
  const { name } = profileSchema.parse(req.body);
  const user = await prisma.user.update({ where: { id: req.userId }, data: { name } });
  res.json({ user: publicUser(user) });
});

// Pide la contraseña actual (y limita intentos) para que una sesión abierta en otro dispositivo no baste para cambiarla.
router.post('/password', requireAuth, passwordLimiter, async (req, res) => {
  const { currentPassword, newPassword } = passwordSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) throw new HttpError(401, 'Usuario no encontrado');
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
    throw new HttpError(400, 'La contraseña actual no es correcta');
  }
  if (currentPassword === newPassword) throw new HttpError(400, 'La nueva contraseña debe ser distinta de la actual');

  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(newPassword, 12) } });
  res.status(204).end();
});

// Responde igual exista o no la cuenta (y sin esperar al correo) para no revelar qué emails están registrados.
router.post('/forgot', forgotLimiter, async (req, res) => {
  if (!mailEnabled) throw new HttpError(503, 'La recuperación por email no está configurada');
  const { email } = forgotSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    const { token, tokenHash, expiresAt } = newResetToken();
    // Solo vale el último enlace pedido.
    await prisma.passwordReset.deleteMany({ where: { userId: user.id, usedAt: null } });
    await prisma.passwordReset.create({ data: { userId: user.id, tokenHash, expiresAt } });
    const link = `${config.appUrl}/restablecer?token=${token}`;
    sendMail({ to: user.email, ...resetEmail({ name: user.name, link }) }).catch((err) =>
      console.error('No se pudo enviar el correo de recuperación:', err.message),
    );
  }
  res.status(204).end();
});

// Cambia la contraseña con el enlace del correo y deja la sesión iniciada.
router.post('/reset', passwordLimiter, async (req, res) => {
  const { token, password } = resetSchema.parse(req.body);
  const reset = await prisma.passwordReset.findUnique({ where: { tokenHash: hashResetToken(token) } });
  if (!isResetUsable(reset)) {
    throw new HttpError(400, 'El enlace no es válido o ya caducó. Pide uno nuevo.');
  }

  const user = await prisma.$transaction(async (tx) => {
    await tx.passwordReset.update({ where: { id: reset.id }, data: { usedAt: new Date() } });
    await tx.passwordReset.deleteMany({ where: { userId: reset.userId, usedAt: null } });
    return tx.user.update({
      where: { id: reset.userId },
      data: { passwordHash: await bcrypt.hash(password, 12) },
    });
  });

  setSessionCookie(res, user.id);
  res.json({ user: publicUser(user) });
});

export default router;
