import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowLeft, IndianRupee, Send, Flag } from 'lucide-react';

import { api, asset, errMsg } from '../../lib/api.js';
import { socket } from '../../lib/socket.js';
import { appendMessage } from '../../lib/chatCache.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { Avatar, Spinner } from '../ui/index.jsx';
import PaymentModal from './PaymentModal.jsx';
import { clock, dayLabel, inr, inrPaise, cx } from '../../lib/format.js';

function PaymentCard({ m, mine, convoId }) {
  const qc = useQueryClient();
  const pr = m.paymentRequest;

  const pay = useMutation({
    mutationFn: () => api.post(`/wallet/requests/${pr._id}/pay`),
    onSuccess: () => {
      toast.success('Paid');
      qc.invalidateQueries({ queryKey: ['messages', convoId] });
      qc.invalidateQueries({ queryKey: ['wallet'] });
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  const cancel = useMutation({
    mutationFn: () => api.post(`/wallet/requests/${pr._id}/cancel`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['messages', convoId] });
      qc.invalidateQueries({ queryKey: ['wallet'] });
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  if (!pr) return null;

  const expired =
    pr.status === 'pending' && new Date(pr.expiresAt) < new Date();

  const status = expired ? 'expired' : pr.status;

  return (
    <div className="w-56 rounded-xl border border-neutral-300 bg-white p-3.5 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100">
      <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        {mine ? 'You requested' : 'Payment request'}
      </p>

      <p className="mt-1 text-2xl font-semibold">{inrPaise(pr.amount)}</p>

      {m.text && (
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
          {m.text}
        </p>
      )}

      {status === 'pending' ? (
        mine ? (
          <button
            type="button"
            className="btn-outline btn-sm mt-3 w-full"
            disabled={cancel.isPending}
            onClick={() => cancel.mutate()}
          >
            {cancel.isPending ? <Spinner className="h-4 w-4" /> : 'Cancel request'}
          </button>
        ) : (
          <button
            type="button"
            className="btn-primary btn-sm mt-3 w-full"
            disabled={pay.isPending}
            onClick={() => pay.mutate()}
          >
            {pay.isPending ? (
              <Spinner className="h-4 w-4" />
            ) : (
              `Pay ${inrPaise(pr.amount)}`
            )}
          </button>
        )
      ) : (
        <span className="chip mt-3 capitalize dark:border-neutral-700 dark:text-neutral-200">
          {status}
        </span>
      )}
    </div>
  );
}

export default function ChatWindow({ id, onBack }) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [text, setText] = useState('');
  const [payOpen, setPayOpen] = useState(false);
  const [typing, setTyping] = useState(false);

  const bottom = useRef(null);
  const typingTimer = useRef(null);
  const lastTypingEmit = useRef(0);

  const { data: convo } = useQuery({
    queryKey: ['conversation', id],
    queryFn: async () =>
      (await api.get(`/conversations/${id}`)).data.conversation,
  });

  const msgs = useInfiniteQuery({
    queryKey: ['messages', id],
    initialPageParam: null,
    queryFn: async ({ pageParam }) =>
      (
        await api.get(`/conversations/${id}/messages`, {
          params: {
            before: pageParam ?? undefined,
            limit: 30,
          },
        })
      ).data,
    getNextPageParam: (last) =>
      last.hasMore ? last.messages[0]?.createdAt : undefined,
    staleTime: 0,
  });

  const messages = useMemo(
    () =>
      [...(msgs.data?.pages || [])]
        .reverse()
        .flatMap((p) => p.messages),
    [msgs.data],
  );

  // Mark messages as read when the conversation has messages.
  useEffect(() => {
    if (!messages.length) return;

    api
      .post(`/conversations/${id}/read`)
      .then(() => {
        qc.invalidateQueries({ queryKey: ['unread'] });
        qc.invalidateQueries({ queryKey: ['conversations'] });
      })
      .catch(() => {});
  }, [id, messages.length, qc]);

  // Scroll to the latest message.
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, typing]);

  // Listen for typing events.
  useEffect(() => {
    const onTyping = (e) => {
      if (e.conversationId !== id) return;

      setTyping(e.typing);
      clearTimeout(typingTimer.current);

      if (e.typing) {
        typingTimer.current = setTimeout(() => setTyping(false), 4000);
      }
    };

    socket.on('typing', onTyping);

    return () => {
      socket.off('typing', onTyping);
      clearTimeout(typingTimer.current);
    };
  }, [id]);

  const send = useMutation({
    mutationFn: (t) => api.post(`/conversations/${id}/messages`, { text: t }),
    onSuccess: ({ data }) => appendMessage(qc, data.message),
    onError: (e) => toast.error(errMsg(e)),
  });

  const onSubmit = (e) => {
    e.preventDefault();

    const t = text.trim();
    if (!t) return;

    setText('');
    send.mutate(t);
    socket.emit('typing', { conversationId: id, typing: false });
  };

  const onChange = (e) => {
    setText(e.target.value);

    if (Date.now() - lastTypingEmit.current > 2000) {
      lastTypingEmit.current = Date.now();
      socket.emit('typing', { conversationId: id, typing: true });
    }
  };

  const report = async () => {
    if (!convo?.other?._id) {
      toast.error('Conversation details are not available yet.');
      return;
    }

    try {
      await api.post('/reports', {
        targetType: 'user',
        targetId: convo.other._id,
        reason: 'harassment',
      });

      toast.success('Reported. Our team will review.');
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  let lastDay = null;

  return (
    <div className="flex h-full min-h-0 flex-col bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      {/* Chat header */}
      <div className="flex items-center gap-3 border-b border-neutral-200 px-3 py-3 dark:border-neutral-800 sm:px-4">
        <button
          type="button"
          onClick={onBack}
          className="btn-ghost rounded-full p-2 md:hidden"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <Avatar user={convo?.other} size={40} />

        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold leading-tight">
            {convo?.other?.name}
          </p>

          <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
            {typing
              ? 'typing…'
              : convo?.item
                ? `About: ${convo.item.title}`
                : convo?.request
                  ? `Request: ${convo.request.title}`
                  : convo?.business
                    ? convo.business.name
                    : ''}
          </p>
        </div>

        {convo?.item && (
          <Link
            to={`/item/${convo.item._id}`}
            className="hidden shrink-0 sm:block"
          >
            <img
              src={asset(convo.item.images?.[0])}
              alt=""
              className="h-10 w-10 rounded-md object-cover"
            />
          </Link>
        )}

        <button
          type="button"
          className="btn-ghost rounded-full p-2"
          onClick={report}
          aria-label="Report user"
          title="Report user"
        >
          <Flag className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-1 overflow-y-auto bg-neutral-50 px-3 py-4 dark:bg-neutral-950 sm:px-5">
        {msgs.hasNextPage && (
          <div className="pb-2 text-center">
            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={() => msgs.fetchNextPage()}
              disabled={msgs.isFetchingNextPage}
            >
              {msgs.isFetchingNextPage
                ? 'Loading…'
                : 'Load earlier messages'}
            </button>
          </div>
        )}

        {msgs.isLoading && (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        )}

        {msgs.isError && (
          <p className="py-4 text-center text-sm text-red-600 dark:text-red-400">
            Unable to load messages. Please try again.
          </p>
        )}

        {messages.map((m) => {
          const mine = String(m.sender) === String(user.id);
          const day = dayLabel(m.createdAt);
          const showDay = day !== lastDay;

          lastDay = day;

          return (
            <div key={m._id}>
              {showDay && (
                <p className="my-3 text-center text-[11px] font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                  {day}
                </p>
              )}

              <div className={cx('flex', mine ? 'justify-end' : 'justify-start')}>
                {m.type === 'payment_request' ? (
                  <PaymentCard m={m} mine={mine} convoId={id} />
                ) : m.type === 'payment' ? (
                  <div className="rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-center text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100">
                    <IndianRupee className="mx-auto h-4 w-4" />

                    <p className="font-semibold">
                      {inr(m.amount)} {mine ? 'sent' : 'received'}
                    </p>

                    {m.text && (
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        {m.text}
                      </p>
                    )}
                  </div>
                ) : (
                  <div
                    className={cx(
                      'max-w-[78%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm',
                      mine
                        ? 'rounded-br-md bg-black text-white dark:bg-white dark:text-black'
                        : 'rounded-bl-md border border-neutral-200 bg-white text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100',
                    )}
                  >
                    {m.text}

                    <span
                      className={cx(
                        'ml-2 inline-block translate-y-0.5 text-[10px]',
                        mine
                          ? 'text-neutral-400 dark:text-neutral-500'
                          : 'text-neutral-500 dark:text-neutral-400',
                      )}
                    >
                      {clock(m.createdAt)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        <div ref={bottom} />
      </div>

      {/* Message composer */}
      <form
        onSubmit={onSubmit}
        className="flex items-center gap-2 border-t border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-950"
      >
        <button
          type="button"
          onClick={() => setPayOpen(true)}
          className="btn-outline rounded-full p-2.5"
          aria-label="Payments"
        >
          <IndianRupee className="h-4 w-4" />
        </button>

        <input
          className="input flex-1 rounded-full"
          placeholder="Message"
          maxLength={2000}
          value={text}
          onChange={onChange}
        />

        <button
          type="submit"
          className="btn-primary rounded-full p-2.5"
          disabled={!text.trim() || send.isPending}
          aria-label="Send"
        >
          {send.isPending ? (
            <Spinner className="h-4 w-4" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </form>

      <PaymentModal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        conversationId={id}
        otherName={convo?.other?.name}
      />
    </div>
  );
}