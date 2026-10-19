import { useState } from 'react';
import { useApi } from '../hooks/useApi.js';
import { useTasks } from '../hooks/useTasks.js';
import { formatDay, toDayString } from '../lib/dates.js';
import QuickAdd from '../components/tasks/QuickAdd.jsx';
import TaskList from '../components/tasks/TaskList.jsx';
import TaskDetailModal from '../components/tasks/TaskDetailModal.jsx';
import Icon from '../components/Icon.jsx';

const TABS = [
  { value: 'inbox', label: 'Bandeja', icon: 'inbox' },
  { value: 'upcoming', label: 'Próximas', icon: 'calendar-range' },
];

function groupByDay(tasks) {
  const groups = new Map();
  for (const t of tasks) groups.set(t.dueDay, [...(groups.get(t.dueDay) ?? []), t]);
  return [...groups];
}

function TabContent({ view, today, categories }) {
  const tasks = useTasks(view, today);
  const [openId, setOpenId] = useState(null);
  const open = (task) => setOpenId(task.id);
  const detailTask = openId && tasks.tasks.find((t) => t.id === openId);

  return (
    <>
      {view === 'inbox' ? (
        <div className="space-y-3">
          <QuickAdd placeholder="Apunta lo que tengas en la cabeza…" withPriority onAdd={(title, extra) => tasks.create({ title, ...extra })} />
          <p className="text-xs text-muted">
            Aquí va todo lo que aún no tiene fecha. Tócala para ponerle una cuando decidas hacerla.
          </p>
          {tasks.loaded && (
            <TaskList
              tasks={tasks.tasks}
              today={today}
              onToggle={tasks.toggle}
              onOpen={open}
              empty={<p className="py-8 text-center text-sm text-muted">
                  Bandeja vacía. Mente despejada <Icon name="sparkles" className="text-gold" />
                </p>
              }
            />
          )}
        </div>
      ) : (
        tasks.loaded && (
          <div className="space-y-5">
            {tasks.tasks.length === 0 && (
              <p className="py-8 text-center text-sm text-muted">No hay nada programado para los próximos días.</p>
            )}
            {groupByDay(tasks.tasks).map(([day, list]) => (
              <section key={day} className="space-y-2">
                <h2 className="text-sm font-semibold text-muted first-letter:uppercase">{formatDay(day)}</h2>
                <TaskList tasks={list} today={today} showDue={false} onToggle={tasks.toggle} onOpen={open} />
              </section>
            ))}
          </div>
        )
      )}

      {detailTask && (
        <TaskDetailModal
          task={detailTask}
          tasks={tasks}
          today={today}
          categories={categories}
          onClose={() => setOpenId(null)}
        />
      )}
    </>
  );
}

export default function TasksPage() {
  const [today] = useState(toDayString);
  const [tab, setTab] = useState('inbox');
  const { data: catData } = useApi('/categories');

  return (
    <div className="space-y-4 pt-2">
      <h1 className="text-2xl font-bold">Tareas</h1>
      <div className="flex rounded-xl bg-surface p-1" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.value}
            role="tab"
            aria-selected={tab === t.value}
            onClick={() => setTab(t.value)}
            className={`flex-1 rounded-lg py-2 text-sm transition ${tab === t.value ? 'bg-bg font-semibold' : 'text-muted'}`}
          >
            <Icon name={t.icon} /> {t.label}
          </button>
        ))}
      </div>
      <TabContent key={tab} view={tab} today={today} categories={catData?.categories ?? []} />
    </div>
  );
}
