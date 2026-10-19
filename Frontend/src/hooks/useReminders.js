import { useCallback, useEffect, useState } from 'react';
import { DATA_CHANGED } from '../api/client.js';
import { localDateTime, toDayString } from '../lib/dates.js';
import { notify } from '../lib/notify.js';
import { useApi } from './useApi.js';

const SETTINGS_KEY = 'quest:reminders';
const NOTIFIED_KEY = 'quest:notified';
const REFRESH_MS = 5 * 60_000;
const DEFAULTS = { enabled: false, minutesBefore: 10 };
const SETTINGS_EVENT = 'quest:reminders-changed';

function read(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* almacenamiento no disponible */
  }
}

// Ajustes de recordatorios de este dispositivo.
export function useReminderSettings() {
  const [settings, setSettings] = useState(() => ({ ...DEFAULTS, ...read(SETTINGS_KEY, {}) }));

  useEffect(() => {
    const onChange = () => setSettings({ ...DEFAULTS, ...read(SETTINGS_KEY, {}) });
    window.addEventListener(SETTINGS_EVENT, onChange);
    return () => window.removeEventListener(SETTINGS_EVENT, onChange);
  }, []);

  const update = useCallback((patch) => {
    const next = { ...DEFAULTS, ...read(SETTINGS_KEY, {}), ...patch };
    write(SETTINGS_KEY, next);
    window.dispatchEvent(new Event(SETTINGS_EVENT));
  }, []);

  return [settings, update];
}

/**
 * Avisa antes de cada tarea de hoy con hora, mientras la app esté abierta (o en segundo plano).
 * Cada aviso se recuerda en localStorage para no repetirse al recargar.
 */
export function useReminders() {
  const [settings] = useReminderSettings();
  const [version, setVersion] = useState(0);
  const today = toDayString();
  const { data } = useApi(settings.enabled ? `/tasks?view=today&today=${today}&v=${version}` : null);

  useEffect(() => {
    if (!settings.enabled) return;
    const bump = () => setVersion((v) => v + 1);
    const id = setInterval(bump, REFRESH_MS);
    window.addEventListener(DATA_CHANGED, bump);
    return () => {
      clearInterval(id);
      window.removeEventListener(DATA_CHANGED, bump);
    };
  }, [settings.enabled]);

  useEffect(() => {
    if (!settings.enabled || !data) return;
    const notified = new Set(read(NOTIFIED_KEY, []));
    const timers = data.tasks
      .filter((t) => t.status === 'pending' && t.dueDay === today && t.dueTime)
      .map((task) => {
        const key = `${task.id}:${today}:${task.dueTime}`;
        const delay = localDateTime(today, task.dueTime) - settings.minutesBefore * 60_000 - Date.now();
        if (notified.has(key) || delay < -REFRESH_MS) return null; // ya avisada o pasó hace rato
        return setTimeout(() => {
          write(NOTIFIED_KEY, [...read(NOTIFIED_KEY, []), key].slice(-100));
          const when = settings.minutesBefore ? `en ${settings.minutesBefore} min` : 'ahora';
          notify(`⏰ ${task.title}`, `Empieza ${when} (${task.dueTime})`, key);
        }, Math.max(0, delay));
      });
    return () => timers.forEach((t) => t && clearTimeout(t));
  }, [data, settings, today]);
}
