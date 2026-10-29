"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { io } from "socket.io-client";
import { Bell, BellRing, Clock, FileText, ShieldCheck, type LucideIcon } from "lucide-react";
import AppShell, { NOTIFICATIONS_CHANGED } from "../AppShell";
import { Alert, Empty, Pager, RowsSkeleton, Spinner } from "../ui";
import { api, API, message, relativeTime } from "@/lib/api";
import { Notification } from "@/types";

const PAGE = 25;
const kinds: Record<Notification["type"], [LucideIcon, string | null]> = {
  reminder: [BellRing, "/check-in"],
  missed_standup: [Clock, "/check-in"],
  digest_ready: [FileText, "/digests"],
  promoted_to_admin: [ShieldCheck, null],
};

export default function Notifications() {
  const [rows, setRows] = useState<Notification[]>([]),
    [page, setPage] = useState(1),
    [revision, setRevision] = useState(0),
    [loadedPage, setLoadedPage] = useState(0),
    [marking, setMarking] = useState(""),
    [error, setError] = useState("");
  const loading = loadedPage !== page;
  useEffect(() => {
    let live = true;
    api<Notification[]>("/api/notifications?page=" + page)
      .then((d) => {
        if (live) {
          setRows(d);
          setError("");
        }
      })
      .catch((e) => {
        if (live) setError(message(e));
      })
      .finally(() => {
        if (live) setLoadedPage(page);
      });
    return () => {
      live = false;
    };
  }, [page, revision]);
  useEffect(() => {
    const s = io(process.env.NEXT_PUBLIC_SOCKET_URL || API, {
      withCredentials: true,
    });
    s.on("new_notification", () => {
      setRevision((x) => x + 1);
      window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));
    });
    return () => {
      s.disconnect();
    };
  }, []);
  async function markRead(n: Notification) {
    setMarking(n._id);
    try {
      await api("/api/notifications/" + n._id + "/read", {
        method: "PATCH",
        body: "{}",
      });
      setRevision((x) => x + 1);
      window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));
    } catch (e) {
      setError(message(e));
    } finally {
      setMarking("");
    }
  }
  const unread = rows.filter((n) => !n.isRead).length;

  return (
    <AppShell
      title="Notifications"
      needsTeam={false}
      description={
        loading
          ? undefined
          : unread
            ? unread === 1
              ? "1 unread on this page."
              : unread + " unread on this page."
            : "You're all caught up."
      }
    >
      {error && (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      )}
      {loading && rows.length === 0 ? (
        <RowsSkeleton />
      ) : rows.length === 0 ? (
        !error && (
          <Empty icon={Bell} title="Nothing here yet">
            Reminders, missed check-ins, and new summaries will show up here.
          </Empty>
        )
      ) : (
        <ul className="rows notifications" aria-busy={loading}>
          {rows.map((n) => {
            const [Icon, href] = kinds[n.type] || [Bell, null];
            return (
              <li key={n._id} className={n.isRead ? "" : "is-unread"}>
                <span className={n.isRead ? "read-dot" : "unread-dot"}>
                  {!n.isRead && <span className="sr-only">Unread</span>}
                </span>
                <span className="notif-icon" aria-hidden="true">
                  <Icon size={16} />
                </span>
                <div className="row-main">
                  <p className="user-text">
                    {href ? (
                      <Link className="text-[inherit] no-underline hover:underline" href={href}>
                        {n.message}
                      </Link>
                    ) : (
                      n.message
                    )}
                  </p>
                  <time className="meta" dateTime={n.createdAt}>
                    {relativeTime(n.createdAt)}
                  </time>
                </div>
                {!n.isRead && (
                  <div className="row-actions">
                    <button
                      className="btn btn-ghost btn-sm"
                      disabled={marking === n._id}
                      onClick={() => markRead(n)}
                    >
                      {marking === n._id && <Spinner size={14} />}
                      Mark as read
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <Pager
        page={page}
        hasNext={rows.length >= PAGE}
        busy={loading}
        onChange={setPage}
      />
    </AppShell>
  );
}
