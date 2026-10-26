import { Link, Navigate } from 'react-router-dom';
import {
  ShieldCheck,
  Users,
  Zap,
  Wallet,
  Store,
  MessageCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

const FEATURES = [
  {
    icon: ShieldCheck,
    t: 'Verified students only',
    d: 'Every account is approved against a real college ID card. No outsiders, no fake profiles.',
  },
  {
    icon: Users,
    t: 'Boys see boys. Girls see girls.',
    d: 'Listings, requests and chats are walled by college and hostel group — enforced on the server.',
  },
  {
    icon: Zap,
    t: 'Need it now? Just ask.',
    d: 'Post “I need Maggi” and a classmate down the corridor can say “I have it” in minutes.',
  },
  {
    icon: MessageCircle,
    t: 'Chat & close the deal',
    d: 'Private, real-time chat per listing. Share nothing you don’t want to.',
  },
  {
    icon: Wallet,
    t: 'Wallet built in',
    d: 'Top up with Razorpay, pay in chat or in person with a one-time code.',
  },
  {
    icon: Store,
    t: 'Campus businesses',
    d: 'Laundry, printing, snacks, tutoring — register your business and reach your hostel.',
  },
];

export default function Landing() {
  const { user } = useAuth();

  if (user) return <Navigate to="/market" replace />;

  return (
    <div className="min-h-screen bg-white text-neutral-900 transition-colors duration-200 dark:bg-neutral-950 dark:text-neutral-100">
      <header className="mx-auto flex h-20 max-w-6xl items-center justify-between px-5">
        <img src="/logo.png" alt="DormAce" className="h-14 w-auto" />

        <div className="flex items-center gap-2">
          <Link to="/login" className="btn-ghost">
            Sign in
          </Link>

          <Link to="/register" className="btn-primary">
            Get started
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-5 pb-20 pt-16 text-center sm:pt-24">
        <span className="chip mb-6">
          For verified hostel residents
        </span>

        <h1 className="text-5xl font-semibold leading-[1.05] tracking-tight text-neutral-900 dark:text-white sm:text-7xl">
          The marketplace
          <br />
          inside your hostel.
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-neutral-500 dark:text-neutral-400">
          Sell what you don’t need. Find what you do. Trade safely with
          people you can actually knock on the door of.
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/register"
            className="btn-primary px-7 py-3 text-base"
          >
            Create your account
          </Link>

          <Link
            to="/login"
            className="btn-outline px-7 py-3 text-base"
          >
            I already have one
          </Link>
        </div>
      </section>

      <section className="border-y border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mx-auto grid max-w-6xl gap-px bg-neutral-200 dark:bg-neutral-800 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.t}
              className="bg-neutral-50 p-8 transition-colors duration-200 dark:bg-neutral-900"
            >
              <f.icon
                className="h-6 w-6 text-neutral-800 dark:text-neutral-200"
                strokeWidth={1.5}
              />

              <h3 className="mt-4 font-semibold text-neutral-900 dark:text-neutral-100">
                {f.t}
              </h3>

              <p className="mt-1.5 text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
                {f.d}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 py-20 text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-neutral-900 dark:text-white">
          Three steps to start
        </h2>

        <div className="mt-10 grid gap-8 text-left sm:grid-cols-3">
          {[
            'Sign up with your college details and upload your ID card.',
            'We verify it — usually within a day.',
            'Buy, sell, request and chat with your hostel.',
          ].map((s, i) => (
            <div key={i}>
              <span className="text-5xl font-semibold text-neutral-200 dark:text-neutral-700">
                0{i + 1}
              </span>

              <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                {s}
              </p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-neutral-200 py-8 text-center text-xs text-neutral-400 dark:border-neutral-800 dark:text-neutral-500">
        © {new Date().getFullYear()} DormAce · Made for hostel life
      </footer>
    </div>
  );
}