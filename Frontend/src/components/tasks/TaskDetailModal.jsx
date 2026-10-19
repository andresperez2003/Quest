import Modal from '../Modal.jsx';
import TaskDetail from './TaskDetail.jsx';

// Une el detalle de una tarea con las acciones de `useTasks`.
// `task` debe ser la versión más reciente de la lista, para reflejar cambios en subtareas.
export default function TaskDetailModal({ task, tasks, today, categories, onClose }) {
  return (
    <Modal title="Tarea" onClose={onClose}>
      <TaskDetail
        key={task.id}
        task={task}
        today={today}
        categories={categories}
        onSave={async (fields) => {
          await tasks.update(task, fields);
          onClose();
        }}
        onToggle={tasks.toggle}
        onAddSubtask={(title) => tasks.create({ title, parentId: task.id })}
        onRemove={async (t) => {
          if (t.id === task.id) onClose();
          await tasks.remove(t);
        }}
      />
    </Modal>
  );
}
