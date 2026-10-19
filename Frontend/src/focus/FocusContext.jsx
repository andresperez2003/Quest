import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api } from '../api/client.js';
import { toDayString } from '../lib/dates.js';
import { chime, unlockAudio } from '../lib/sounds.js';
import { notify } from '../lib/notify.js';

// El temporizador vive aquí (no en la página) para que siga corriendo al navegar,
// y se guarda en localStorage para sobrevivir a recargas o a cerrar la app.
const SESSION_KEY = 'quest:focus';
const SETUP_KEY = 'quest:focus-setup';
const MINUTE = 60_000;
// Si el periodo terminó hace más de esto (app cerrada), no suena ni notifica al volver.
const LATE_ALERT_MS = MINUTE;

const FocusContext = createContext(null);

function load(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}

function store(key, value) {
  try {
    if (value) localStorage.setItem(key, JSON.stringify(value));
    else localStorage.removeItem(key);
  } catch {
    /* almacenamiento no disponible */
  }
}

/**
 * session: null | {
 *   mode: 'focus' | 'rest', running, endsAt (ms, si corre), remainingMs (si está en pausa),
 *   focusMin, restMin, startedAt (ISO), day, taskId, habitId, label
 * }
 */
export function FocusProvider({ children }) {
  const [session, setSession] = useState(() => load(SESSION_KEY));
  const [setup, setSetup] = useState(() => load(SETUP_KEY) ?? { focus: 25, rest: 5 });
  const [now, setNow] = useState(Date.now);
  const [result, setResult] = useState(null); // último pomodoro registrado
  const finished = useRef(null);

  useEffect(() => store(SESSION_KEY, session), [session]);
  useEffect(() => store(SETUP_KEY, setup), [setup]);

  useEffect(() => {
    if (!session?.running) return;
    const tick = () => setNow(Date.now());
    const id = setInterval(tick, 500);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [session?.running]);

  const remainingMs = !session ? 0 : session.running ? Math.max(0, session.endsAt - now) : session.remainingMs;
  const totalMs = !session ? 0 : (session.mode === 'focus' ? session.focusMin : session.restMin) * MINUTE;

  const record = useCallback(async (s, actualMin, completed) => {
    if (actualMin < 1) return;
    const base = { taskId: s.taskId, label: s.label, minutes: actualMin, completed };
    try {
      const { points } = await api.post('/pomodoros', {
        day: s.day,
        plannedMin: s.focusMin,
        actualMin,
        completed,
        startedAt: s.startedAt,
        taskId: s.taskId,
        habitId: s.habitId,
      });
      setResult({ ...base, points });
    } catch (err) {
      setResult({ ...base, points: 0, error: err.message });
    }
  }, []);

  // Fin de periodo: el foco pasa a descanso (y se registra); el descanso termina la sesión.
  useEffect(() => {
    if (!session?.running || remainingMs > 0) return;
    const key = `${session.startedAt}:${session.mode}`;
    if (finished.current === key) return;
    finished.current = key;

    const onTime = Date.now() - session.endsAt < LATE_ALERT_MS;
    if (onTime) chime();
    if (session.mode === 'focus') {
      if (onTime) notify('🍅 ¡Pomodoro completado!', `Descansa ${session.restMin} min. Te lo has ganado.`, 'quest-focus');
      setSession({ ...session, mode: 'rest', endsAt: session.endsAt + session.restMin * MINUTE });
      record(session, session.focusMin, true);
    } else {
      if (onTime) notify('⏰ Fin del descanso', '¿Vamos a por otro pomodoro?', 'quest-focus');
      setSession(null);
    }
  }, [session, remainingMs, record]);

  const start = useCallback(({ focus, rest, taskId = null, habitId = null, label = null }) => {
    unlockAudio();
    const startedAt = Date.now();
    setResult(null);
    setSetup({ focus, rest, taskId, habitId, label });
    setNow(startedAt);
    setSession({
      mode: 'focus',
      running: true,
      endsAt: startedAt + focus * MINUTE,
      remainingMs: null,
      focusMin: focus,
      restMin: rest,
      startedAt: new Date(startedAt).toISOString(),
      day: toDayString(),
      taskId,
      habitId,
      label,
    });
  }, []);

  const pause = useCallback(() => {
    setSession((s) => s && { ...s, running: false, remainingMs: Math.max(0, s.endsAt - Date.now()), endsAt: null });
  }, []);

  const resume = useCallback(() => {
    setNow(Date.now());
    setSession((s) => s && { ...s, running: true, endsAt: Date.now() + s.remainingMs, remainingMs: null });
  }, []);

  // Parar antes de tiempo: los minutos ya enfocados cuentan igual (sin castigos).
  const stop = useCallback(() => {
    if (!session) return;
    setSession(null);
    if (session.mode === 'focus') {
      const left = session.running ? session.endsAt - Date.now() : session.remainingMs;
      record(session, Math.floor((session.focusMin * MINUTE - left) / MINUTE), false);
    }
  }, [session, record]);

  const value = {
    session,
    setup,
    remainingMs,
    totalMs,
    result,
    start,
    pause,
    resume,
    stop,
    skipRest: () => setSession(null),
    clearResult: () => setResult(null),
  };

  return <FocusContext.Provider value={value}>{children}</FocusContext.Provider>;
}

export function useFocus() {
  return useContext(FocusContext);
}
