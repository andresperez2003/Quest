import { useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../auth/AuthContext.jsx';
import { useGame } from '../game/GameContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { useTasks } from '../hooks/useTasks.js';
import { formatDay, toDayString } from '../lib/dates.js';
import Medal from '../components/Medal.jsx';
import ProgressBar from '../components/ProgressBar.jsx';
import { medalOf } from '../lib/medals.js';
import Modal from '../components/Modal.jsx';
import ActivityHeatmap from '../components/ActivityHeatmap.jsx';
import QuickAdd from '../components/tasks/QuickAdd.jsx';
import TaskList from '../components/tasks/TaskList.jsx';
import TaskDetailModal from '../components/tasks/TaskDetailModal.jsx';
import WhatNow from '../components/tasks/WhatNow.jsx';
import Icon from '../components/Icon.jsx';

const VISIBLE_TASKS = 5;

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

export default function TodayPage() {
  const { user } = useAuth();
  const { profile } = useGame();
  const week = profile?.week;
  const medal = medalOf(week?.tier);
  const nextMedal = medalOf(week?.nextTier);
  const [today] = useState(toDayString);
  const tasks = useTasks('today', today);
  const { data: habitData } = useApi(`/habits?today=${today}`);
  const { data: catData } = useApi('/categories');
  const [modal, setModal] = useState(null); // { type: 'detail', task } | { type: 'whatnow' }

  const habits = habitData?.habits ?? [];
  const pendingHabits = habits.filter(
    (h) => !h.stats.doneToday && !(h.frequency === 'weekly' && h.stats.periodProgress >= h.stats.periodTarget),
  );
  const doneCount = tasks.tasks.filter((t) => t.status === 'done').length;
  const detailTask = modal?.type === 'detail' && (tasks.tasks.find((t) => t.id === modal.task.id) ?? modal.task);

  return (
    <div className="space-y-4 pt-2">
      <section className="flex items-center gap-4 rounded-2xl bg-surface p-4">
        <Link to="/perfil" aria-label="Ver tu medalla y tu rango">
          <Medal tier={week?.tier ?? 0} size={60} shine={profile?.todayPoints > 0} dim={!profile?.todayPoints} />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold">
            {greeting()}, {user.name}
          </h1>
          <p className="text-sm text-muted first-letter:uppercase">{formatDay(today)}</p>
          {week && (
            <>
              <p className="mt-0.5 text-xs text-muted">
                {medal ? `Semana de ${medal.name}` : 'Semana nueva'}
                {nextMedal && ` · ${week.nextMinPoints - week.points} pts para ${nextMedal.name}`}
                {profile.todayPoints > 0 && <span className="text-accent"> · +{profile.todayPoints} hoy</span>}
              </p>
              {nextMedal && (
                <div className="mt-1.5">
                  <ProgressBar value={week.points - week.minPoints} max={week.nextMinPoints - week.minPoints} className="bg-gold" height="h-1.5" />
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <QuickAdd placeholder="¿Qué tienes que hacer hoy?" withPriority onAdd={(title, extra) => tasks.create({ title, dueDay: today, ...extra })} />

      <button
        onClick={() => setModal({ type: 'whatnow' })}
        className="w-full rounded-2xl border border-accent/40 bg-accent/10 p-3 font-semibold text-accent transition hover:bg-accent/20"
      >
        <Icon name="target" /> ¿Qué hago ahora?
      </button>

      <section className="space-y-2">
        <div className="flex items-baseline justify-between">
          <h2 className="font-semibold">Para hoy</h2>
          {tasks.tasks.length > 0 && (
            <span className="text-xs text-muted">
              {doneCount} de {tasks.tasks.length} hechas
            </span>
          )}
        </div>
        {tasks.error && <p className="text-sm text-red-400">No se pudieron cargar las tareas: {tasks.error.message}</p>}
        {tasks.loaded && (
          <TaskList
            tasks={tasks.tasks}
            today={today}
            limit={VISIBLE_TASKS}
            onToggle={tasks.toggle}
            onOpen={(task) => setModal({ type: 'detail', task })}
            empty={
              <p className="rounded-2xl border border-dashed border-border p-5 text-center text-sm text-muted">
                {doneCount > 0 ? (
                  <>
                    <Icon name="party-popper" className="text-gold" /> ¡Terminaste todo lo de hoy!
                  </>
                ) : (
                  'Nada para hoy. Añade algo arriba o revisa tu '
                )}
                {doneCount === 0 && (
                  <Link to="/tareas" className="text-accent underline">
                    bandeja
                  </Link>
                )}
              </p>
            }
          />
        )}
      </section>

      {habitData && (
        <Link to="/habitos" className="flex items-center justify-between rounded-2xl bg-surface p-4 hover:bg-border">
          <div>
            <h2 className="font-semibold">Hábitos de hoy</h2>
            <p className="text-sm text-muted">
              {habits.length === 0 ? (
                'Crea tu primer hábito'
              ) : pendingHabits.length === 0 ? (
                <>
                  <Icon name="party-popper" className="text-gold" /> ¡Todo al día!
                </>
              ) : (
                <>
                  Te faltan:{' '}
                  {pendingHabits.map((h) => (
                    <Icon key={h.id} name={h.icon} className="mr-1" />
                  ))}
                </>
              )}
            </p>
          </div>
          <span className="text-muted">›</span>
        </Link>
      )}

      <ActivityHeatmap today={today} version={tasks.version} />

      {modal?.type === 'whatnow' && (
        <Modal title="¿Qué hago ahora?" onClose={() => setModal(null)}>
          <WhatNow
            today={today}
            onComplete={tasks.toggle}
            onOpen={(task) => setModal({ type: 'detail', task })}
          />
        </Modal>
      )}
      {detailTask && (
        <TaskDetailModal
          task={detailTask}
          tasks={tasks}
          today={today}
          categories={catData?.categories ?? []}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
