import { Navigate, Route, Routes } from 'react-router';
import { useAuth } from './auth/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import AuthPage from './pages/AuthPage.jsx';
import ResetPasswordPage from './pages/ResetPasswordPage.jsx';
import TodayPage from './pages/TodayPage.jsx';
import TasksPage from './pages/TasksPage.jsx';
import HabitsPage from './pages/HabitsPage.jsx';
import CategoriesPage from './pages/CategoriesPage.jsx';
import FocusPage from './pages/FocusPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import AccountPage from './pages/AccountPage.jsx';
import { GameProvider } from './game/GameContext.jsx';
import CalendarPage from './pages/CalendarPage.jsx';
import { FocusProvider } from './focus/FocusContext.jsx';

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="grid min-h-dvh place-items-center text-muted">Cargando…</div>;
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage />} />
      <Route path="/restablecer" element={<ResetPasswordPage />} />
      <Route
        element={
          <RequireAuth>
            <GameProvider>
              <FocusProvider>
                <Layout />
              </FocusProvider>
            </GameProvider>
          </RequireAuth>
        }
      >
        <Route index element={<TodayPage />} />
        <Route path="tareas" element={<TasksPage />} />
        <Route path="habitos" element={<HabitsPage />} />
        <Route path="categorias" element={<CategoriesPage />} />
        <Route path="foco" element={<FocusPage />} />
        <Route path="calendario" element={<CalendarPage />} />
        <Route path="perfil" element={<ProfilePage />} />
        <Route path="mi-perfil" element={<AccountPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
