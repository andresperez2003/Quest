import { useState } from 'react';
import Icon from '../Icon.jsx';

const BENEFITS = [
  { icon: 'list-checks', title: 'Tareas en pasos pequeños', text: 'Divide lo grande y avanza paso a paso.' },
  { icon: 'flame', title: 'Hábitos sin castigos', text: 'Rachas que no se rompen hasta que acaba el periodo.' },
  { icon: 'timer', title: 'Foco con pomodoro', text: 'Un pomodoro a la vez; las distracciones, aparcadas.' },
  { icon: 'medal', title: 'Medallas cada semana', text: 'Cada semana empieza de cero. Tu rango nunca baja.' },
];

export const MIN_PASSWORD = 8;
export const inputClass = 'min-w-0 flex-1 bg-transparent py-2.5 outline-none';
export const errorText = (err) => err.details?.[0]?.message ?? err.message;

function Hero() {
  return (
    <aside className="relative overflow-hidden bg-surface px-6 py-8 lg:flex lg:flex-col lg:justify-center lg:px-12">
      <div className="pointer-events-none absolute -top-24 -left-24 size-72 rounded-full bg-accent/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 -bottom-24 size-64 rounded-full bg-gold/10 blur-3xl" />

      <div className="relative mx-auto w-full max-w-md">
        <div className="flex items-center gap-3">
          <img src="/icon.svg" alt="" className="size-12 rounded-xl" />
          <span className="text-3xl font-bold">Quest</span>
        </div>
        <p className="mt-3 text-lg text-muted lg:text-xl">Tu día, un paso a la vez.</p>

        {/* En móvil, solo los íconos: el formulario es lo importante. */}
        <ul className="mt-5 flex gap-3 lg:hidden" aria-hidden="true">
          {BENEFITS.map((b) => (
            <li key={b.icon} className="grid size-10 place-items-center rounded-xl bg-bg text-lg text-accent">
              <Icon name={b.icon} />
            </li>
          ))}
        </ul>

        <ul className="mt-10 hidden space-y-6 lg:block">
          {BENEFITS.map((b) => (
            <li key={b.icon} className="flex gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-bg text-xl text-accent">
                <Icon name={b.icon} />
              </span>
              <span>
                <span className="block font-semibold">{b.title}</span>
                <span className="text-sm text-muted">{b.text}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

// Pantalla dividida: beneficios a la izquierda (arriba y compactos en móvil) y el formulario a la derecha.
export default function AuthShell({ children }) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-2">
      <Hero />
      <main className="flex items-start justify-center px-4 py-8 lg:items-center">
        <div className="w-full max-w-sm animate-sheet">{children}</div>
      </main>
    </div>
  );
}

export function Field({ id, label, icon, error, hint, action, children }) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        {action}
      </div>
      <div
        className={`flex items-center gap-2 rounded-lg border bg-bg px-3 transition focus-within:border-accent ${error ? 'border-red-400' : 'border-border'}`}
      >
        <Icon name={icon} className="text-muted" />
        {children}
      </div>
      {error ? (
        <p id={`${id}-error`} className="text-xs text-red-400">
          {error}
        </p>
      ) : (
        hint
      )}
    </div>
  );
}

export function FormError({ children }) {
  if (!children) return null;
  return (
    <p role="alert" className="flex items-start gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
      <Icon name="triangle-alert" className="mt-0.5" />
      <span>{children}</span>
    </p>
  );
}

export function SubmitButton({ busy, busyLabel, children }) {
  return (
    <button
      disabled={busy}
      className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent py-2.5 font-semibold text-bg transition hover:brightness-110 disabled:opacity-60"
    >
      {busy && <Icon name="loader-circle" className="animate-spin" />}
      {busy ? busyLabel : children}
    </button>
  );
}

// Orientativo: solo se exige el mínimo de 8 caracteres.
function passwordStrength(password) {
  if (password.length < MIN_PASSWORD) return 0;
  let score = 1;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;
  return score;
}

const STRENGTH = [
  null,
  { label: 'Aceptable', color: 'bg-orange-400' },
  { label: 'Buena', color: 'bg-yellow-400' },
  { label: 'Fuerte', color: 'bg-accent' },
  { label: 'Muy fuerte', color: 'bg-accent' },
];

// Contraseña con ojo para verla, aviso de Bloq Mayús y, al crear una nueva, medidor de seguridad.
export function PasswordField({ id, label, value, onChange, error, isNew = false, autoComplete, placeholder, action }) {
  const [visible, setVisible] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const checkCaps = (e) => setCapsLock(e.getModifierState?.('CapsLock') ?? false);
  const strength = isNew ? passwordStrength(value) : 0;

  return (
    <Field
      id={id}
      label={label}
      icon="lock-keyhole"
      error={error}
      action={action}
      hint={
        <>
          {capsLock && (
            <p className="text-xs text-yellow-400">
              <Icon name="triangle-alert" /> Bloq Mayús está activado
            </p>
          )}
          {isNew && (
            <div className="space-y-1 pt-1">
              <div className="flex gap-1" aria-hidden="true">
                {[1, 2, 3, 4].map((n) => (
                  <span key={n} className={`h-1 flex-1 rounded-full transition ${strength >= n ? STRENGTH[strength].color : 'bg-border'}`} />
                ))}
              </div>
              <p className="text-xs text-muted">
                {strength ? `Seguridad: ${STRENGTH[strength].label}` : `Mínimo ${MIN_PASSWORD} caracteres`}
              </p>
            </div>
          )}
        </>
      }
    >
      <input
        id={id}
        className={inputClass}
        type={visible ? 'text' : 'password'}
        placeholder={placeholder}
        autoComplete={autoComplete ?? (isNew ? 'new-password' : 'current-password')}
        maxLength={100}
        value={value}
        onChange={onChange}
        onKeyUp={checkCaps}
        onKeyDown={checkCaps}
        onBlur={() => setCapsLock(false)}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="-mr-1 p-1 text-muted hover:text-white"
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        aria-pressed={visible}
      >
        <Icon name={visible ? 'eye-off' : 'eye'} />
      </button>
    </Field>
  );
}
