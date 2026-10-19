import { useState } from 'react';
import TaskItem from './TaskItem.jsx';

/**
 * Lista con límite visible ("poco a la vez") y las completadas plegadas al final.
 * `limit` = cuántas pendientes mostrar antes de "Ver más"; `renderAction` añade un botón por tarea.
 */
export default function TaskList({ tasks, today, onToggle, onOpen, limit = Infinity, showDue, renderAction, empty }) {
  const [expanded, setExpanded] = useState(false);
  const [showDone, setShowDone] = useState(false);

  const pending = tasks.filter((t) => t.status !== 'done');
  const done = tasks.filter((t) => t.status === 'done');
  const visible = expanded ? pending : pending.slice(0, limit);
  const hidden = pending.length - visible.length;

  const item = (task) => (
    <TaskItem
      key={task.id}
      task={task}
      today={today}
      onToggle={onToggle}
      onOpen={onOpen}
      showDue={showDue}
      action={renderAction?.(task)}
    />
  );

  return (
    <div className="space-y-2">
      {pending.length === 0 && empty}
      {visible.map(item)}

      {hidden > 0 && (
        <button onClick={() => setExpanded(true)} className="w-full py-1 text-sm text-muted hover:text-white">
          Ver {hidden} más
        </button>
      )}

      {done.length > 0 && (
        <>
          <button onClick={() => setShowDone(!showDone)} className="pt-2 text-sm text-muted hover:text-white">
            {showDone ? '▾' : '▸'} Hechas hoy ({done.length})
          </button>
          {showDone && done.map(item)}
        </>
      )}
    </div>
  );
}
