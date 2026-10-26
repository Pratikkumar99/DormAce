import { Link } from 'react-router-dom';

export default function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}) {
  return (
    <div className="grid min-h-screen bg-white text-neutral-900 transition-colors duration-200 dark:bg-neutral-950 dark:text-neutral-100 lg:grid-cols-2">
      {/* Left branding panel */}
      <div className="relative hidden flex-col justify-between bg-black p-10 text-white dark:bg-neutral-900 lg:flex">
        <Link to="/">
          <img
            src="/logo.png"
            alt="DormAce"
            className="h-16 w-auto invert"
          />
        </Link>

        <div>
          <p className="text-4xl font-semibold leading-tight tracking-tight">
            Your hostel,
            <br />
            your marketplace.
          </p>

          <p className="mt-4 max-w-sm text-neutral-400">
            Buy, sell and ask for anything — only with verified students
            from your own college and hostel group.
          </p>
        </div>

        <p className="text-xs text-neutral-500">
          © {new Date().getFullYear()} DormAce
        </p>
      </div>

      {/* Right authentication panel */}
      <div className="flex flex-col justify-center bg-white px-5 py-10 transition-colors duration-200 dark:bg-neutral-950 sm:px-12">
        <Link to="/" className="mb-8 lg:hidden">
          <img
            src="/logo.png"
            alt="DormAce"
            className="h-14 w-auto dark:invert"
          />
        </Link>

        <div className="mx-auto w-full max-w-md animate-fade-up">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
            {title}
          </h1>

          {subtitle && (
            <p className="mt-1.5 text-sm text-neutral-500 dark:text-neutral-400">
              {subtitle}
            </p>
          )}

          <div className="mt-7">{children}</div>

          {footer && (
            <div className="mt-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}