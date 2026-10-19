import { useState } from 'react';
import { useNavigate } from 'react-router';
import { api } from '../../api/client.js';
import { ENERGIES, formatMinutes, priorityOf } from '../../lib/tasks.js';
import Icon from '../Icon.jsx';

const TIMES = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 60, label: '1 h' },
  { value: null, label: 'Sin límite' },
];

const option = (active) =>
  `flex-1 rounded-xl border p-3 text-sm transition ${active ? 'border-accent bg-accent/15' : 'border-border text-muted'}`;

// Dos preguntas rápidas y una sola sugerencia a la vez, para no abrumar.
export default function WhatNow({ today, onComplete, onOpen }) {
  const [energy, setEnergy] = useState('medium');
  const [minutes, setMinutes] = useState(30);
  const [suggestions, setSuggestions] = useState(null);
  const [index, setIndex] = useState(0);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function suggest() {
    setError('');
    try {
      const params = new URLSearchParams({ today, energy });
      if (minutes) params.set('minutes', minutes);
      const { suggestions } = await api.get(`/tasks/suggest?${params}`);
      setSuggestions(suggestions);
      setIndex(0);
    } catch (err) {
      setError(err.message);
    }
  }

  async function complete(task) {
    await onComplete(task);
    await suggest();
  }

  if (!suggestions) {
    return (
      <div className="space-y-5">
        <div>
          <p className="mb-2 text-sm text-muted">¿Cómo está tu energía?</p>
          <div className="flex gap-2">
            {ENERGIES.map((e) => (
              <button key={e.value} onClick={() => setEnergy(e.value)} className={option(energy === e.value)}>
                <Icon name={e.icon} className="mx-auto mb-1 block text-2xl" />
                {e.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm text-muted">¿Cuánto tiempo tienes?</p>
          <div className="flex gap-2">
            {TIMES.map((t) => (
              <button key={t.label} onClick={() => setMinutes(t.value)} className={option(minutes === t.value)}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button onClick={suggest} className="w-full rounded-lg bg-accent py-3 font-semibold text-bg hover:brightness-110">
          Decide por mí <Icon name="sparkles" />
        </button>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div className="space-y-4 py-4 text-center">
        <Icon name="party-popper" className="mx-auto block text-4xl text-gold" />
        <p className="font-semibold">No tienes nada pendiente para hoy.</p>
        <p className="text-sm text-muted">Descansa, o añade algo a tu bandeja.</p>
      </div>
    );
  }

  const { task, reasons } = suggestions[index % suggestions.length];
  const priority = priorityOf(task.priority);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">Te sugiero empezar por:</p>
      <div className="rounded-2xl border-2 bg-bg p-5" style={{ borderColor: priority.color }}>
        <p className="text-xl font-bold">{task.title}</p>
        <p className="mt-1 text-sm text-muted">
          {task.category && (
            <>
              <Icon name={task.category.icon} /> {task.category.name}
            </>
          )}
          {task.category && task.estimatedMin && ' · '}
          {formatMinutes(task.estimatedMin)}
        </p>
        {reasons.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-1">
            {reasons.map((r) => (
              <li key={r} className="rounded-full bg-surface px-2 py-0.5 text-xs">
                {r}
              </li>
            ))}
          </ul>
        )}
        {task.subtasks.some((s) => s.status !== 'done') && (
          <p className="mt-3 text-sm">
            Primer paso: <strong>{task.subtasks.find((s) => s.status !== 'done').title}</strong>
          </p>
        )}
      </div>

      <button
        onClick={() => navigate(`/foco?task=${task.id}&start=1`)}
        className="w-full rounded-lg bg-accent py-3 text-lg font-bold text-bg hover:brightness-110"
      >
        <Icon name="play" /> ¡Empezar!
      </button>
      <div className="flex gap-2">
        <button onClick={() => complete(task)} className="flex-1 rounded-lg bg-bg py-2.5 font-semibold text-accent">
          <Icon name="check" /> ¡Hecho!
        </button>
        <button onClick={() => onOpen(task)} className="flex-1 rounded-lg bg-bg py-2.5">
          Detalles
        </button>
        {suggestions.length > 1 && (
          <button onClick={() => setIndex(index + 1)} className="flex-1 rounded-lg bg-bg py-2.5">
            Otra →
          </button>
        )}
      </div>
      <button onClick={() => setSuggestions(null)} className="w-full text-sm text-muted hover:text-white">
        Cambiar energía o tiempo
      </button>
    </div>
  );
}
