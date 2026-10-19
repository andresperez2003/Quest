# AGENTS.md — Backend (API de Quest)

Complementa al [`AGENTS.md` de la raíz](../AGENTS.md) (producto, stack, convenciones generales, roadmap).
Aquí solo lo específico de la API. Si algo choca, manda el de la raíz.

## Comandos (desde `Backend/`)

```bash
npm run dev          # node --watch --env-file=.env main.js  (puerto 3000)
npm test             # node --test src  → ejecuta todos los *.test.js
npm run db:migrate   # prisma migrate dev
npm run db:studio
npx prisma generate  # falla con EPERM si `npm run dev` está corriendo (ver raíz)
```

No hay linter ni bundler: es Node ESM directo. Imports relativos **siempre con extensión `.js`**.

## Variables de entorno

Definidas en `.env` (no leerlo ni imprimirlo); la plantilla es `.env.example`. `src/config.js` aborta el arranque
si falta `JWT_SECRET` o `DATABASE_URL`. Para leer configuración, importar `config`, no `process.env`.

| Variable | Uso |
|---|---|
| `PORT` | Puerto de la API (3000 por defecto) |
| `DATABASE_URL` | SQLite, relativa a `prisma/` (`file:./dev.db`) |
| `JWT_SECRET` | Firma del JWT de sesión |
| `ALLOW_REGISTRATION` | Registro abierto por defecto; `false` lo cierra (solo se puede crear el primer usuario) |
| `NODE_ENV` | `production` activa `secure` en la cookie |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Opcionales. Sin ellas, Google Calendar aparece como "no configurado" |
| `GOOGLE_REDIRECT_URI` | Por defecto `http://localhost:5173/api/google/callback` (pasa por el proxy de Vite) |

Las variables del shell **tienen prioridad** sobre `--env-file`, lo que permite apuntar a una copia de la BD (ver abajo).

## Arquitectura

```
main.js                 → app.listen(config.port)
src/app.js              → express.json, cookieParser, rutas, notFound, errorHandler
src/config.js           → validación y lectura de env
src/lib/prisma.js       → instancia única de PrismaClient (importar esta, no crear otra)
src/lib/errors.js       → HttpError(status, message)
src/lib/days.js         → dayString (Zod), addDays, weekStart
src/middleware/auth.js  → requireAuth: lee cookie `token`, pone req.userId
src/middleware/error.js → ZodError → 400 {error, details}; HttpError → {error}; resto → 500
src/modules/<dominio>/
    <dominio>.routes.js → Router de Express, export default
    <lógica>.js         → funciones puras (sin Prisma, sin req/res)
    <lógica>.test.js    → tests de node:test junto a la lógica
```

`requireAuth` se aplica **al montar** el router en `app.js`, no dentro de cada ruta. Solo `/api/health` y
`/api/auth/*` son públicos (`/api/auth/me` aplica `requireAuth` por su cuenta).

Formato de respuesta: siempre un objeto con clave nombrada (`{ habit }`, `{ habits }`, `{ user }`, `{ days }`),
nunca un array suelto. Errores: `{ error: 'mensaje en español' }`. Borrados → `204` sin cuerpo; creación → `201`.

## Endpoints actuales

| Método y ruta | Notas |
|---|---|
| `GET /api/health` | Pública |
| `GET /api/auth/status` | `{ registrationOpen }` |
| `POST /api/auth/register` | Rate limit; crea usuario + 5 categorías por defecto |
| `POST /api/auth/login` | Rate limit (10 / 15 min) |
| `POST /api/auth/logout` | Borra la cookie |
| `GET /api/auth/me` | Usuario actual |
| `GET /api/categories` | Solo lectura (el CRUD es de la fase 1) |
| `GET /api/habits?today=` | Activos, con `stats` (rachas) y `recent` (últimos 7 días) |
| `POST /api/habits` · `PATCH /api/habits/:id` | Pasan por `normalize()` |
| `DELETE /api/habits/:id` | Archiva, no borra |
| `GET /api/habits/:id/logs?from=&to=` | Historial de un hábito |
| `PUT /api/habits/:id/logs/:day` | `{ value, today }`; solo acepta `day === today` (`logDayError`). `0` borra el registro. Da o quita puntos |
| `GET /api/activity/heatmap?from=&to=` | Puntos por día para el mapa de calor global |
| `GET /api/tasks?view=today/inbox/upcoming/range&today=` | `range` exige `from` y `to`. Cada tarea trae `focusMin` |
| `GET /api/tasks/:id` | Una tarea con subtareas y `focusMin` |
| `POST /api/pomodoros` | `{ day, plannedMin, actualMin, completed, startedAt?, taskId?, habitId? }` → `{ session, points }` |
| `GET /api/pomodoros/stats?today=` | Minutos y sesiones de hoy y de los últimos 7 días |
| `POST /api/game/sync` | `{ today }` → `{ profile, achievements, weeks, news }`. Otorga congeladores, logros y cofre; `profile.week` (medalla en curso) y `profile.rank` |
| `GET /api/game/week?today=` | Resumen de la semana actual y la anterior |
| `GET /api/google/status` | `{ configured, connected, email, canWrite, syncTasks }` |
| `GET /api/google/connect?tz=&write=0/1` | Navegación completa → pantalla de permisos de Google |
| `GET /api/google/callback` | Vuelta de Google; redirige a `/calendario?google=ok/cancelado/caducado/error` |
| `PATCH /api/google/settings` | `{ syncTasks, timeZone?, today }`; al activarlo envía las tareas con hora desde hoy |
| `POST /api/google/disconnect` | Revoca el token y borra la cuenta |
| `GET /api/google/events?timeMin=&timeMax=&tz=` | Eventos (sin los que son tareas); aplica a las tareas los cambios hechos en Google |

## Patrones a seguir

**Nuevo módulo** (usar `habits/` como referencia):
1. Crear `src/modules/<dominio>/<dominio>.routes.js` con `Router()` y `export default router`.
2. Montarlo en `app.js` con `requireAuth`.
3. Esquemas Zod al principio del archivo; un objeto `xxxFields` compartido para crear (con `.default()`/`.optional()`)
   y actualizar (`.partial()`).
4. Helper `findXxx(userId, id)` que hace `findFirst({ where: { id, userId } })` y lanza `HttpError(404, ...)`.
5. Si recibe un `categoryId`, validar que pertenece al usuario (ver `assertCategory` en habits).
6. En `PATCH`, construir el objeto `data` con los campos permitidos explícitamente; no pasar `req.body` ni el
   registro completo a Prisma.

**Puntos / ActivityLog** — el patrón de `PUT /habits/:id/logs/:day`:

```js
await prisma.$transaction(async (tx) => {
  // ...guardar la entidad...
  if (cuentaComoHecho) {
    await tx.activityLog.upsert({
      where: { source_sourceId: { source: 'task', sourceId } },
      create: { userId: req.userId, day, points: TASK_POINTS, source: 'task', sourceId },
      update: {},
    });
  } else {
    await tx.activityLog.deleteMany({ where: { source: 'task', sourceId } });
  }
});
```

- `sourceId` determinista (`habitId:day`, `taskId`, `pomodoroId`) para que repetir la acción no duplique puntos.
- La constante de puntos vive en el archivo de lógica pura (`HABIT_POINTS` en `habits/stats.js`).
- Devolver los puntos otorgados en la respuesta para que el frontend muestre el "+N" sin recalcular.
- Escritura de entidad + `ActivityLog` siempre en la misma transacción.

**Días**
- Cualquier día que llegue por query, params o body se valida con `dayString`.
- Los endpoints que dependen de "hoy" lo reciben del cliente (`?today=`). La única excepción es acotar ese
  "hoy": el registro de hábitos exige que esté a ±1 día de la fecha UTC del servidor (margen para cualquier zona horaria).
- Comparar días como strings (`day > maxDay`) es válido gracias al formato `YYYY-MM-DD`.
- Nada de `new Date(day)` sueltos ni `getDay()` locales: usar `addDays` / `weekStart`.

**Auth**
- Nunca devolver un `User` sin pasar por `publicUser()`.
- La cookie dura 30 días (`SESSION_DAYS`); el JWT solo lleva `sub`.

## Modelo de datos (`prisma/schema.prisma`)

- Todos en uso: `User`, `Category`, `Task`, `Habit`, `HabitLog`, `PomodoroSession`, `ActivityLog`,
  `GameEvent` (hitos del juego: `achievement | freeze_earned | freeze_used | surprise | medal | rank`) y `GoogleAccount`.
- Campos de gamificación en `User` (`level`, `xp`, `coins`, `streakFreezes`): solo los escribe `syncGame()`
  (`modules/game/game.service.js`) a partir de `ActivityLog` y `GameEvent`. Las reglas están en funciones puras con
  tests (`levels`, `streak`, `achievements`, `medals`, `surprise`). Las medallas y el rango no se guardan: se
  calculan en cada sync desde `ActivityLog`.
- Fuentes de `ActivityLog`: `task`, `habit`, `pomodoro`, `achievement` (`userId:clave`), `surprise` (`userId:día`).
- `GoogleAccount.accessToken/refreshToken` van cifrados (`lib/crypto.js`, clave derivada de `JWT_SECRET`).
- Enumerados guardados como `String` (SQLite no tiene enums): validarlos con `z.enum([...])` y documentar los
  valores en el comentario del campo del schema.
- `HabitLog` es único por `(habitId, day)`; `ActivityLog` por `(source, sourceId)`. Usar esos índices en los upsert
  (`habitId_day`, `source_sourceId`).
- `onDelete: Cascade` desde `User`; `SetNull` en relaciones opcionales con categoría, tarea o hábito.

## Tests y verificación

- Tests unitarios solo de lógica pura, con `node:test` + `assert/strict`. Nombres de test en español describiendo
  la regla (`'no completar hoy todavía no rompe la racha'`). Usar fechas fijas, nunca `new Date()`.
- Casos que siempre merecen test: cambio de mes, semanas que empiezan en lunes, periodo actual sin cumplir.
- Para probar endpoints sin tocar los datos reales:

```bash
cp prisma/dev.db "$TMP/quest-test.db"
DATABASE_URL="file:$TMP/quest-test.db" PORT=3100 node --env-file=.env main.js
# en otra terminal (con cookie jar):
curl -s -c jar -b jar -H 'Content-Type: application/json' \
  -d '{"email":"...","password":"..."}' localhost:3100/api/auth/login
curl -s -b jar "localhost:3100/api/habits?today=2026-10-12"
```

  Si no se conocen las credenciales del usuario, poner `ALLOW_REGISTRATION=true` en esa misma ejecución y
  registrar un usuario de prueba en la copia. Matar después solo ese proceso (el del puerto 3100).

## Errores frecuentes a evitar

- Olvidar `userId` en un `where` (incluidas consultas sobre tablas hijas: filtrar por el padre ya verificado).
- Usar `findUnique({ where: { id } })` para recursos del usuario: no comprueba el dueño.
- Añadir `try/catch` en handlers solo para responder 500: Express 5 y `errorHandler` ya lo hacen.
- Crear otra instancia de `PrismaClient`.
- Calcular puntos sumando en `User.xp` en vez de crear filas en `ActivityLog`.
- Migraciones que borran columnas o añaden obligatorias sin default sobre tablas con datos (hay datos reales).
