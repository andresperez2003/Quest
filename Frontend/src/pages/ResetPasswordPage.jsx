import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useAuth } from '../auth/AuthContext.jsx';
import AuthShell, { FormError, MIN_PASSWORD, PasswordField, SubmitButton, errorText } from '../components/auth/AuthShell.jsx';
import Icon from '../components/Icon.jsx';

// Destino del enlace del correo: elegir contraseña nueva y entrar directamente.
export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const { resetPassword } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [expired, setExpired] = useState(false);
  const [saving, setSaving] = useState(false);

  const update = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value });
    setErrors({});
  };

  async function handleSubmit(e) {
    e.preventDefault();
    const found = {};
    if (form.password.length < MIN_PASSWORD) found.password = `Mínimo ${MIN_PASSWORD} caracteres`;
    else if (form.confirm !== form.password) found.confirm = 'No coincide con la nueva contraseña';
    setErrors(found);
    if (Object.keys(found).length) return;

    setSaving(true);
    try {
      await resetPassword(token, form.password);
      navigate('/', { replace: true });
    } catch (err) {
      if (err.status === 400 && !err.details) setExpired(true);
      else setErrors({ general: errorText(err) });
      setSaving(false);
    }
  }

  if (!token || expired) {
    return (
      <AuthShell>
        <div className="space-y-5 text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-red-500/15 text-2xl text-red-400">
            <Icon name="triangle-alert" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Este enlace ya no sirve</h1>
            <p className="text-sm text-muted">
              Los enlaces caducan a los 30 minutos y solo se pueden usar una vez. Pide uno nuevo y usa el más reciente.
            </p>
          </div>
          <Link to="/login?olvide=1" className="block w-full rounded-lg bg-accent py-2.5 font-semibold text-bg hover:brightness-110">
            Pedir otro enlace
          </Link>
          <Link to="/login" className="block text-sm text-muted hover:text-white">
            Volver a entrar
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold">Elige una contraseña nueva</h1>
          <p className="text-sm text-muted">Al guardarla entrarás directamente.</p>
        </div>
        <PasswordField
          id="reset-password"
          label="Nueva contraseña"
          value={form.password}
          onChange={update('password')}
          error={errors.password}
          isNew
          placeholder="Crea una contraseña"
        />
        <PasswordField
          id="reset-confirm"
          label="Repítela"
          value={form.confirm}
          onChange={update('confirm')}
          error={errors.confirm}
          autoComplete="new-password"
          placeholder="La misma otra vez"
        />
        <FormError>{errors.general}</FormError>
        <SubmitButton busy={saving} busyLabel="Guardando…">
          Guardar y entrar
        </SubmitButton>
      </form>
    </AuthShell>
  );
}
