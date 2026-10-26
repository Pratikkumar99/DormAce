import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Clock, XCircle, Upload } from 'lucide-react';
import AuthLayout from '../components/layout/AuthLayout.jsx';
import { Spinner } from '../components/ui/index.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api, errMsg } from '../lib/api.js';

export default function Verification() {
  const { user, refreshUser, logout } = useAuth();
  const nav = useNavigate();

  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = setInterval(refreshUser, 20_000);
    return () => clearInterval(t);
  }, [refreshUser]);

  if (!user.emailVerified) {
    return <Navigate to="/verify-email" replace />;
  }

  if (user.verification.status === 'approved') {
    return <Navigate to="/market" replace />;
  }

  const rejected = user.verification.status === 'rejected';

  const resubmit = async () => {
    if (!file) return;

    setBusy(true);

    try {
      const fd = new FormData();
      fd.append('idCard', file);

      await api.post('/auth/id-card', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      await refreshUser();
      setFile(null);
      toast.success('Submitted for review');
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title={
        rejected
          ? 'We couldn’t verify your ID'
          : 'Verification in progress'
      }
      footer={
        <button
          onClick={() => logout().then(() => nav('/'))}
          className="underline text-neutral-700 hover:text-black dark:text-neutral-300 dark:hover:text-white"
        >
          Sign out
        </button>
      }
    >
      <div className="card p-6 text-center">
        {rejected ? (
          <XCircle
            className="mx-auto h-10 w-10 text-red-500 dark:text-red-400"
            strokeWidth={1.5}
          />
        ) : (
          <Clock
            className="mx-auto h-10 w-10 text-neutral-700 dark:text-neutral-300"
            strokeWidth={1.5}
          />
        )}

        <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">
          {rejected ? (
            <>
              Reason:{' '}
              <b className="text-black dark:text-white">
                {user.verification.rejectionReason}
              </b>
              . Upload a clearer photo to try again.
            </>
          ) : (
            'An admin is checking your college ID against your hostel details. This usually takes less than a day. You’ll get a notification when you’re in.'
          )}
        </p>
      </div>

      <button
        onClick={refreshUser}
        className="btn-outline mt-4 w-full"
      >
        Check status
      </button>

      {rejected && (
        <div className="mt-5 space-y-3">
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-neutral-300 py-5 text-sm text-neutral-500 transition-colors hover:border-black dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-neutral-400">
            <Upload className="h-4 w-4" />
            <span className="max-w-[80%] truncate">
              {file ? file.name : 'Choose a new ID photo'}
            </span>

            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) =>
                setFile(e.target.files?.[0] || null)
              }
            />
          </label>

          <button
            className="btn-primary w-full"
            disabled={!file || busy}
            onClick={resubmit}
          >
            {busy ? <Spinner /> : 'Resubmit'}
          </button>
        </div>
      )}
    </AuthLayout>
  );
}