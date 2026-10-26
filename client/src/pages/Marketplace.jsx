import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  SlidersHorizontal,
  Package,
  X,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useTaxonomy, useHostels } from '../hooks/useTaxonomy.js';
import { useDebounce } from '../hooks/useDebounce.js';
import ItemCard from '../components/market/ItemCard.jsx';
import {
  EmptyState,
  GridSkeleton,
  Pagination,
  Segmented,
} from '../components/ui/index.jsx';
import { cx } from '../lib/format.js';

export default function Marketplace() {
  const { user } = useAuth();
  const { categories, conditions } = useTaxonomy();

  const { data: hostels = [] } = useHostels(
    user.college?._id,
    user.gender
  );

  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [hostel, setHostel] = useState('');
  const [sort, setSort] = useState('new');
  const [source, setSource] = useState('all');
  const [condition, setCondition] = useState('');
  const [minPrice, setMin] = useState('');
  const [maxPrice, setMax] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  const dq = useDebounce(q);

  const params = {
    q: dq || undefined,
    category: category || undefined,
    subcategory: subcategory || undefined,
    hostel: hostel || undefined,
    sort: dq && sort === 'new' ? 'relevance' : sort,
    condition: condition || undefined,
    minPrice: minPrice || undefined,
    maxPrice: maxPrice || undefined,
    businessOnly: source === 'business' || undefined,
    peerOnly: source === 'students' || undefined,
    page,
    limit: 24,
  };

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['items', params],
    queryFn: async () =>
      (await api.get('/items', { params })).data,
    placeholderData: (p) => p,
  });

  const reset = (fn) => (v) => {
    fn(v);
    setPage(1);
  };

  const activeCat = categories.find((c) => c.slug === category);

  const hasFilters =
    category ||
    hostel ||
    condition ||
    minPrice ||
    maxPrice ||
    source !== 'all';

  const clearFilters = () => {
    setCategory('');
    setHostel('');
    setCondition('');
    setMin('');
    setMax('');
    setSource('all');
    setSubcategory('');
    setPage(1);
  };

  return (
    <div className="text-neutral-900 dark:text-neutral-100">
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="h-page">Marketplace</h1>

        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {user.college?.name} ·{' '}
          {user.gender === 'boys' ? 'Boys' : 'Girls'} hostels
        </p>
      </div>

      {/* Search and filter button */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />

          <input
            className="input pl-10"
            placeholder="Search mattress, calculator, maggi…"
            value={q}
            onChange={(e) => reset(setQ)(e.target.value)}
          />
        </div>

        <button
          type="button"
          className={cx(
            'btn-outline',
            showFilters &&
              'border-neutral-900 dark:border-neutral-100'
          )}
          onClick={() => setShowFilters(!showFilters)}
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span className="hidden sm:inline">Filters</span>
        </button>
      </div>

      {/* Categories */}
      <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4">
        <button
          type="button"
          onClick={() => {
            reset(setCategory)('');
            setSubcategory('');
          }}
          className={cx(
            'chip shrink-0 py-1.5',
            !category &&
              'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black'
          )}
        >
          All
        </button>

        {categories.map((c) => (
          <button
            type="button"
            key={c.slug}
            onClick={() => {
              reset(setCategory)(c.slug);
              setSubcategory('');
            }}
            className={cx(
              'chip shrink-0 py-1.5 transition hover:border-neutral-900 dark:hover:border-neutral-300',
              category === c.slug &&
                'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black'
            )}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Subcategories */}
      {activeCat && (
        <div className="no-scrollbar -mx-4 mt-2 flex gap-2 overflow-x-auto px-4">
          {activeCat.sub.map((s) => (
            <button
              type="button"
              key={s}
              onClick={() =>
                reset(setSubcategory)(subcategory === s ? '' : s)
              }
              className={cx(
                'shrink-0 rounded-md px-2.5 py-1 text-xs transition-colors',
                subcategory === s
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'
              )}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Filters panel */}
      {showFilters && (
        <div className="card mt-4 grid animate-fade-up gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="label">Hostel</label>

            <select
              className="input"
              value={hostel}
              onChange={(e) => reset(setHostel)(e.target.value)}
            >
              <option value="">All {user.gender} hostels</option>

              {hostels.map((h) => (
                <option key={h._id} value={h._id}>
                  {h.name}
                  {h._id === user.hostel?._id ? ' (mine)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Condition</label>

            <select
              className="input"
              value={condition}
              onChange={(e) => reset(setCondition)(e.target.value)}
            >
              <option value="">Any</option>

              {conditions.map((c) => (
                <option key={c} value={c}>
                  {c.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Price (₹)</label>

            <div className="flex gap-2">
              <input
                className="input min-w-0"
                inputMode="numeric"
                placeholder="Min"
                value={minPrice}
                onChange={(e) =>
                  reset(setMin)(e.target.value.replace(/\D/g, ''))
                }
              />

              <input
                className="input min-w-0"
                inputMode="numeric"
                placeholder="Max"
                value={maxPrice}
                onChange={(e) =>
                  reset(setMax)(e.target.value.replace(/\D/g, ''))
                }
              />
            </div>
          </div>

          <div>
            <label className="label">Sort</label>

            <select
              className="input"
              value={sort}
              onChange={(e) => reset(setSort)(e.target.value)}
            >
              <option value="new">Newest</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
            </select>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2 lg:col-span-4">
            <Segmented
              value={source}
              onChange={reset(setSource)}
              options={[
                { value: 'all', label: 'Everyone' },
                { value: 'students', label: 'Students' },
                { value: 'business', label: 'Businesses' },
              ]}
            />

            {hasFilters && (
              <button
                type="button"
                className="btn-ghost btn-sm"
                onClick={clearFilters}
              >
                <X className="h-3.5 w-3.5" />
                Clear all
              </button>
            )}
          </div>
        </div>
      )}

      {/* Listings */}
      <div className="mt-6">
        {isLoading ? (
          <GridSkeleton />
        ) : data?.items?.length ? (
          <div
            className={cx(
              'grid grid-cols-2 gap-x-3 gap-y-6 transition-opacity sm:gap-x-5 md:grid-cols-3 lg:grid-cols-4',
              isFetching && 'opacity-60'
            )}
          >
            {data.items.map((i) => (
              <ItemCard key={i._id} item={i} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Package}
            title="Nothing here yet"
            text="Be the first to list something in this section, or post a request so others can find you."
            action={
              <div className="flex gap-2">
                <Link to="/sell" className="btn-primary">
                  Sell an item
                </Link>

                <Link to="/requests" className="btn-outline">
                  Make a request
                </Link>
              </div>
            }
          />
        )}

        <Pagination
          page={data?.page || 1}
          pages={data?.pages}
          onChange={(p) => {
            setPage(p);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      </div>
    </div>
  );
}