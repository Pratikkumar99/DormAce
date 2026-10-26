import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import AuthLayout from '../components/layout/AuthLayout.jsx';
import { Field, Spinner } from '../components/ui/index.jsx';
import { api, errMsg } from '../lib/api.js';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);

    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Reset password"
      subtitle="We’ll email you a link that’s valid for 30 minutes."
      footer={
        <Link
          to="/login"
          className="font-medium text-black underline dark:text-white"
        >
          Back to sign in
        </Link>
      }
    >
      {sent ? (
        <p className="rounded-lg bg-neutral-50 p-4 text-sm text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
          If an account exists for <b className="text-neutral-900 dark:text-neutral-100">{email}</b>, a reset link is on its way.
        </p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Field label="Email">
            <input
              className="input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>

          <button
            className="btn-primary w-full py-3"
            disabled={busy}
          >
            {busy ? <Spinner /> : 'Send reset link'}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}