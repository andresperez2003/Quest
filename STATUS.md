# Estado del proyecto — Quest

_Última actualización: 2026-10-19_

**Progreso: 6 de 7 fases completadas** (0 a 5) · Siguiente: **Fase 6 — Extras**

| Fase | Contenido | Estado |
|---|---|---|
| 0 | Estructura, base de datos, login, PWA | ✅ Completada |
| 1 | Tareas + categorías + vista "Hoy" | ✅ Completada |
| 2 | Hábitos + mapa de calor estilo GitHub | ✅ Completada |
| 3 | Pomodoro / foco | ✅ Completada |
| 4 | Gamificación: XP, niveles, rachas, logros, medallas y rango | ✅ Completada |
| 5 | Calendario + Google Calendar | ✅ Completada (Google sin probar con cuenta real) |
| 6 | Extras: recompensas, check-in de ánimo, IA | ⏭️ Siguiente |

---

## ✅ Fases completadas

### Fase 0 — Base
- [x] Backend Node 26 + Express 5 + Prisma 6 (SQLite)
- [x] Frontend React 19 + Vite 8 + Tailwind 4, instalable como PWA
- [x] Login con JWT en cookie `httpOnly`; registro abierto desde la app (se cierra con `ALLOW_REGISTRATION=false`)
- [x] Límite de intentos de login
- [x] Pantalla de login rediseñada (2026-10-19): dividida (beneficios + formulario; en móvil, compacta), pestañas
      Entrar / Crear cuenta, ver/ocultar contraseña, aviso de Bloq Mayús, medidor de seguridad al registrarse y
      errores junto a cada campo
- [x] "¿Olvidaste tu contraseña?" (2026-10-19): enlace por email con Gmail (SMTP, contraseña de aplicación) que caduca a
      los 30 min y sirve una vez; al usarlo entra directo. Solo aparece si `SMTP_USER`/`SMTP_PASS` están configurados.
      Tabla `PasswordReset` (migración `password_reset`). Falta probar el envío con una cuenta de Gmail real
- [ ] Login: "Continuar con Google" (reutilizar el OAuth de Calendar; vincular por email)
- [x] **Mi perfil** (`/mi-perfil`, inicial del nombre en el header): cambiar nombre, cambiar contraseña (pide la actual,
      mínimo 8 caracteres, con límite de intentos) y cerrar sesión (2026-10-19)
- [x] Al registrarse: 5 categorías por defecto
- [x] Navegación inferior mobile-first
- [x] `npm run dev` levanta API y web a la vez

### Fase 1 — Tareas, categorías y "Hoy"
- [x] Entrada rápida (escribir + Enter), con prioridad opcional al crear (Media por defecto; también en el calendario) (2026-10-19)
- [x] Subtareas ("pasos pequeños"), un solo nivel
- [x] Prioridad, energía requerida, tiempo estimado, fecha y hora opcionales
- [x] Recurrencia: diaria, lunes a viernes, días de la semana, mensual
- [x] Bandeja de entrada (tareas sin fecha); la fecha se pone desde el detalle (el botón "→ Hoy" se quitó el 2026-10-19)
- [x] Vista "Próximas" agrupada por día
- [x] Vista "Hoy": máximo 5 visibles, atrasadas arriba, hechas plegadas
- [x] **"¿Qué hago ahora?"**: sugiere una tarea según energía y tiempo disponible
- [x] Recompensa al completar (+10 tarea, +2 subtarea) con animación
- [x] CRUD de categorías (nombre, color, ícono)

### Fase 2 — Hábitos y mapa de calor
- [x] Hábitos simples, con cantidad (ej. 8 vasos) y semanales (ej. 3 veces/semana)
- [x] Rachas actual y mejor, sin romperse hasta que termina el periodo
- [x] Los hábitos solo se registran el mismo día (2026-10-19); los últimos 7 días se ven pero no se editan
- [x] Mapa de calor global (6 meses) en "Hoy" y "Hábitos", y uno por hábito
- [x] Sugerencias para crear el primer hábito con un toque
- [x] Archivar sin perder el historial

### Fase 3 — Pomodoro / foco
- [x] Temporizador 25/5, 50/10, 15/3 o personalizado, con círculo que se vacía
- [x] Sigue corriendo al cambiar de pantalla o recargar (indicador en el header)
- [x] Vincular la sesión a una tarea o a un hábito
- [x] Estimado vs. real: barra en el detalle de la tarea y en Foco; chip "⏱ real / estimado" en las listas
- [x] Modo foco a pantalla completa (mantiene la pantalla encendida si el navegador lo permite)
- [x] "Aparcar distracciones" → van a la bandeja sin salir del foco
- [x] Subtareas de la tarea en el modo foco: se marcan ahí mismo (+2), con barra "2 de 5" y el siguiente paso destacado (2026-10-19)
- [x] Aviso sonoro + notificación al terminar (los sonidos de fondo se quitaron el 2026-10-19)
- [x] Suma puntos al mapa de calor (1 cada 5 min; parar antes también cuenta)
- [x] "▶ ¡Empezar!" desde "¿Qué hago ahora?" y "Enfocarme en esta tarea" desde el detalle
- [x] Al terminar: "Marcar la tarea como hecha" con un toque

### Fase 4 — Gamificación
- [x] XP (= todos los puntos) y niveles con barra en el header
- [x] Monedas (1 por cada 10 XP): el backend las calcula, pero se retiraron de la interfaz (2026-10-19) hasta tener
      en qué gastarlas (ver "Funcionalidades extra")
- [x] Racha global (cualquier actividad cuenta) con congeladores: 1 de bienvenida, +1 cada 7 días, máximo 2
- [x] 15 logros con XP extra, que nunca se pierden
- [x] ~~Mascota~~ → sustituida por medallas y rango (2026-10-19, ver abajo)
- [x] Cofre sorpresa diario al superar un umbral secreto de puntos
- [x] Avisos de logro, subida de nivel, medalla, rango y congeladores
- [x] Resumen semanal en positivo (sin reproches si la semana fue peor)
- [x] Página **Perfil**: rango, medalla de la semana, resumen semanal, vitrina, nivel, racha, logros
- [x] **Medalla semanal** (lunes → domingo) con los puntos de tareas, hábitos y foco, sin bonus: Bronce 20,
      Plata 60, Oro 120, Platino 200, Diamante 300. Barra hacia la siguiente en "Hoy" y en el perfil; brilla si hoy
      hubo actividad
- [x] **Rango de honor** (Novato → Explorador → Aventurero → Veterano → Maestro → Gran Maestro → Leyenda): cada
      medalla suma 1–5 de honor y el rango nunca baja. Se calcula desde el historial (las semanas pasadas cuentan)
- [x] **Vitrina**: medallas ganadas por tipo y resumen mensual navegable con la medalla de cada semana
- [x] Mascota eliminada de la UI, la API y la BD (migración `remove_pet`)

### Fase 5 — Calendario
- [x] Vistas día / semana / mes
- [x] Time-blocking: arrastrar tareas de la bandeja a una hora (escritorio) o "Colocar" + tocar la hora (móvil)
- [x] Mover bloques arrastrándolos; tocar una hora vacía crea una tarea ahí
- [x] Botón flotante "+" para crear un bloque con fecha, hora (cualquiera, también de madrugada) y duración;
      tocar una hora vacía abre el mismo formulario con la hora puesta (2026-10-19)
- [x] Google Calendar vía OAuth con un solo botón: lectura y escritura en un mismo consentimiento
- [x] Sincronización bidireccional automática al conectar: las tareas con hora se envían a Google y si mueves o renombras el
      evento allí, la tarea se actualiza aquí
- [x] Recordatorios locales antes de las tareas con hora (5–30 min antes), con botón de prueba

### Interfaz — Íconos
- [x] Íconos de **Lucide** (`lucide-react`) en lugar de emojis, con el componente `<Icon name>`
      (`Frontend/src/components/Icon.jsx`)
- [x] Hábitos, categorías y logros guardan el nombre del ícono (`book-open`); los emojis antiguos de la BD se
      traducen al vuelo, sin migración
- [x] Siguen con emoji a propósito: las notificaciones del sistema y el prefijo `✅` de los eventos de Google

**Tests:** 43 tests del backend pasando (rachas, recurrencia, sugerencias, pomodoro, niveles, congeladores,
logros, medallas y rango, cofre, resumen semanal, conversión de eventos de Google).

---

## ⏳ Fases pendientes

### Fase 6 — Extras ⏭️
- [ ] Tienda de recompensas propias (canjear monedas; ver "Funcionalidades extra → Monedas")
- [ ] Check-in diario de ánimo y energía
- [ ] Rutinas paso a paso (mañana / noche)
- [ ] Asistente IA que divide y agenda tareas

---

## 🪙 Funcionalidades extra — Monedas (pendiente de retomar)
Hoy `User.coins` = XP ÷ 10, se recalcula en cada sync y no se puede gastar; por eso no se muestra en la UI.
Idea para retomarlas:
- [ ] **Tienda de recompensas propias**: el usuario crea premios de la vida real con precio (ej. capítulo 15,
      café 30, cine 150). Incluir premios baratos para canjear a menudo
- [ ] **Comprar congeladores de racha** como segunda vía, además de ganarlos cada 7 días
- [ ] (Opcional) Cosméticos: temas de color, marcos de rango
- [ ] Ganarlas: 1 cada 10 puntos + bonus por medalla semanal (Bronce +5, Plata +10, Oro +20, Platino +35,
      Diamante +50) y al subir de rango. A ritmo actual: ~15–35 monedas/semana
- [ ] Técnica: saldo = ganadas (derivado del historial) − gastadas (tabla nueva). Modelos `Reward` (nombre, ícono,
      precio, `archived`) y `Redemption` (premio, día, precio). Saldo nunca negativo; deshacer un canje el mismo día
- No hacer: comprar medallas, honor o XP (romperían su significado)
- Al retomarlas, volver a mostrar el saldo en el header y en el perfil

## 🏆 Funcionalidades extra — Ranking entre amigos (a futuro)
Compararse con amigos en grupos privados, no con desconocidos en un ranking global. Habrá dos rankings:
- [ ] **Semanal**: puntos de la semana (lunes → domingo), con la misma suma que las medallas (tareas, hábitos y
      pomodoros, sin bonus de logros ni cofres). Se reinicia cada lunes: todos empiezan de cero y una mala semana no
      te hunde. Cuenta atrás hasta el cierre
- [ ] **Histórico**: honor acumulado (rango). Nunca baja y premia la constancia; no el XP total, que solo favorece
      a quien lleva más tiempo
- [ ] **Grupos**: crear un grupo y unirse con un código de invitación; salir cuando se quiera. Un top 10 por grupo
- [ ] Tu fila siempre visible (resaltada, o fija abajo si estás fuera del top 10) con un mensaje en positivo
      ("Te faltan 35 pts para el top 10") y una barra hasta el siguiente puesto. Sin "puesto 47 de 50"
- [ ] Podio con los 3 primeros y su medalla de la semana
- [ ] Participar es opcional (interruptor "aparecer en el ranking"); salir no afecta a medallas ni rango
- [ ] Avisos una vez con `<GameToasts>` al entrar al top 3 o terminar la semana en el podio (`GameEvent` `ranking`)
- [ ] Privacidad: solo se muestran alias, nivel, rango y puntos; nunca nombres de tareas ni hábitos
- Técnica:
  - El registro ya está abierto; falta (opcional) invitar por enlace
  - Modelos `Group` (nombre, código de invitación) y `GroupMember`; en `User`, `alias` y `showInRanking`.
    Migración no destructiva
  - Es la primera consulta que cruza usuarios: ruta excepcional que solo devuelve campos públicos y agregados, y solo
    de grupos a los que perteneces
  - Calcular desde `ActivityLog` agrupando por usuario, no desde `User.xp` (caché que solo actualiza el sync)
  - Cada usuario cuenta su semana en su zona horaria; aceptable entre amigos
  - Trampas (tareas tontas para inflar puntos): menos crítico entre amigos; si hace falta, tope diario de puntos por
    tareas que cuentan para el ranking

## 💡 Mejoras propuestas (sin fase asignada)
- [ ] Revisar los umbrales de medallas y rangos tras 4–6 semanas de uso real (`modules/game/medals.js`)
- [ ] "¿Qué hago ahora?": priorizar tareas con hora próxima
- [ ] "¿Qué hago ahora?": tareas de la bandeja suman puntos con los días, para que no se olviden
- [ ] "¿Qué hago ahora?": sugerir dividir una tarea si se salta varias veces
- [ ] Íconos PNG para la PWA (mejor instalación en iPhone)

- [ ] Notificaciones push con la app cerrada (Web Push + VAPID); hoy los recordatorios necesitan la app abierta
      o en segundo plano
- [ ] Recordatorios también para eventos de Google (Google ya avisa por su cuenta)
- [ ] **Google Calendar para cualquier usuario con un solo botón "Conectar con Google"** (sin configurar nada).
      El código ya guarda los tokens por usuario; falta:
      - Publicar Quest con dominio propio y HTTPS, (el registro ya está abierto)
      - Pasar la app de Google Cloud a **Producción** y completar la verificación de Google (permisos de calendario
        "sensibles"): página de inicio, política de privacidad, dominio verificado y vídeo de demostración
      - Mientras tanto (pocos usuarios): modo **Prueba**, añadiendo cada email como usuario de prueba (máx. 100);
        la conexión caduca cada 7 días y hay que volver a pulsar Conectar
      - Alternativa sin Google Cloud: leer el calendario con la dirección secreta iCal (solo lectura)

## 📝 Pendientes menores
- [ ] Primer commit en git (el repo está inicializado pero sin commits)
- [ ] Revisar la interfaz de las Fases 1 a 5 en el navegador
- [ ] Probar Google Calendar con credenciales reales (el flujo está probado con una API simulada)
- [ ] Borrar `Backend/prisma/dev.backup-2026-10-16.db` y `dev.backup-2026-10-19.db` (antes de quitar la mascota) cuando confirmes que todo va bien
- [x] Regenerar el cliente de Prisma tras quitar `Pet`
