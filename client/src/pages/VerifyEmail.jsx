import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import AuthLayout from '../components/layout/AuthLayout.jsx';
import { Spinner } from '../components/ui/index.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api, errMsg } from '../lib/api.js';

export default function VerifyEmail() {
  const { user, refreshUser, logout } = useAuth();
  const nav = useNavigate();

  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);

  if (user.emailVerified) {
    return <Navigate to="/verification" replace />;
  }

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);

    try {
      await api.post('/auth/verify-email', { otp });
      await refreshUser();
      toast.success('Email verified');
      nav('/verification', { replace: true });
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    try {
      await api.post('/auth/resend-otp');
      toast.success('New code sent');
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  return (
    <AuthLayout
      title="Confirm your email"
      subtitle={`We sent a 6-digit code to ${user.email}.`}
      footer={
        <button
          onClick={() => logout().then(() => nav('/'))}
          className="underline text-neutral-700 hover:text-black dark:text-neutral-300 dark:hover:text-white"
        >
          Sign out
        </button>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <input
          className="input text-center text-2xl font-semibold tracking-[0.5em]"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="······"
          value={otp}
          onChange={(e) =>
            setOtp(e.target.value.replace(/\D/g, ''))
          }
        />

        <button
          className="btn-primary w-full py-3"
          disabled={busy || otp.length !== 6}
        >
          {busy ? <Spinner /> : 'Verify'}
        </button>

        <button
          type="button"
          onClick={resend}
          className="w-full text-sm text-neutral-500 transition-colors hover:text-black dark:text-neutral-400 dark:hover:text-white"
        >
          Didn’t get it? Resend code
        </button>
      </form>
    </AuthLayout>
  );
}