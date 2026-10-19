import { useState } from 'react';
import { formatDay } from '../../lib/dates.js';
import ItemRow, { TASK_MIME } from './ItemRow.jsx';

// Semana como lista vertical de días (cómoda en móvil). Soltar una tarea en un día la mueve a ese día.
export default function WeekView({ days, today, byDay, onPickDay, onDropTask, onOpenTask, onToggle }) {
  const [over, setOver] = useState(null);

  return (
    <div className="space-y-2">
      {days.map((day) => {
        const items = byDay.get(day) ?? [];
        const pending = items.filter((i) => i.kind === 'task' && !i.done).length;
        return (
          <section
            key={day}
            onDragOver={(e) => {
              if (!e.dataTransfer.types.includes(TASK_MIME)) return;
              e.preventDefault();
              setOver(day);
            }}
            onDragLeave={() => setOver(null)}
            onDrop={(e) => {
              e.preventDefault();
              setOver(null);
              const id = e.dataTransfer.getData(TASK_MIME);
              if (id) onDropTask(id, day);
            }}
            className={`space-y-1.5 rounded-2xl bg-surface p-3 ${over === day ? 'ring-2 ring-accent' : ''} ${day < today ? 'opacity-70' : ''}`}
          >
            <button onClick={() => onPickDay(day)} className="flex w-full items-baseline justify-between text-left">
              <span className={`text-sm font-semibold first-letter:uppercase ${day === today ? 'text-accent' : ''}`}>
                {formatDay(day, { weekday: 'long', day: 'numeric' })}
                {day === today && ' · hoy'}
              </span>
              <span className="text-xs text-muted">{pending > 0 ? `${pending} pendiente${pending > 1 ? 's' : ''} ›` : '›'}</span>
            </button>
            {items.map((item) => (
              <ItemRow key={item.id} item={item} onOpenTask={onOpenTask} onToggle={onToggle} />
            ))}
          </section>
        );
      })}
    </div>
  );
}
