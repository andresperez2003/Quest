import { TASK_POINTS } from '../../lib/tasks.js';
import TaskCheck from '../tasks/TaskCheck.jsx';

export const TASK_MIME = 'application/x-quest-task';

export function dragTask(e, taskId) {
  e.dataTransfer.setData(TASK_MIME, taskId);
  e.dataTransfer.effectAllowed = 'move';
}

// Fila compacta de un bloque (tarea o evento de Google) para las vistas de lista.
export default function ItemRow({ item, onOpenTask, onToggle }) {
  const time = item.time && <span className="w-11 shrink-0 text-xs text-muted tabular-nums">{item.time}</span>;

  if (item.kind === 'event') {
    return (
      <a
        href={item.event.htmlLink ?? undefined}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-2 rounded-lg border-l-4 bg-bg px-2 py-1.5 text-sm"
        style={{ borderColor: item.color }}
        title="Evento de Google Calendar"
      >
        {time}
        <span className="min-w-0 flex-1 truncate">{item.title}</span>
        <span className="text-[10px] text-muted">G</span>
      </a>
    );
  }

  return (
    <div
      draggable
      onDragStart={(e) => dragTask(e, item.task.id)}
      className={`flex items-center gap-2 rounded-lg border-l-4 bg-bg px-2 py-1.5 text-sm ${item.done ? 'opacity-60' : ''}`}
      style={{ borderColor: item.color }}
    >
      {time}
      <button onClick={() => onOpenTask(item.task)} className={`min-w-0 flex-1 truncate text-left ${item.done ? 'line-through' : ''}`}>
        {item.title}
      </button>
      <TaskCheck
        done={item.done}
        color={item.color}
        points={TASK_POINTS}
        size="size-6"
        label={item.title}
        onToggle={() => onToggle(item.task)}
      />
    </div>
  );
}
