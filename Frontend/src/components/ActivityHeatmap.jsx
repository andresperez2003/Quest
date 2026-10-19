import { useMemo } from 'react';
import { useApi } from '../hooks/useApi.js';
import { addDays, formatDay, weekStart } from '../lib/dates.js';
import Heatmap from './Heatmap.jsx';
import Icon from './Icon.jsx';

const WEEKS = 26;

function currentStreak(values, today) {
  let cursor = values.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (values.has(cursor)) {
    n++;
    cursor = addDays(cursor, -1);
  }
  return n;
}

// Mapa de calor global: todo lo que da puntos (hábitos ahora; tareas y pomodoros después).
// `version` cambia cuando el padre registra actividad, para recargar.
export default function ActivityHeatmap({ today, version = 0 }) {
  const from = addDays(weekStart(today), -(WEEKS - 1) * 7);
  const { data } = useApi(`/activity/heatmap?from=${from}&to=${today}&v=${version}`);

  const values = useMemo(() => new Map((data?.days ?? []).map((d) => [d.day, d.points])), [data]);
  const activeDays = values.size;
  const streak = currentStreak(values, today);

  return (
    <section className="rounded-2xl bg-surface p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="font-semibold">Tu actividad</h2>
        <span className="text-xs text-muted">
          {streak > 0 && (
            <>
              <Icon name="flame" className="text-orange-400" /> {streak} {streak === 1 ? 'día' : 'días'} seguidos ·{' '}
            </>
          )}
          {activeDays} días activos
        </span>
      </div>
      <Heatmap
        values={values}
        today={today}
        weeks={WEEKS}
        tooltip={(day, v) => `${formatDay(day)}: ${v ? `${v} puntos` : 'sin actividad'}`}
      />
    </section>
  );
}
