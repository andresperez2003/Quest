// Logros: se desbloquean una vez y nunca se pierden. `points` es la XP extra que dan.
// `icon` es un nombre de Lucide (lucide.dev/icons) que el frontend dibuja con <Icon>.
export const ACHIEVEMENTS = [
  { key: 'first_task', icon: 'circle-check', title: 'Primer paso', description: 'Completa tu primera tarea', points: 10, test: (s) => s.tasksDone >= 1 },
  { key: 'tasks_10', icon: 'clipboard-list', title: 'En marcha', description: 'Completa 10 tareas', points: 20, test: (s) => s.tasksDone >= 10 },
  { key: 'tasks_50', icon: 'rocket', title: 'Imparable', description: 'Completa 50 tareas', points: 50, test: (s) => s.tasksDone >= 50 },
  { key: 'tasks_200', icon: 'trophy', title: 'Leyenda de las listas', description: 'Completa 200 tareas', points: 100, test: (s) => s.tasksDone >= 200 },
  { key: 'first_habit', icon: 'sprout', title: 'Semilla', description: 'Cumple un hábito por primera vez', points: 10, test: (s) => s.habitsDone >= 1 },
  { key: 'habits_30', icon: 'tree-deciduous', title: 'Raíces', description: 'Cumple hábitos 30 veces', points: 30, test: (s) => s.habitsDone >= 30 },
  { key: 'habits_100', icon: 'tree-pine', title: 'Bosque', description: 'Cumple hábitos 100 veces', points: 60, test: (s) => s.habitsDone >= 100 },
  { key: 'first_focus', icon: 'timer', title: 'Concentración', description: 'Termina tu primer pomodoro', points: 10, test: (s) => s.pomodoros >= 1 },
  { key: 'focus_5h', icon: 'brain', title: 'Mente enfocada', description: 'Acumula 5 horas de foco', points: 40, test: (s) => s.focusMin >= 300 },
  { key: 'focus_25h', icon: 'flower-2', title: 'Maestría zen', description: 'Acumula 25 horas de foco', points: 80, test: (s) => s.focusMin >= 1500 },
  { key: 'streak_3', icon: 'flame', title: 'Calentando', description: 'Racha de 3 días', points: 15, test: (s) => s.bestStreak >= 3 },
  { key: 'streak_7', icon: 'flame', title: 'Semana completa', description: 'Racha de 7 días', points: 30, test: (s) => s.bestStreak >= 7 },
  { key: 'streak_30', icon: 'flame-kindling', title: 'Un mes en llamas', description: 'Racha de 30 días', points: 100, test: (s) => s.bestStreak >= 30 },
  { key: 'level_5', icon: 'star', title: 'Nivel 5', description: 'Alcanza el nivel 5', points: 30, test: (s) => s.level >= 5 },
  { key: 'level_10', icon: 'sparkles', title: 'Nivel 10', description: 'Alcanza el nivel 10', points: 80, test: (s) => s.level >= 10 },
];

export function newlyUnlocked(stats, unlockedKeys) {
  return ACHIEVEMENTS.filter((a) => !unlockedKeys.has(a.key) && a.test(stats));
}

export function publicAchievement({ test: _, ...rest }) {
  return rest;
}
