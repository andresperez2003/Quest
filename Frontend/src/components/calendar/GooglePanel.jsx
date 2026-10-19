import { useState } from 'react';
import { api } from '../../api/client.js';
import Icon from '../Icon.jsx';
import { useConfirm } from '../Confirm.jsx';

const timeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

// La conexión es una navegación completa: el backend redirige a Google y vuelve a /calendario.
// Un solo permiso: ver los eventos de Google y enviar allí las tareas con hora.
function connect(today) {
  const params = new URLSearchParams({ tz: timeZone(), today });
  window.location.href = `/api/google/connect?${params}`;
}

export default function GooglePanel({ status, onChange, today }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const confirm = useConfirm();
  if (!status) return null;

  async function run(promise) {
    setBusy(true);
    setError('');
    try {
      await promise;
      await onChange();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!status.configured) {
    return (
      <section className="rounded-2xl bg-surface p-4 text-sm text-muted">
        <Icon name="calendar-days" /> Para conectar Google Calendar hay que poner <code>GOOGLE_CLIENT_ID</code> y{' '}
        <code>GOOGLE_CLIENT_SECRET</code> en <code>Backend/.env</code>. Los pasos están en el README.
      </section>
    );
  }

  if (!status.connected) {
    return (
      <button
        onClick={() => connect(today)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-event/15 py-3.5 font-semibold text-event ring-1 ring-event/30 transition hover:bg-event/25"
      >
        <Icon name="calendar-days" /> Conectar Google Calendar
      </button>
    );
  }

  return (
    <section className="space-y-3 rounded-2xl bg-surface p-4 text-sm">
      <div className="flex items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-event/15 text-lg text-event">
          <Icon name="calendar-days" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            Google Calendar <Icon name="circle-check" className="text-accent" />
          </p>
          {status.email && <p className="truncate text-xs text-muted">{status.email}</p>}
        </div>
        <button
          disabled={busy}
          onClick={async () =>
            (await confirm({ title: '¿Desconectar Google Calendar?', confirmLabel: 'Desconectar', danger: true })) &&
            run(api.post('/google/disconnect'))
          }
          className="shrink-0 text-xs text-red-400"
        >
          Desconectar
        </button>
      </div>
      {status.canWrite && status.syncTasks ? (
        <p className="text-xs text-muted">
          Tus tareas con hora se envían a Google. Si mueves o renombras el evento allí, la tarea se actualiza aquí.
        </p>
      ) : status.canWrite ? (
        <button
          disabled={busy}
          onClick={() => run(api.patch('/google/settings', { syncTasks: true, timeZone: timeZone(), today }))}
          className="w-full rounded-lg bg-bg py-2 text-event"
        >
          Sincronizar mis tareas con Google
        </button>
      ) : (
        <button onClick={() => connect(today)} className="w-full rounded-lg bg-bg py-2 text-event">
          Volver a conectar para sincronizar mis tareas
        </button>
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}
    </section>
  );
}
