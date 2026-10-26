import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Package, Pencil, Trash2, Plus } from 'lucide-react';
import { api, asset, errMsg } from '../lib/api.js';
import { EmptyState, PageLoader } from '../components/ui/index.jsx';
import { inr, ago } from '../lib/format.js';

export default function MyListings() {
  const qc = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['my-items'],
    queryFn: async () => (await api.get('/items/mine')).data.items,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['my-items'] });
    qc.invalidateQueries({ queryKey: ['items'] });
  };

  const setStatus = useMutation({
    mutationFn: ({ id, status }) =>
      api.patch(`/items/${id}/status`, { status }),
    onSuccess: refresh,
    onError: (e) => toast.error(errMsg(e)),
  });

  const del = useMutation({
    mutationFn: (id) => api.delete(`/items/${id}`),
    onSuccess: () => {
      toast.success('Deleted');
      refresh();
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  if (isLoading) return <PageLoader />;

  return (
    <div className="mx-auto max-w-3xl text-neutral-900 dark:text-neutral-100">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="h-page">My listings</h1>

        <Link to="/sell" className="btn-primary btn-sm">
          <Plus className="h-4 w-4" />
          New
        </Link>
      </div>

      {!items.length ? (
        <EmptyState
          icon={Package}
          title="You haven’t listed anything"
          text="Old books, spare kettle, unused cooler — someone in your hostel needs it."
          action={
            <Link to="/sell" className="btn-primary">
              Sell an item
            </Link>
          }
        />
      ) : (
        <ul className="space-y-3">
          {items.map((i) => (
            <li
              key={i._id}
              className="card flex gap-3 p-3 transition-colors"
            >
              <Link
                to={`/item/${i._id}`}
                className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-800"
              >
                <img
                  src={asset(i.images[0])}
                  alt={i.title}
                  className="h-full w-full object-cover"
                />
              </Link>

              <div className="min-w-0 flex-1">
                <Link
                  to={`/item/${i._id}`}
                  className="block truncate font-medium text-neutral-900 hover:underline dark:text-neutral-100"
                >
                  {i.title}
                </Link>

                <p className="text-sm text-neutral-800 dark:text-neutral-200">
                  {inr(i.price)}{' '}
                  <span className="text-xs text-neutral-400 dark:text-neutral-500">
                    · {i.views} views · {ago(i.createdAt)}
                  </span>
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {i.status === 'flagged' ? (
                    <span className="chip-solid">
                      Under review
                    </span>
                  ) : (
                    <select
                      className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs text-neutral-800 outline-none focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:focus:border-neutral-500"
                      value={i.status}
                      onChange={(e) =>
                        setStatus.mutate({
                          id: i._id,
                          status: e.target.value,
                        })
                      }
                      disabled={setStatus.isPending}
                      aria-label={`Status for ${i.title}`}
                    >
                      <option value="available">Available</option>
                      <option value="reserved">Reserved</option>
                      <option value="sold">Sold</option>
                    </select>
                  )}

                  <Link
                    to={`/sell/${i._id}`}
                    className="btn-ghost btn-sm"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Link>

                  <button
                    type="button"
                    className="btn-ghost btn-sm text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/40 dark:hover:text-red-300"
                    onClick={() =>
                      confirm('Delete this listing?') &&
                      del.mutate(i._id)
                    }
                    disabled={del.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}