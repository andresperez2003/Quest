import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';

// GET simple con recarga manual. `path` null = no pedir nada.
export function useApi(path) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    if (!path) return;
    try {
      setData(await api.get(path));
      setError(null);
    } catch (err) {
      setError(err);
    }
  }, [path]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, error, reload, setData };
}
