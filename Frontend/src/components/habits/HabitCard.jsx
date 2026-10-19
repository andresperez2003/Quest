import { useCelebrate } from '../../hooks/useCelebrate.js';
import { formatDay } from '../../lib/dates.js';
import PointsBurst from '../PointsBurst.jsx';
import Icon from '../Icon.jsx';

const FALLBACK_COLOR = '#22c55e';

function streakLabel({ streak, streakUnit }) {
  if (!streak) return 'Empieza tu racha hoy';
  const unit = streakUnit === 'weeks' ? (streak === 1 ? 'semana' : 'semanas') : streak === 1 ? 'día' : 'días';
  return (
    <>
      <Icon name="flame" className="text-orange-400" /> {streak} {unit}
    </>
  );
}

// Paso de los botones +/−: de 1 en 1 para metas pequeñas, de 5 en 5 para metas grandes.
const stepFor = (target) => (target >= 10 ? 5 : 1);

export default function HabitCard({ habit, today, onLog, onOpen }) {
  const [celebrating, celebrate] = useCelebrate();
  const color = habit.category?.color ?? FALLBACK_COLOR;
  const { stats } = habit;
  const target = habit.targetValue ?? 1;
  const quantitative = habit.targetValue != null;

  // Solo se registra el día de hoy: los días pasados no se pueden rellenar después.
  function log(value) {
    if (!stats.doneToday && value >= target) celebrate();
    onLog(habit, today, Math.max(0, value));
  }

  const subtitle =
    habit.frequency === 'weekly' ? (
      <>
        {stats.periodProgress}/{stats.periodTarget} esta semana · {streakLabel(stats)}
      </>
    ) : (
      streakLabel(stats)
    );

  return (
    <article className="rounded-2xl bg-surface p-4">
      <div className="flex items-center gap-3">
        <button onClick={() => onOpen(habit)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <span
            className="grid size-11 shrink-0 place-items-center rounded-xl text-2xl"
            style={{ background: `color-mix(in srgb, ${color} 20%, transparent)`, color }}
          >
            <Icon name={habit.icon} />
          </span>
          <span className="min-w-0">
            <span className="block truncate font-semibold">{habit.name}</span>
            <span className="block truncate text-xs text-muted">{subtitle}</span>
          </span>
        </button>

        <div className="relative shrink-0">
          {celebrating && <PointsBurst points={10} />}
          {quantitative ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => log(stats.todayValue - stepFor(target))}
                disabled={stats.todayValue === 0}
                className="grid place-items-center size-8 rounded-lg bg-bg text-lg text-muted disabled:opacity-30"
                aria-label="Restar"
              >
                <Icon name="minus" />
              </button>
              <span className={`w-16 text-center text-sm tabular-nums ${stats.doneToday ? 'text-accent' : ''}`}>
                {stats.todayValue}/{target}
                <span className="block truncate text-[10px] text-muted">{habit.unit}</span>
              </span>
              <button
                onClick={() => log(stats.todayValue + stepFor(target))}
                className={`grid place-items-center size-8 rounded-lg text-lg font-bold ${celebrating ? 'animate-pop' : ''}`}
                style={{ background: color, color: '#0f172a' }}
                aria-label="Sumar"
              >
                <Icon name="plus" />
              </button>
            </div>
          ) : (
            // Círculo del mismo tamaño que los +/−; el relleno invisible mantiene un área táctil cómoda.
            <button
              onClick={() => log(stats.doneToday ? 0 : 1)}
              aria-pressed={stats.doneToday}
              aria-label={stats.doneToday ? 'Desmarcar' : 'Marcar como hecho'}
              className="-m-2 grid place-items-center p-2"
            >
              <span
                className={`grid size-8 place-items-center rounded-full border-2 text-lg font-bold transition ${celebrating ? 'animate-pop' : ''}`}
                style={
                  stats.doneToday
                    ? { background: color, borderColor: color, color: '#0f172a' }
                    : { borderColor: color, color }
                }
              >
                {stats.doneToday && <Icon name="check" strokeWidth={3} />}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Últimos 7 días, solo para ver el progreso: lo de hoy se marca con el botón de arriba. */}
      <div className="mt-3 flex justify-between gap-1">
        {habit.recent.map(({ day, value }) => {
          const done = value >= target;
          const partial = value > 0 && !done;
          const isToday = day === today;
          return (
            <div
              key={day}
              title={`${formatDay(day)}: ${done ? 'hecho' : partial ? 'a medias' : 'sin registrar'}`}
              className="flex flex-1 flex-col items-center gap-1 text-[10px] text-muted"
            >
              <span className={isToday ? 'font-bold text-white' : ''}>
                {formatDay(day, { weekday: 'narrow' })}
              </span>
              <span
                className="size-6 rounded-md"
                style={{
                  background: done
                    ? color
                    : partial
                      ? `color-mix(in srgb, ${color} 40%, transparent)`
                      : 'rgb(148 163 184 / 0.12)',
                  outline: isToday ? '1px solid rgb(255 255 255 / 0.5)' : undefined,
                }}
              />
            </div>
          );
        })}
      </div>
    </article>
  );
}
