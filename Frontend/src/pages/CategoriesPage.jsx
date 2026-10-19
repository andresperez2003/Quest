import { useState } from 'react';
import { api } from '../api/client.js';
import { useApi } from '../hooks/useApi.js';
import Modal from '../components/Modal.jsx';
import { useConfirm } from '../components/Confirm.jsx';
import Icon, { CATEGORY_ICONS, iconName } from '../components/Icon.jsx';

const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#22c55e', '#14b8a6', '#0ea5e9', '#3b82f6', '#8b5cf6', '#ec4899', '#64748b'];

function CategoryForm({ initial, onSubmit, onDelete }) {
  const [form, setForm] = useState(() =>
    initial ? { ...initial, icon: iconName(initial.icon) } : { name: '', color: COLORS[3], icon: CATEGORY_ICONS[0] },
  );
  const [error, setError] = useState('');
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await onSubmit({ name: form.name, color: form.color, icon: form.icon });
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex items-center gap-3">
        <span
          className="grid size-12 shrink-0 place-items-center rounded-xl text-2xl"
          style={{ background: `color-mix(in srgb, ${form.color} 25%, transparent)`, color: form.color }}
        >
          <Icon name={form.icon} />
        </span>
        <input
          className="w-full rounded-lg border border-border bg-bg px-3 py-2 outline-none focus:border-accent"
          placeholder="Nombre"
          value={form.name}
          onChange={(e) => set({ name: e.target.value })}
          maxLength={30}
          autoFocus
          required
        />
      </div>

      <div className="grid grid-cols-10 gap-1.5">
        {COLORS.map((c) => (
          <button
            type="button"
            key={c}
            onClick={() => set({ color: c })}
            className={`aspect-square rounded-full ${form.color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-surface' : ''}`}
            style={{ background: c }}
            aria-label={`Color ${c}`}
          />
        ))}
      </div>

      <div className="grid grid-cols-8 gap-1">
        {CATEGORY_ICONS.map((icon) => (
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

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button className="w-full rounded-lg bg-accent py-2.5 font-semibold text-bg hover:brightness-110">
        {initial ? 'Guardar' : 'Crear categoría'}
      </button>
      {onDelete && (
        <button type="button" onClick={onDelete} className="w-full rounded-lg bg-bg py-2 text-sm text-red-400">
          Eliminar categoría
        </button>
      )}
    </form>
  );
}

export default function CategoriesPage() {
  const { data, reload } = useApi('/categories');
  const [editing, setEditing] = useState(null); // 'new' | categoría
  const confirm = useConfirm();
  const categories = data?.categories ?? [];

  async function save(fields) {
    if (editing === 'new') await api.post('/categories', fields);
    else await api.patch(`/categories/${editing.id}`, fields);
    setEditing(null);
    await reload();
  }

  async function remove(category) {
    const { tasks, habits } = category._count;
    const text = tasks + habits > 0 ? `Sus ${tasks} tareas y ${habits} hábitos quedarán sin categoría.` : '';
    if (!(await confirm({ title: `¿Eliminar "${category.name}"?`, text, confirmLabel: 'Eliminar', danger: true }))) return;
    await api.delete(`/categories/${category.id}`);
    setEditing(null);
    await reload();
  }

  return (
    <div className="space-y-4 pt-2">
      <h1 className="text-2xl font-bold">Categorías</h1>

      <div className="space-y-2">
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setEditing(c)}
            className="flex w-full items-center gap-3 rounded-2xl bg-surface p-3 text-left hover:bg-border"
          >
            <span
              className="grid size-10 place-items-center rounded-xl text-xl"
              style={{ background: `color-mix(in srgb, ${c.color} 25%, transparent)`, color: c.color }}
            >
              <Icon name={c.icon} />
            </span>
            <span className="flex-1 font-medium">{c.name}</span>
            <span className="text-xs text-muted">
              {c._count.tasks} tareas · {c._count.habits} hábitos
            </span>
          </button>
        ))}
      </div>

      <button
        onClick={() => setEditing('new')}
        className="w-full rounded-2xl border border-dashed border-border p-3 text-muted hover:text-white"
      >
        + Nueva categoría
      </button>

      {editing && (
        <Modal title={editing === 'new' ? 'Nueva categoría' : 'Editar categoría'} onClose={() => setEditing(null)}>
          <CategoryForm
            initial={editing === 'new' ? null : editing}
            onSubmit={save}
            onDelete={editing === 'new' ? null : () => remove(editing)}
          />
        </Modal>
      )}
    </div>
  );
}
