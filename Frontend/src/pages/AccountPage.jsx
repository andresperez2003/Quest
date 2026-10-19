import { useState } from 'react';
import { Link } from 'react-router';
import { api } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';
import Icon from '../components/Icon.jsx';

const input = 'w-full rounded-lg border border-border bg-bg px-3 py-2 outline-none focus:border-accent';
const errorText = (err) => err.details?.[0]?.message ?? err.message;

function NameForm({ user, onSave }) {
  const [name, setName] = useState(user.name);
  const [status, setStatus] = useState(null); // null | 'saving' | 'saved' | { error }
  const changed = name.trim() && name.trim() !== user.name;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!changed) return;
    setStatus('saving');
    try {
      await onSave({ name: name.trim() });
      setStatus('saved');
    } catch (err) {
      setStatus({ error: errorText(err) });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <label htmlFor="account-name" className="text-sm text-muted">
        Nombre
      </label>
      <div className="flex gap-2">
        <input
          id="account-name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setStatus(null);
          }}
          maxLength={50}
          className={input}
        />
        <button
          disabled={!changed || status === 'saving'}
          className="shrink-0 rounded-lg bg-accent px-4 font-semibold text-bg disabled:opacity-40"
        >
          Guardar
        </button>
      </div>
      {status === 'saved' && <p className="text-sm text-accent">Nombre actualizado</p>}
      {status?.error && <p className="text-sm text-red-400">{status.error}</p>}
    </form>
  );
}

const EMPTY_PASSWORDS = { currentPassword: '', newPassword: '', confirm: '' };

function PasswordForm() {
  const [form, setForm] = useState(EMPTY_PASSWORDS);
  const [status, setStatus] = useState(null); // null | 'saving' | 'saved' | { error }
  const set = (patch) => {
    setForm((f) => ({ ...f, ...patch }));
    setStatus(null);
  };

  const tooShort = form.newPassword.length > 0 && form.newPassword.length < 8;
  const mismatch = form.confirm.length > 0 && form.confirm !== form.newPassword;
  const ready = form.currentPassword && form.newPassword.length >= 8 && form.confirm === form.newPassword;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!ready) return;
    setStatus('saving');
    try {
      await api.post('/auth/password', { currentPassword: form.currentPassword, newPassword: form.newPassword });
      setForm(EMPTY_PASSWORDS);
      setStatus('saved');
    } catch (err) {
      setStatus({ error: errorText(err) });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        type="password"
        autoComplete="current-password"
        placeholder="Contraseña actual"
        aria-label="Contraseña actual"
        value={form.currentPassword}
        onChange={(e) => set({ currentPassword: e.target.value })}
        className={input}
      />
      <div className="space-y-1">
        <input
          type="password"
          autoComplete="new-password"
          placeholder="Nueva contraseña"
          aria-label="Nueva contraseña"
          value={form.newPassword}
          onChange={(e) => set({ newPassword: e.target.value })}
          maxLength={100}
          className={input}
        />
        <p className={`text-xs ${tooShort ? 'text-red-400' : 'text-muted'}`}>Mínimo 8 caracteres</p>
      </div>
      <div className="space-y-1">
        <input
          type="password"
          autoComplete="new-password"
          placeholder="Repite la nueva contraseña"
          aria-label="Repite la nueva contraseña"
          value={form.confirm}
          onChange={(e) => set({ confirm: e.target.value })}
          maxLength={100}
          className={input}
        />
        {mismatch && <p className="text-xs text-red-400">No coincide con la nueva contraseña</p>}
      </div>
      {status === 'saved' && (
        <p className="text-sm text-accent">
          <Icon name="circle-check" /> Contraseña actualizada
        </p>
      )}
      {status?.error && <p className="text-sm text-red-400">{status.error}</p>}
      <button
        disabled={!ready || status === 'saving'}
        className="w-full rounded-lg bg-accent py-2 font-semibold text-bg disabled:opacity-40"
      >
        {status === 'saving' ? 'Guardando…' : 'Cambiar contraseña'}
      </button>
    </form>
  );
}

export default function AccountPage() {
  const { user, logout, updateProfile } = useAuth();
  const since = new Date(user.createdAt).toLocaleDateString('es', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-4 pt-2">
      <section className="flex items-center gap-4 rounded-2xl bg-surface p-4">
        <div className="grid size-14 shrink-0 place-items-center rounded-full bg-accent/15 text-2xl font-bold text-accent">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold">{user.name}</h1>
          <p className="truncate text-sm text-muted">{user.email}</p>
          <p className="text-xs text-muted">En Quest desde {since}</p>
        </div>
      </section>

      <Link to="/perfil" className="flex items-center justify-between rounded-2xl bg-surface p-4 hover:bg-border">
        <span>
          <Icon name="trophy" className="text-gold" /> Ver mi progreso (rango, medallas, logros)
        </span>
        <Icon name="chevron-right" className="text-muted" />
      </Link>

      <section className="space-y-3 rounded-2xl bg-surface p-4">
        <h2 className="font-semibold">
          <Icon name="user-round" /> Datos
        </h2>
        <NameForm user={user} onSave={updateProfile} />
        <div className="space-y-1">
          <p className="text-sm text-muted">Email</p>
          <p className="rounded-lg bg-bg px-3 py-2 text-muted">{user.email}</p>
        </div>
      </section>

      <section className="space-y-3 rounded-2xl bg-surface p-4">
        <h2 className="font-semibold">
          <Icon name="lock-keyhole" /> Cambiar contraseña
        </h2>
        <PasswordForm />
      </section>

      <button onClick={logout} className="w-full rounded-2xl bg-surface py-3 text-red-400 hover:bg-border">
        <Icon name="log-out" /> Cerrar sesión
      </button>
    </div>
  );
}
