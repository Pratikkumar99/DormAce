import { Zap, Clock, MessageCircle } from 'lucide-react';

import { Avatar } from '../ui/index.jsx';
import { inr, ago, timeLeft, URGENCY, cx } from '../../lib/format.js';

export default function RequestCard({
  r,
  mine,
  onRespond,
  onClose,
  onDelete,
  busy,
}) {
  return (
    <div className="card animate-fade-up p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {/* Urgency and status */}
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            <span
              className={cx(
                r.urgency === 'now' ? 'chip-solid' : 'chip',
              )}
            >
              {r.urgency === 'now' && (
                <Zap className="h-3 w-3" />
              )}
              {URGENCY[r.urgency]}
            </span>

            {r.status !== 'open' && (
              <span className="chip capitalize">
                {r.status}
              </span>
            )}
          </div>

          {/* Request title */}
          <p className="font-semibold leading-snug text-neutral-900 dark:text-neutral-100">
            {r.title}
          </p>

          {/* Description */}
          {r.description && (
            <p className="mt-1 line-clamp-2 text-sm text-neutral-500 dark:text-neutral-400">
              {r.description}
            </p>
          )}
        </div>

        {/* Budget */}
        {r.maxPrice != null && (
          <div className="shrink-0 text-right">
            <p className="text-[11px] uppercase text-neutral-400 dark:text-neutral-500">
              Budget
            </p>

            <p className="font-semibold text-neutral-900 dark:text-neutral-100">
              {inr(r.maxPrice)}
            </p>
          </div>
        )}
      </div>

      {/* Request details and actions */}
      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
          {!mine && (
            <Avatar user={r.requester} size={22} />
          )}

          <span className="truncate">
            {mine
              ? r.hostel?.name
              : `${r.requester?.name} · ${r.hostel?.name}`}
          </span>

          <span className="flex shrink-0 items-center gap-1">
            <Clock className="h-3 w-3" />

            {r.status === 'open'
              ? timeLeft(r.expiresAt)
              : ago(r.createdAt)}
          </span>
        </div>

        {mine ? (
          <div className="flex shrink-0 gap-1.5">
            {r.status === 'open' && (
              <button
                type="button"
                className="btn-outline btn-sm"
                onClick={() => onClose('fulfilled')}
              >
                Got it
              </button>
            )}

            {r.status === 'open' && (
              <button
                type="button"
                className="btn-ghost btn-sm"
                onClick={() => onClose('closed')}
              >
                Close
              </button>
            )}

            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={onDelete}
            >
              Delete
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="btn-primary btn-sm shrink-0"
            disabled={busy}
            onClick={onRespond}
          >
            <MessageCircle className="h-3.5 w-3.5" />
            I have this
          </button>
        )}
      </div>
    </div>
  );
}