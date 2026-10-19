import express from 'express';
import cookieParser from 'cookie-parser';
import authRoutes from './modules/auth/auth.routes.js';
import categoryRoutes from './modules/categories/categories.routes.js';
import habitRoutes from './modules/habits/habits.routes.js';
import activityRoutes from './modules/activity/activity.routes.js';
import taskRoutes from './modules/tasks/tasks.routes.js';
import pomodoroRoutes from './modules/pomodoros/pomodoros.routes.js';
import gameRoutes from './modules/game/game.routes.js';
import googleRoutes from './modules/google/google.routes.js';
import { requireAuth } from './middleware/auth.js';
import { errorHandler, notFound } from './middleware/error.js';

export const app = express();

app.use(express.json());
app.use(cookieParser());

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/categories', requireAuth, categoryRoutes);
app.use('/api/habits', requireAuth, habitRoutes);
app.use('/api/tasks', requireAuth, taskRoutes);
app.use('/api/activity', requireAuth, activityRoutes);
app.use('/api/pomodoros', requireAuth, pomodoroRoutes);
app.use('/api/game', requireAuth, gameRoutes);
app.use('/api/google', requireAuth, googleRoutes);

app.use(notFound);
app.use(errorHandler);
