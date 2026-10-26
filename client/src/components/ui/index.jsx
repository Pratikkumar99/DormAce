import { useEffect } from "react";
import { Loader2, X, ChevronLeft, ChevronRight } from "lucide-react";

import { asset } from "../../lib/api.js";
import { cx } from "../../lib/format.js";

export const Spinner = ({ className = "h-5 w-5" }) => (
  <Loader2 className={cx("animate-spin", className)} />
);

export const PageLoader = () => (
  <div className="flex min-h-[50vh] items-center justify-center text-neutral-400 dark:text-neutral-500">
    <Spinner className="h-6 w-6" />
  </div>
);

export function Field({ label, error, hint, children, className }) {
  return (
    <div className={className}>
      {label && <label className="label">{label}</label>}

      {children}

      {hint && !error && (
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          {hint}
        </p>
      )}

      {error && (
        <p className="mt-1 text-xs font-medium text-red-600 underline decoration-wavy dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

export function Avatar({ user, size = 36, className }) {
  const initials = (user?.name || "?")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return user?.avatar ? (
    <img
      src={asset(user.avatar)}
      alt=""
      style={{ width: size, height: size }}
      className={cx("shrink-0 rounded-full object-cover", className)}
    />
  ) : (
    <span
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      className={cx(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-black font-semibold text-white dark:bg-white dark:text-black",
        className,
      )}
    >
      {initials}
    </span>
  );
}

export function Modal({ open, onClose, title, children, wide }) {
  useEffect(() => {
    if (!open) return undefined;

    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      <div
        className={cx(
          "animate-pop relative max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 text-neutral-900 shadow-xl dark:bg-neutral-900 dark:text-neutral-100 sm:rounded-2xl sm:p-6",
          wide ? "sm:max-w-2xl" : "sm:max-w-md",
        )}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold tracking-tight">
            {title}
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="btn-ghost -mr-2 -mt-1 rounded-full p-2"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-neutral-300 px-6 py-14 text-center dark:border-neutral-700">
      {Icon && (
        <Icon
          className="mb-3 h-8 w-8 text-neutral-400 dark:text-neutral-500"
          strokeWidth={1.5}
        />
      )}

      <p className="font-medium text-neutral-900 dark:text-neutral-100">
        {title}
      </p>

      {text && (
        <p className="mt-1 max-w-sm text-sm text-neutral-500 dark:text-neutral-400">
          {text}
        </p>
      )}

      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Pagination({ page, pages, onChange }) {
  if (!pages || pages <= 1) return null;

  return (
    <div className="mt-8 flex items-center justify-center gap-3 text-sm">
      <button
        type="button"
        className="btn-outline btn-sm"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        <ChevronLeft className="h-4 w-4" />
        Prev
      </button>

      <span className="text-neutral-500 dark:text-neutral-400">
        Page {page} of {pages}
      </span>

      <button
        type="button"
        className="btn-outline btn-sm"
        disabled={page >= pages}
        onClick={() => onChange(page + 1)}
      >
        Next
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

export const GridSkeleton = ({ n = 8 }) => (
  <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
    {Array.from({ length: n }).map((_, i) => (
      <div key={i}>
        <div className="skeleton aspect-square" />
        <div className="skeleton mt-3 h-4 w-3/4" />
        <div className="skeleton mt-2 h-4 w-1/3" />
      </div>
    ))}
  </div>
);

export function Segmented({ value, onChange, options }) {
  return (
    <div className="inline-flex rounded-lg border border-neutral-300 p-0.5 dark:border-neutral-700">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cx(
            "rounded-md px-3 py-1.5 text-xs font-medium transition",
            value === o.value
              ? "bg-black text-white dark:bg-white dark:text-black"
              : "text-neutral-600 hover:text-black dark:text-neutral-400 dark:hover:text-white",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function ImagePicker({
  files,
  setFiles,
  existing = [],
  setExisting,
  max = 5,
}) {
  const total = files.length + existing.length;

  const add = (e) => {
    const picked = Array.from(e.target.files || []).filter((f) =>
      f.type.startsWith("image/"),
    );

    setFiles([...files, ...picked].slice(0, max - existing.length));
    e.target.value = "";
  };

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
      {existing.map((u) => (
        <Thumb
          key={u}
          src={asset(u)}
          onRemove={() => setExisting(existing.filter((x) => x !== u))}
        />
      ))}

      {files.map((f, i) => (
        <Thumb
          key={`${f.name}-${f.lastModified}-${i}`}
          src={URL.createObjectURL(f)}
          onRemove={() => setFiles(files.filter((_, j) => j !== i))}
        />
      ))}

      {total < max && (
        <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-neutral-300 text-xs text-neutral-500 transition hover:border-black hover:text-black dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-white dark:hover:text-white">
          <span className="text-xl leading-none">+</span>
          Add photo

          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={add}
          />
        </label>
      )}
    </div>
  );
}

const Thumb = ({ src, onRemove }) => (
  <div className="relative aspect-square overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-700">
    <img
      src={src}
      alt=""
      className="h-full w-full object-cover"
    />

    <button
      type="button"
      onClick={onRemove}
      className="absolute right-1 top-1 rounded-full bg-black p-1 text-white transition hover:bg-neutral-700 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
      aria-label="Remove"
    >
      <X className="h-3 w-3" />
    </button>
  </div>
);