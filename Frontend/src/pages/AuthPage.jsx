import { useEffect, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router';
import { api } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';
import AuthShell, { Field, FormError, MIN_PASSWORD, PasswordField, SubmitButton, errorText, inputClass } from '../components/auth/AuthShell.jsx';
import Icon from '../components/Icon.jsx';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function emailError(email) {
  if (!email.trim()) return 'Escribe tu email';
  if (!EMAIL_RE.test(email.trim())) return 'Ese email no parece válido';
  return undefined;
}

function validate(form, isRegister) {
  const errors = {};
  if (isRegister && !form.name.trim()) errors.name = 'Escribe tu nombre';
  errors.email = emailError(form.email);
  if (!form.password) errors.password = 'Escribe tu contraseña';
  else if (isRegister && form.password.length < MIN_PASSWORD) errors.password = `Mínimo ${MIN_PASSWORD} caracteres`;
  return Object.fromEntries(Object.entries(errors).filter(([, v]) => v));
}

// Lleva cada error de la API a su campo; lo que no es de un campo va arriba del botón.
function serverErrors(err) {
  const issue = err.details?.[0];
  if (issue?.path?.[0]) return { [issue.path[0]]: issue.message };
  if (err.status === 409) return { email: err.message };
  return { general: err.message };
}

function EmailField({ value, onChange, error }) {
  return (
    <Field id="auth-email" label="Email" icon="mail" error={error}>
      <input
        id="auth-email"
        className={inputClass}
        type="email"
        inputMode="email"
        placeholder="tu@email.com"
        autoComplete="email"
        value={value}
        onChange={onChange}
        aria-invalid={!!error}
        aria-describedby={error ? 'auth-email-error' : undefined}
      />
    </Field>
  );
}

// "¿Olvidaste tu contraseña?": pide el enlace y confirma sin revelar si el email tiene cuenta.
function ForgotPassword({ initialEmail, onBack }) {
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState('');
  const [sentTo, setSentTo] = useState(null);
  const [sending, setSending] = useState(false);

  async function send(e) {
    e?.preventDefault();
    const invalid = emailError(email);
    if (invalid) return setError(invalid);
    setSending(true);
    setError('');
    try {
      await api.post('/auth/forgot', { email: email.trim() });
      setSentTo(email.trim());
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSending(false);
    }
  }

  if (sentTo) {
    return (
      <div className="space-y-5 text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-full bg-accent/15 text-2xl text-accent">
          <Icon name="mail" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Revisa tu correo</h1>
          <p className="text-sm text-muted">
            Si existe una cuenta con <strong className="text-white">{sentTo}</strong>, te llegará un enlace para elegir una
            contraseña nueva. Caduca en 30 minutos.
          </p>
          <p className="text-xs text-muted">¿No aparece? Mira en spam o promociones.</p>
        </div>
        <FormError>{error}</FormError>
        <button onClick={onBack} className="w-full rounded-lg bg-accent py-2.5 font-semibold text-bg hover:brightness-110">
          Volver a entrar
        </button>
        <button onClick={() => send()} disabled={sending} className="text-sm text-muted hover:text-white disabled:opacity-60">
          {sending ? 'Enviando…' : 'Reenviar el enlace'}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={send} noValidate className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Recupera tu contraseña</h1>
        <p className="text-sm text-muted">Te enviaremos un enlace para elegir una nueva.</p>
      </div>
      <EmailField
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          setError('');
        }}
        error={error && emailError(email) ? error : undefined}
      />
      {!emailError(email) && <FormError>{error}</FormError>}
      <SubmitButton busy={sending} busyLabel="Enviando…">
        Enviar enlace
      </SubmitButton>
      <button type="button" onClick={onBack} className="w-full text-sm text-muted hover:text-white">
        <Icon name="chevron-left" /> Volver a entrar
      </button>
    </form>
  );
}

export default function AuthPage() {
  const { user, login, register } = useAuth();
  const [params, setParams] = useSearchParams();
  const [status, setStatus] = useState({ registrationOpen: false, passwordReset: false });
  const [mode, setMode] = useState(() => (params.get('olvide') ? 'forgot' : 'login'));
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get('/auth/status').then((s) => {
      setStatus(s);
      // Primera vez que se abre la app: ir directo a crear la cuenta.
      if (s.firstRun && !params.get('olvide')) setMode('register');
    });
  }, []);

  if (user) return <Navigate to="/" replace />;

  const isRegister = mode === 'register';

  const update = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value });
    if (errors[field] || errors.general) setErrors({ ...errors, [field]: undefined, general: undefined });
  };

  function switchMode(next) {
    setMode(next);
    setErrors({});
    if (params.get('olvide')) setParams({}, { replace: true });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const found = validate(form, isRegister);
    setErrors(found);
    if (Object.keys(found).length) return;

    setSubmitting(true);
    try {
      if (isRegister) await register(form.name.trim(), form.email.trim(), form.password);
      else await login(form.email.trim(), form.password);
    } catch (err) {
      setErrors(serverErrors(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (mode === 'forgot') {
    return (
      <AuthShell>
        <ForgotPassword initialEmail={form.email} onBack={() => switchMode('login')} />
      </AuthShell>
    );
  }

  const tab = (active) =>
    `flex-1 rounded-md py-1.5 text-sm font-medium transition ${active ? 'bg-surface text-white shadow' : 'text-muted hover:text-white'}`;

  return (
    <AuthShell>
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold">{isRegister ? 'Crea tu cuenta' : 'Bienvenido de vuelta'}</h1>
          <p className="text-sm text-muted">
            {isRegister ? 'Solo te llevará un momento.' : 'Entra para seguir con tu progreso.'}
          </p>
        </div>

        {status.registrationOpen && (
          <div className="flex gap-1 rounded-lg bg-bg p-1 ring-1 ring-border" role="tablist">
            <button type="button" role="tab" aria-selected={!isRegister} className={tab(!isRegister)} onClick={() => switchMode('login')}>
              Entrar
            </button>
            <button type="button" role="tab" aria-selected={isRegister} className={tab(isRegister)} onClick={() => switchMode('register')}>
              Crear cuenta
            </button>
          </div>
        )}

        {isRegister && (
          <Field id="auth-name" label="Nombre" icon="user-round" error={errors.name}>
            <input
              id="auth-name"
              className={inputClass}
              placeholder="¿Cómo te llamamos?"
              autoComplete="name"
              maxLength={50}
              value={form.name}
              onChange={update('name')}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'auth-name-error' : undefined}
            />
          </Field>
        )}

        <EmailField value={form.email} onChange={update('email')} error={errors.email} />

        <PasswordField
          id="auth-password"
          label="Contraseña"
          value={form.password}
          onChange={update('password')}
          error={errors.password}
          isNew={isRegister}
          placeholder={isRegister ? 'Crea una contraseña' : 'Tu contraseña'}
          action={
            !isRegister &&
            status.passwordReset && (
              <button type="button" onClick={() => switchMode('forgot')} className="text-xs text-accent hover:underline">
                ¿Olvidaste tu contraseña?
              </button>
            )
          }
        />

        <FormError>{errors.general}</FormError>

        <SubmitButton busy={submitting} busyLabel={isRegister ? 'Creando cuenta…' : 'Entrando…'}>
          {isRegister ? 'Crear cuenta' : 'Entrar'}
        </SubmitButton>
      </form>
    </AuthShell>
  );
}
