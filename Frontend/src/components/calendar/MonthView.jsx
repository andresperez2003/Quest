const WEEKDAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const MAX_VISIBLE = 3;

// Cuadrícula del mes: de un vistazo, qué días están cargados. Tocar un día abre su vista de día.
export default function MonthView({ days, month, today, byDay, onPickDay }) {
  return (
    <div className="rounded-2xl bg-surface p-2">
      <div className="grid grid-cols-7 gap-1 pb-1 text-center text-[11px] text-muted">
        {WEEKDAY_LABELS.map((l) => (
          <span key={l}>{l}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const items = byDay.get(day) ?? [];
          const inMonth = day.slice(0, 7) === month;
          return (
            <button
              key={day}
              onClick={() => onPickDay(day)}
              className={`flex min-h-16 flex-col gap-0.5 rounded-lg p-1 text-left hover:bg-border sm:min-h-24 ${inMonth ? 'bg-bg' : 'bg-bg/30 text-muted'}`}
            >
              <span
                className={`grid size-6 place-items-center rounded-full text-xs ${day === today ? 'bg-accent font-bold text-bg' : ''}`}
              >
                {Number(day.slice(8))}
              </span>
              {/* Móvil: puntos. Pantallas anchas: títulos. */}
              <span className="flex flex-wrap gap-0.5 sm:hidden">
                {items.slice(0, 4).map((i) => (
                  <span key={i.id} className={`size-1.5 rounded-full ${i.done ? 'opacity-40' : ''}`} style={{ background: i.color }} />
                ))}
              </span>
              <span className="hidden space-y-0.5 sm:block">
                {items.slice(0, MAX_VISIBLE).map((i) => (
                  <span
                    key={i.id}
                    className={`block truncate rounded border-l-2 pl-1 text-[10px] leading-tight ${i.done ? 'line-through opacity-50' : ''}`}
                    style={{ borderColor: i.color }}
                  >
                    {i.title}
                  </span>
                ))}
                {items.length > MAX_VISIBLE && <span className="block text-[10px] text-muted">+{items.length - MAX_VISIBLE} más</span>}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
