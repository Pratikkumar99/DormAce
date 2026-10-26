import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MessageCircle } from 'lucide-react';

import { api, asset } from '../../lib/api.js';
import { Avatar, EmptyState, Spinner } from '../ui/index.jsx';
import { ago, cx } from '../../lib/format.js';

export default function ConversationList({ activeId }) {
  const { data, isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () =>
      (await api.get('/conversations')).data.conversations,
    refetchInterval: 120_000,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center p-10">
        <Spinner />
      </div>
    );
  }

  if (!data?.length) {
    return (
      <div className="p-4">
        <EmptyState
          icon={MessageCircle}
          title="No chats yet"
          text="Message a seller from any listing, or respond to a request."
        />
      </div>
    );
  }

  return (
    <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
      {data.map((c) => {
        const ctx =
          c.item?.title || c.request?.title || c.business?.name;

        const lastMessage =
          c.lastMessage?.text ||
          (c.lastMessage?.type === 'payment_request'
            ? 'Payment request'
            : c.lastMessage?.type === 'payment'
              ? 'Payment'
              : '');

        return (
          <li key={c._id}>
            <Link
              to={`/chat/${c._id}`}
              className={cx(
                'flex items-center gap-3 px-4 py-3 transition-colors',
                'hover:bg-neutral-50 dark:hover:bg-neutral-900',
                activeId === c._id &&
                  'bg-neutral-100 dark:bg-neutral-800',
              )}
            >
              <Avatar user={c.other} size={44} />

              <div className="min-w-0 flex-1">
                {/* Name and timestamp */}
                <div className="flex items-baseline justify-between gap-2">
                  <p
                    className={cx(
                      'truncate text-sm text-neutral-900 dark:text-neutral-100',
                      c.unread ? 'font-semibold' : 'font-medium',
                    )}
                  >
                    {c.other?.name}
                  </p>

                  <span className="shrink-0 text-[11px] text-neutral-400 dark:text-neutral-500">
                    {ago(c.lastMessageAt).replace(' ago', '')}
                  </span>
                </div>

                {/* Related listing, request, or business */}
                {ctx && (
                  <p className="truncate text-[11px] font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                    {ctx}
                  </p>
                )}

                {/* Last message */}
                <p
                  className={cx(
                    'truncate text-sm',
                    c.unread
                      ? 'font-medium text-neutral-900 dark:text-white'
                      : 'text-neutral-500 dark:text-neutral-400',
                  )}
                >
                  {c.lastMessage?.sender === c.other?._id
                    ? ''
                    : 'You: '}
                  {lastMessage}
                </p>
              </div>

              {/* Unread message count */}
              {c.unread > 0 && (
                <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-black px-1.5 text-[11px] font-semibold text-white dark:bg-white dark:text-black">
                  {c.unread}
                </span>
              )}

              {/* Listing image */}
              {c.item?.images?.[0] && (
                <img
                  src={asset(c.item.images[0])}
                  alt=""
                  className="hidden h-10 w-10 shrink-0 rounded-md object-cover sm:block"
                />
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}