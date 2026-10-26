import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { api } from '../lib/api.js';
import { EmptyState, PageLoader } from '../components/ui/index.jsx';
import { ago, cx } from '../lib/format.js';

export default function Notifications() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => (await api.get('/notifications')).data,
  });

  const readAll = useMutation({
    mutationFn: () => api.post('/notifications/read'),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const readOne = useMutation({
    mutationFn: (id) => api.post(`/notifications/${id}/read`),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  if (isLoading) return <PageLoader />;

  return (
    <div className="mx-auto max-w-2xl text-neutral-900 dark:text-neutral-100">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="h-page">Notifications</h1>

        {data.unread > 0 && (
          <button
            type="button"
            className="btn-outline btn-sm"
            onClick={() => readAll.mutate()}
            disabled={readAll.isPending}
          >
            {readAll.isPending ? 'Marking…' : 'Mark all read'}
          </button>
        )}
      </div>

      {!data.notifications.length ? (
        <EmptyState
          icon={Bell}
          title="You’re all caught up"
        />
      ) : (
        <ul className="divide-y divide-neutral-100 overflow-hidden rounded-xl border border-neutral-200 bg-white dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-900">
          {data.notifications.map((n) => {
            const Inner = (
              <div
                className={cx(
                  'flex gap-3 p-4 transition-colors',
                  !n.read
                    ? 'bg-neutral-50 dark:bg-neutral-800/70'
                    : 'bg-white hover:bg-neutral-50 dark:bg-neutral-900 dark:hover:bg-neutral-800/50'
                )}
              >
                <span
                  className={cx(
                    'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                    n.read
                      ? 'bg-transparent'
                      : 'bg-black dark:bg-white'
                  )}
                />

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    {n.title}
                  </p>

                  {n.body && (
                    <p className="truncate text-sm text-neutral-500 dark:text-neutral-400">
                      {n.body}
                    </p>
                  )}

                  <p className="mt-0.5 text-xs text-neutral-400 dark:text-neutral-500">
                    {ago(n.createdAt)}
                  </p>
                </div>
              </div>
            );

            return (
              <li key={n._id}>
                {n.link ? (
                  <Link
                    to={n.link}
                    onClick={() => !n.read && readOne.mutate(n._id)}
                    className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neutral-400 dark:focus-visible:ring-neutral-500"
                  >
                    {Inner}
                  </Link>
                ) : (
                  Inner
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}