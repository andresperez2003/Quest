import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { api } from '../../api/client.js';
import { useFocus } from '../../focus/FocusContext.jsx';
import { useCelebrate } from '../../hooks/useCelebrate.js';
import { toDayString } from '../../lib/dates.js';
import { formatClock } from '../../lib/focus.js';
import { TASK_POINTS } from '../../lib/tasks.js';
import ProgressRing from '../ProgressRing.jsx';
import PointsBurst from '../PointsBurst.jsx';
import Icon from '../Icon.jsx';
import FocusSubtasks from './FocusSubtasks.jsx';
import { useConfirm } from '../Confirm.jsx';

// Mantiene la pantalla encendida mientras corre el temporizador (si el navegador lo permite).
function useWakeLock(active) {
  useEffect(() => {
    if (!active || !navigator.wakeLock) return;
    let lock = null;
    let cancelled = false;
    navigator.wakeLock
      .request('screen')
      .then((l) => (cancelled ? l.release() : (lock = l)))
      .catch(() => {});
    return () => {
      cancelled = true;
      lock?.release().catch(() => {});
    };
  }, [active]);
}

// "Estacionar distracciones": lo que se te ocurra va a la bandeja sin salir del foco.
function ParkDistraction() {
  const [text, setText] = useState('');
  const [parked, setParked] = useState(0);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    const title = text.trim();
    if (!title) return;
    setText('');
    setError('');
    try {
      await api.post('/tasks', { title });
      setParked((n) => n + 1);
    } catch (err) {
      setText(title);
      setError(err.message);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative">
        <Icon name="circle-parking" size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="¿Te vino algo a la cabeza? Apárcalo aquí"
          maxLength={200}
          enterKeyHint="done"
          className="w-full rounded-xl border border-border bg-surface py-3 pr-4 pl-10 text-sm outline-none focus:border-accent"
        />
      </div>
      <p className="mt-1 h-4 text-xs text-muted">
        {error ? (
          <span className="text-red-400">{error}</span>
        ) : (
          parked > 0 && (
            <>
              {parked} aparcada{parked > 1 ? 's' : ''} en tu bandeja. Sigue con lo tuyo <Icon name="dumbbell" />
            </>
          )
        )}
      </p>
    </form>
  );
}

// Pantalla limpia: solo el tiempo, en qué estás y lo imprescindible.
export default function FocusMode() {
  const confirm = useConfirm();
  const focus = useFocus();
  const navigate = useNavigate();
  const { session, remainingMs, totalMs, result } = focus;
  const rest = session.mode === 'rest';
  const [celebrating, celebrate] = useCelebrate();
  const [taskDone, setTaskDone] = useState(false);
  useWakeLock(session.running);

  useEffect(() => {
    if (rest && result?.completed) celebrate();
  }, [rest, result, celebrate]);

  async function completeTask() {
    celebrate();
    setTaskDone(true);
    try {
      await api.post(`/tasks/${result.taskId}/complete`, { today: toDayString() });
    } catch {
      setTaskDone(false);
    }
  }

  const color = rest ? 'var(--color-rest)' : 'var(--color-accent)';

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-bg">
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center gap-6 px-4 pt-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <div className="flex w-full justify-between text-sm">
          <span className="text-muted">
            <Icon name={rest ? 'coffee' : 'timer'} /> {rest ? 'Descanso' : 'Modo foco'}
          </span>
          <button onClick={() => navigate('/')} className="text-muted hover:text-white">
            Minimizar <Icon name="minimize-2" />
          </button>
        </div>

        <div className="text-center">
          <p className="text-sm text-muted">{rest ? 'Estira, bebe agua, mira lejos' : 'Enfocado en'}</p>
          {!rest && <h1 className="text-xl font-bold">{session.label ?? 'Foco libre'}</h1>}
        </div>

        <div className="relative">
          {celebrating && <PointsBurst points={taskDone ? TASK_POINTS : result?.points ?? 0} />}
          <ProgressRing progress={totalMs ? remainingMs / totalMs : 0} size={260} color={color}>
            <div>
              <div className="text-5xl font-bold tabular-nums">{formatClock(remainingMs)}</div>
              <div className="mt-1 text-sm text-muted">{session.running ? (rest ? 'descansando' : 'enfocando') : 'en pausa'}</div>
            </div>
          </ProgressRing>
        </div>

        {rest && result && (
          <div className="w-full animate-sheet rounded-2xl bg-surface p-4 text-center">
            <p className="font-semibold">
              <Icon name="party-popper" className="text-gold" /> ¡Pomodoro completado! {result.points > 0 && <span className="text-accent">+{result.points} puntos</span>}
            </p>
            {result.error && <p className="text-sm text-red-400">No se pudo guardar: {result.error}</p>}
            {result.taskId && !taskDone && (
              <button onClick={completeTask} className="mt-3 w-full rounded-lg bg-accent py-2 font-semibold text-bg">
                <Icon name="check" /> Marcar «{result.label}» como hecha
              </button>
            )}
            {taskDone && <p className="mt-2 text-sm text-accent">¡Tarea completada! +{TASK_POINTS}</p>}
          </div>
        )}

        <div className="flex w-full gap-2">
          {session.running ? (
            <button onClick={focus.pause} className="flex-1 rounded-xl bg-surface py-3 font-semibold">
              <Icon name="pause" /> Pausar
            </button>
          ) : (
            <button onClick={focus.resume} className="flex-1 rounded-xl bg-accent py-3 font-semibold text-bg">
              <Icon name="play" /> Seguir
            </button>
          )}
          {rest ? (
            <button onClick={focus.skipRest} className="flex-1 rounded-xl bg-surface py-3">
              Saltar descanso
            </button>
          ) : (
            <button
              onClick={async () =>
                (await confirm({ title: '¿Terminar ya?', text: 'Los minutos enfocados cuentan igual.', confirmLabel: 'Terminar' })) &&
                focus.stop()
              }
              className="flex-1 rounded-xl bg-surface py-3"
            >
              <Icon name="square" /> Terminar
            </button>
          )}
        </div>

        {session.taskId && <FocusSubtasks taskId={session.taskId} />}

        {!rest && <ParkDistraction />}
      </div>
    </div>
  );
}
