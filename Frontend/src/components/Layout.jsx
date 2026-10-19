import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { useAuth } from '../auth/AuthContext.jsx';
import { useGame } from '../game/GameContext.jsx';
import { useFocus } from '../focus/FocusContext.jsx';
import { useReminders } from '../hooks/useReminders.js';
import { formatClock } from '../lib/focus.js';
import GameToasts from './GameToasts.jsx';
import Icon from './Icon.jsx';

const TABS = [
  { to: '/', label: 'Hoy', icon: 'sun' },
  { to: '/tareas', label: 'Tareas', icon: 'clipboard-list' },
  { to: '/habitos', label: 'Hábitos', icon: 'flame' },
  { to: '/foco', label: 'Foco', icon: 'timer' },
  { to: '/calendario', label: 'Calendario', icon: 'calendar-days' },
];

// Nivel con barra de XP y racha: lleva al perfil.
function GameBadge() {
  const { user } = useAuth();
  const { profile } = useGame();
  const level = profile?.level ?? user.level;
  const progress = profile ? profile.levelXp / profile.levelSize : 0;

  return (
    <Link to="/perfil" className="flex items-center gap-2 rounded-full bg-surface px-3 py-1 text-sm hover:bg-border" title="Tu progreso">
      <span className="flex flex-col leading-none">
        <span className="font-semibold">Nv {level}</span>
        <span className="mt-0.5 h-1 w-10 overflow-hidden rounded-full bg-bg">
          <span className="block h-full rounded-full bg-gold transition-all duration-500" style={{ width: `${progress * 100}%` }} />
        </span>
      </span>
      {profile?.streak.current > 0 && (
        <span>
          <Icon name="flame" className="text-orange-400" /> {profile.streak.current}
        </span>
      )}
    </Link>
  );
}

// Temporizador en marcha visible desde cualquier pantalla.
function FocusPill() {
  const { session, remainingMs } = useFocus();
  const { pathname } = useLocation();
  if (!session || pathname === '/foco') return null;
  const rest = session.mode === 'rest';
  return (
    <Link
      to="/foco"
      className={`rounded-full px-3 py-1 text-sm font-semibold tabular-nums ${rest ? 'bg-rest/15 text-rest' : 'bg-accent/15 text-accent'}`}
    >
      <Icon name={rest ? 'coffee' : 'timer'} /> {formatClock(remainingMs)}
      {!session.running && <> <Icon name="pause" /></>}
    </Link>
  );
}

// Inicial del nombre: acceso a "Mi perfil" (datos y contraseña).
function AccountLink() {
  const { user } = useAuth();
  return (
    <NavLink
      to="/mi-perfil"
      title="Mi perfil"
      aria-label="Mi perfil"
      className={({ isActive }) =>
        `grid size-8 place-items-center rounded-full text-sm font-bold ${isActive ? 'bg-accent text-bg' : 'bg-accent/15 text-accent hover:bg-accent/25'}`
      }
    >
      {user.name.charAt(0).toUpperCase()}
    </NavLink>
  );
}

export default function Layout() {
  useReminders();

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col">
      <GameToasts />
      <header className="flex items-center justify-between gap-2 px-4 py-3">
        <Link to="/" className="text-lg font-bold">
          Quest
        </Link>
        <div className="flex items-center gap-2 text-sm">
          <FocusPill />
          <GameBadge />
          <Link to="/categorias" className="text-lg" title="Categorías" aria-label="Categorías">
            <Icon name="tag" className="text-muted" />
          </Link>
          <AccountLink />
        </div>
      </header>

      <main className="flex-1 px-4 pb-24">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <ul className="mx-auto flex max-w-2xl">
          {TABS.map((tab) => (
            <li key={tab.to} className="flex-1">
              <NavLink
                to={tab.to}
                end
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 py-2 text-[11px] ${isActive ? 'text-accent' : 'text-muted'}`
                }
              >
                <Icon name={tab.icon} size={22} />
                {tab.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
