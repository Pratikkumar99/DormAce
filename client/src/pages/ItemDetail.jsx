import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  MessageCircle,
  Flag,
  Eye,
  MapPin,
  BadgeCheck,
  Pencil,
  ChevronLeft,
} from 'lucide-react';
import { api, asset, errMsg } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useTaxonomy } from '../hooks/useTaxonomy.js';
import { Avatar, Modal, PageLoader, Spinner } from '../components/ui/index.jsx';
import { inr, ago, CONDITION, cx } from '../lib/format.js';

export default function ItemDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const { catName } = useTaxonomy();

  const [idx, setIdx] = useState(0);
  const [report, setReport] = useState(false);
  const [reason, setReason] = useState('spam');

  const {
    data: item,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['item', id],
    queryFn: async () => (await api.get(`/items/${id}`)).data.item,
    retry: false,
  });

  const chat = useMutation({
    mutationFn: async () =>
      (
        await api.post('/conversations', {
          itemId: id,
          message: `Hi! Is "${item.title}" still available?`,
        })
      ).data.conversationId,
    onSuccess: (cid) => nav(`/chat/${cid}`),
    onError: (e) => toast.error(errMsg(e)),
  });

  const sendReport = useMutation({
    mutationFn: () =>
      api.post('/reports', {
        targetType: 'item',
        targetId: id,
        reason,
      }),
    onSuccess: () => {
      toast.success('Thanks, we’ll review it');
      setReport(false);
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  if (isLoading) return <PageLoader />;

  if (error || !item) {
    return (
      <div className="py-20 text-center text-neutral-700 dark:text-neutral-300">
        <p className="font-medium">This listing isn’t available.</p>
        <Link to="/market" className="btn-primary mt-4">
          Back to marketplace
        </Link>
      </div>
    );
  }

  const mine = item.seller._id === user.id;

  return (
    <div className="animate-fade-up">
      <button
        onClick={() => nav(-1)}
        className="btn-ghost -ml-3 mb-3"
      >
        <ChevronLeft className="h-4 w-4" />
        Back
      </button>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Image gallery */}
        <div>
          <div className="aspect-square overflow-hidden rounded-2xl bg-neutral-100 dark:bg-neutral-800">
            <img
              src={asset(item.images[idx])}
              alt={item.title}
              className="h-full w-full object-cover"
            />
          </div>

          {item.images.length > 1 && (
            <div className="mt-3 flex gap-2">
              {item.images.map((src, i) => (
                <button
                  key={src}
                  onClick={() => setIdx(i)}
                  className={cx(
                    'h-16 w-16 overflow-hidden rounded-lg border-2',
                    i === idx
                      ? 'border-black dark:border-white'
                      : 'border-transparent opacity-60 hover:opacity-100'
                  )}
                >
                  <img
                    src={asset(src)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Item information */}
        <div>
          <div className="flex flex-wrap gap-1.5">
            <span className="chip">{catName(item.category)}</span>

            {item.subcategory && (
              <span className="chip">{item.subcategory}</span>
            )}

            {item.status !== 'available' && (
              <span className="chip-solid capitalize">
                {item.status}
              </span>
            )}
          </div>

          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100 sm:text-3xl">
            {item.title}
          </h1>

          <p className="mt-2 text-3xl font-semibold text-neutral-900 dark:text-neutral-100">
            {inr(item.price)}{' '}
            {item.negotiable && (
              <span className="text-sm font-normal text-neutral-400">
                · negotiable
              </span>
            )}
          </p>

          {/* Condition and location */}
          <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-neutral-50 p-3 dark:bg-neutral-800">
              <dt className="text-xs text-neutral-500 dark:text-neutral-400">
                Condition
              </dt>
              <dd className="font-medium text-neutral-900 dark:text-neutral-100">
                {CONDITION[item.condition]}
              </dd>
            </div>

            <div className="rounded-lg bg-neutral-50 p-3 dark:bg-neutral-800">
              <dt className="text-xs text-neutral-500 dark:text-neutral-400">
                Location
              </dt>
              <dd className="flex items-center gap-1 font-medium text-neutral-900 dark:text-neutral-100">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                {item.hostel?.name}
              </dd>
            </div>
          </dl>

          <p className="mt-5 whitespace-pre-line text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
            {item.description}
          </p>

          {/* Seller information */}
          <div className="card mt-6 flex items-center gap-3 p-3.5">
            <Avatar user={item.seller} size={44} />

            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-neutral-900 dark:text-neutral-100">
                {item.seller.name}
              </p>

              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Verified student · joined{' '}
                {ago(item.seller.createdAt).replace(' ago', '')} ago
              </p>

              {item.business && (
                <Link
                  to={`/businesses/${item.business._id}`}
                  className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium underline"
                >
                  {item.business.name}
                  {item.business.isVerified && (
                    <BadgeCheck className="h-3 w-3 text-blue-500" />
                  )}
                </Link>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-5 flex gap-2">
            {mine ? (
              <Link
                to={`/sell/${item._id}`}
                className="btn-primary flex-1 py-3"
              >
                <Pencil className="h-4 w-4" />
                Edit listing
              </Link>
            ) : (
              <button
                className="btn-primary flex-1 py-3"
                disabled={chat.isPending || item.status === 'sold'}
                onClick={() => chat.mutate()}
              >
                {chat.isPending ? (
                  <Spinner />
                ) : (
                  <>
                    <MessageCircle className="h-4 w-4" />
                    {item.status === 'sold' ? 'Sold' : 'Chat with seller'}
                  </>
                )}
              </button>
            )}

            {!mine && (
              <button
                className="btn-outline px-3.5"
                onClick={() => setReport(true)}
                aria-label="Report"
              >
                <Flag className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Views and safety note */}
          <p className="mt-4 flex items-center gap-1.5 text-xs text-neutral-400">
            <Eye className="h-3.5 w-3.5" />
            {item.views} views · posted {ago(item.createdAt)}
          </p>

          <p className="mt-3 rounded-lg bg-neutral-50 p-3 text-xs text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
            Meet in a common area of your hostel and check the item before
            paying. DormAce never asks for your password or OTP.
          </p>
        </div>
      </div>

      {/* Report modal */}
      <Modal
        open={report}
        onClose={() => setReport(false)}
        title="Report listing"
      >
        <select
          className="input"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        >
          {[
            ['spam', 'Spam'],
            ['scam', 'Looks like a scam'],
            ['inappropriate', 'Inappropriate'],
            ['prohibited', 'Prohibited item'],
            ['other', 'Other'],
          ].map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <button
          className="btn-primary mt-4 w-full"
          onClick={() => sendReport.mutate()}
          disabled={sendReport.isPending}
        >
          {sendReport.isPending ? <Spinner /> : 'Submit report'}
        </button>
      </Modal>
    </div>
  );
}