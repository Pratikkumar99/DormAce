import { Link } from 'react-router-dom';
import { BadgeCheck, Store, Truck, Sparkles } from 'lucide-react';

import { asset } from '../../lib/api.js';

export default function BusinessCard({ b, segName }) {
  return (
    <Link
      to={`/businesses/${b._id}`}
      className="card group block animate-fade-up overflow-hidden transition hover:border-black dark:hover:border-white"
    >
      {/* Business banner */}
      <div className="h-24 bg-neutral-100 dark:bg-neutral-800">
        {b.banner && (
          <img
            src={asset(b.banner)}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        )}
      </div>

      <div className="-mt-7 px-4 pb-4">
        {/* Business logo */}
        <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border-2 border-white bg-black text-white dark:border-neutral-900 dark:bg-white dark:text-black">
          {b.logo ? (
            <img
              src={asset(b.logo)}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <Store className="h-6 w-6" />
          )}
        </div>

        {/* Business name and verification */}
        <div className="mt-2 flex items-center gap-1.5">
          <p className="truncate font-semibold text-neutral-900 dark:text-neutral-100">
            {b.name}
          </p>

          {b.isVerified && (
            <BadgeCheck
              className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400"
              aria-label="Verified business"
            />
          )}
        </div>

        {/* Description */}
        <p className="mt-0.5 line-clamp-2 text-sm text-neutral-500 dark:text-neutral-400">
          {b.description}
        </p>

        {/* Business tags */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="chip">
            {segName(b.segment)}
          </span>

          {b.deliversToHostel && (
            <span className="chip">
              <Truck className="h-3 w-3" />
              Delivers
            </span>
          )}

          {b.featured && (
            <span className="chip-solid">
              <Sparkles className="h-3 w-3" />
              Featured
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}