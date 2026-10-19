import { useMemo } from 'react';
import { useApi } from '../../hooks/useApi.js';
import { addDays, formatDay, weekStart } from '../../lib/dates.js';
import Heatmap from '../Heatmap.jsx';
import Icon from '../Icon.jsx';
import { useConfirm } from '../Confirm.jsx';

const WEEKS = 26;

export default function HabitDetail({ habit, today, version, onEdit, onArchive }) {
  const confirm = useConfirm();
  const from = addDays(weekStart(today), -(WEEKS - 1) * 7);
  const { data } = useApi(`/habits/${habit.id}/logs?from=${from}&to=${today}&v=${version}`);
  const values = useMemo(() => new Map((data?.logs ?? []).map((l) => [l.day, l.value])), [data]);

  const target = habit.targetValue ?? 1;
  const doneDays = [...values.values()].filter((v) => v >= target).length;
  const unit = habit.stats.streakUnit === 'weeks' ? 'sem.' : 'días';

  const stat = (label, value) => (
    <div className="rounded-xl bg-bg p-3 text-center">
      <div className="text-xl font-bold">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-2">
        {stat(
          `Racha (${unit})`,
          <>
            <Icon name="flame" className="text-orange-400" /> {habit.stats.streak}
          </>,
        )}
        {stat(`Mejor (${unit})`, habit.stats.bestStreak)}
        {stat('Días cumplidos', doneDays)}
      </div>

      <Heatmap
        values={values}
        today={today}
        weeks={WEEKS}
        max={target}
        color={habit.category?.color ?? '#22c55e'}
        tooltip={(day, v) =>
          `${formatDay(day)}: ${habit.targetValue ? `${v}/${target} ${habit.unit ?? ''}` : v ? 'hecho' : '—'}`
        }
      />

      <div className="flex gap-2">
        <button onClick={onEdit} className="flex-1 rounded-lg bg-bg py-2 font-medium">
          Editar
        </button>
        <button
          onClick={async () =>
            (await confirm({ title: `¿Archivar "${habit.name}"?`, text: 'Su historial se conserva.', confirmLabel: 'Archivar', danger: true })) &&
            onArchive()
          }
          className="flex-1 rounded-lg bg-bg py-2 font-medium text-red-400"
        >
          Archivar
        </button>
      </div>
    </div>
  );
}
