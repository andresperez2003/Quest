import { useState } from 'react';
import Icon, { HABIT_ICONS, iconName } from '../Icon.jsx';

const EMPTY = {
  name: '',
  icon: HABIT_ICONS[0],
  categoryId: null,
  frequency: 'daily',
  targetCount: 3,
  targetValue: null,
  unit: '',
};

export default function HabitForm({ initial, categories, onSubmit }) {
  const [form, setForm] = useState(() => ({
    ...EMPTY,
    ...initial,
    icon: iconName(initial?.icon ?? EMPTY.icon),
    targetCount: initial?.frequency === 'weekly' ? initial.targetCount : EMPTY.targetCount,
    unit: initial?.unit ?? '',
  }));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const measured = form.targetValue != null;

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSubmit({
        name: form.name,
        icon: form.icon,
        categoryId: form.categoryId,
        frequency: form.frequency,
        targetCount: form.frequency === 'weekly' ? form.targetCount : 1,
        targetValue: measured ? Number(form.targetValue) || 1 : null,
        unit: measured ? form.unit.trim() || null : null,
      });
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  const chip = (active) =>
    `rounded-full border px-3 py-1 text-sm transition ${active ? 'border-accent bg-accent/15 text-white' : 'border-border text-muted'}`;
  const input = 'w-full rounded-lg border border-border bg-bg px-3 py-2 outline-none focus:border-accent';

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <input
        className={input}
        placeholder="¿Qué hábito quieres construir?"
        value={form.name}
        onChange={(e) => set({ name: e.target.value })}
        autoFocus
        required
        maxLength={60}
      />

      <fieldset>
        <legend className="mb-2 text-sm text-muted">Ícono</legend>
        <div className="grid grid-cols-8 gap-1">
          {HABIT_ICONS.map((icon) => (
            <button
              type="button"
              key={icon}
              onClick={() => set({ icon })}
              className={`grid aspect-square place-items-center rounded-lg text-xl ${form.icon === icon ? 'bg-accent/25 text-accent ring-1 ring-accent' : 'bg-bg text-muted'}`}
              aria-label={icon}
            >
              <Icon name={icon} />
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm text-muted">Categoría</legend>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={chip(!form.categoryId)} onClick={() => set({ categoryId: null })}>
            Ninguna
          </button>
          {categories.map((c) => (
            <button type="button" key={c.id} className={chip(form.categoryId === c.id)} onClick={() => set({ categoryId: c.id })}>
              <Icon name={c.icon} style={{ color: c.color }} /> {c.name}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm text-muted">Frecuencia</legend>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={chip(form.frequency === 'daily')} onClick={() => set({ frequency: 'daily' })}>
            Todos los días
          </button>
          <button type="button" className={chip(form.frequency === 'weekly')} onClick={() => set({ frequency: 'weekly' })}>
            Algunos días por semana
          </button>
        </div>
        {form.frequency === 'weekly' && (
          <div className="mt-3 flex items-center gap-3 text-sm">
            <button
              type="button"
              className="grid place-items-center size-8 rounded-lg bg-bg"
              onClick={() => set({ targetCount: Math.max(1, form.targetCount - 1) })}
            >
              <Icon name="minus" />
            </button>
            <span className="tabular-nums">
              {form.targetCount} {form.targetCount === 1 ? 'vez' : 'veces'} por semana
            </span>
            <button
              type="button"
              className="grid place-items-center size-8 rounded-lg bg-bg"
              onClick={() => set({ targetCount: Math.min(7, form.targetCount + 1) })}
            >
              <Icon name="plus" />
            </button>
          </div>
        )}
      </fieldset>

      <fieldset>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={measured}
            onChange={(e) => set({ targetValue: e.target.checked ? 1 : null })}
            className="size-4 accent-[var(--color-accent)]"
          />
          Medir una cantidad (ej. 8 vasos, 20 páginas)
        </label>
        {measured && (
          <div className="mt-3 flex gap-2">
            <input
              type="number"
              min={1}
              className={`${input} w-24`}
              value={form.targetValue}
              onChange={(e) => set({ targetValue: e.target.value })}
              aria-label="Meta"
            />
            <input
              className={input}
              placeholder="unidad (páginas, vasos, min…)"
              value={form.unit}
              onChange={(e) => set({ unit: e.target.value })}
              maxLength={20}
            />
          </div>
        )}
      </fieldset>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        disabled={saving}
        className="w-full rounded-lg bg-accent py-2.5 font-semibold text-bg transition hover:brightness-110 disabled:opacity-60"
      >
        {initial ? 'Guardar cambios' : 'Crear hábito'}
      </button>
    </form>
  );
}
