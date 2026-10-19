import { useCallback, useEffect, useRef, useState } from 'react';

// Activa una animación de recompensa durante ~1 s.
export function useCelebrate() {
  const [celebrating, setCelebrating] = useState(false);
  const timer = useRef();

  const celebrate = useCallback(() => {
    clearTimeout(timer.current);
    setCelebrating(true);
    timer.current = setTimeout(() => setCelebrating(false), 900);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  return [celebrating, celebrate];
}
