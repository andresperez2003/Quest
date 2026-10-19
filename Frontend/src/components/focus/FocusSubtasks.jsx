import { api } from '../../api/client.js';
import { useApi } from '../../hooks/useApi.js';
import { toDayString } from '../../lib/dates.js';
import { SUBTASK_POINTS } from '../../lib/tasks.js';
import TaskCheck from '../tasks/TaskCheck.jsx';
import ProgressBar from '../ProgressBar.jsx';

// Pasos de la tarea en foco: se marcan aquí mismo, sin salir del pomodoro.
export default function FocusSubtasks({ taskId }) {
  const { data, reload, setData } = useApi(`/tasks/${taskId}`);
  const subtasks = data?.task.subtasks ?? [];
  if (!subtasks.length) return null;

  const doneCount = subtasks.filter((s) => s.status === 'done').length;
  const next = subtasks.find((s) => s.status !== 'done');

  async function toggle(sub) {
    const done = sub.status !== 'done';
    setData((d) => ({
      ...d,
      task: {
        ...d.task,
        subtasks: d.task.subtasks.map((s) => (s.id === sub.id ? { ...s, status: done ? 'done' : 'pending' } : s)),
      },
    }));
    try {
      await (done
        ? api.post(`/tasks/${sub.id}/complete`, { today: toDayString() })
        : api.post(`/tasks/${sub.id}/reopen`));
    } finally {
      await reload();
    }
  }

  return (
    <section className="w-full rounded-2xl bg-surface p-4">
      <div className="mb-2 flex items-baseline justify-between text-sm">
        <span className="font-semibold">Pasos</span>
        <span className="text-muted tabular-nums">
          {doneCount} de {subtasks.length}
        </span>
      </div>
      <ProgressBar value={doneCount} max={subtasks.length} />

      <ul className="mt-3 space-y-2">
        {subtasks.map((s) => {
          const done = s.status === 'done';
          const isNext = s.id === next?.id;
          return (
            <li
              key={s.id}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 ${isNext ? 'border border-accent/60 bg-accent/10' : 'bg-bg'}`}
            >
              <TaskCheck
                done={done}
                color="var(--color-accent)"
                points={SUBTASK_POINTS}
                size="size-6"
                label={s.title}
                onToggle={() => toggle(s)}
              />
              <span className={`flex-1 text-sm ${done ? 'text-muted line-through' : ''}`}>{s.title}</span>
              {isNext && <span className="text-xs font-semibold text-accent">Ahora</span>}
            </li>
          );
        })}
      </ul>

      {!next && <p className="mt-3 text-center text-sm text-accent">¡Todos los pasos hechos!</p>}
    </section>
  );
}
