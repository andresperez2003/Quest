# AGENTS.md — Frontend (PWA de Quest)

Complementa al [`AGENTS.md` de la raíz](../AGENTS.md) (principios de producto TDAH, stack, convenciones generales,
roadmap). Aquí solo lo específico de la web. Si algo choca, manda el de la raíz.

## Comandos (desde `Frontend/`)

```bash
npm run dev       # Vite en :5173 (o :5174 si está ocupado); /api → proxy a localhost:3000
npm run build     # build de producción + service worker (vite-plugin-pwa)
npm run preview   # sirve el build
```

No hay tests, linter ni TypeScript. La verificación mínima es que `npm run build` pase sin errores; para cambios
visuales, abrir la app con la API levantada (`npm run dev` desde la raíz).

## Estructura

```
src/
├── main.jsx               StrictMode → BrowserRouter → AuthProvider → App
├── App.jsx                rutas; RequireAuth envuelve <Layout> (todas salvo /login)
├── index.css              Tailwind 4: tokens en @theme, keyframes, regla reduced-motion
├── api/client.js          api.get/post/put/patch/delete → fetch a /api + cookie; lanza ApiError
├── auth/AuthContext.jsx   useAuth(): { user, loading, login, register, logout }
├── hooks/useApi.js        useApi(path) → { data, error, reload, setData }
├── lib/dates.js           toDayString, addDays, weekStart, formatDay (espejo de Backend/src/lib/days.js)
├── components/            piezas reutilizables (Modal, Heatmap, ActivityHeatmap, Medal, ProgressBar, Layout)
│   └── <dominio>/         componentes de un dominio: habits/HabitCard, HabitForm, HabitDetail
└── pages/                 una por ruta; dueñas de los datos y de las mutaciones
```

Rutas (`App.jsx`): `/` Hoy · `/tareas` · `/habitos` · `/foco` · `/calendario` · `/perfil` · `/categorias` · `/login`.
`RequireAuth` envuelve `GameProvider` → `FocusProvider` → `Layout`. El header lleva al perfil (nivel y
racha) y muestra el temporizador en marcha fuera de `/foco`; "Cerrar sesión" está en `/perfil`.
Las URLs van **en español**; cualquier otra ruta redirige a `/`. Una pestaña nueva se añade en `TABS` de `Layout.jsx`.

## Datos y API

- Siempre a través de `api` (`api/client.js`), con rutas **sin** el prefijo `/api` (`api.get('/habits?...')`).
  Nunca `fetch` directo ni URLs absolutas: el proxy de Vite hace que sea mismo origen y la cookie viaje sola.
- Las respuestas son objetos con clave (`{ habits }`, `{ user }`); desestructurar, no asumir arrays.
- `ApiError` trae `status`, `message` (ya en español, viene del backend) y `details` (issues de Zod en 400).
  Mostrar `err.message` (o `err.details?.[0]?.message` si es más concreto) en un `<p className="text-sm text-red-400">`.
- Lecturas con `useApi(path)`. Pasar `null` para no pedir nada. Si cambia `path`, se vuelve a pedir.
- `useApi` no tiene caché compartida: dos componentes con el mismo path hacen dos peticiones. Para forzar una
  recarga en un hijo que no es dueño de los datos, se le pasa un `version` que el padre incrementa y se añade
  a la URL como `&v=${version}` (ver `ActivityHeatmap` y `HabitDetail`).

**Mutaciones** (patrón de `HabitsPage.handleLog`):

```js
async function handleLog(habit, day, value) {
  habitsApi.setData((d) => ({ habits: applyLog(d.habits, habit.id, day, value, today) })); // 1. optimista
  try {
    await api.put(`/habits/${habit.id}/logs/${day}`, { value });                          // 2. API
  } finally {
    await refresh();                                                                      // 3. verdad del servidor
  }
}
```

- La función que aplica el cambio optimista es pura y vive fuera del componente (`applyLog`).
- Actualizar solo lo que se puede deducir con certeza (valor de hoy, `doneToday`); rachas y estadísticas
  derivadas las recalcula el servidor en el `reload()`.
- `finally` + `reload()` garantiza que, si la API falla, la UI vuelve al estado real.
- Crear, editar y archivar no son optimistas: esperan la respuesta, cierran el modal y recargan. Así el formulario
  puede mostrar el error si falla.

## Fechas

- "Hoy" se obtiene con `toDayString()` (fecha **local** del navegador) y se envía al backend (`?today=`). Es la
  única función que usa la hora local; todo lo demás opera sobre strings `YYYY-MM-DD` en UTC.
- Las páginas lo fijan una vez con `const [today] = useState(toDayString)`.
- Para mostrar fechas, `formatDay(day, opciones)` (español, `timeZone: 'UTC'`). No usar `new Date(day)` ni
  `toLocaleDateString` sobre un día: con zonas horarias negativas se desplaza al día anterior.
- Si cambias la aritmética de días aquí, cambia también `Backend/src/lib/days.js` (deben coincidir).

## UI y estilos

- Tailwind 4 sin `tailwind.config`: los tokens están en `@theme` de `index.css` → clases `bg-bg`, `bg-surface`,
  `border-border`, `text-muted`, `bg-accent`, `text-accent`, `bg-accent/15`... Añadir colores o animaciones nuevas
  ahí, no como hex sueltos.
- Excepciones existentes: el color de una **categoría** (viene de la API) se aplica con `style`, y sus variantes
  suaves con `color-mix(in srgb, ${color} 20%, transparent)`. Texto sobre un fondo de color: `#0f172a` (= `bg`).
  Errores y acciones destructivas: `text-red-400`.
- Bloques visuales recurrentes:
  - Tarjeta: `rounded-2xl bg-surface p-4`.
  - Input: `w-full rounded-lg border border-border bg-bg px-3 py-2 outline-none focus:border-accent`.
  - Botón principal: `rounded-lg bg-accent py-2 font-semibold text-bg hover:brightness-110 disabled:opacity-60`.
  - Chip seleccionable: `rounded-full border px-3 py-1 text-sm` (`border-accent bg-accent/15` si está activo).
  - Estado vacío: `rounded-2xl border border-dashed border-border p-5 text-center`, con sugerencias de un toque.
  - Botón flotante "+": `fixed right-4 bottom-20 z-40 grid size-10 place-items-center rounded-full bg-accent text-xl`
    con `<Icon name="plus" />` (encima de la nav inferior; mismo botón en Hábitos y Calendario).
- Layout: `Layout.jsx` ya pone `max-w-2xl`, el header (nivel y racha) y la nav inferior con `safe-area-inset`;
  las páginas solo devuelven su contenido (`<div className="space-y-4 pt-2">`) y añaden `pb` si hace falta
  (el `<main>` ya deja `pb-24`).
- Formularios y detalles dentro de `<Modal title onClose>` (hoja inferior en móvil, cierra con Esc y clic fuera).
  Un solo estado `modal` por página: `{ type: 'create' | 'detail' | 'edit', item? }`, y el ítem del modal se
  vuelve a buscar en la lista actual para que no quede desactualizado tras un `reload()`.
- Formularios: solo el nombre es `required` y lleva `autoFocus`; el resto con valores por defecto. Opciones
  cortas como chips o botones −/+, no `<select>`. Estado `saving` para deshabilitar el botón.

## Feedback y gamificación

- Toda acción completada da feedback inmediato en el propio elemento: `animate-pop` en el botón y un "+N" flotante
  con `animate-rise` que se quita con un `setTimeout` (~900 ms). Ver `HabitCard`.
- Los puntos los define el backend (`HABIT_POINTS`) y la respuesta los devuelve (`points`). El `+10` de `HabitCard`
  está escrito a mano; en componentes nuevos, preferir el valor de la respuesta o una constante compartida.
- Progreso visible: barras (`h-2 rounded-full bg-surface` + relleno `bg-accent transition-all`), cuadrículas
  (`<Heatmap>`) y contadores `x/y` con `tabular-nums`. Evitar números sueltos sin contexto.
- `<Heatmap values={Map<day, número>} today weeks max color tooltip>` sirve para cualquier serie diaria; no hacer
  otra cuadrícula.
- Lenguaje amable y sin culpa: "Empieza tu racha hoy", "¡Todo al día!", "Te faltan: …". Confirmaciones solo para
  archivar (`window.confirm`), y diciendo que el historial se conserva.
- `<Medal tier size shine dim>` dibuja la medalla semanal (`tier` 0 = semana sin medalla, hueco punteado). `shine`
  si hoy hubo actividad (`profile.todayPoints > 0`), `dim` si aún no. Colores del metal en `lib/medals.js`
  (excepción a los tokens, como las categorías). Datos: `useGame().profile.week`, `.rank` y `useGame().weeks`.
- Una semana sin medalla se llama "Descanso"; nunca mostrarla como fallo.
- Nivel, XP, racha, logros, medallas y rango vienen de `useGame()`; nunca calcularlos en el cliente.
- Colores del juego en tokens: `gold` (XP, logros), `rest` (descansos), `event` (eventos de Google).

## Accesibilidad

- Botones de solo ícono con `aria-label`; toggles con `aria-pressed`; celdas de días con `title`.
- Áreas táctiles de al menos `size-8` (mejor `size-11`/`size-12` para la acción principal).
- Las animaciones nuevas se definen en `@theme` para que las cubra la regla `prefers-reduced-motion`.

## PWA

- Configurada en `vite.config.js` (`registerType: 'autoUpdate'`, manifest en español, ícono `public/icon.svg`).
- `/api` está excluida del fallback de navegación: nunca cachear respuestas de la API en el service worker.
- Si cambia `theme_color`, cambiar también el `<meta name="theme-color">` de `index.html` y el token `--color-bg`.
- El service worker solo se genera en `build`; para probar la instalación o el modo offline usar `npm run preview`.

## Errores frecuentes a evitar

- Importar de `react-router-dom` (es `react-router` v7) o actualizar React Router, Vite o Tailwind sin pedirlo.
- Esperar la respuesta de la API antes de reflejar un check o un "+1" (rompe la recompensa inmediata).
- Calcular rachas, puntos o niveles en el cliente: es lógica del backend.
- Mostrar todo de golpe: la vista Hoy resume y enlaza; el detalle va en su página o en un modal.
- Textos de UI en inglés o con tono de reproche.
