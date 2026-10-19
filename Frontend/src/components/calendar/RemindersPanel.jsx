import { useState } from 'react';
import { useReminderSettings } from '../../hooks/useReminders.js';
import { notificationPermission, notify, requestNotifications } from '../../lib/notify.js';

const LEAD_TIMES = [0, 5, 10, 15, 30];

export default function RemindersPanel() {
  const [settings, update] = useReminderSettings();
  const [permission, setPermission] = useState(notificationPermission);

  async function toggle(enabled) {
    if (enabled && permission !== 'granted') {
      const result = await requestNotifications();
      setPermission(result);
      if (result !== 'granted') return;
    }
    update({ enabled });
  }

  if (permission === 'unsupported') {
    return <p className="text-sm text-muted">Este navegador no permite notificaciones.</p>;
  }

  return (
    <div className="space-y-3 text-sm">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={settings.enabled && permission === 'granted'}
          onChange={(e) => toggle(e.target.checked)}
          className="size-4 accent-[var(--color-accent)]"
        />
        Avisarme antes de mis tareas con hora
      </label>
      {settings.enabled && permission === 'granted' && (
        <div className="flex flex-wrap items-center gap-2">
          {LEAD_TIMES.map((m) => (
            <button
              key={m}
              onClick={() => update({ minutesBefore: m })}
              className={`rounded-full border px-3 py-1 ${settings.minutesBefore === m ? 'border-accent bg-accent/15' : 'border-border text-muted'}`}
            >
              {m ? `${m} min antes` : 'A la hora'}
            </button>
          ))}
          <button onClick={() => notify('🔔 Prueba de Quest', 'Así se verán tus recordatorios')} className="text-xs text-muted underline">
            Probar
          </button>
        </div>
      )}
      {permission === 'denied' && (
        <p className="text-xs text-amber-400">Las notificaciones están bloqueadas: actívalas en los ajustes del sitio del navegador.</p>
      )}
      <p className="text-xs text-muted">
        Funcionan en este dispositivo mientras Quest esté abierta (aunque sea en segundo plano). El pomodoro también avisa al terminar.
      </p>
    </div>
  );
}
