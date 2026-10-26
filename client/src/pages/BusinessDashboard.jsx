import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Store, Plus, Eye, MessageCircle, Package, ExternalLink } from 'lucide-react';
import { api, errMsg } from '../lib/api.js';
import { useTaxonomy } from '../hooks/useTaxonomy.js';
import { EmptyState, PageLoader } from '../components/ui/index.jsx';

const STATUS = {
  pending: 'In review',
  active: 'Live',
  rejected: 'Rejected',
  suspended: 'Suspended',
};

function Stats({ id }) {
  const { data } = useQuery({
    queryKey: ['biz-stats', id],
    queryFn: async () =>
      (await api.get(`/businesses/${id}/stats`)).data.stats,
  });

  const cells = [
    [Package, 'Listings', data?.items],
    [Package, 'Active', data?.active],
    [Eye, 'Views', data?.views],
    [MessageCircle, 'Chats', data?.chats],
  ];

  return (
    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
      {cells.map(([I, label, value]) => (
        <div
          key={label}
          className="rounded-lg bg-neutral-50 p-3 transition-colors dark:bg-neutral-800"
        >
          <I className="h-4 w-4 text-neutral-400" />
          <p className="mt-1.5 text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            {value ?? '–'}
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {label}
          </p>
        </div>
      ))}
    </div>
  );
}

export default function BusinessDashboard() {
  const qc = useQueryClient();
  const { segName } = useTaxonomy();

  const { data = [], isLoading } = useQuery({
    queryKey: ['my-businesses'],
    queryFn: async () =>
      (await api.get('/businesses/mine')).data.businesses,
  });

  const del = useMutation({
    mutationFn: (id) => api.delete(`/businesses/${id}`),
    onSuccess: () => {
      toast.success('Business removed');
      qc.invalidateQueries({ queryKey: ['my-businesses'] });
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  if (isLoading) return <PageLoader />;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="h-page">My business</h1>

        <Link to="/business/new" className="btn-primary btn-sm">
          <Plus className="h-4 w-4" />
          Register
        </Link>
      </div>

      {!data.length ? (
        <EmptyState
          icon={Store}
          title="Promote your business to your hostel"
          text="Register a laundry, tiffin, print shop, repair stall, tutoring — anything students need. Approval is quick and free."
          action={
            <Link to="/business/new" className="btn-primary">
              Register a business
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {data.map((b) => (
            <div key={b._id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                    {b.name}
                  </p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    {segName(b.segment)}
                  </p>
                </div>

                <span
                  className={
                    b.status === 'active'
                      ? 'chip-solid'
                      : 'chip'
                  }
                >
                  {STATUS[b.status]}
                </span>
              </div>

              {b.reviewNote && (
                <p className="mt-3 rounded-lg bg-neutral-50 p-3 text-sm text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                  Admin note: {b.reviewNote}
                </p>
              )}

              {b.status === 'active' && <Stats id={b._id} />}

              <div className="mt-4 flex flex-wrap gap-2">
                {b.status === 'active' && (
                  <Link to="/sell" className="btn-primary btn-sm">
                    <Plus className="h-3.5 w-3.5" />
                    Add product / service
                  </Link>
                )}

                <Link
                  to={`/businesses/${b._id}`}
                  className="btn-outline btn-sm"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  View page
                </Link>

                <Link
                  to={`/business/${b._id}/edit`}
                  className="btn-outline btn-sm"
                >
                  Edit
                </Link>

                <button
                  className="btn-ghost btn-sm"
                  onClick={() =>
                    confirm('Delete this business and all its listings?') &&
                    del.mutate(b._id)
                  }
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}