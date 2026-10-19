import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useFocus } from '../focus/FocusContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { formatDay, toDayString } from '../lib/dates.js';
import { PRESETS, pomodoroPoints } from '../lib/focus.js';
import { formatMinutes } from '../lib/tasks.js';
import FocusMode from '../components/focus/FocusMode.jsx';
import EstimateBar from '../components/focus/EstimateBar.jsx';
import Icon from '../components/Icon.jsx';

const chip = (active) =>
  `rounded-full border px-3 py-1.5 text-sm transition ${active ? 'border-accent bg-accent/15 text-white' : 'border-border text-muted'}`;

function Stepper({ label, value, min, max, step, onChange }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-bg px-3 py-2 text-sm">
      <span className="text-muted">{label}</span>
      <span className="flex items-center gap-3">
        <button type="button" className="grid place-items-center size-8 rounded-lg bg-surface" onClick={() => onChange(Math.max(min, value - step))}>
          <Icon name="minus" />
        </button>
        <span className="w-14 text-center tabular-nums">{value} min</span>
        <button type="button" className="grid place-items-center size-8 rounded-lg bg-surface" onClick={() => onChange(Math.min(max, value + step))}>
          <Icon name="plus" />
        </button>
      </span>
    </div>
  );
}

// Minutos de foco de los últimos 7 días, como barras (tiempo visible).
function RecentFocus({ stats }) {
  const max = Math.max(25, ...stats.recent.map((d) => d.minutes));
  return (
    <section className="rounded-2xl bg-surface p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="font-semibold">Tu foco</h2>
        <span className="text-xs text-muted">
          Hoy:{' '}
          {stats.today.completed > 0
            ? Array.from({ length: Math.min(stats.today.completed, 8) }, (_, i) => (
                <Icon key={i} name="timer" className="text-accent" />
              ))
            : 'ningún pomodoro aún'}
          {stats.today.minutes > 0 && ` · ${formatMinutes(stats.today.minutes)}`}
        </span>
      </div>
      <div className="flex h-20 items-end gap-2">
        {stats.recent.map((d) => (
          <div key={d.day} className="flex flex-1 flex-col items-center gap-1" title={`${formatDay(d.day)}: ${d.minutes} min`}>
            <div className="flex w-full flex-1 items-end">
              <div
                className="w-full rounded-t-md bg-accent/70 transition-all duration-500"
                style={{ height: `${Math.max(d.minutes ? 6 : 2, (d.minutes / max) * 100)}%`, opacity: d.minutes ? 1 : 0.25 }}
              />
            </div>
            <span className="text-[10px] text-muted">{formatDay(d.day, { weekday: 'narrow' })}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function FocusSetup() {
  const focus = useFocus();
  const [params, setParams] = useSearchParams();
  const [today] = useState(toDayString);
  const [durations, setDurations] = useState({ focus: focus.setup.focus, rest: focus.setup.rest });
  const [target, setTarget] = useState(() =>
    params.get('task')
      ? { type: 'task', id: params.get('task') }
      : focus.setup.taskId
        ? { type: 'task', id: focus.setup.taskId }
        : focus.setup.habitId
          ? { type: 'habit', id: focus.setup.habitId }
          : null,
  );

  const { data: taskData } = useApi(`/tasks?view=today&today=${today}`);
  const { data: habitData } = useApi(`/habits?today=${today}`);
  const { data: stats } = useApi(`/pomodoros/stats?today=${today}`);
  const pendingTasks = (taskData?.tasks ?? []).filter((t) => t.status === 'pending');
  const habits = (habitData?.habits ?? []).filter((h) => !h.stats.doneToday);

  // La tarea elegida puede no ser de hoy (p. ej. de la bandeja desde "¿Qué hago ahora?").
  const listed = target?.type === 'task' && pendingTasks.find((t) => t.id === target.id);
  const { data: single, error: singleError } = useApi(target?.type === 'task' && taskData && !listed ? `/tasks/${target.id}` : null);
  const task = target?.type === 'task' ? (listed || single?.task) : null;
  const habit = target?.type === 'habit' ? habits.find((h) => h.id === target.id) : null;
  const label = task?.title ?? habit?.name ?? null;
  const extraTask = task && !listed ? task : null;

  function start() {
    focus.start({
      ...durations,
      taskId: task?.id ?? null,
      habitId: habit?.id ?? null,
      label,
    });
  }

  // "¡Empezar!" desde otra pantalla: arranca en cuanto se conoce la tarea.
  const autoStart = params.get('start') === '1';
  const ready = !target || task || habit || singleError;
  useEffect(() => {
    if (!autoStart || !ready) return;
    setParams({}, { replace: true });
    start();
  });

  const presetActive = (p) => p.focus === durations.focus && p.rest === durations.rest;

  return (
    <div className="space-y-5 pt-2">
      <header>
        <h1 className="text-2xl font-bold">Foco</h1>
        <p className="text-sm text-muted">Un pomodoro a la vez. Lo que te distraiga, apárcalo.</p>
      </header>

      {focus.result && !focus.result.completed && (
        <p className="rounded-2xl bg-surface p-3 text-sm">
          Guardaste {formatMinutes(focus.result.minutes)} de foco
          {focus.result.points > 0 && <span className="text-accent"> · +{focus.result.points} puntos</span>}. ¡Cada minuto cuenta!
        </p>
      )}

      <section className="space-y-3 rounded-2xl bg-surface p-4">
        <h2 className="font-semibold">¿Cuánto tiempo?</h2>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button key={p.label} className={chip(presetActive(p))} onClick={() => setDurations({ focus: p.focus, rest: p.rest })}>
              {p.label} · {p.focus}/{p.rest}
            </button>
          ))}
        </div>
        <Stepper label="Foco" value={durations.focus} min={5} max={120} step={5} onChange={(v) => setDurations((d) => ({ ...d, focus: v }))} />
        <Stepper label="Descanso" value={durations.rest} min={1} max={30} step={1} onChange={(v) => setDurations((d) => ({ ...d, rest: v }))} />
      </section>

      <section className="space-y-3 rounded-2xl bg-surface p-4">
        <h2 className="font-semibold">¿En qué te vas a enfocar?</h2>
        <div className="flex flex-wrap gap-2">
          <button className={chip(!target)} onClick={() => setTarget(null)}>
            <Icon name="orbit" /> Libre
          </button>
          {extraTask && (
            <button className={chip(true)} onClick={() => setTarget({ type: 'task', id: extraTask.id })}>
              <Icon name="clipboard-list" /> {extraTask.title}
            </button>
          )}
          {pendingTasks.map((t) => (
            <button
              key={t.id}
              className={`${chip(target?.id === t.id)} max-w-full truncate`}
              onClick={() => setTarget({ type: 'task', id: t.id })}
            >
              <Icon name="clipboard-list" /> {t.title}
            </button>
          ))}
          {habits.map((h) => (
            <button key={h.id} className={chip(target?.id === h.id)} onClick={() => setTarget({ type: 'habit', id: h.id })}>
              <Icon name={h.icon} /> {h.name}
            </button>
          ))}
        </div>
        {taskData && pendingTasks.length === 0 && habits.length === 0 && !extraTask && (
          <p className="text-xs text-muted">No tienes tareas para hoy: un foco libre también suma.</p>
        )}
        {task && <EstimateBar focusMin={task.focusMin} estimatedMin={task.estimatedMin} />}
      </section>

      <button
        onClick={start}
        className="w-full rounded-2xl bg-accent py-4 text-lg font-bold text-bg shadow-lg shadow-accent/20 transition hover:brightness-110"
      >
        <Icon name="play" /> ¡Empezar! <span className="text-sm font-normal opacity-80">+{pomodoroPoints(durations.focus)} puntos</span>
      </button>

      {stats && <RecentFocus stats={stats} />}
    </div>
  );
}

export default function FocusPage() {
  const { session } = useFocus();
  return session ? <FocusMode /> : <FocusSetup />;
}
