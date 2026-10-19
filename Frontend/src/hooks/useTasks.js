import { useState } from 'react';
import { api } from '../api/client.js';
import { useApi } from './useApi.js';

// Aplica `fn` a la tarea `id`, sea de primer nivel o subtarea.
function mapTask(tasks, id, fn) {
  return tasks.map((t) =>
    t.id === id ? fn(t) : { ...t, subtasks: t.subtasks.map((s) => (s.id === id ? fn(s) : s)) },
  );
}

/**
 * Lista de tareas de una vista ("today" | "inbox" | "upcoming" | "range") y sus acciones.
 * `range` ({ from, to }) solo para la vista "range" (calendario).
 * `version` sube tras cada cambio que da o quita puntos, para recargar el mapa de calor.
 */
export function useTasks(view, today, range) {
  const rangeQuery = range ? `&from=${range.from}&to=${range.to}` : '';
  const { data, error, reload, setData } = useApi(`/tasks?view=${view}&today=${today}${rangeQuery}`);
  const [version, setVersion] = useState(0);

  async function run(promise) {
    try {
      await promise;
    } finally {
      await reload();
      setVersion((v) => v + 1);
    }
  }

  return {
    tasks: data?.tasks ?? [],
    loaded: data != null,
    error,
    version,
    reload,

    toggle(task) {
      const done = task.status !== 'done';
      setData((d) => ({
        tasks: mapTask(d.tasks, task.id, (t) => ({ ...t, status: done ? 'done' : 'pending' })),
      }));
      return run(done ? api.post(`/tasks/${task.id}/complete`, { today }) : api.post(`/tasks/${task.id}/reopen`));
    },

    create(fields) {
      return run(api.post('/tasks', fields));
    },

    update(task, fields) {
      setData((d) => ({ tasks: mapTask(d.tasks, task.id, (t) => ({ ...t, ...fields })) }));
      return run(api.patch(`/tasks/${task.id}`, fields));
    },

    remove(task) {
      setData((d) => ({
        tasks: d.tasks
          .filter((t) => t.id !== task.id)
          .map((t) => ({ ...t, subtasks: t.subtasks.filter((s) => s.id !== task.id) })),
      }));
      return run(api.delete(`/tasks/${task.id}`));
    },
  };
}
