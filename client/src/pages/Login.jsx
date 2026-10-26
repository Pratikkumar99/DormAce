import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import AuthLayout from '../components/layout/AuthLayout.jsx';
import { Field, Spinner } from '../components/ui/index.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { errMsg } from '../lib/api.js';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();

  const [form, setForm] = useState({ email: '', password: '' });
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);

    try {
      await login(form.email, form.password);
      nav(loc.state?.from?.pathname || '/market', { replace: true });
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your hostel marketplace."
      footer={
        <>
          New here?{' '}
          <Link
            to="/register"
            className="font-medium text-black underline dark:text-white"
          >
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email">
          <input
            className="input"
            type="email"
            autoComplete="email"
            required
            value={form.email}
            onChange={(e) =>
              setForm({ ...form, email: e.target.value })
            }
          />
        </Field>

        <Field label="Password">
          <input
            className="input"
            type="password"
            autoComplete="current-password"
            required
            value={form.password}
            onChange={(e) =>
              setForm({ ...form, password: e.target.value })
            }
          />
        </Field>

        <div className="text-right">
          <Link
            to="/forgot-password"
            className="text-sm text-neutral-500 hover:text-black dark:text-neutral-400 dark:hover:text-white"
          >
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          className="btn-primary w-full py-3"
          disabled={busy}
        >
          {busy ? <Spinner /> : 'Sign in'}
        </button>
      </form>
    </AuthLayout>
  );
}