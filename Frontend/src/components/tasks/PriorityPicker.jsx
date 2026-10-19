import { PRIORITIES } from '../../lib/tasks.js';

// Chips compactos con el color de cada prioridad. Media viene marcada: elegir es opcional.
export default function PriorityPicker({ value, onChange }) {
  return (
    <div className="flex items-center gap-2" role="radiogroup" aria-label="Prioridad">
      <span className="text-xs text-muted">Prioridad</span>
      {PRIORITIES.map((p) => {
        const active = value === p.value;
        return (
          <button
            key={p.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(p.value)}
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs transition ${active ? 'text-white' : 'border-border text-muted'}`}
            style={active ? { borderColor: p.color, background: `${p.color}26` } : undefined}
          >
            <span className="size-2 rounded-full" style={{ background: p.color }} />
            {p.label}
          </button>
        );
      })}
    </div>
  );
}
