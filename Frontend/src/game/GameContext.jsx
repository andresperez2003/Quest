import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api, DATA_CHANGED } from '../api/client.js';
import { toDayString } from '../lib/dates.js';

// Estado del juego (nivel, XP, racha, medallas, rango, logros). Se resincroniza tras cada cambio de datos
// y cuando la app vuelve a primer plano; las novedades (logros, nivel, cofres) se muestran como avisos.
const GameContext = createContext(null);
const SYNC_DELAY_MS = 400;

const newsKey = (n) => `${n.type}:${n.key ?? n.level ?? ''}`;

export function GameProvider({ children }) {
  const [state, setState] = useState(null);
  const [toasts, setToasts] = useState([]);
  const timer = useRef();

  const sync = useCallback(async () => {
    try {
      const { news, ...data } = await api.post('/game/sync', { today: toDayString() });
      setState(data);
      if (news.length) {
        setToasts((current) => {
          const keys = new Set(current.map((t) => t.id));
          return [...current, ...news.map((n) => ({ ...n, id: newsKey(n) })).filter((n) => !keys.has(n.id))];
        });
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    sync();
    const later = () => {
      clearTimeout(timer.current);
      timer.current = setTimeout(sync, SYNC_DELAY_MS);
    };
    const onVisible = () => document.visibilityState === 'visible' && later();
    window.addEventListener(DATA_CHANGED, later);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearTimeout(timer.current);
      window.removeEventListener(DATA_CHANGED, later);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [sync]);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  return (
    <GameContext.Provider
      value={{
        profile: state?.profile ?? null,
        achievements: state?.achievements ?? [],
        weeks: state?.weeks ?? [],
        toasts,
        dismiss,
        sync,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  return useContext(GameContext);
}
