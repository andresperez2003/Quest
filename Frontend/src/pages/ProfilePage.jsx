import { useState } from 'react';
import { Link } from 'react-router';
import { useGame } from '../game/GameContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { addDays, addMonths, formatDay, toDayString, weekStart } from '../lib/dates.js';
import { MEDALS, medalOf, monthOfWeek, weeksOfMonth } from '../lib/medals.js';
import { formatMinutes } from '../lib/tasks.js';
import Medal from '../components/Medal.jsx';
import ProgressBar from '../components/ProgressBar.jsx';
import Icon from '../components/Icon.jsx';

function RankCard({ rank }) {
  return (
    <section className="flex flex-col items-center gap-2 rounded-2xl bg-surface p-5 text-center">
      <span className="grid size-24 animate-float place-items-center rounded-full bg-gold/10 text-5xl text-gold ring-2 ring-gold/40">
        <Icon name={rank.icon} />
      </span>
      <h1 className="text-2xl font-bold">{rank.name}</h1>
      <p className="text-sm text-muted">
        <Icon name="medal" className="text-gold" /> {rank.honor} de honor
      </p>
      {rank.nextMinHonor != null ? (
        <div className="w-full text-left text-xs text-muted">
          <div className="mb-1 flex justify-between">
            <span>Siguiente: {rank.nextName}</span>
            <span className="tabular-nums">faltan {rank.nextMinHonor - rank.honor}</span>
          </div>
          <ProgressBar value={rank.honor - rank.minHonor} max={rank.nextMinHonor - rank.minHonor} className="bg-gold" />
        </div>
      ) : (
        <p className="text-sm text-gold">¡Rango máximo!</p>
      )}
      <p className="text-xs text-muted">Cada medalla semanal suma honor (Bronce 1 … Diamante 5). El rango nunca baja.</p>
    </section>
  );
}

function WeekMedalCard({ week, active }) {
  const medal = medalOf(week.tier);
  const next = medalOf(week.nextTier);
  return (
    <section className="space-y-3 rounded-2xl bg-surface p-4">
      <div className="flex items-center gap-4">
        <Medal tier={week.tier} size={80} shine={active} dim={!active} />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-baseline justify-between">
            <h2 className="font-semibold">Medalla de la semana</h2>
            <span className="text-xs text-muted tabular-nums">{week.points} pts</span>
          </div>
          <p className="text-sm">{medal ? medal.name : 'Aún sin medalla'}</p>
          {next ? (
            <>
              <ProgressBar value={week.points - week.minPoints} max={week.nextMinPoints - week.minPoints} className="bg-gold" />
              <p className="text-xs text-muted">
                Faltan {week.nextMinPoints - week.points} pts para {next.name}
              </p>
            </>
          ) : (
            <p className="text-xs text-gold">¡Medalla máxima! Semana excelente</p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-5 gap-1 text-center text-[10px] text-muted">
        {MEDALS.map((m) => (
          <div key={m.tier} className={`flex flex-col items-center ${m.tier <= week.tier ? '' : 'opacity-35'}`}>
            <Medal tier={m.tier} size={28} />
            <span>{m.name}</span>
            <span className="tabular-nums">{m.minPoints}</span>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-muted">Cuentan tareas, hábitos y foco. El lunes empieza una semana nueva.</p>
    </section>
  );
}

// Vitrina: medallas ganadas en total y, mes a mes, la medalla de cada semana.
function Showcase({ weeks, today }) {
  const current = weekStart(today);
  const lastMonth = monthOfWeek(current);
  const firstMonth = weeks.length ? monthOfWeek(weeks[0].start) : lastMonth;
  const [month, setMonth] = useState(lastMonth);
  const byStart = new Map(weeks.map((w) => [w.start, w]));
  const monthWeeks = weeksOfMonth(month).map((start) => ({ start, points: 0, tier: 0, ...byStart.get(start) }));
  const monthMedals = monthWeeks.filter((w) => w.tier > 0).length;
  const monthPoints = monthWeeks.reduce((sum, w) => sum + w.points, 0);
  const short = (day) => formatDay(day, { day: 'numeric', month: 'short' });

  return (
    <section className="space-y-3 rounded-2xl bg-surface p-4">
      <h2 className="font-semibold">Vitrina</h2>
      <div className="grid grid-cols-5 gap-1 text-center">
        {MEDALS.map((m) => {
          const count = weeks.filter((w) => w.tier === m.tier).length;
          return (
            <div key={m.tier} title={m.name} className={`flex flex-col items-center ${count ? '' : 'opacity-35'}`}>
              <Medal tier={m.tier} size={32} />
              <span className="text-xs font-semibold tabular-nums">×{count}</span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={() => setMonth(addMonths(month, -1))}
          disabled={month <= firstMonth}
          aria-label="Mes anterior"
          className="grid size-9 place-items-center rounded-lg hover:bg-border disabled:opacity-30"
        >
          <Icon name="chevron-left" />
        </button>
        <span className="text-sm font-medium first-letter:uppercase">{formatDay(month, { month: 'long', year: 'numeric' })}</span>
        <button
          onClick={() => setMonth(addMonths(month, 1))}
          disabled={month >= lastMonth}
          aria-label="Mes siguiente"
          className="grid size-9 place-items-center rounded-lg hover:bg-border disabled:opacity-30"
        >
          <Icon name="chevron-right" />
        </button>
      </div>
      <ul className="space-y-1.5">
        {monthWeeks.map((w) => {
          const medal = medalOf(w.tier);
          const future = w.start > current;
          const status = future
            ? 'Por venir'
            : w.start === current
              ? `En curso · ${medal?.name ?? 'aún sin medalla'}`
              : (medal?.name ?? 'Descanso');
          return (
            <li key={w.start} className={`flex items-center gap-3 rounded-xl bg-bg p-2 ${future ? 'opacity-40' : ''}`}>
              <Medal tier={w.tier} size={28} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {short(w.start)} – {short(addDays(w.start, 6))}
                </p>
                <p className="text-xs text-muted">{status}</p>
              </div>
              <span className="text-xs text-muted tabular-nums">{w.points} pts</span>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-muted">
        {monthMedals} {monthMedals === 1 ? 'medalla' : 'medallas'} · {monthPoints} pts este mes
      </p>
    </section>
  );
}

function StreakCard({ streak }) {
  return (
    <section className="rounded-2xl bg-surface p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-3xl font-bold">
            <Icon name="flame" className="text-orange-400" /> {streak.current}
          </p>
          <p className="text-xs text-muted">
            {streak.current === 1 ? 'día seguido' : 'días seguidos'} · mejor: {streak.best}
          </p>
        </div>
        <div className="text-right">
          <p className="flex justify-end gap-0.5 text-2xl" aria-label={`${streak.freezes} congeladores`}>
            {Array.from({ length: streak.maxFreezes }, (_, i) => (
              <Icon key={i} name="snowflake" className={i < streak.freezes ? 'text-sky-300' : 'text-muted opacity-30'} />
            ))}
          </p>
          <p className="text-xs text-muted">congeladores</p>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted">
        Cualquier actividad cuenta para la racha. Si un día no puedes, un congelador la mantiene. Ganas uno cada 7 días
        seguidos.
      </p>
    </section>
  );
}

function WeekSummary({ today }) {
  const { data } = useApi(`/game/week?today=${today}`);
  if (!data) return null;
  const { current, previous } = data;
  const days = Array.from({ length: 7 }, (_, i) => addDays(current.start, i));
  const pointsOf = new Map(current.days.map((d) => [d.day, d.points]));

  const stat = (label, value) => (
    <div className="rounded-xl bg-bg p-3 text-center">
      <div className="text-lg font-bold">{value}</div>
      <div className="text-[11px] text-muted">{label}</div>
    </div>
  );

  // Solo comparaciones en positivo: si fue peor, se anima sin señalarlo.
  const better = previous.points > 0 && current.points > previous.points;
  const [comparisonIcon, comparison] = better
    ? ['trending-up', `+${Math.round(((current.points - previous.points) / previous.points) * 100)}% de puntos que la semana pasada`]
    : current.points > 0
      ? ['dumbbell', 'Cada punto de esta semana cuenta']
      : ['sprout', 'Semana nueva: empieza con algo pequeño'];

  return (
    <section className="space-y-3 rounded-2xl bg-surface p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold">Esta semana</h2>
        <span className="text-xs text-muted">{current.points} puntos</span>
      </div>
      <div className="flex justify-between gap-1">
        {days.map((d) => {
          const points = pointsOf.get(d) ?? 0;
          return (
            <div key={d} title={`${formatDay(d)}: ${points} puntos`} className="flex flex-1 flex-col items-center gap-1 text-[10px] text-muted">
              <span className={d === today ? 'font-bold text-white' : ''}>{formatDay(d, { weekday: 'narrow' })}</span>
              <span className={`grid size-7 place-items-center rounded-md text-[10px] ${points > 0 ? 'bg-accent text-bg font-bold' : d > today ? 'bg-bg/40' : 'bg-bg'}`}>
                {points > 0 ? points : ''}
              </span>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {stat('días activos', `${current.activeDays}/7`)}
        {stat('tareas', current.tasksDone)}
        {stat('hábitos', current.habitsDone)}
        {stat('de foco', formatMinutes(current.focusMin) ?? '0 min')}
      </div>
      {current.bestDay && (
        <p className="text-xs text-muted first-letter:uppercase">
          Mejor día: {formatDay(current.bestDay.day, { weekday: 'long', day: 'numeric' })} ({current.bestDay.points} puntos)
        </p>
      )}
      <p className="text-sm">
        <Icon name={comparisonIcon} className="text-accent" /> {comparison}
      </p>
    </section>
  );
}

function Achievements({ achievements }) {
  const unlocked = achievements.filter((a) => a.unlockedDay).length;
  return (
    <section className="space-y-3 rounded-2xl bg-surface p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold">Logros</h2>
        <span className="text-xs text-muted">
          {unlocked} de {achievements.length}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {achievements.map((a) => (
          <div
            key={a.key}
            title={`${a.description}${a.unlockedDay ? ` · ${formatDay(a.unlockedDay)}` : ''}`}
            className={`flex flex-col items-center gap-1 rounded-xl p-2 text-center ${a.unlockedDay ? 'bg-gold/10' : 'bg-bg opacity-45'}`}
          >
            <Icon name={a.icon} className={`text-3xl ${a.unlockedDay ? 'text-gold' : 'text-muted'}`} />
            <span className="text-[11px] leading-tight font-medium">{a.title}</span>
            <span className="text-[10px] leading-tight text-muted">{a.unlockedDay ? `+${a.points} XP` : a.description}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function ProfilePage() {
  const { profile, achievements, weeks } = useGame();
  const [today] = useState(toDayString);

  if (!profile) return <p className="pt-10 text-center text-muted">Cargando…</p>;

  return (
    <div className="space-y-4 pt-2">
      <RankCard rank={profile.rank} />
      <WeekMedalCard week={profile.week} active={profile.todayPoints > 0} />
      <WeekSummary today={today} />
      <Showcase weeks={weeks} today={today} />

      <section className="space-y-2 rounded-2xl bg-surface p-4">
        <h2 className="font-semibold">Nivel {profile.level}</h2>
        <ProgressBar value={profile.levelXp} max={profile.levelSize} className="bg-gold" />
        <p className="text-xs text-muted">
          {profile.levelXp}/{profile.levelSize} XP · faltan {profile.levelSize - profile.levelXp} para el nivel {profile.level + 1}
          {' · '}
          {profile.xp} XP en total
        </p>
      </section>

      <StreakCard streak={profile.streak} />
      <Achievements achievements={achievements} />

      <Link to="/mi-perfil" className="flex items-center justify-between px-1 pt-2 text-sm text-muted hover:text-white">
        <span>
          <Icon name="user-round" /> Mi perfil: datos, contraseña y cerrar sesión
        </span>
        <Icon name="chevron-right" />
      </Link>
    </div>
  );
}
