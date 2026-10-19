import { useState } from 'react';
import Icon from '../Icon.jsx';
import PriorityPicker from './PriorityPicker.jsx';

// Captura en < 5 s: escribir y Enter. La prioridad es opcional (Media por defecto); el resto, después.
export default function QuickAdd({ placeholder, onAdd, withPriority = false }) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState(2);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    const value = title.trim();
    if (!value) return;
    setTitle('');
    setPriority(2);
    setError('');
    try {
      await onAdd(value, withPriority ? { priority } : {});
    } catch (err) {
      setTitle(value);
      setPriority(priority);
      setError(err.message);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={placeholder}
          maxLength={200}
          enterKeyHint="done"
          className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-accent"
        />
        <button
          disabled={!title.trim()}
          className="grid place-items-center rounded-xl bg-accent px-4 text-2xl font-bold text-bg transition disabled:opacity-30"
          aria-label="Añadir tarea"
        >
          <Icon name="plus" />
        </button>
      </div>
      {withPriority && (
        <div className="mt-2">
          <PriorityPicker value={priority} onChange={setPriority} />
        </div>
      )}
      {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
    </form>
  );
}
