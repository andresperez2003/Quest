import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, ApiError } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // undefined = cargando, null = sin sesión
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    api
      .get('/auth/me')
      .then(({ user }) => setUser(user))
      .catch((err) => {
        if (!(err instanceof ApiError && err.status === 401)) console.error(err);
        setUser(null);
      });
  }, []);

  const login = useCallback(async (email, password) => {
    const { user } = await api.post('/auth/login', { email, password });
    setUser(user);
  }, []);

  const register = useCallback(async (name, email, password) => {
    const { user } = await api.post('/auth/register', { name, email, password });
    setUser(user);
  }, []);

  const resetPassword = useCallback(async (token, password) => {
    const { user } = await api.post('/auth/reset', { token, password });
    setUser(user);
  }, []);

  const updateProfile = useCallback(async (fields) => {
    const { user } = await api.patch('/auth/me', fields);
    setUser(user);
  }, []);

  const logout = useCallback(async () => {
    await api.post('/auth/logout');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading: user === undefined, login, register, logout, updateProfile, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
