import { useState } from 'react';
import { api } from '../api/client.js';
import { useApi } from '../hooks/useApi.js';
import { toDayString } from '../lib/dates.js';
import ActivityHeatmap from '../components/ActivityHeatmap.jsx';
import Modal from '../components/Modal.jsx';
import HabitCard from '../components/habits/HabitCard.jsx';
import HabitForm from '../components/habits/HabitForm.jsx';
import HabitDetail from '../components/habits/HabitDetail.jsx';
import Icon from '../components/Icon.jsx';

// Para empezar con un toque, sin pensar.
const SUGGESTIONS = [
  { name: 'Tomar agua', icon: 'droplet', targetValue: 8, unit: 'vasos' },
  { name: 'Leer', icon: 'book-open', targetValue: 10, unit: 'páginas' },
  { name: 'Meditar', icon: 'flower-2' },
  { name: 'Moverme', icon: 'footprints', frequency: 'weekly', targetCount: 3 },
  { name: 'Tomar medicamento', icon: 'pill' },
];

// Optimista: refleja el cambio al instante mientras el servidor responde.
function applyLog(habits, habitId, day, value, today) {
  return habits.map((h) => {
    if (h.id !== habitId) return h;
    const target = h.targetValue ?? 1;
    return {
      ...h,
      recent: h.recent.map((r) => (r.day === day ? { ...r, value } : r)),
      stats:
        day === today ? { ...h.stats, todayValue: value, doneToday: value >= target } : h.stats,
    };
  });
}

export default function HabitsPage() {
  const [today] = useState(toDayString);
  const habitsApi = useApi(`/habits?today=${today}`);
  const { data: catData } = useApi('/categories');
  const [modal, setModal] = useState(null); // { type: 'create' | 'detail' | 'edit', habit? }
  const [version, setVersion] = useState(0);

  const habits = habitsApi.data?.habits ?? [];
  const categories = catData?.categories ?? [];
  const onTrack = habits.filter(
    (h) => h.stats.doneToday || (h.frequency === 'weekly' && h.stats.periodProgress >= h.stats.periodTarget),
  ).length;

  async function refresh() {
    await habitsApi.reload();
    setVersion((v) => v + 1);
  }

  async function handleLog(habit, day, value) {
    habitsApi.setData((d) => ({ habits: applyLog(d.habits, habit.id, day, value, today) }));
    try {
      await api.put(`/habits/${habit.id}/logs/${day}`, { value, today });
    } finally {
      await refresh();
    }
  }

  async function createHabit(data) {
    await api.post('/habits', data);
    setModal(null);
    await refresh();
  }

  async function updateHabit(habit, data) {
    await api.patch(`/habits/${habit.id}`, data);
    setModal(null);
    await refresh();
  }

  async function archiveHabit(habit) {
    await api.delete(`/habits/${habit.id}`);
    setModal(null);
    await refresh();
  }

  // Mantiene el detalle sincronizado con la última versión de la lista.
  const current = modal?.habit && habits.find((h) => h.id === modal.habit.id);

  return (
    <div className="space-y-4 pt-2">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">Hábitos</h1>
          {habits.length > 0 && (
            <p className="text-sm text-muted">
              {onTrack === habits.length ? (
                <>
                  <Icon name="party-popper" className="text-gold" /> ¡Todo al día!
                </>
              ) : (
                `${onTrack} de ${habits.length} al día`
              )}
            </p>
          )}
        </div>
      </header>

      {habits.length > 0 && (
        <div className="h-2 overflow-hidden rounded-full bg-surface">
          <div
            className="h-full rounded-full bg-accent transition-all duration-500"
            style={{ width: `${(onTrack / habits.length) * 100}%` }}
          />
        </div>
      )}

      {habitsApi.error && <p className="text-red-400">No se pudieron cargar los hábitos: {habitsApi.error.message}</p>}

      {habitsApi.data && habits.length === 0 && (
        <section className="rounded-2xl border border-dashed border-border p-5 text-center">
          <p className="mb-1 font-semibold">Aún no tienes hábitos</p>
          <p className="mb-4 text-sm text-muted">Empieza con uno pequeño. Toca una sugerencia:</p>
          <div className="flex flex-wrap justify-center gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s.name}
                onClick={() => createHabit(s)}
                className="rounded-full bg-surface px-3 py-1.5 text-sm hover:bg-border"
              >
                <Icon name={s.icon} /> {s.name}
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="space-y-3">
        {habits.map((habit) => (
          <HabitCard
            key={habit.id}
            habit={habit}
            today={today}
            onLog={handleLog}
            onOpen={(h) => setModal({ type: 'detail', habit: h })}
          />
        ))}
      </div>

      <ActivityHeatmap today={today} version={version} />

      <button
        onClick={() => setModal({ type: 'create' })}
        className="fixed right-4 bottom-20 z-40 grid size-10 place-items-center rounded-full bg-accent text-xl text-bg shadow-lg shadow-black/40 transition hover:brightness-110 sm:right-[calc(50%-20rem)]"
        aria-label="Nuevo hábito"
      >
        <Icon name="plus" />
      </button>

      {modal?.type === 'create' && (
        <Modal title="Nuevo hábito" onClose={() => setModal(null)}>
          <HabitForm categories={categories} onSubmit={createHabit} />
        </Modal>
      )}
      {modal?.type === 'edit' && current && (
        <Modal title="Editar hábito" onClose={() => setModal(null)}>
          <HabitForm initial={current} categories={categories} onSubmit={(data) => updateHabit(current, data)} />
        </Modal>
      )}
      {modal?.type === 'detail' && current && (
        <Modal title={current.name} onClose={() => setModal(null)}>
          <HabitDetail
            habit={current}
            today={today}
            version={version}
            onEdit={() => setModal({ type: 'edit', habit: current })}
            onArchive={() => archiveHabit(current)}
          />
        </Modal>
      )}
    </div>
  );
}
