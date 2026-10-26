import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  BadgeCheck,
  Clock,
  MessageCircle,
  Store,
  Truck,
  Pencil,
} from 'lucide-react';
import { api, asset, errMsg } from '../lib/api.js';
import { useTaxonomy } from '../hooks/useTaxonomy.js';
import ItemCard from '../components/market/ItemCard.jsx';
import { EmptyState, PageLoader, Spinner } from '../components/ui/index.jsx';

export default function BusinessDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { segName } = useTaxonomy();

  const { data, isLoading, error } = useQuery({
    queryKey: ['business', id],
    retry: false,
    queryFn: async () => (await api.get(`/businesses/${id}`)).data,
  });

  const items = useQuery({
    queryKey: ['items', 'biz', id],
    enabled: !!data && data.business.status === 'active',
    queryFn: async () =>
      (
        await api.get('/items', {
          params: { business: id, limit: 50 },
        })
      ).data.items,
  });

  const chat = useMutation({
    mutationFn: async () =>
      (
        await api.post('/conversations', {
          businessId: id,
          message: 'Hi! I’d like to know more about your services.',
        })
      ).data.conversationId,
    onSuccess: (cid) => nav(`/chat/${cid}`),
    onError: (e) => toast.error(errMsg(e)),
  });

  if (isLoading) return <PageLoader />;

  if (error) {
    return (
      <div className="py-20 text-center text-neutral-700 dark:text-neutral-300">
        <p>Business not found.</p>
        <Link to="/businesses" className="btn-primary mt-4">
          Back
        </Link>
      </div>
    );
  }

  const { business: b, isOwner } = data;

  return (
    <div className="animate-fade-up">
      {/* Banner */}
      <div className="h-40 overflow-hidden rounded-2xl bg-neutral-100 dark:bg-neutral-800 sm:h-56">
        {b.banner && (
          <img
            src={asset(b.banner)}
            alt=""
            className="h-full w-full object-cover"
          />
        )}
      </div>

      {/* Business information */}
      <div className="-mt-10 flex flex-wrap items-end gap-4 px-4 sm:px-6">
        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-black text-white dark:border-neutral-950">
          {b.logo ? (
            <img
              src={asset(b.logo)}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <Store className="h-8 w-8" />
          )}
        </div>

        <div className="flex-1 pb-1">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
            {b.name}
            {b.isVerified && (
              <BadgeCheck className="h-5 w-5 text-blue-500" />
            )}
          </h1>

          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {segName(b.segment)}
          </p>
        </div>

        {isOwner ? (
          <Link to={`/business/${b._id}/edit`} className="btn-outline">
            <Pencil className="h-4 w-4" />
            Edit
          </Link>
        ) : (
          <button
            className="btn-primary"
            onClick={() => chat.mutate()}
            disabled={chat.isPending}
          >
            {chat.isPending ? (
              <Spinner />
            ) : (
              <>
                <MessageCircle className="h-4 w-4" />
                Message
              </>
            )}
          </button>
        )}
      </div>

      {/* Business status */}
      {b.status !== 'active' && (
        <p className="mt-4 rounded-lg bg-neutral-100 p-3 text-sm text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
          Status:{' '}
          <b className="capitalize">{b.status}</b>
          {b.reviewNote && ` — ${b.reviewNote}`}
        </p>
      )}

      {/* Description */}
      <p className="mt-5 whitespace-pre-line text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
        {b.description}
      </p>

      {/* Business details */}
      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        {b.timings && (
          <span className="chip">
            <Clock className="h-3 w-3" />
            {b.timings}
          </span>
        )}

        {b.deliversToHostel && (
          <span className="chip">
            <Truck className="h-3 w-3" />
            Delivers to hostel
          </span>
        )}

        <span className="chip capitalize">
          For{' '}
          {b.audience === 'both'
            ? 'all hostels'
            : `${b.audience} hostels`}
        </span>

        {b.hostels?.length > 0 && (
          <span className="chip">
            {b.hostels.map((h) => h.name).join(', ')}
          </span>
        )}
      </div>

      {/* Products and services */}
      <h2 className="mb-4 mt-10 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
        Products & services
      </h2>

      {!items.data?.length ? (
        <EmptyState title="Nothing listed yet" />
      ) : (
        <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-x-5 md:grid-cols-3 lg:grid-cols-4">
          {items.data.map((i) => (
            <ItemCard key={i._id} item={i} />
          ))}
        </div>
      )}
    </div>
  );
}