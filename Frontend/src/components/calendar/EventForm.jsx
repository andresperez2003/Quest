import { useState } from 'react';
import { formatDay } from '../../lib/dates.js';
import PriorityPicker from '../tasks/PriorityPicker.jsx';

const DURATIONS = [15, 30, 60, 120];

const chip = (active) =>
  `rounded-full border px-3 py-1 text-sm transition ${active ? 'border-accent bg-accent/15 text-white' : 'border-border text-muted'}`;
const input = 'w-full rounded-lg border border-border bg-bg px-3 py-2 outline-none focus:border-accent';

// Siguiente hora en punto (hoy) o las 09:00 (otro día): una sugerencia que casi nunca hay que cambiar.
function suggestedTime(day, today) {
  if (day !== today) return '09:00';
  const next = Math.min(new Date().getHours() + 1, 23);
  return `${String(next).padStart(2, '0')}:00`;
}

/**
 * Crear un bloque en el calendario con fecha, hora (cualquiera, también de madrugada) y duración.
 * Solo el título es obligatorio: lo demás llega ya propuesto. Se guarda como tarea programada.
 */
export default function EventForm({ day, time, today, onSubmit }) {
  const [form, setForm] = useState(() => ({
    title: '',
    dueDay: day,
    dueTime: time ?? suggestedTime(day, today),
    estimatedMin: 30,
    priority: 2,
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.dueDay) return;
    setSaving(true);
    setError('');
    try {
      await onSubmit({
        title: form.title.trim(),
        dueDay: form.dueDay,
        dueTime: form.dueTime || null,
        estimatedMin: form.dueTime ? form.estimatedMin : null,
        priority: form.priority,
      });
    } catch (err) {
      setError(err.details?.[0]?.message ?? err.message);
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        value={form.title}
        onChange={(e) => set({ title: e.target.value })}
        placeholder="¿Qué vas a hacer?"
        className={input}
        required
        autoFocus
        maxLength={200}
        enterKeyHint="done"
        aria-label="Título"
      />
      <PriorityPicker value={form.priority} onChange={(priority) => set({ priority })} />

      <div className="flex gap-2">
        <input
          type="date"
          className={input}
          value={form.dueDay}
          required
          onChange={(e) => set({ dueDay: e.target.value })}
          aria-label="Fecha"
        />
        <input
          type="time"
          className={`${input} w-32`}
          value={form.dueTime}
          onChange={(e) => set({ dueTime: e.target.value })}
          aria-label="Hora"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={chip(!form.dueTime)} onClick={() => set({ dueTime: form.dueTime ? '' : suggestedTime(form.dueDay, today) })}>
          Sin hora
        </button>
      </div>

      {form.dueTime && (
        <div className="space-y-2">
          <p className="text-xs text-muted">Duración</p>
          <div className="flex flex-wrap gap-2">
            {DURATIONS.map((m) => (
              <button type="button" key={m} className={chip(form.estimatedMin === m)} onClick={() => set({ estimatedMin: m })}>
                {m < 60 ? `${m} min` : `${m / 60} h`}
              </button>
            ))}
          </div>
        </div>
      )}

      {form.dueDay && (
        <p className="text-xs text-muted first-letter:uppercase">
          {formatDay(form.dueDay)}
          {form.dueTime ? ` · ${form.dueTime}` : ' · sin hora'}
        </p>
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        disabled={saving || !form.title.trim() || !form.dueDay}
        className="w-full rounded-lg bg-accent py-2 font-semibold text-bg hover:brightness-110 disabled:opacity-60"
      >
        {saving ? 'Guardando…' : 'Añadir al calendario'}
      </button>
    </form>
  );
}
