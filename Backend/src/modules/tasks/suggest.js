// "¿Qué hago ahora?": puntúa las tareas pendientes según urgencia, prioridad, energía y tiempo disponible.
// Devuelve razones legibles para que la sugerencia no parezca arbitraria.

const ENERGY_LEVEL = { low: 1, medium: 2, high: 3 };

export function scoreTask(task, { today, energy, minutes }) {
  let score = 0;
  const reasons = [];

  if (task.dueDay && task.dueDay < today) {
    score += 40;
    reasons.push('Está atrasada');
  } else if (task.dueDay === today) {
    score += 30;
    reasons.push('Es para hoy');
  }

  if (task.priority === 1) {
    score += 25;
    reasons.push('Prioridad alta');
  } else if (task.priority === 2) {
    score += 10;
  }

  if (minutes && task.estimatedMin) {
    if (task.estimatedMin <= minutes) {
      score += 15;
      reasons.push('Cabe en tu tiempo');
    } else {
      score -= 30;
    }
  }

  if (energy && task.energy) {
    const diff = ENERGY_LEVEL[task.energy] - ENERGY_LEVEL[energy];
    if (diff > 0) score -= 25 * diff;
    else if (diff === 0) {
      score += 10;
      reasons.push('Va con tu energía');
    } else if (energy === 'low') {
      score += 5;
    }
  }

  if (task.estimatedMin && task.estimatedMin <= 15) {
    score += 5;
    reasons.push('Victoria rápida');
  }

  return { score, reasons };
}

export function suggestTasks(tasks, context, limit = 5) {
  return tasks
    .map((task) => ({ task, ...scoreTask(task, context) }))
    .sort((a, b) => b.score - a.score || String(a.task.createdAt).localeCompare(String(b.task.createdAt)))
    .slice(0, limit);
}
