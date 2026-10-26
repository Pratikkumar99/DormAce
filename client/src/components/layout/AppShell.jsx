import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  Bell,
  Home,
  MessageCircle,
  Plus,
  Store,
  Wallet,
  User as UserIcon,
  HandHelping,
  LogOut,
  Shield,
  Package,
  ChevronDown,
  Briefcase,
  Sun,
  Moon,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext.jsx";
import { useTheme } from "../../context/ThemeContext.jsx";
import { api } from "../../lib/api.js";
import { socket } from "../../lib/socket.js";
import { Avatar } from "../ui/index.jsx";
import { cx } from "../../lib/format.js";
import { appendMessage } from "../../lib/chatCache.js";

const NAV = [
  { to: "/market", label: "Market", icon: Home },
  { to: "/requests", label: "Requests", icon: HandHelping },
  { to: "/businesses", label: "Businesses", icon: Store },
  { to: "/chat", label: "Chat", icon: MessageCircle, badge: "chat" },
  { to: "/wallet", label: "Wallet", icon: Wallet },
];

function useRealtime() {
  const qc = useQueryClient();

  useEffect(() => {
    const onMsg = (m) => {
      qc.invalidateQueries({ queryKey: ["unread"] });
      qc.invalidateQueries({ queryKey: ["conversations"] });

      appendMessage(qc, m);

      if (m.type === "payment" || m.type === "payment_request") {
        qc.invalidateQueries({ queryKey: ["wallet"] });
      }
    };

    const onNotif = (n) => {
      qc.invalidateQueries({ queryKey: ["notifications"] });

      if (n.type !== "message") {
        toast(n.title, { icon: "🔔" });
      }
    };

    socket.on("message:new", onMsg);
    socket.on("notification", onNotif);

    return () => {
      socket.off("message:new", onMsg);
      socket.off("notification", onNotif);
    };
  }, [qc]);
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="btn-ghost rounded-full p-2"
      aria-label={
        theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
      }
      title={theme === "dark" ? "Light mode" : "Dark mode"}
    >
      {theme === "dark" ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </button>
  );
}

function NotificationBell() {
  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => (await api.get("/notifications")).data,
    refetchInterval: 120_000,
  });

  return (
    <Link
      to="/notifications"
      className="btn-ghost relative rounded-full p-2"
      aria-label="Notifications"
    >
      <Bell className="h-5 w-5" />

      {data?.unread > 0 && (
        <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-black dark:border-neutral-950 dark:bg-white" />
      )}
    </Link>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const nav = useNavigate();

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  const go = (to) => () => {
    setOpen(false);
    nav(to);
  };

  const Item = ({ icon: Icon, children, onClick }) => (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
    >
      <Icon className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
      {children}
    </button>
  );

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-full p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        aria-label="Account menu"
        aria-expanded={open}
      >
        <Avatar user={user} size={32} />
        <ChevronDown className="hidden h-3.5 w-3.5 text-neutral-500 dark:text-neutral-400 sm:block" />
      </button>

      {open && (
        <div className="animate-pop absolute right-0 z-40 mt-2 w-60 overflow-hidden rounded-xl border border-neutral-200 bg-white py-1 text-neutral-900 shadow-lg dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100">
          <div className="border-b border-neutral-100 px-3 py-2.5 dark:border-neutral-800">
            <p className="truncate text-sm font-semibold">{user.name}</p>

            <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
              {user.hostel?.name} · {user.college?.code}
            </p>
          </div>

          <Item icon={UserIcon} onClick={go("/profile")}>
            Profile &amp; security
          </Item>

          <Item icon={Package} onClick={go("/my-listings")}>
            My listings
          </Item>

          <Item icon={Briefcase} onClick={go("/business")}>
            My business
          </Item>

          {user.role === "admin" && (
            <Item icon={Shield} onClick={go("/admin")}>
              Admin
            </Item>
          )}

          <div className="my-1 border-t border-neutral-100 dark:border-neutral-800" />

          <Item
            icon={LogOut}
            onClick={async () => {
              setOpen(false);

              try {
                await logout();
                nav("/");
              } catch {
                toast.error("Unable to sign out. Please try again.");
              }
            }}
          >
            Sign out
          </Item>
        </div>
      )}
    </div>
  );
}

export default function AppShell() {
  const { user } = useAuth();

  useRealtime();

  const { data: unread } = useQuery({
    queryKey: ["unread"],
    queryFn: async () =>
      (await api.get("/conversations/unread-count")).data.count,
    refetchInterval: 90_000,
  });

  const badge = (b) =>
    b === "chat" && unread > 0 ? (
      <span className="ml-1 rounded-full bg-black px-1.5 text-[10px] font-semibold leading-4 text-white dark:bg-white dark:text-black">
        {unread > 9 ? "9+" : unread}
      </span>
    ) : null;

  return (
    <div className="min-h-screen bg-white pb-20 text-neutral-900 transition-colors duration-200 dark:bg-neutral-950 dark:text-neutral-100 md:pb-0">
      <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/90 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/90">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
          <Link to="/market" className="shrink-0">
            <img
              src="/logo.png"
              alt="DormAce"
              className="h-11 w-auto dark:invert"
            />
          </Link>

          <nav className="ml-4 hidden items-center gap-1 md:flex">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  cx(
                    "flex items-center rounded-lg px-3 py-2 text-sm font-medium transition",
                    isActive
                      ? "bg-black text-white dark:bg-white dark:text-black"
                      : "text-neutral-600 hover:bg-neutral-100 hover:text-black dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white",
                  )
                }
              >
                {n.label}
                {badge(n.badge)}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1.5">
            <span className="chip hidden lg:inline-flex dark:border-neutral-700 dark:text-neutral-200">
              {user.gender === "boys" ? "Boys" : "Girls"} · {user.college?.code}
            </span>

            <Link
              to="/sell"
              className="btn-primary btn-sm hidden sm:inline-flex"
            >
              <Plus className="h-4 w-4" />
              Sell
            </Link>

            <ThemeToggle />
            <NotificationBell />
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <Outlet />
      </main>

      <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-neutral-200 bg-white/95 px-2 pt-1.5 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95 md:hidden">
        {[NAV[0], NAV[1], null, NAV[3], NAV[4]].map((n, i) =>
          n ? (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                cx(
                  "relative flex w-16 flex-col items-center gap-0.5 py-1 text-[10px] font-medium",
                  isActive
                    ? "text-black dark:text-white"
                    : "text-neutral-400 dark:text-neutral-500",
                )
              }
            >
              <n.icon className="h-5 w-5" />
              {n.label}

              {n.badge === "chat" && unread > 0 && (
                <span className="absolute right-3 top-0 h-2 w-2 rounded-full bg-black dark:bg-white" />
              )}
            </NavLink>
          ) : (
            <Link
              key={i}
              to="/sell"
              className="-mt-5 flex h-12 w-12 items-center justify-center rounded-full bg-black text-white shadow-lg dark:bg-white dark:text-black"
              aria-label="Sell"
            >
              <Plus className="h-6 w-6" />
            </Link>
          ),
        )}
      </nav>
    </div>
  );
}