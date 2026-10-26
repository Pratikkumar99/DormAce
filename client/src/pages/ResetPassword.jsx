import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import AuthLayout from '../components/layout/AuthLayout.jsx';
import { Field, Spinner } from '../components/ui/index.jsx';
import { api, errMsg } from '../lib/api.js';

export default function ResetPassword() {
  const [sp] = useSearchParams();
  const nav = useNavigate();

  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);

    try {
      await api.post('/auth/reset-password', {
        email: sp.get('email'),
        token: sp.get('token'),
        password,
      });

      toast.success('Password updated. Please sign in.');
      nav('/login', { replace: true });
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Choose a new password"
      footer={
        <Link
          to="/login"
          className="font-medium text-black underline dark:text-white"
        >
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field
          label="New password"
          hint="Min 8 characters with upper, lower case and a number"
        >
          <input
            className="input"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>

        <button
          className="btn-primary w-full py-3"
          disabled={busy}
        >
          {busy ? <Spinner /> : 'Update password'}
        </button>
      </form>
    </AuthLayout>
  );
}