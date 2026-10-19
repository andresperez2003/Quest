import { useEffect, useState } from 'react';
import { timeOf, toDayString } from '../../lib/dates.js';
import { layoutTimed } from '../../lib/calendar.js';
import { TASK_POINTS } from '../../lib/tasks.js';
import TaskCheck from '../tasks/TaskCheck.jsx';
import ItemRow, { dragTask, TASK_MIME } from './ItemRow.jsx';

const HOUR_PX = 64;
const SLOT_MIN = 15;
// Por debajo de esto el bloque no cabe en dos líneas: título y hora van juntos, como en Google Calendar.
const COMPACT_MIN = 30;
const DEFAULT_HOURS = [7, 22];

// Minuto actual del día, actualizado cada 30 s, para la línea de "ahora".
function useNowMinutes() {
  const read = () => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  };
  const [now, setNow] = useState(read);
  useEffect(() => {
    const id = setInterval(() => setNow(read()), 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

// Mientras se arrastra algo, los bloques dejan pasar el puntero para poder soltar sobre la franja de debajo.
function useDragging() {
  const [dragging, setDragging] = useState(false);
  useEffect(() => {
    const on = () => setDragging(true);
    const off = () => setDragging(false);
    document.addEventListener('dragstart', on);
    document.addEventListener('dragend', off);
    document.addEventListener('drop', off);
    return () => {
      document.removeEventListener('dragstart', on);
      document.removeEventListener('dragend', off);
      document.removeEventListener('drop', off);
    };
  }, []);
  return dragging;
}

function Block({ block, startHour, dragging, onOpenTask, onToggle }) {
  const { item, start, end, lane, lanes } = block;
  const compact = end - start < COMPACT_MIN;
  const range = `${item.time}–${timeOf(Math.min(start + (item.durationMin ?? 0), 24 * 60 - 1))}`;
  const style = {
    top: ((start - startHour * 60) * HOUR_PX) / 60,
    height: ((end - start) * HOUR_PX) / 60 - 2,
    left: `${(lane / lanes) * 100}%`,
    width: `calc(${100 / lanes}% - 3px)`,
    borderColor: item.color,
    background: `color-mix(in srgb, ${item.color} 22%, var(--color-bg))`,
  };
  const className = `absolute overflow-hidden rounded-md border-l-4 px-2 text-left ${compact ? 'text-[11px] leading-[14px]' : 'py-0.5 text-xs'} ${dragging ? 'pointer-events-none' : ''} ${item.done ? 'opacity-50' : ''}`;
  const label = compact ? (
    <span className="block truncate">
      <span className={`font-medium ${item.done ? 'line-through' : ''}`}>{item.title}</span>
      <span className="text-muted">, {item.time}</span>
    </span>
  ) : (
    <>
      <span className={`block truncate font-medium ${item.done ? 'line-through' : ''}`}>{item.title}</span>
      <span className="block truncate text-[10px] text-muted">
        {range}
        {item.kind === 'event' && ' · Google'}
      </span>
    </>
  );

  if (item.kind === 'event') {
    return (
      <a href={item.event.htmlLink ?? undefined} target="_blank" rel="noreferrer" className={className} style={style} title={`${item.title} · ${range}`}>
        {label}
      </a>
    );
  }
  return (
    <div
      draggable
      onDragStart={(e) => dragTask(e, item.task.id)}
      className={`${className} flex cursor-grab items-start gap-1`}
      style={style}
      title={`${item.title} · ${range}`}
    >
      <button onClick={() => onOpenTask(item.task)} className="min-w-0 flex-1 text-left">
        {label}
      </button>
      <span className={compact ? '' : 'mt-0.5'}>
        <TaskCheck
          done={item.done}
          color={item.color}
          points={TASK_POINTS}
          size={compact ? 'size-3.5' : 'size-5'}
          label={item.title}
          onToggle={() => onToggle(item.task)}
        />
      </span>
    </div>
  );
}

/**
 * Vista de día con franjas de 15 min (time-blocking): soltar una tarea en una franja le pone fecha y hora;
 * tocar una franja vacía crea una tarea ahí (o coloca la tarea elegida en "Colocar").
 */
export default function DayView({ day, items, placing, onDropTask, onSlot, onOpenTask, onToggle }) {
  const now = useNowMinutes();
  const dragging = useDragging();
  const [over, setOver] = useState(null);

  const untimed = items.filter((i) => !i.time);
  const timed = items.filter((i) => i.time);
  const blocks = layoutTimed(timed);
  const startHour = Math.min(DEFAULT_HOURS[0], ...blocks.map((b) => Math.floor(b.start / 60)));
  const endHour = Math.min(24, Math.max(DEFAULT_HOURS[1], ...blocks.map((b) => Math.ceil(b.end / 60))));
  const slots = Array.from({ length: ((endHour - startHour) * 60) / SLOT_MIN }, (_, i) => startHour * 60 + i * SLOT_MIN);
  const isToday = day === toDayString();

  const drop = (time) => (e) => {
    e.preventDefault();
    setOver(null);
    const id = e.dataTransfer.getData(TASK_MIME);
    if (id) onDropTask(id, day, time);
  };
  const allowDrop = (key) => (e) => {
    if (!e.dataTransfer.types.includes(TASK_MIME)) return;
    e.preventDefault();
    setOver(key);
  };

  return (
    <div className="space-y-3">
      <section
        onDragOver={allowDrop('untimed')}
        onDragLeave={() => setOver(null)}
        onDrop={drop(null)}
        className={`space-y-1.5 rounded-2xl bg-surface p-3 ${over === 'untimed' ? 'ring-2 ring-accent' : ''}`}
      >
        <h3 className="text-xs text-muted">Todo el día / sin hora</h3>
        {untimed.length === 0 && <p className="text-xs text-muted/70">Nada sin hora. Suelta aquí para quitarle la hora a una tarea.</p>}
        {untimed.map((item) => (
          <ItemRow key={item.id} item={item} onOpenTask={onOpenTask} onToggle={onToggle} />
        ))}
      </section>

      <div className="relative rounded-2xl bg-surface" style={{ height: (endHour - startHour) * HOUR_PX + 32 }}>
        <div className="absolute inset-4">
          {Array.from({ length: endHour - startHour + 1 }, (_, i) => (
            <div key={i} className="absolute inset-x-0 border-t border-border/50" style={{ top: i * HOUR_PX }}>
              <span className="absolute -top-2 left-0 w-10 text-[10px] text-muted tabular-nums">{timeOf((startHour + i) * 60)}</span>
            </div>
          ))}

          <div className="absolute inset-y-0 right-0 left-12">
            {slots.map((minutes) => {
              const time = timeOf(minutes);
              return (
                <button
                  key={minutes}
                  aria-label={placing ? `Colocar a las ${time}` : `Nueva tarea a las ${time}`}
                  onClick={() => onSlot(day, time)}
                  onDragOver={allowDrop(time)}
                  onDragLeave={() => setOver(null)}
                  onDrop={drop(time)}
                  className={`absolute inset-x-0 rounded-md transition ${
                    over === time ? 'bg-accent/30' : placing ? 'border border-dashed border-accent/30 hover:bg-accent/20' : 'hover:bg-white/5'
                  }`}
                  style={{ top: ((minutes - startHour * 60) * HOUR_PX) / 60, height: (SLOT_MIN * HOUR_PX) / 60 }}
                />
              );
            })}

            {blocks.map((b) => (
              <Block
                key={b.item.id}
                block={b}
                startHour={startHour}
                dragging={dragging || Boolean(placing)}
                onOpenTask={onOpenTask}
                onToggle={onToggle}
              />
            ))}

            {isToday && now >= startHour * 60 && now <= endHour * 60 && (
              <div
                className="pointer-events-none absolute inset-x-0 border-t-2 border-red-400"
                style={{ top: ((now - startHour * 60) * HOUR_PX) / 60 }}
              >
                <span className="absolute -top-1.5 -left-1.5 size-3 rounded-full bg-red-400" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
