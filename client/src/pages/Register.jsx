import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Upload, ShieldCheck, Check } from 'lucide-react';
import AuthLayout from '../components/layout/AuthLayout.jsx';
import { Field, Spinner } from '../components/ui/index.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useHostels } from '../hooks/useTaxonomy.js';
import { api, errMsg } from '../lib/api.js';
import { cx } from '../lib/format.js';

const STEPS = ['Account', 'Campus', 'Verify'];

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});
  const [idCard, setIdCard] = useState(null);

  const [f, setF] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    gender: '',
    collegeId: '',
    hostelId: '',
    roomNumber: '',
    rollNumber: '',
  });

  const set = (k) => (e) =>
    setF({ ...f, [k]: e.target.value });

  const { data: colleges = [] } = useQuery({
    queryKey: ['colleges'],
    queryFn: async () =>
      (await api.get('/catalog/colleges')).data.colleges,
  });

  const { data: hostels = [] } = useHostels(
    f.collegeId,
    f.gender
  );

  const validate = () => {
    const e = {};

    if (step === 0) {
      if (f.name.trim().length < 2) {
        e.name = 'Enter your full name';
      }

      if (!/^\S+@\S+\.\S+$/.test(f.email)) {
        e.email = 'Enter a valid email';
      }

      if (!/^[6-9]\d{9}$/.test(f.phone)) {
        e.phone = 'Enter a valid 10-digit mobile number';
      }

      if (
        f.password.length < 8 ||
        !/[a-z]/.test(f.password) ||
        !/[A-Z]/.test(f.password) ||
        !/\d/.test(f.password)
      ) {
        e.password =
          'Min 8 chars with upper, lower case and a number';
      }
    }

    if (step === 1) {
      if (!f.gender) e.gender = 'Choose one';
      if (!f.collegeId) e.collegeId = 'Select your college';
      if (!f.hostelId) e.hostelId = 'Select your hostel';
      if (!f.roomNumber.trim()) e.roomNumber = 'Required';

      if (f.rollNumber.trim().length < 2) {
        e.rollNumber = 'Required';
      }
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => {
    if (validate()) setStep(step + 1);
  };

  const submit = async (e) => {
    e.preventDefault();

    if (!idCard) {
      return setErrors({
        idCard: 'Upload your college ID card',
      });
    }

    setBusy(true);

    try {
      const fd = new FormData();

      Object.entries(f).forEach(([k, v]) => {
        fd.append(k, v.trim?.() ?? v);
      });

      fd.append('idCard', idCard);

      await register(fd);

      toast.success(
        'Account created. Check your email for the code.'
      );

      nav('/verify-email', { replace: true });
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Takes two minutes. Only real students get in."
      footer={
        <>
          Already registered?{' '}
          <Link
            to="/login"
            className="font-medium text-black underline dark:text-white"
          >
            Sign in
          </Link>
        </>
      }
    >
      <ol className="mb-7 flex items-center gap-2 text-xs font-medium">
        {STEPS.map((s, i) => (
          <li
            key={s}
            className="flex flex-1 items-center gap-2"
          >
            <span
              className={cx(
                'flex h-6 w-6 items-center justify-center rounded-full border',
                i < step
                  ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black'
                  : i === step
                    ? 'border-black text-black dark:border-white dark:text-white'
                    : 'border-neutral-300 text-neutral-400 dark:border-neutral-700 dark:text-neutral-500'
              )}
            >
              {i < step ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                i + 1
              )}
            </span>

            <span
              className={
                i === step
                  ? 'text-black dark:text-white'
                  : 'text-neutral-400 dark:text-neutral-500'
              }
            >
              {s}
            </span>

            {i < STEPS.length - 1 && (
              <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
            )}
          </li>
        ))}
      </ol>

      <form onSubmit={submit} className="space-y-4">
        {step === 0 && (
          <>
            <Field label="Full name" error={errors.name}>
              <input
                className="input"
                autoComplete="name"
                value={f.name}
                onChange={set('name')}
              />
            </Field>

            <Field
              label="Email"
              error={errors.email}
              hint="Use your college email if you have one"
            >
              <input
                className="input"
                type="email"
                autoComplete="email"
                value={f.email}
                onChange={set('email')}
              />
            </Field>

            <Field
              label="Mobile"
              error={errors.phone}
              hint="Never shown to other users"
            >
              <input
                className="input"
                inputMode="numeric"
                maxLength={10}
                value={f.phone}
                onChange={set('phone')}
              />
            </Field>

            <Field label="Password" error={errors.password}>
              <input
                className="input"
                type="password"
                autoComplete="new-password"
                value={f.password}
                onChange={set('password')}
              />
            </Field>

            <button
              type="button"
              className="btn-primary w-full py-3"
              onClick={next}
            >
              Continue
            </button>
          </>
        )}

        {step === 1 && (
          <>
            <Field label="I live in a" error={errors.gender}>
              <div className="grid grid-cols-2 gap-2">
                {[
                  ['boys', 'Boys hostel'],
                  ['girls', 'Girls hostel'],
                ].map(([v, l]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() =>
                      setF({
                        ...f,
                        gender: v,
                        hostelId: '',
                      })
                    }
                    className={cx(
                      'rounded-lg border py-3 text-sm font-medium transition',
                      f.gender === v
                        ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black'
                        : 'border-neutral-300 hover:border-black dark:border-neutral-700 dark:hover:border-neutral-400'
                    )}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="College" error={errors.collegeId}>
              <select
                className="input"
                value={f.collegeId}
                onChange={(e) =>
                  setF({
                    ...f,
                    collegeId: e.target.value,
                    hostelId: '',
                  })
                }
              >
                <option
                  value=""
                  className="bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100"
                >
                  Select college
                </option>

                {colleges.map((c) => (
                  <option
                    key={c._id}
                    value={c._id}
                    className="bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100"
                  >
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label="Hostel"
              error={errors.hostelId}
              hint={
                !f.gender || !f.collegeId
                  ? 'Pick gender and college first'
                  : undefined
              }
            >
              <select
                className="input"
                value={f.hostelId}
                onChange={set('hostelId')}
                disabled={!f.gender || !f.collegeId}
              >
                <option
                  value=""
                  className="bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100"
                >
                  Select hostel
                </option>

                {hostels.map((h) => (
                  <option
                    key={h._id}
                    value={h._id}
                    className="bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100"
                  >
                    {h.name}
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Room no."
                error={errors.roomNumber}
              >
                <input
                  className="input"
                  value={f.roomNumber}
                  onChange={set('roomNumber')}
                />
              </Field>

              <Field
                label="Roll / ID no."
                error={errors.rollNumber}
              >
                <input
                  className="input"
                  value={f.rollNumber}
                  onChange={set('rollNumber')}
                />
              </Field>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                className="btn-outline flex-1 py-3"
                onClick={() => setStep(0)}
              >
                Back
              </button>

              <button
                type="button"
                className="btn-primary flex-1 py-3"
                onClick={next}
              >
                Continue
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <Field
              label="College ID card"
              error={errors.idCard}
              hint="Front side, clearly readable. Your name, photo and college must be visible."
            >
              <label
                className={cx(
                  'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-8 text-center transition hover:border-black dark:hover:border-neutral-400',
                  idCard
                    ? 'border-black dark:border-white'
                    : 'border-neutral-300 dark:border-neutral-700'
                )}
              >
                {idCard ? (
                  <img
                    src={URL.createObjectURL(idCard)}
                    alt="ID preview"
                    className="max-h-44 rounded-lg"
                  />
                ) : (
                  <>
                    <Upload className="h-6 w-6 text-neutral-400 dark:text-neutral-500" />
                    <span className="text-sm text-neutral-500 dark:text-neutral-400">
                      Tap to upload JPG, PNG or WEBP (max 5 MB)
                    </span>
                  </>
                )}

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) =>
                    setIdCard(e.target.files?.[0] || null)
                  }
                />
              </label>
            </Field>

            <div className="flex gap-3 rounded-lg bg-neutral-50 p-3.5 text-xs leading-relaxed text-neutral-600 dark:bg-neutral-900 dark:text-neutral-300">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-black dark:text-white" />
              <p>
                Your ID is stored privately and is only seen by
                DormAce admins to confirm you are a student of
                your selected hostel. It is never shown to other
                users.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                className="btn-outline flex-1 py-3"
                onClick={() => setStep(1)}
              >
                Back
              </button>

              <button
                className="btn-primary flex-1 py-3"
                disabled={busy}
              >
                {busy ? <Spinner /> : 'Create account'}
              </button>
            </div>
          </>
        )}
      </form>
    </AuthLayout>
  );
}
