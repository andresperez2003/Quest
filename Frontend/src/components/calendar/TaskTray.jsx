import { useState } from 'react';
import { formatMinutes } from '../../lib/tasks.js';
import { dragTask } from './ItemRow.jsx';
import Icon from '../Icon.jsx';

// Tareas de la bandeja listas para colocar en el calendario: arrastrar (escritorio) o "Colocar" + tocar una franja (móvil).
export default function TaskTray({ tasks, placing, onPlace }) {
  const [open, setOpen] = useState(true);
  if (tasks.length === 0) return null;

  return (
    <section className="rounded-2xl border border-dashed border-border p-3">
      <button onClick={() => setOpen(!open)} className="flex w-full items-baseline justify-between text-left">
        <span className="text-sm font-semibold">
          <Icon name={open ? 'chevron-down' : 'chevron-right'} /> <Icon name="inbox" /> Bandeja ({tasks.length})
        </span>
        <span className="text-xs text-muted">Arrastra a una hora o toca «Colocar»</span>
      </button>
      {open && (
        <div className="mt-2 max-h-48 space-y-1.5 overflow-y-auto">
          {tasks.map((task) => (
            <div
              key={task.id}
              draggable
              onDragStart={(e) => dragTask(e, task.id)}
              className={`flex cursor-grab items-center gap-2 rounded-lg bg-surface px-3 py-2 text-sm ${placing?.id === task.id ? 'ring-2 ring-accent' : ''}`}
            >
              <span className="min-w-0 flex-1 truncate">{task.title}</span>
              {task.estimatedMin && <span className="text-xs text-muted">{formatMinutes(task.estimatedMin)}</span>}
              <button
                onClick={() => onPlace(placing?.id === task.id ? null : task)}
                className="shrink-0 rounded-md bg-bg px-2 py-1 text-xs text-accent"
              >
                {placing?.id === task.id ? 'Cancelar' : 'Colocar'}
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
