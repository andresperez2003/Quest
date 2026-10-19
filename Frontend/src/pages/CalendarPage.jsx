import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useApi } from '../hooks/useApi.js';
import { useTasks } from '../hooks/useTasks.js';
import { addDays, localDateTime, toDayString } from '../lib/dates.js';
import { CALENDAR_VIEWS, groupByDay, rangeFor, rangeLabel, shiftCursor, toItems } from '../lib/calendar.js';
import Modal from '../components/Modal.jsx';
import TaskDetailModal from '../components/tasks/TaskDetailModal.jsx';
import DayView from '../components/calendar/DayView.jsx';
import WeekView from '../components/calendar/WeekView.jsx';
import MonthView from '../components/calendar/MonthView.jsx';
import TaskTray from '../components/calendar/TaskTray.jsx';
import EventForm from '../components/calendar/EventForm.jsx';
import GooglePanel from '../components/calendar/GooglePanel.jsx';
import RemindersPanel from '../components/calendar/RemindersPanel.jsx';
import Icon from '../components/Icon.jsx';

const GOOGLE_NOTICES = {
  ok: 'Google Calendar conectado.',
  cancelado: 'Conexión con Google cancelada.',
  caducado: 'La conexión con Google tardó demasiado. Inténtalo de nuevo.',
  error: 'No se pudo conectar con Google. Revisa las credenciales del servidor e inténtalo de nuevo.',
};

function useGoogleEvents(connected, range) {
  const params = new URLSearchParams({
    timeMin: localDateTime(range.from).toISOString(),
    timeMax: localDateTime(addDays(range.to, 1)).toISOString(),
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
  return useApi(connected ? `/google/events?${params}` : null);
}

export default function CalendarPage() {
  const [today] = useState(toDayString);
  const [params, setParams] = useSearchParams();
  const [view, setView] = useState('day');
  const [cursor, setCursor] = useState(today);
  const [placing, setPlacing] = useState(null); // tarea de la bandeja elegida con "Colocar"
  const [modal, setModal] = useState(null); // { type: 'task', id } | { type: 'new', day, time? }
  const [noticeKey] = useState(() => params.get('google'));
  const notice = GOOGLE_NOTICES[noticeKey] ?? null;

  const range = useMemo(() => rangeFor(view, cursor), [view, cursor]);
  const tasks = useTasks('range', today, range);
  const inbox = useTasks('inbox', today);
  const { data: catData } = useApi('/categories');
  const google = useApi('/google/status');
  const connected = Boolean(google.data?.connected);
  const events = useGoogleEvents(connected, range);

  const { reload: reloadTasks } = tasks;
  useEffect(() => {
    if (params.has('google')) setParams({}, { replace: true });
  }, [params, setParams]);
  // Si el backend aplicó cambios hechos en Google a alguna tarea, se recargan.
  useEffect(() => {
    if (events.data?.tasksUpdated) reloadTasks();
  }, [events.data, reloadTasks]);

  const googleEvents = connected ? (events.data?.events ?? []) : [];
  const byDay = groupByDay(toItems(tasks.tasks, googleEvents, range));
  const days = Array.from({ length: (Date.parse(range.to) - Date.parse(range.from)) / 86_400_000 + 1 }, (_, i) => addDays(range.from, i));

  const findTask = (id) => tasks.tasks.find((t) => t.id === id) ?? inbox.tasks.find((t) => t.id === id);

  // Programar = ponerle día (y hora, si se soltó en una franja). `time` undefined conserva la hora.
  async function schedule(id, day, time) {
    setPlacing(null);
    const inRange = tasks.tasks.find((t) => t.id === id);
    const fromInbox = inbox.tasks.find((t) => t.id === id);
    const task = inRange ?? fromInbox;
    if (!task) return;
    const fields = { dueDay: day, dueTime: time === undefined ? task.dueTime : time };
    if (task.dueDay === fields.dueDay && task.dueTime === fields.dueTime) return;
    if (inRange) {
      await tasks.update(task, fields);
    } else {
      await inbox.update(task, fields);
      await tasks.reload();
    }
  }

  function onSlot(day, time) {
    if (placing) schedule(placing.id, day, time);
    else setModal({ type: 'new', day, time });
  }

  function pickDay(day) {
    setCursor(day);
    setView('day');
  }

  // Tras crear, se lleva al día del bloque para verlo (la vista de día se amplía si es de madrugada o de noche).
  async function createEvent(fields) {
    await tasks.create(fields);
    setModal(null);
    if (fields.dueDay < range.from || fields.dueDay > range.to || (view === 'day' && fields.dueDay !== cursor)) {
      pickDay(fields.dueDay);
    }
  }

  const openTask = (task) => setModal({ type: 'task', id: task.id });
  const detailTask = modal?.type === 'task' && findTask(modal.id);
  const detailSource = detailTask && tasks.tasks.some((t) => t.id === detailTask.id) ? tasks : inbox;

  return (
    <div className="space-y-4 pt-2">
      <header className="space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Calendario</h1>
          <div className="flex rounded-xl bg-surface p-1" role="tablist">
            {CALENDAR_VIEWS.map((v) => (
              <button
                key={v.value}
                role="tab"
                aria-selected={view === v.value}
                onClick={() => setView(v.value)}
                className={`rounded-lg px-3 py-1 text-sm ${view === v.value ? 'bg-bg font-semibold' : 'text-muted'}`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setCursor(shiftCursor(view, cursor, -1))} className="size-9 rounded-lg bg-surface" aria-label="Anterior">
            ‹
          </button>
          <button onClick={() => setCursor(shiftCursor(view, cursor, 1))} className="size-9 rounded-lg bg-surface" aria-label="Siguiente">
            ›
          </button>
          <h2 className="flex-1 truncate font-semibold first-letter:uppercase">{rangeLabel(view, cursor)}</h2>
          {cursor !== today && (
            <button onClick={() => setCursor(today)} className="rounded-lg bg-surface px-3 py-1.5 text-sm text-accent">
              Hoy
            </button>
          )}
        </div>
      </header>

      {notice && (
        <p className="rounded-xl bg-surface p-3 text-sm">
          {noticeKey === 'ok' && <Icon name="circle-check" className="text-accent" />} {notice}
        </p>
      )}
      {tasks.error && <p className="text-sm text-red-400">No se pudieron cargar las tareas: {tasks.error.message}</p>}
      {connected && events.error && <p className="text-sm text-red-400">Google Calendar: {events.error.message}</p>}

      {view === 'day' && (
        <>
          <TaskTray tasks={inbox.tasks} placing={placing} onPlace={setPlacing} />
          {placing && (
            <p className="sticky top-2 z-20 rounded-xl bg-accent p-2 text-center text-sm font-semibold text-bg">
              Toca una hora para colocar «{placing.title}»
            </p>
          )}
          <DayView
            day={cursor}
            items={byDay.get(cursor) ?? []}
            placing={placing}
            onDropTask={schedule}
            onSlot={onSlot}
            onOpenTask={openTask}
            onToggle={tasks.toggle}
          />
        </>
      )}
      {view === 'week' && (
        <WeekView
          days={days}
          today={today}
          byDay={byDay}
          onPickDay={pickDay}
          onDropTask={(id, day) => schedule(id, day)}
          onOpenTask={openTask}
          onToggle={tasks.toggle}
        />
      )}
      {view === 'month' && (
        <MonthView days={days} month={cursor.slice(0, 7)} today={today} byDay={byDay} onPickDay={pickDay} />
      )}

      <GooglePanel status={google.data} onChange={google.reload} today={today} />

      <section className="space-y-3 rounded-2xl bg-surface p-4">
        <h2 className="font-semibold">
          <Icon name="bell" className="text-muted" /> Recordatorios
        </h2>
        <RemindersPanel />
      </section>

      <button
        onClick={() => setModal({ type: 'new', day: view === 'day' ? cursor : today })}
        className="fixed right-4 bottom-20 z-40 grid size-10 place-items-center rounded-full bg-accent text-xl text-bg shadow-lg shadow-black/40 transition hover:brightness-110 sm:right-[calc(50%-20rem)]"
        aria-label="Nuevo en el calendario"
      >
        <Icon name="plus" />
      </button>

      {modal?.type === 'new' && (
        <Modal title="Nuevo en el calendario" onClose={() => setModal(null)}>
          <EventForm day={modal.day} time={modal.time} today={today} onSubmit={createEvent} />
        </Modal>
      )}
      {detailTask && (
        <TaskDetailModal
          task={detailTask}
          tasks={detailSource}
          today={today}
          categories={catData?.categories ?? []}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
