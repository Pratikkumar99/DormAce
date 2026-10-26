import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, Store } from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useHostels, useTaxonomy } from '../hooks/useTaxonomy.js';
import { useDebounce } from '../hooks/useDebounce.js';
import BusinessCard from '../components/market/BusinessCard.jsx';
import { EmptyState, PageLoader, Pagination } from '../components/ui/index.jsx';
import { cx } from '../lib/format.js';

export default function Businesses() {
  const { user } = useAuth();
  const { segments, segName } = useTaxonomy();
  const { data: hostels = [] } = useHostels(user.college?._id, user.gender);

  const [segment, setSegment] = useState('');
  const [hostel, setHostel] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);

  const dq = useDebounce(q);

  const { data, isLoading } = useQuery({
    queryKey: ['businesses', segment, hostel, dq, page],
    placeholderData: (p) => p,
    queryFn: async () =>
      (
        await api.get('/businesses', {
          params: {
            segment: segment || undefined,
            hostel: hostel || undefined,
            q: dq || undefined,
            page,
          },
        })
      ).data,
  });

  return (
    <div>
      {/* Page heading */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="h-page">Campus businesses</h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Services and shops that serve your hostel.
          </p>
        </div>

        <Link to="/business" className="btn-outline">
          <Store className="h-4 w-4" />
          Register your business
        </Link>
      </div>

      {/* Search and hostel filter */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />

          <input
            className="input pl-10"
            placeholder="Search businesses"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <select
          className="input sm:w-56"
          value={hostel}
          onChange={(e) => {
            setHostel(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Serves any hostel</option>
          {hostels.map((h) => (
            <option key={h._id} value={h._id}>
              {h.name}
            </option>
          ))}
        </select>
      </div>

      {/* Category filters */}
      <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4">
        <button
          onClick={() => {
            setSegment('');
            setPage(1);
          }}
          className={cx(
            'chip shrink-0 py-1.5',
            !segment &&
              'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black'
          )}
        >
          All
        </button>

        {segments.map((s) => (
          <button
            key={s.slug}
            onClick={() => {
              setSegment(s.slug);
              setPage(1);
            }}
            className={cx(
              'chip shrink-0 py-1.5 hover:border-black dark:hover:border-white',
              segment === s.slug &&
                'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black'
            )}
          >
            {s.name}
          </button>
        ))}
      </div>

      {/* Business results */}
      <div className="mt-6">
        {isLoading ? (
          <PageLoader />
        ) : !data?.businesses?.length ? (
          <EmptyState
            icon={Store}
            title="No businesses here yet"
            text="Run a laundry, tiffin, print shop or tutoring? Be the first to list."
            action={
              <Link to="/business/new" className="btn-primary">
                Register a business
              </Link>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.businesses.map((b) => (
              <BusinessCard
                key={b._id}
                b={b}
                segName={segName}
              />
            ))}
          </div>
        )}

        <Pagination
          page={data?.page || 1}
          pages={data?.pages}
          onChange={setPage}
        />
      </div>
    </div>
  );
}