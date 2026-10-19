import { addDays, formatDay, weekStart } from '../lib/dates.js';

const LEVEL_ALPHA = [0, 30, 55, 80, 100];
const DAY_LABELS = ['L', '', 'X', '', 'V', '', ''];

function cellColor(color, level) {
  if (level === 0) return 'rgb(148 163 184 / 0.12)';
  return `color-mix(in srgb, ${color} ${LEVEL_ALPHA[level]}%, transparent)`;
}

/**
 * Cuadrícula estilo GitHub: columnas = semanas (lunes arriba), intensidad = valor del día.
 * @param values  Map<"YYYY-MM-DD", number>
 * @param max     valor que corresponde a la intensidad máxima (por defecto, el mayor del rango)
 * @param tooltip (day, value) => string
 */
export default function Heatmap({ values, today, weeks = 26, color = '#22c55e', max, tooltip }) {
  const firstDay = addDays(weekStart(today), -(weeks - 1) * 7);
  const columns = Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => addDays(firstDay, w * 7 + d)),
  );
  const top = max ?? Math.max(1, ...values.values());
  const levelOf = (v) => (v <= 0 ? 0 : Math.min(4, Math.ceil((v / top) * 4)));

  const template = { gridTemplateColumns: `0.75rem repeat(${weeks}, minmax(0, 1fr))` };
  let prevMonth = null;

  return (
    <div className="select-none">
      <div className="grid gap-[3px] text-[10px] text-muted" style={template}>
        <span />
        {columns.map((col) => {
          const month = col[0].slice(5, 7);
          const label = month !== prevMonth ? formatDay(col[0], { month: 'short' }).replace('.', '') : '';
          prevMonth = month;
          return (
            <span key={col[0]} className="overflow-visible whitespace-nowrap">
              {label}
            </span>
          );
        })}
      </div>

      <div className="grid grid-flow-col grid-rows-7 gap-[3px]" style={template}>
        {DAY_LABELS.map((l, i) => (
          <span key={i} className="flex items-center text-[10px] leading-none text-muted">
            {l}
          </span>
        ))}
        {columns.flat().map((day) => {
          if (day > today) return <span key={day} />;
          const value = values.get(day) ?? 0;
          return (
            <span
              key={day}
              title={tooltip ? tooltip(day, value) : `${formatDay(day)}: ${value}`}
              className={`aspect-square rounded-[3px] ${day === today ? 'ring-1 ring-white/60' : ''}`}
              style={{ background: cellColor(color, levelOf(value)) }}
            />
          );
        })}
      </div>

      <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-muted">
        Menos
        {LEVEL_ALPHA.map((_, level) => (
          <span key={level} className="size-2.5 rounded-[2px]" style={{ background: cellColor(color, level) }} />
        ))}
        Más
      </div>
    </div>
  );
}
