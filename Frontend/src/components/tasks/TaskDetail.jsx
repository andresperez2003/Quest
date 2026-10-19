import { useState } from 'react';
import { Link } from 'react-router';
import { addDays } from '../../lib/dates.js';
import { ENERGIES, PRIORITIES, SUBTASK_POINTS, WEEKDAYS } from '../../lib/tasks.js';
import TaskCheck from './TaskCheck.jsx';
import QuickAdd from './QuickAdd.jsx';
import EstimateBar from '../focus/EstimateBar.jsx';
import Icon from '../Icon.jsx';
import { useConfirm } from '../Confirm.jsx';

const ESTIMATES = [5, 15, 30, 60, 120];

const RECURRENCE_TYPES = [
  { value: '', label: 'No se repite' },
  { value: 'daily', label: 'Cada día' },
  { value: 'weekdays', label: 'Lunes a viernes' },
  { value: 'weekly', label: 'Días de la semana…' },
  { value: 'monthly', label: 'Cada mes' },
];

function recurrenceType(rule) {
  return rule?.startsWith('weekly:') ? 'weekly' : (rule ?? '');
}

const chip = (active) =>
  `rounded-full border px-3 py-1 text-sm transition ${active ? 'border-accent bg-accent/15 text-white' : 'border-border text-muted'}`;
const input = 'w-full rounded-lg border border-border bg-bg px-3 py-2 outline-none focus:border-accent';

function Field({ label, children }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm text-muted">{label}</legend>
      {children}
    </fieldset>
  );
}

export default function TaskDetail({ task, today, categories, onSave, onToggle, onAddSubtask, onRemove }) {
  const confirm = useConfirm();
  const [form, setForm] = useState(() => ({
    title: task.title,
    notes: task.notes ?? '',
    categoryId: task.categoryId,
    priority: task.priority,
    energy: task.energy,
    dueDay: task.dueDay ?? '',
    dueTime: task.dueTime ?? '',
    estimatedMin: task.estimatedMin,
    recurrence: task.recurrence,
  }));
  const [weekdays, setWeekdays] = useState(() =>
    task.recurrence?.startsWith('weekly:') ? task.recurrence.slice(7).split(',').map(Number) : [],
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  function setRecurrenceType(type) {
    // Repetir sin fecha no tiene sentido: se asume que empieza hoy.
    const dueDay = type && !form.dueDay ? today : form.dueDay;
    if (type === 'weekly') {
      const days = weekdays.length ? weekdays : [((new Date(`${dueDay}T00:00:00Z`).getUTCDay() + 6) % 7) + 1];
      setWeekdays(days);
      set({ recurrence: `weekly:${days.join(',')}`, dueDay });
    } else {
      set({ recurrence: type || null, dueDay });
    }
  }

  function toggleWeekday(day) {
    const next = weekdays.includes(day) ? weekdays.filter((d) => d !== day) : [...weekdays, day].sort();
    if (next.length === 0) return;
    setWeekdays(next);
    set({ recurrence: `weekly:${next.join(',')}` });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSave({
        ...form,
        notes: form.notes.trim() || null,
        dueDay: form.dueDay || null,
        dueTime: form.dueDay && form.dueTime ? form.dueTime : null,
        recurrence: form.dueDay ? form.recurrence : null,
      });
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={handleSubmit} className="space-y-5">
        <input
          className={`${input} text-lg font-semibold`}
          value={form.title}
          onChange={(e) => set({ title: e.target.value })}
          required
          maxLength={200}
          aria-label="Título"
        />

        <Field label="Cuándo">
          <div className="flex flex-wrap gap-2">
            <button type="button" className={chip(form.dueDay === today)} onClick={() => set({ dueDay: today })}>
              Hoy
            </button>
            <button
              type="button"
              className={chip(form.dueDay === addDays(today, 1))}
              onClick={() => set({ dueDay: addDays(today, 1) })}
            >
              Mañana
            </button>
            <button
              type="button"
              className={chip(!form.dueDay)}
              onClick={() => set({ dueDay: '', dueTime: '', recurrence: null })}
            >
              Sin fecha
            </button>
          </div>
          <div className="mt-2 flex gap-2">
            <input
              type="date"
              className={input}
              value={form.dueDay}
              onChange={(e) => set({ dueDay: e.target.value })}
              aria-label="Fecha"
            />
            <input
              type="time"
              className={`${input} w-32`}
              value={form.dueTime}
              disabled={!form.dueDay}
              onChange={(e) => set({ dueTime: e.target.value })}
              aria-label="Hora"
            />
          </div>
          {form.dueDay && (
            <div className="mt-2 space-y-2">
              <select
                className={input}
                value={recurrenceType(form.recurrence)}
                onChange={(e) => setRecurrenceType(e.target.value)}
                aria-label="Repetir"
              >
                {RECURRENCE_TYPES.map((r) => (
                  <option key={r.value} value={r.value}>
                    ↻ {r.label}
                  </option>
                ))}
              </select>
              {recurrenceType(form.recurrence) === 'weekly' && (
                <div className="flex justify-between gap-1">
                  {WEEKDAYS.map((d) => (
                    <button
                      type="button"
                      key={d.value}
                      onClick={() => toggleWeekday(d.value)}
                      className={`size-9 rounded-full text-sm ${weekdays.includes(d.value) ? 'bg-accent text-bg' : 'bg-bg text-muted'}`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </Field>

        <Field label="Prioridad">
          <div className="flex gap-2">
            {PRIORITIES.map((p) => (
              <button
                type="button"
                key={p.value}
                onClick={() => set({ priority: p.value })}
                className={chip(form.priority === p.value)}
                style={form.priority === p.value ? { borderColor: p.color } : undefined}
              >
                <span style={{ color: p.color }}>●</span> {p.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Energía que requiere">
          <div className="flex flex-wrap gap-2">
            {ENERGIES.map((en) => (
              <button
                type="button"
                key={en.value}
                className={chip(form.energy === en.value)}
                onClick={() => set({ energy: form.energy === en.value ? null : en.value })}
              >
                <Icon name={en.icon} /> {en.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Tiempo estimado">
          <div className="flex flex-wrap gap-2">
            {ESTIMATES.map((m) => (
              <button
                type="button"
                key={m}
                className={chip(form.estimatedMin === m)}
                onClick={() => set({ estimatedMin: form.estimatedMin === m ? null : m })}
              >
                {m < 60 ? `${m} min` : `${m / 60} h`}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Categoría">
          <div className="flex flex-wrap gap-2">
            <button type="button" className={chip(!form.categoryId)} onClick={() => set({ categoryId: null })}>
              Ninguna
            </button>
            {categories.map((c) => (
              <button
                type="button"
                key={c.id}
                className={chip(form.categoryId === c.id)}
                onClick={() => set({ categoryId: c.id })}
              >
                <Icon name={c.icon} style={{ color: c.color }} /> {c.name}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Notas">
          <textarea
            className={`${input} min-h-20`}
            value={form.notes}
            onChange={(e) => set({ notes: e.target.value })}
            maxLength={2000}
          />
        </Field>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          disabled={saving}
          className="w-full rounded-lg bg-accent py-2.5 font-semibold text-bg transition hover:brightness-110 disabled:opacity-60"
        >
          Guardar
        </button>
      </form>

      <Field label="Foco">
        <div className="space-y-3">
          <EstimateBar focusMin={task.focusMin ?? 0} estimatedMin={task.estimatedMin} />
          {task.status !== 'done' && (
            <Link
              to={`/foco?task=${task.id}&start=1`}
              className="block w-full rounded-lg border border-accent/40 bg-accent/10 py-2 text-center font-semibold text-accent"
            >
              <Icon name="play" /> Enfocarme en esta tarea
            </Link>
          )}
        </div>
      </Field>

      {/* Las subtareas se guardan al instante, sin pulsar "Guardar". */}
      <Field label="Pasos pequeños (subtareas)">
        <div className="space-y-2">
          {task.subtasks.map((s) => (
            <div key={s.id} className="flex items-center gap-3 rounded-lg bg-bg px-3 py-2">
              <TaskCheck
                done={s.status === 'done'}
                color="#22c55e"
                points={SUBTASK_POINTS}
                size="size-6"
                label={s.title}
                onToggle={() => onToggle(s)}
              />
              <span className={`flex-1 text-sm ${s.status === 'done' ? 'text-muted line-through' : ''}`}>{s.title}</span>
              <button onClick={() => onRemove(s)} className="text-muted hover:text-red-400" aria-label={`Borrar ${s.title}`}>
                ×
              </button>
            </div>
          ))}
          <QuickAdd placeholder="Divide la tarea en un paso…" onAdd={onAddSubtask} />
        </div>
      </Field>

      <button
        onClick={async () =>
          (await confirm({ title: `¿Eliminar "${task.title}"?`, confirmLabel: 'Eliminar', danger: true })) && onRemove(task)
        }
        className="w-full rounded-lg bg-bg py-2 text-sm font-medium text-red-400"
      >
        Eliminar tarea
      </button>
    </div>
  );
}
