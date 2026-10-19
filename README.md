# Quest

PWA personal para tareas, hábitos y foco, con gamificación (mapa de calor, XP, rachas, medallas semanales y rango de honor).

- **Backend/**: Node.js + Express 5 + Prisma (SQLite en desarrollo)
- **Frontend/**: React 19 + Vite + Tailwind 4 + vite-plugin-pwa

## Arrancar en local

```bash
npm install
npm install --prefix Backend
npm install --prefix Frontend
cp Backend/.env.example Backend/.env   # y cambia JWT_SECRET
npm run db:migrate                     # crea la base de datos
npm run dev                            # API en :3000 y web en :5173
```

La primera vez que abras la app te pedirá crear tu cuenta. Cualquiera puede crear la suya desde
la pestaña "Crear cuenta"; para cerrar el registro pon `ALLOW_REGISTRATION=false` en `Backend/.env`.

## Conectar Google Calendar (opcional)

1. En [Google Cloud Console](https://console.cloud.google.com/) crea un proyecto y activa la **Google Calendar API**.
2. En *APIs y servicios → Pantalla de consentimiento OAuth*, configúrala como "Externa" y añade tu email como
   usuario de prueba.
3. En *Credenciales → Crear credenciales → ID de cliente OAuth*, elige **Aplicación web** y añade como URI de
   redirección autorizada: `http://localhost:5173/api/google/callback` (si Vite usa otro puerto, ese).
4. Copia el ID y el secreto en `Backend/.env` (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` y, si cambiaste el
   puerto, `GOOGLE_REDIRECT_URI`) y reinicia `npm run dev`.
5. En la app: **Calendario → Conectar Google Calendar** (al final de la página). Se aceptan los permisos una sola
   vez y la sincronización queda activa: verás tus eventos de Google y tus tareas con hora se envían allí.

## Roadmap

| Fase | Contenido | Estado |
|---|---|---|
| 0 | Estructura, base de datos, login, PWA | ✅ |
| 1 | Tareas + categorías + vista "Hoy" | ✅ |
| 2 | Hábitos + mapa de calor estilo GitHub | ✅ |
| 3 | Pomodoro vinculado a tareas/hábitos | ✅ |
| 4 | XP, niveles, rachas, logros, medallas y rango | ✅ |
| 5 | Calendario + Google Calendar | ✅ |
| 6 | Recompensas, check-in de ánimo, IA | |
