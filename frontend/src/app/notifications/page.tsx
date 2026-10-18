"use client";
import { useState, useEffect } from "react";
import { io } from "socket.io-client";
import AppShell from "@/components/AppShell";
import { api, API, message } from "@/lib/api";
import { Notification } from "@/types";
export default function Page() {
  const [rows, setRows] = useState<Notification[]>([]),
    [page, setPage] = useState(1),
    [revision, setRevision] = useState(0),
    [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    api<Notification[]>("/api/notifications?page=" + page)
      .then((d) => {
        if (live) setRows(d);
      })
      .catch((e) => {
        if (live) setError(message(e));
      });
    return () => {
      live = false;
    };
  }, [page, revision]);
  useEffect(() => {
    const s = io(process.env.NEXT_PUBLIC_SOCKET_URL || API, {
      withCredentials: true,
    });
    s.on("new_notification", () => setRevision((x) => x + 1));
    return () => {
      s.disconnect();
    };
  }, []);
  return (
    <AppShell title="Notifications">
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {rows.length === 0 && <p className="card">You are all caught up.</p>}
      {rows.map((n) => (
        <article key={n._id} className="card row">
          <div>
            <p>{n.message}</p>
            <small className="muted">
              {new Date(n.createdAt).toLocaleString()}
            </small>
          </div>
          {!n.isRead && (
            <button
              className="secondary"
              onClick={async () => {
                try {
                  await api("/api/notifications/" + n._id + "/read", {
                    method: "PATCH",
                    body: "{}",
                  });
                  setRevision((x) => x + 1);
                } catch (e) {
                  setError(message(e));
                }
              }}
            >
              Mark read
            </button>
          )}
        </article>
      ))}
      <div className="pagination">
        <button disabled={page === 1} onClick={() => setPage((x) => x - 1)}>
          Previous
        </button>
        <span>Page {page}</span>
        <button
          disabled={rows.length < 25}
          onClick={() => setPage((x) => x + 1)}
        >
          Next
        </button>
      </div>
    </AppShell>
  );
}
