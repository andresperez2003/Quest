import { dueLabel, energyOf, formatMinutes, priorityOf, recurrenceLabel, TASK_POINTS } from '../../lib/tasks.js';
import TaskCheck from './TaskCheck.jsx';
import Icon from '../Icon.jsx';

function Chip({ className = '', ...props }) {
  return <span className={`rounded-md bg-bg px-1.5 py-0.5 ${className}`} {...props} />;
}

export default function TaskItem({ task, today, onToggle, onOpen, showDue = true, action }) {
  const done = task.status === 'done';
  const priority = priorityOf(task.priority);
  const due = showDue && dueLabel(task.dueDay, today);
  const energy = energyOf(task.energy);
  const subDone = task.subtasks.filter((s) => s.status === 'done').length;

  return (
    <article className={`flex items-center gap-3 rounded-2xl bg-surface p-3 transition ${done ? 'opacity-60' : ''}`}>
      <TaskCheck done={done} color={priority.color} points={TASK_POINTS} label={task.title} onToggle={() => onToggle(task)} />

      <button onClick={() => onOpen(task)} className="min-w-0 flex-1 text-left">
        <span className={`block truncate ${done ? 'text-muted line-through' : ''}`}>{task.title}</span>
        <span className="mt-1 flex flex-wrap gap-1 text-[11px] text-muted">
          {due && (
            <Chip className={due.overdue && !done ? 'text-red-400' : ''}>
              {due.overdue && !done && <><Icon name="triangle-alert" /> </>}
              {due.text}
              {task.dueTime ? ` · ${task.dueTime}` : ''}
            </Chip>
          )}
          {task.category && (
            <Chip style={{ color: task.category.color }}>
              <Icon name={task.category.icon} /> {task.category.name}
            </Chip>
          )}
          {task.subtasks.length > 0 && (
            <Chip>
              <Icon name="list-checks" /> {subDone}/{task.subtasks.length}
            </Chip>
          )}
          {(task.estimatedMin || task.focusMin > 0) && (
            <Chip title="Foco real / estimado">
              <Icon name="timer" /> {task.focusMin > 0 && `${formatMinutes(task.focusMin)}${task.estimatedMin ? ' / ' : ''}`}
              {formatMinutes(task.estimatedMin)}
            </Chip>
          )}
          {energy && (
            <Chip title={`Energía ${energy.label.toLowerCase()}`}>
              <Icon name={energy.icon} />
            </Chip>
          )}
          {task.recurrence && (
            <Chip title={recurrenceLabel(task.recurrence)}>
              <Icon name="repeat" />
            </Chip>
          )}
        </span>
      </button>

      {action}
    </article>
  );
}
