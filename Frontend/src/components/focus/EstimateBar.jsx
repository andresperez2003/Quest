import { formatMinutes } from '../../lib/tasks.js';

// Tiempo estimado vs. real (minutos de pomodoro). Pasarse no es un fallo: sirve para estimar mejor.
export default function EstimateBar({ focusMin = 0, estimatedMin }) {
  if (!estimatedMin) {
    return (
      <p className="text-sm text-muted">
        {focusMin ? `${formatMinutes(focusMin)} de foco.` : 'Aún sin pomodoros.'} Añade un tiempo estimado para comparar.
      </p>
    );
  }
  const over = focusMin > estimatedMin;
  const fill = Math.min(1, focusMin / estimatedMin);

  return (
    <div className="space-y-1">
      <div className="h-2.5 overflow-hidden rounded-full bg-bg">
        <div
          className={`h-full rounded-full transition-all duration-500 ${over ? 'bg-amber-400' : 'bg-accent'}`}
          style={{ width: `${fill * 100}%` }}
        />
      </div>
      <p className="text-xs text-muted">
        {formatMinutes(focusMin) ?? '0 min'} de {formatMinutes(estimatedMin)} estimados
        {over && ` · +${formatMinutes(focusMin - estimatedMin)}: ¡normal! Ajusta la próxima estimación`}
      </p>
    </div>
  );
}
