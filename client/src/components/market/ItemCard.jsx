import { Link } from 'react-router-dom';
import { BadgeCheck, ImageOff } from 'lucide-react';

import { asset } from '../../lib/api.js';
import { inr, ago, cx } from '../../lib/format.js';

export default function ItemCard({ item }) {
  return (
    <Link
      to={`/item/${item._id}`}
      className="group block animate-fade-up"
    >
      {/* Item image */}
      <div className="relative aspect-square overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-800">
        {item.images?.[0] ? (
          <img
            src={asset(item.images[0])}
            alt={item.title}
            loading="lazy"
            className={cx(
              'h-full w-full object-cover transition duration-300 group-hover:scale-105',
              item.status === 'sold' && 'opacity-50',
            )}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-neutral-300 dark:text-neutral-600">
            <ImageOff className="h-8 w-8" />
          </div>
        )}

        {/* Item status */}
        {item.status !== 'available' && (
          <span className="chip-solid absolute left-2 top-2 capitalize">
            {item.status}
          </span>
        )}

        {/* Business badge */}
        {item.business && (
          <span className="chip absolute right-2 top-2 flex max-w-[80%] items-center gap-1 bg-white text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100">
            <span className="truncate">{item.business.name}</span>

            {item.business.isVerified && (
              <BadgeCheck
                className="h-3 w-3 shrink-0 text-blue-600 dark:text-blue-400"
                aria-label="Verified business"
              />
            )}
          </span>
        )}
      </div>

      {/* Item details */}
      <div className="mt-2.5">
        <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
          {item.title}
        </p>

        <p className="mt-0.5 flex items-baseline gap-2">
          <span className="font-semibold text-neutral-900 dark:text-neutral-100">
            {inr(item.price)}
          </span>

          {item.negotiable && (
            <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
              negotiable
            </span>
          )}
        </p>

        <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-400">
          {item.hostel?.name} · {ago(item.createdAt)}
        </p>
      </div>
    </Link>
  );
}