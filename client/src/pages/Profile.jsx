import { useState } from 'react';
import toast from 'react-hot-toast';
import { BadgeCheck, Camera } from 'lucide-react';
import { api, errMsg } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Avatar, Field, Spinner } from '../components/ui/index.jsx';

export default function Profile() {
  const { user, setUser } = useAuth();

  const [f, setF] = useState({
    name: user.name,
    phone: user.phone,
    roomNumber: user.roomNumber,
  });

  const [busy, setBusy] = useState(false);

  const [pw, setPw] = useState({
    currentPassword: '',
    newPassword: '',
  });

  const [pwBusy, setPwBusy] = useState(false);

  const save = async (e, avatar) => {
    e?.preventDefault();
    setBusy(true);

    try {
      const fd = new FormData();

      Object.entries(f).forEach(([k, v]) => fd.append(k, v));

      if (avatar) fd.append('avatar', avatar);

      const { data } = await api.patch('/auth/profile', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setUser(data.user);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const changePw = async (e) => {
    e.preventDefault();
    setPwBusy(true);

    try {
      await api.post('/auth/change-password', pw);

      setPw({
        currentPassword: '',
        newPassword: '',
      });

      toast.success('Password changed. Other devices were signed out.');
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setPwBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-6 text-neutral-900 dark:text-neutral-100">
      <h1 className="h-page">Profile</h1>

      {/* Profile information */}
      <div className="card flex items-center gap-4 p-5">
        <div className="relative">
          <Avatar user={user} size={72} />

          <label
            className="absolute -bottom-1 -right-1 cursor-pointer rounded-full border-2 border-white bg-black p-1.5 text-white transition hover:bg-neutral-800 dark:border-neutral-900 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
            aria-label="Change photo"
          >
            <Camera className="h-3.5 w-3.5" />

            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];

                if (file) save(null, file);

                e.target.value = '';
              }}
            />
          </label>
        </div>

        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            {user.name}

            <BadgeCheck
              className="h-4 w-4 text-blue-600 dark:text-blue-400"
              aria-label="Verified"
            />
          </p>

          <p className="truncate text-sm text-neutral-500 dark:text-neutral-400">
            {user.email}
          </p>

          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {user.hostel?.name} · {user.college?.name}
          </p>
        </div>
      </div>

      {/* Verified details */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        {[
          ['Group', user.gender === 'boys' ? 'Boys' : 'Girls'],
          ['College', user.college?.code],
          ['Roll no.', user.rollNumber],
        ].map(([l, v]) => (
          <div
            key={l}
            className="rounded-lg bg-neutral-50 p-3 dark:bg-neutral-900"
          >
            <p className="text-neutral-500 dark:text-neutral-400">
              {l}
            </p>

            <p className="mt-0.5 truncate font-semibold text-neutral-900 dark:text-neutral-100">
              {v || '—'}
            </p>
          </div>
        ))}
      </div>

      <p className="text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
        College, hostel and gender group are tied to your verified ID
        and can only be changed by contacting support.
      </p>

      {/* Edit profile */}
      <form onSubmit={save} className="card space-y-4 p-5">
        <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">
          Details
        </h2>

        <Field label="Name">
          <input
            className="input"
            value={f.name}
            onChange={(e) =>
              setF({ ...f, name: e.target.value })
            }
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Mobile">
            <input
              className="input"
              inputMode="numeric"
              maxLength={10}
              value={f.phone || ''}
              onChange={(e) =>
                setF({ ...f, phone: e.target.value })
              }
            />
          </Field>

          <Field label="Room">
            <input
              className="input"
              value={f.roomNumber || ''}
              onChange={(e) =>
                setF({ ...f, roomNumber: e.target.value })
              }
            />
          </Field>
        </div>

        <button
          type="submit"
          className="btn-primary"
          disabled={busy}
        >
          {busy ? <Spinner /> : 'Save changes'}
        </button>
      </form>

      {/* Change password */}
      <form onSubmit={changePw} className="card space-y-4 p-5">
        <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">
          Change password
        </h2>

        <Field label="Current password">
          <input
            className="input"
            type="password"
            autoComplete="current-password"
            required
            value={pw.currentPassword}
            onChange={(e) =>
              setPw({ ...pw, currentPassword: e.target.value })
            }
          />
        </Field>

        <Field
          label="New password"
          hint="Min 8 chars with upper, lower case and a number"
        >
          <input
            className="input"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={pw.newPassword}
            onChange={(e) =>
              setPw({ ...pw, newPassword: e.target.value })
            }
          />
        </Field>

        <button
          type="submit"
          className="btn-outline"
          disabled={pwBusy}
        >
          {pwBusy ? <Spinner /> : 'Update password'}
        </button>
      </form>
    </div>
  );
}