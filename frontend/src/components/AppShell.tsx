"use client";
import Link from "next/link";
import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useTeam } from "@/context/TeamContext";
import { api, signOut, message } from "@/lib/api";
import { Notification } from "@/types";
import { Alert, Avatar, Empty, Spinner } from "./ui";
import {
  Bell,
  ChartColumn,
  FileText,
  History,
  Layers,
  LayoutList,
  LogIn,
  LogOut,
  Menu,
  PenLine,
  Settings,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";

export const NOTIFICATIONS_CHANGED = "daybrief:notifications";
export const roleLabel = {
  member: "Member",
  admin: "Team admin",
  superadmin: "Workspace admin",
} as const;

type NavLink = [href: string, label: string, Icon: LucideIcon];

export function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
        <path
          d="M5 22h22M9.5 22a6.5 6.5 0 0 1 13 0M16 7v3M7.6 10.6l2 2M24.4 10.6l-2 2"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

export default function AppShell({
  title,
  description,
  actions,
  wide,
  needsTeam = true,
  children,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  wide?: boolean;
  needsTeam?: boolean;
  children: ReactNode;
}) {
  const { user, teams, activeTeam, setActiveTeam, loading, error } = useTeam();
  const path = usePathname();
  const [failure, setFailure] = useState(""),
    [open, setOpen] = useState(false),
    [unread, setUnread] = useState(0),
    [leaving, setLeaving] = useState(false);
  const sidebar = useRef<HTMLElement>(null),
    menuButton = useRef<HTMLButtonElement>(null);

  const countUnread = useCallback(() => {
    api<Notification[]>("/api/notifications?page=1")
      .then((rows) => setUnread(rows.filter((n) => !n.isRead).length))
      .catch(() => setUnread(0));
  }, []);
  useEffect(() => {
    if (!user) return;
    countUnread();
    window.addEventListener(NOTIFICATIONS_CHANGED, countUnread);
    return () => window.removeEventListener(NOTIFICATIONS_CHANGED, countUnread);
  }, [user, countUnread]);

  // Close the mobile drawer on navigation and with Escape.
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    sidebar.current?.querySelector<HTMLElement>("a, button, select")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        menuButton.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const links: NavLink[] = [
    ["/dashboard", "Team feed", LayoutList],
    ["/history", "My check-ins", History],
    ["/insights", "Insights", ChartColumn],
    ["/digests", "Summaries", FileText],
    ["/notifications", "Notifications", Bell],
  ];
  const adminLinks: NavLink[] = [];
  if (user?.role === "admin" || user?.role === "superadmin")
    adminLinks.push(
      ["/admin/users", "Members", Users],
      ["/admin/dashboard", "Team settings", Settings],
    );
  if (user?.role === "superadmin")
    adminLinks.push(["/admin/super", "All teams", Layers]);
  const active = (href: string) =>
    path === href ||
    (href === "/dashboard" && path === "/admin/team-feed") ||
    (href === "/insights" && path === "/admin/reports");
  const renderLink = ([href, label, Icon]: NavLink) => (
    <Link
      aria-current={active(href) ? "page" : undefined}
      key={href}
      href={href}
    >
      <Icon size={17} strokeWidth={2} aria-hidden="true" />
      {label}
      {href === "/notifications" && unread > 0 && (
        <span className="count" aria-hidden="true">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );

  async function leave() {
    setLeaving(true);
    try {
      await api("/api/auth/logout", { method: "POST", body: "{}" });
      signOut();
    } catch (e) {
      setFailure(message(e));
      setLeaving(false);
    }
  }

  const showCheckIn = !!user && !!activeTeam;
  let body: ReactNode;
  if (loading)
    body = (
      <div className="center-state" aria-live="polite">
        <p className="meta">
          <Spinner /> Loading your workspace…
        </p>
      </div>
    );
  else if (!user)
    body = (
      <Empty
        icon={LogIn}
        title="You're signed out"
        action={
          <Link className="btn btn-primary" href="/login">
            Sign in
          </Link>
        }
      >
        {error && error !== "Request failed" && !/auth|session|sign/i.test(error)
          ? error
          : "Your session has ended. Sign in again to pick up where you left off."}
      </Empty>
    );
  else if (needsTeam && !activeTeam)
    body = (
      <Empty
        icon={Users}
        title="You're not on a team yet"
        action={
          user.role === "superadmin" ? (
            <Link className="btn btn-primary" href="/admin/super">
              Create a team
            </Link>
          ) : undefined
        }
      >
        {user.role === "superadmin"
          ? "Create your first team, then add people by the email they registered with."
          : `Ask a team admin to add ${user.email}. Your team's feed will appear here once you're in.`}
      </Empty>
    );
  else body = children;

  return (
    <div className="shell">
      <a href="#content" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] btn btn-secondary">
        Skip to content
      </a>
      <header className="mobile-bar">
        <button
          ref={menuButton}
          className="btn btn-ghost btn-icon"
          aria-label="Open navigation"
          aria-expanded={open}
          aria-controls="sidebar"
          onClick={() => setOpen(true)}
        >
          <Menu size={20} aria-hidden="true" />
        </button>
        <Link className="brand" href="/dashboard">
          <BrandMark />
          Daybrief
        </Link>
        {showCheckIn && path !== "/check-in" && (
          <Link className="btn btn-primary btn-sm" href="/check-in">
            <PenLine size={15} aria-hidden="true" />
            Check in
          </Link>
        )}
      </header>
      <div
        className="scrim"
        data-open={open}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />
      <aside
        id="sidebar"
        ref={sidebar}
        className="sidebar"
        data-open={open}
        aria-label="Main"
        onClick={(e) => {
          // Close the drawer even when the link points at the current page.
          if ((e.target as HTMLElement).closest("a")) setOpen(false);
        }}
      >
        <div className="flex items-center justify-between">
          <Link className="brand" href="/dashboard">
            <BrandMark />
            Daybrief
          </Link>
          {open && (
            <button
              className="btn btn-ghost btn-icon"
              aria-label="Close navigation"
              onClick={() => {
                setOpen(false);
                menuButton.current?.focus();
              }}
            >
              <X size={20} aria-hidden="true" />
            </button>
          )}
        </div>
        {teams.length > 0 && (
          <div className="team-switch">
            <label htmlFor="active-team">Team</label>
            <select
              id="active-team"
              className="select"
              value={activeTeam?._id || ""}
              onChange={(e) =>
                setActiveTeam(
                  teams.find((t) => t._id === e.target.value) || null,
                )
              }
            >
              <option value="" disabled>
                Choose a team
              </option>
              {teams.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        )}
        {showCheckIn && (
          <Link
            className="btn btn-primary sidebar-cta"
            href="/check-in"
            aria-current={path === "/check-in" ? "page" : undefined}
          >
            <PenLine size={16} aria-hidden="true" />
            Post a check-in
          </Link>
        )}
        <nav className="nav" aria-label="Workspace">
          {links.map(renderLink)}
          {adminLinks.length > 0 && (
            <>
              <p className="nav-heading" id="admin-nav">
                Admin
              </p>
              {adminLinks.map(renderLink)}
            </>
          )}
        </nav>
        {user && (
          <div className="sidebar-foot">
            <Link
              className="me"
              href="/account"
              aria-current={path === "/account" ? "page" : undefined}
            >
              <Avatar name={user.name} seed={user._id} />
              <span className="me-text">
                <strong>{user.name}</strong>
                <span>Account & security</span>
              </span>
            </Link>
            <button
              className="btn btn-ghost btn-sm"
              onClick={leave}
              disabled={leaving}
            >
              {leaving ? <Spinner /> : <LogOut size={16} aria-hidden="true" />}
              Sign out
            </button>
          </div>
        )}
      </aside>
      <main className="main" id="content" tabIndex={-1}>
        <div className={"page" + (wide ? " page-wide" : "")}>
          <div className="page-head">
            <div>
              <h1 className="page-title">{title}</h1>
              {description && user && <p className="page-lede">{description}</p>}
            </div>
            {actions && user && !loading && (
              <div className="page-actions">{actions}</div>
            )}
          </div>
          {failure && (
            <div className="mb-5">
              <Alert>{failure}</Alert>
            </div>
          )}
          {body}
        </div>
      </main>
    </div>
  );
}
