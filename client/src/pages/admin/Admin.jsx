import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Check, X } from 'lucide-react';

import { api, errMsg } from '../../lib/api.js';
import {
  EmptyState,
  Field,
  Modal,
  PageLoader,
} from '../../components/ui/index.jsx';
import { inrPaise, ago, cx } from '../../lib/format.js';

const TABS = [
  ['verifications', 'ID checks', 'pendingIds'],
  ['businesses', 'Businesses', 'pendingBiz'],
  ['reports', 'Reports', 'openReports'],
  ['withdrawals', 'Withdrawals', 'pendingWithdrawals'],
  ['colleges', 'Colleges & hostels'],
];

function useAct(key, path) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }) => api.post(path(id), body),

    onSuccess: () => {
      toast.success('Done');
      qc.invalidateQueries({ queryKey: [key] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
    },

    onError: (e) => toast.error(errMsg(e)),
  });
}

function Verifications() {
  const { data, isLoading } = useQuery({
    queryKey: ['verifications'],
    queryFn: async () =>
      (
        await api.get('/admin/verifications', {
          params: { status: 'pending' },
        })
      ).data,
  });

  const act = useAct(
    'verifications',
    (id) => `/admin/users/${id}/review`,
  );

  const [reject, setReject] = useState(null);
  const [reason, setReason] = useState('');

  if (isLoading) return <PageLoader />;

  if (!data.users.length) {
    return <EmptyState title="No pending verifications" />;
  }

  return (
    <div className="space-y-4">
      {data.users.map((u) => (
        <div
          key={u.id}
          className="card grid gap-4 p-4 sm:grid-cols-[220px_1fr]"
        >
          <a
            href={`/api/admin/users/${u.id}/id-card`}
            target="_blank"
            rel="noreferrer"
          >
            <img
              src={`/api/admin/users/${u.id}/id-card`}
              alt="ID card"
              className="max-h-44 w-full rounded-lg border border-neutral-200 object-contain dark:border-neutral-700"
            />
          </a>

          <div>
            <p className="font-semibold text-neutral-900 dark:text-neutral-100">
              {u.name}{' '}
              <span className="chip ml-1 capitalize">{u.gender}</span>{' '}
              {!u.emailVerified && (
                <span className="chip">email unverified</span>
              )}
            </p>

            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-neutral-600 dark:text-neutral-400">
              <dt>College</dt>
              <dd className="font-medium text-neutral-900 dark:text-neutral-100">
                {u.college?.name}
              </dd>

              <dt>Hostel</dt>
              <dd className="font-medium text-neutral-900 dark:text-neutral-100">
                {u.hostel?.name}
              </dd>

              <dt>Roll no.</dt>
              <dd className="font-medium text-neutral-900 dark:text-neutral-100">
                {u.rollNumber}
              </dd>

              <dt>Room</dt>
              <dd className="font-medium text-neutral-900 dark:text-neutral-100">
                {u.roomNumber}
              </dd>

              <dt>Email</dt>
              <dd className="truncate font-medium text-neutral-900 dark:text-neutral-100">
                {u.email}
              </dd>

              <dt>Submitted</dt>
              <dd>{ago(u.verification.submittedAt)}</dd>
            </dl>

            <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
              Check the name, photo and college on the ID, and that the
              selected group/hostel is plausible.
            </p>

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                className="btn-primary btn-sm"
                disabled={act.isPending}
                onClick={() =>
                  act.mutate({
                    id: u.id,
                    body: { action: 'approve' },
                  })
                }
              >
                <Check className="h-3.5 w-3.5" />
                Approve
              </button>

              <button
                type="button"
                className="btn-outline btn-sm"
                onClick={() => setReject(u)}
              >
                <X className="h-3.5 w-3.5" />
                Reject
              </button>
            </div>
          </div>
        </div>
      ))}

      <Modal
        open={!!reject}
        onClose={() => setReject(null)}
        title={`Reject ${reject?.name}`}
      >
        <Field label="Reason shown to the student">
          <input
            className="input"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. ID photo is blurry"
          />
        </Field>

        <button
          type="button"
          className="btn-primary mt-4 w-full"
          disabled={!reason.trim() || act.isPending}
          onClick={() => {
            act.mutate({
              id: reject.id,
              body: { action: 'reject', reason },
            });

            setReject(null);
            setReason('');
          }}
        >
          Reject
        </button>
      </Modal>
    </div>
  );
}

function Businesses() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-businesses'],
    queryFn: async () =>
      (
        await api.get('/admin/businesses', {
          params: { status: 'pending' },
        })
      ).data.businesses,
  });

  const act = useAct(
    'admin-businesses',
    (id) => `/admin/businesses/${id}/review`,
  );

  if (isLoading) return <PageLoader />;

  if (!data.length) {
    return <EmptyState title="No businesses awaiting review" />;
  }

  return (
    <div className="space-y-3">
      {data.map((b) => (
        <div key={b._id} className="card p-4">
          <p className="font-semibold text-neutral-900 dark:text-neutral-100">
            {b.name}{' '}
            <span className="chip ml-1">{b.segment}</span>
          </p>

          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
            {b.description}
          </p>

          <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
            {b.owner?.name} · {b.owner?.email} · {b.owner?.phone} ·{' '}
            {b.college?.name} · audience: {b.audience}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-primary btn-sm"
              disabled={act.isPending}
              onClick={() =>
                act.mutate({
                  id: b._id,
                  body: { action: 'approve', verified: true },
                })
              }
            >
              Approve & verify
            </button>

            <button
              type="button"
              className="btn-outline btn-sm"
              disabled={act.isPending}
              onClick={() =>
                act.mutate({
                  id: b._id,
                  body: { action: 'approve', verified: false },
                })
              }
            >
              Approve
            </button>

            <button
              type="button"
              className="btn-ghost btn-sm"
              disabled={act.isPending}
              onClick={() => {
                const note = prompt('Reason for rejection?');

                if (note) {
                  act.mutate({
                    id: b._id,
                    body: { action: 'reject', note },
                  });
                }
              }}
            >
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function Reports() {
  const { data, isLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: async() =>
      (await api.get('/admin/reports')).data.reports,
  });

  const act = useAct(
    'reports',
    (id) => `/admin/reports/${id}/resolve`,
  );

  if (isLoading) return <PageLoader />;

  if (!data.length) {
    return <EmptyState title="No open reports" />;
  }

  return (
    <div className="space-y-3">
      {data.map((r) => (
        <div
          key={r._id}
          className="card flex flex-wrap items-center justify-between gap-3 p-4"
        >
          <div>
            <p className="text-sm text-neutral-900 dark:text-neutral-100">
              <span className="chip mr-1.5 capitalize">
                {r.targetType}
              </span>

              <b>{r.target?.title || 'deleted'}</b>{' '}

              {r.target?.status && (
                <span className="text-neutral-400 dark:text-neutral-500">
                  ({r.target.status})
                </span>
              )}
            </p>

            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              Reason: {r.reason} · by {r.reporter?.name} ·{' '}
              {ago(r.createdAt)}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              className="btn-primary btn-sm"
              disabled={act.isPending}
              onClick={() =>
                act.mutate({
                  id: r._id,
                  body: { action: 'remove' },
                })
              }
            >
              Remove / ban
            </button>

            <button
              type="button"
              className="btn-outline btn-sm"
              disabled={act.isPending}
              onClick={() =>
                act.mutate({
                  id: r._id,
                  body: { action: 'dismiss' },
                })
              }
            >
              Dismiss
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function Withdrawals() {
  const { data, isLoading } = useQuery({
    queryKey: ['withdrawals'],
    queryFn: async() =>
      (await api.get('/admin/withdrawals')).data.withdrawals,
  });

  const act = useAct(
    'withdrawals',
    (id) => `/admin/withdrawals/${id}`,
  );

  if (isLoading) return <PageLoader />;

  if (!data.length) {
    return <EmptyState title="No pending withdrawals" />;
  }

  return (
    <div className="space-y-3">
      {data.map((w) => (
        <div
          key={w._id}
          className="card flex flex-wrap items-center justify-between gap-3 p-4"
        >
          <div>
            <p className="font-semibold text-neutral-900 dark:text-neutral-100">
              {inrPaise(w.amount)} → {w.upiId}
            </p>

            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {w.user?.name} · {w.user?.phone} · {ago(w.createdAt)}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              className="btn-primary btn-sm"
              disabled={act.isPending}
              onClick={() =>
                confirm(
                  `Have you paid ${inrPaise(w.amount)} to ${w.upiId}?`,
                ) &&
                act.mutate({
                  id: w._id,
                  body: { action: 'paid' },
                })
              }
            >
              Mark paid
            </button>

            <button
              type="button"
              className="btn-outline btn-sm"
              disabled={act.isPending}
              onClick={() =>
                act.mutate({
                  id: w._id,
                  body: { action: 'reject' },
                })
              }
            >
              Reject & refund
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function Colleges() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-colleges'],
    queryFn: async() =>
      (await api.get('/admin/colleges')).data.colleges,
  });

  const [c, setC] = useState({
    name: '',
    code: '',
    city: '',
  });

  const [h, setH] = useState({
    college: '',
    name: '',
    gender: 'boys',
  });

  const done = () => {
    qc.invalidateQueries({ queryKey: ['admin-colleges'] });
  };

  const addC = useMutation({
    mutationFn: () => api.post('/admin/colleges', c),

    onSuccess: () => {
      setC({ name: '', code: '', city: '' });
      done();
      toast.success('College added');
    },

    onError: (e) => toast.error(errMsg(e)),
  });

  const addH = useMutation({
    mutationFn: () => api.post('/admin/hostels', h),

    onSuccess: () => {
      setH({ ...h, name: '' });
      done();
      toast.success('Hostel added');
    },

    onError: (e) => toast.error(errMsg(e)),
  });

  const toggle = useMutation({
    mutationFn: (id) => api.post(`/admin/hostels/${id}/toggle`),
    onSuccess: done,
    onError: (e) => toast.error(errMsg(e)),
  });

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        {/* Add college */}
        <form
          className="card space-y-3 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            addC.mutate();
          }}
        >
          <p className="font-semibold text-neutral-900 dark:text-neutral-100">
            Add college
          </p>

          <input
            className="input"
            placeholder="Name"
            required
            value={c.name}
            onChange={(e) =>
              setC({ ...c, name: e.target.value })
            }
          />

          <div className="grid grid-cols-2 gap-2">
            <input
              className="input"
              placeholder="Code (e.g. DIT)"
              required
              value={c.code}
              onChange={(e) =>
                setC({ ...c, code: e.target.value })
              }
            />

            <input
              className="input"
              placeholder="City"
              value={c.city}
              onChange={(e) =>
                setC({ ...c, city: e.target.value })
              }
            />
          </div>

          <button
            type="submit"
            className="btn-primary btn-sm"
            disabled={addC.isPending}
          >
            {addC.isPending ? 'Adding…' : 'Add'}
          </button>
        </form>

        {/* Add hostel */}
        <form
          className="card space-y-3 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            addH.mutate();
          }}
        >
          <p className="font-semibold text-neutral-900 dark:text-neutral-100">
            Add hostel
          </p>

          <select
            className="input"
            required
            value={h.college}
            onChange={(e) =>
              setH({ ...h, college: e.target.value })
            }
          >
            <option value="">College</option>

            {data.map((x) => (
              <option key={x._id} value={x._id}>
                {x.name}
              </option>
            ))}
          </select>

          <div className="grid grid-cols-2 gap-2">
            <input
              className="input"
              placeholder="Hostel name"
              required
              value={h.name}
              onChange={(e) =>
                setH({ ...h, name: e.target.value })
              }
            />

            <select
              className="input"
              value={h.gender}
              onChange={(e) =>
                setH({ ...h, gender: e.target.value })
              }
            >
              <option value="boys">Boys</option>
              <option value="girls">Girls</option>
            </select>
          </div>

          <button
            type="submit"
            className="btn-primary btn-sm"
            disabled={addH.isPending}
          >
            {addH.isPending ? 'Adding…' : 'Add'}
          </button>
        </form>
      </div>

      {/* Colleges and hostels */}
      {data.map((col) => (
        <div key={col._id} className="card p-4">
          <p className="font-semibold text-neutral-900 dark:text-neutral-100">
            {col.name}{' '}
            <span className="chip ml-1">{col.code}</span>
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {col.hostels.map((x) => (
              <button
                key={x._id}
                type="button"
                onClick={() => toggle.mutate(x._id)}
                disabled={toggle.isPending}
                className={cx(
                  'chip py-1.5 transition hover:border-neutral-500 dark:hover:border-neutral-400',
                  !x.isActive && 'line-through opacity-40',
                )}
                title="Click to enable/disable"
              >
                {x.name} · {x.gender}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

const VIEWS = {
  verifications: Verifications,
  businesses: Businesses,
  reports: Reports,
  withdrawals: Withdrawals,
  colleges: Colleges,
};

export default function Admin() {
  const [tab, setTab] = useState('verifications');

  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async() =>
      (await api.get('/admin/stats')).data.stats,
    refetchInterval: 60_000,
  });

  const View = VIEWS[tab];

  return (
    <div className="text-neutral-900 dark:text-neutral-100">
      <h1 className="h-page">Admin</h1>

      {stats && (
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          {stats.users} users · {stats.items} live listings ·{' '}
          {stats.openRequests} open requests
        </p>
      )}

      {/* Admin navigation tabs */}
      <div className="no-scrollbar mb-6 mt-5 flex gap-2 overflow-x-auto">
        {TABS.map(([k, label, statKey]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={cx(
              'chip shrink-0 py-1.5 transition-colors',
              tab === k &&
                'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black',
            )}
          >
            {label}

            {stats?.[statKey] > 0 && (
              <span
                className={cx(
                  'ml-1 rounded-full px-1.5 text-[10px] font-semibold',
                  tab === k
                    ? 'bg-white text-black dark:bg-black dark:text-white'
                    : 'bg-black text-white dark:bg-white dark:text-black',
                )}
              >
                {stats[statKey]}
              </span>
            )}
          </button>
        ))}
      </div>

      <View />
    </div>
  );
}