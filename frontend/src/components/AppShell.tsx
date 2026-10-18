"use client";
import Link from "next/link";
import { ReactNode, useState } from "react";
import { usePathname } from "next/navigation";
import { useTeam } from "@/context/TeamContext";
import { api, signOut, message } from "@/lib/api";
export default function AppShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const { user, teams, activeTeam, setActiveTeam, loading, error } = useTeam();
  const path = usePathname();
  const [failure, setFailure] = useState("");
  const links = [
    ["/dashboard", "Team feed"],
    ["/check-in", "Daily check-in"],
    ["/history", "My history"],
    ["/insights", "Insights"],
    ["/digests", "Digests"],
    ["/notifications", "Notifications"],
    ["/account", "Account"],
  ];
  if (user?.role === "admin" || user?.role === "superadmin")
    links.push(
      ["/admin/users", "Members"],
      ["/admin/dashboard", "Team settings"],
    );
  if (user?.role === "superadmin") links.push(["/admin/super", "Manage teams"]);
  return (
    <div className="app-frame">
      <aside className="sidebar">
        <Link className="brand" href="/dashboard">
          Standup<span>Bot</span>
        </Link>
        <p className="muted">Less meetings. More progress.</p>
        <nav>
          {links.map(([href, label]) => (
            <Link
              aria-current={path === href ? "page" : undefined}
              className={path === href ? "active" : ""}
              key={href}
              href={href}
            >
              {label}
            </Link>
          ))}
        </nav>
        <button
          className="secondary"
          onClick={async () => {
            try {
              await api("/api/auth/logout", { method: "POST", body: "{}" });
              signOut();
            } catch (e) {
              setFailure(message(e));
            }
          }}
        >
          Sign out
        </button>
      </aside>
      <main className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">ASYNC TEAM WORKSPACE</p>
            <h1>{title}</h1>
          </div>
          <div>
            <label htmlFor="active-team">Team</label>
            <select
              id="active-team"
              value={activeTeam?._id || ""}
              onChange={(e) =>
                setActiveTeam(
                  teams.find((t) => t._id === e.target.value) || null,
                )
              }
            >
              <option value="" disabled>
                Select team
              </option>
              {teams.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </header>
        {failure && (
          <p role="alert" className="error">
            {failure}
          </p>
        )}
        {loading ? (
          <p className="card">Loading your workspace…</p>
        ) : !user ? (
          <section className="card">
            <p>{error || "Please sign in."}</p>
            <Link href="/login">Sign in</Link>
          </section>
        ) : (
          <>
            {!activeTeam && (
              <p className="notice">
                You do not belong to a team yet. Ask an administrator to add
                your registered email
                {user.role === "superadmin" ? " or create a team below" : ""}.
              </p>
            )}
            {children}
          </>
        )}
      </main>
    </div>
  );
}
