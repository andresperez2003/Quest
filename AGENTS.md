# AGENTS.md — Quest (proyecto Management)

PWA personal para gestionar tareas, hábitos y foco, **diseñada para una persona con TDAH** y gamificada
(mapa de calor estilo GitHub, XP/niveles, rachas, medallas semanales y rango de honor). Multiusuario con registro abierto (cada usuario ve solo sus datos).

## Principios de producto (guían cualquier decisión de UI/UX)

1. **Fricción mínima**: crear algo debe tomar < 5 s. Solo el nombre es obligatorio; lo demás, opcional y después.
2. **Recompensa inmediata**: toda acción completada tiene feedback visible al instante (animación, +puntos).
   Usar actualizaciones optimistas; nunca hacer esperar al usuario para ver su progreso.
3. **Poco a la vez**: mostrar lo de hoy, no todo. Evitar pantallas densas.
4. **Sin castigos duros**: una racha no se rompe hasta que termina el periodo; archivar en vez de borrar;
   las medallas y el rango ganados nunca se pierden; una semana sin medalla es "descanso", sin reproches.
5. **Tiempo visible**: preferir barras, círculos y cuadrículas a números sueltos.
6. **Accesible**: respetar `prefers-reduced-motion` (ya hay regla global en `index.css`).

## Stack

| Capa | Tecnología | Notas |
|---|---|---|
| Backend | Node 26, Express 5, ESM | Express 5 propaga errores de handlers `async`: no hace falta `try/catch` ni `next(err)`. |
| BD | Prisma **6** + SQLite (`Backend/prisma/dev.db`) | Fijado en v6 a propósito: la v7 cambia la configuración. No actualizar sin pedirlo. |
| Validación | Zod **4** | API v4: `z.email()`, `z.int()`. |
| Auth | JWT en cookie `httpOnly` (`token`), bcryptjs | Registro abierto salvo `ALLOW_REGISTRATION=false` (entonces solo el primer usuario). `PATCH /auth/me` (nombre), `POST /auth/password` (pide la actual) y recuperación por email: `POST /auth/forgot` → enlace `/restablecer?token=` → `POST /auth/reset` (tabla `PasswordReset`, solo el hash del token; correo con `lib/mail.js` vía Gmail SMTP, opcional: `SMTP_USER`, `SMTP_PASS`, `APP_URL`). |
| Frontend | React 19, Vite 8, Tailwind 4, vite-plugin-pwa | **React Router 7** (importar de `react-router`), fijado en v7 a propósito. |

## Estructura

```
Management/
├── package.json            # scripts raíz (concurrently)
├── Backend/
│   ├── main.js             # arranque
│   ├── prisma/schema.prisma
│   └── src/
│       ├── app.js          # monta rutas; todo salvo /api/auth y /api/health va tras requireAuth
│       ├── config.js       # variables de entorno
│       ├── lib/            # prisma, HttpError, days (fechas)
│       ├── middleware/     # auth, error
│       └── modules/<dominio>/<dominio>.routes.js  (+ lógica pura y *.test.js)
└── Frontend/src/
    ├── api/client.js       # fetch con cookie; lanza ApiError
    ├── auth/AuthContext.jsx
    ├── hooks/useApi.js     # GET + reload + setData (para updates optimistas)
    ├── lib/dates.js        # mismas utilidades de días que el backend
    ├── components/         # Heatmap, Modal, Medal, ProgressBar, ProgressRing, components/<dominio>/... (tasks, habits, focus, calendar)
    ├── game/GameContext.jsx   # perfil del juego + avisos
    ├── focus/FocusContext.jsx # temporizador pomodoro global
    └── pages/
```

## Comandos

Desde la raíz:

```bash
npm run dev          # API :3000 + web (Vite :5173; si está ocupado usa :5174)
npm run build        # build del frontend
npm run db:migrate   # prisma migrate dev
npm run db:studio    # explorar la BD
```

Tests del backend: `npm test --prefix Backend` (usa `node:test`, sin dependencias extra).

## Convenciones

**Generales**
- Textos de UI, mensajes de error de la API y comentarios en **español**. Nombres de código en inglés.
- Comentarios solo donde aportan el "por qué". Seguir el estilo del archivo vecino.
- ESM en todo el proyecto (`import`, extensiones `.js` explícitas en el backend).

**Fechas (importante)**
- Un "día" es texto `YYYY-MM-DD` **en la zona horaria del usuario**. El cliente envía su `today`; el servidor
  nunca deduce el día local. Usar `lib/days.js` (backend) y `lib/dates.js` (frontend), que hacen la aritmética en UTC.
- Las semanas empiezan en **lunes**.

**Backend**
- Validar toda entrada con Zod (`schema.parse(req.body)`). El `errorHandler` convierte `ZodError` en 400.
- Para errores de negocio, lanzar `new HttpError(status, 'mensaje')`.
- **Cada consulta se filtra por `req.userId`**. Para buscar un recurso por id, usar `findFirst({ where: { id, userId } })`
  y responder 404 si no existe.
- Lógica con reglas (rachas, puntos, niveles) en funciones puras separadas de las rutas, con tests al lado (`*.test.js`).
- **Puntos y mapa de calor**: toda acción que da puntos crea una fila en `ActivityLog` con `source` y un
  `sourceId` determinista (ej. `habitId:day`). Es única por `(source, sourceId)`, así que: upsert al completar,
  delete al deshacer. Así nunca se duplican puntos. Las tareas y los pomodoros deben seguir el mismo patrón.
- Borrado lógico (`archived`) para entidades con historial.
- **Tareas**: un solo nivel de subtareas. `dueDay = null` es la bandeja de entrada. Al completar una recurrente se crea
  la siguiente instancia (`spawnedFromId`); al reabrirla se borra esa instancia si sigue pendiente.
  Puntos: tarea 10, subtarea 2 (`TASK_POINTS`/`SUBTASK_POINTS`, duplicados en `Frontend/src/lib/tasks.js`).
- **Pomodoros**: la sesión se registra al terminar o parar (`POST /api/pomodoros`); 1 punto cada 5 min reales
  (`pomodoroPoints`, duplicado en `Frontend/src/lib/focus.js`). Parar antes también suma.
- **Juego** (`modules/game`): XP = suma de `ActivityLog`; nivel, monedas, racha global, congeladores, logros, cofre
  sorpresa, medallas y rango se recalculan en `POST /api/game/sync` (idempotente). Los hitos se guardan en `GameEvent`,
  único por `(userId, kind, key)`. `User.level/xp/coins/streakFreezes` son una caché que escribe solo el sync.
  Las monedas se calculan (1 cada 10 XP) pero **no se muestran** en la UI hasta que exista la tienda (ver `STATUS.md`).
- **Medallas** (`modules/game/medals.js`): una por semana (lunes → domingo) según los puntos de tareas, hábitos y
  pomodoros (sin bonus de logros ni cofres): Bronce 20, Plata 60, Oro 120, Platino 200, Diamante 300. Cada medalla
  suma honor (1–5) y el honor acumulado da el **rango** (Novato → Leyenda), que nunca baja. No se guardan: se calculan
  desde `ActivityLog`; en `GameEvent` solo van los hitos (`medal` `lunes:nivel`, `rank` clave) para avisar una vez.
  Umbrales duplicados en `Frontend/src/lib/medals.js`.
- **Google Calendar** (`modules/google`): opcional (variables `GOOGLE_*`). Tokens cifrados con `lib/crypto.js`. Las
  rutas de tareas llaman a `syncTasksLater()` tras cada cambio; nunca esperan a Google ni fallan por su culpa.

**Frontend**
- Diseño mobile-first: navegación inferior, contenido `max-w-2xl`, botón flotante "+" sobre la barra.
- Colores mediante los tokens de `@theme` en `index.css` (`bg`, `surface`, `border`, `muted`, `accent`),
  no valores hex sueltos. Las categorías aportan su propio color.
- Datos con `useApi(path)`. Mutación = update optimista con `setData` → llamada a la API → `reload()`.
  Para tareas usar `useTasks(view, today, range?)`, que ya implementa este patrón y expone `version` para recargar el mapa de calor.
- El cliente API emite `quest:changed` tras cada mutación; `GameProvider` lo escucha y resincroniza el juego
  (y muestra logros, nivel o cofres con `<GameToasts>`). No hace falta avisarle a mano.
- El temporizador vive en `FocusProvider` (persistido en `localStorage`), no en la página: sigue al navegar.
- Recompensa al completar: `useCelebrate()` + `<PointsBurst points={n} />` (o `<TaskCheck>` en tareas).
- Íconos con `<Icon name="kebab-case" />` (`components/Icon.jsx`, sobre `lucide-react`), no emojis. Tamaño `1em` por
  defecto: escala con el texto. Para un ícono nuevo, importarlo y añadirlo al registro `ICONS`. Los emojis antiguos
  guardados en la BD se traducen solos (`LEGACY`).
- Formularios y detalles en `<Modal>` (hoja inferior en móvil).
- Confirmaciones con `const confirm = useConfirm()` y `await confirm({ title, text, confirmLabel, danger })`
  (`components/Confirm.jsx`), nunca `window.confirm`/`alert`.
- Animaciones disponibles: `animate-float`, `animate-pop`, `animate-rise`, `animate-sheet`.
- En desarrollo `/api` pasa por el proxy de Vite (mismo origen), así que no hay CORS. No añadir `cors`.

## Base de datos y migraciones

- Cambiar `schema.prisma` y luego `npm run db:migrate` (o `npx prisma migrate dev --name <nombre>` en `Backend/`).
- **Hay datos reales del usuario en `dev.db`.** Nunca ejecutar `prisma migrate reset`, borrar la BD ni hacer
  migraciones destructivas sin pedir permiso. Para pruebas, copiar `dev.db` a un directorio temporal y arrancar la API
  con `DATABASE_URL` apuntando a la copia y otro `PORT`.
- Antes de una migración que añade columnas obligatorias o borra columnas, comprobar si esas tablas tienen filas.

## Despliegue (Fly.io)

- Una sola imagen (`Dockerfile` en la raíz): compila `Frontend/dist` y Express la sirve cuando `NODE_ENV=production`
  (mismo origen, sin CORS). Al arrancar ejecuta `prisma migrate deploy` (nunca `migrate dev` ni `reset` en producción).
- SQLite vive en el volumen `quest_data` montado en `/data` (`DATABASE_URL=file:/data/quest.db`, en `fly.toml`).
- Las variables no secretas están en `fly.toml`; los secretos (`JWT_SECRET`, `SMTP_*`, `GOOGLE_CLIENT_*`) van en Fly.

## Problemas conocidos (Windows)

- **`prisma generate` falla con `EPERM` sobre `query_engine-windows.dll.node`** si `npm run dev` está corriendo.
  Hay que detener el servidor (preguntando antes al usuario), regenerar y pedirle que lo relance.
- **npm 11 bloquea los scripts de instalación de dependencias.** Por eso `Backend` tiene `postinstall: prisma generate`.
- El puerto 5173 suele estar ocupado por otro proyecto del usuario. Al detener procesos, matar **solo** los de
  `Desktop\Management`, nunca todos los `node.exe`.

## Seguridad

- No leer, imprimir ni commitear `Backend/.env` (contiene `JWT_SECRET`). `.gitignore` ya excluye `.env` y `*.db`.
- Contraseñas siempre con bcrypt; nunca devolver `passwordHash` (usar `publicUser()` en auth).

## Roadmap

| Fase | Contenido | Estado |
|---|---|---|
| 0 | Estructura, BD, login, PWA | ✅ |
| 1 | Tareas (subtareas, prioridad, energía, recurrencia, bandeja, "¿Qué hago ahora?") + categorías CRUD + vista "Hoy" | ✅ |
| 2 | Hábitos + mapa de calor | ✅ |
| 3 | Pomodoro vinculado a tareas/hábitos, estimado vs. real, "estacionar distracciones" | ✅ |
| 4 | XP, niveles, rachas con congeladores, logros, medallas semanales y rango de honor | ✅ |
| 5 | Calendario, time-blocking, Google Calendar (OAuth, bidireccional desde la conexión) | ✅ |
| 6 | Tienda de recompensas, check-in de ánimo/energía, asistente IA | |

El modelo de datos ya cubre tareas, pomodoros, hitos del juego (`GameEvent`, incluidas medallas y rangos), Google (`GoogleAccount`) y enlaces de recuperación (`PasswordReset`);
ampliarlo en lugar de crear modelos paralelos.

## Forma de trabajar

- Fases pequeñas y usables de punta a punta (backend + UI); el usuario debe poder usar cada fase antes de seguir.
- Verificar antes de dar algo por terminado: `npm test --prefix Backend`, `npm run build` y probar los endpoints
  con `curl` contra una copia de la BD.
- No hacer commits salvo que el usuario lo pida.
- Al terminar una fase o tarea relevante, actualizar `STATUS.md` (checklist y tabla), además del roadmap de este archivo.
