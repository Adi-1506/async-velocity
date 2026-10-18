"use client";
import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import AppShell from "./AppShell";
import { useTeam } from "@/context/TeamContext";
import { api, API, message, localDay } from "@/lib/api";
import { Standup } from "@/types";
export default function Feed({ mine = false }: { mine?: boolean }) {
  const { activeTeam, user } = useTeam();
  const [rows, setRows] = useState<Standup[]>([]),
    [day, setDay] = useState(""),
    [query, setQuery] = useState(""),
    [page, setPage] = useState(1),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    let live = true;
    if (!activeTeam) return;
    const date = day || localDay(activeTeam.timezone);
    const params = new URLSearchParams({
      teamId: activeTeam._id,
      date,
      page: String(page),
      limit: "25",
    });
    if (query) params.set("q", query);
    const path = mine
      ? "/api/standups/mine?" + params
      : query
        ? "/api/standups/search?" + params
        : "/api/standups/team/" + activeTeam._id + "?" + params;
    const timer = setTimeout(() => {
      setBusy(true);
      api<Standup[]>(path)
        .then((data) => {
          if (live) {
            setRows(data);
            setError("");
          }
        })
        .catch((e) => {
          if (live) setError(message(e));
        })
        .finally(() => {
          if (live) setBusy(false);
        });
    }, 200);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [activeTeam, day, query, page, mine, revision]);
  useEffect(() => {
    if (!activeTeam) return;
    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || API, {
      withCredentials: true,
    });
    socket.on("connect", () => socket.emit("join_team", activeTeam._id));
    socket.on("new_standup", () => setRevision((r) => r + 1));
    return () => {
      socket.disconnect();
    };
  }, [activeTeam]);
  async function resolve(row: Standup) {
    try {
      await api("/api/standups/" + row._id + "/blocker", {
        method: "PATCH",
        body: JSON.stringify({
          status: row.blockerStatus === "resolved" ? "open" : "resolved",
        }),
      });
      setRevision((r) => r + 1);
    } catch (e) {
      setError(message(e));
    }
  }
  return (
    <AppShell title={mine ? "My check-in history" : "Team feed"}>
      {!mine && (
        <section className="toolbar">
          <label>
            Date
            <input
              type="date"
              value={day || (activeTeam ? localDay(activeTeam.timezone) : "")}
              onChange={(e) => {
                setDay(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <label>
            Search
            <input
              placeholder="Search team updates"
              value={query}
              maxLength={100}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />
          </label>
        </section>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {busy ? (
        <p className="card">Loading updates…</p>
      ) : rows.length === 0 ? (
        <p className="card">
          No updates yet. Your next check-in will appear here.
        </p>
      ) : (
        <div className="feed-grid">
          {rows.map((row) => (
            <article key={row._id} className="card">
              <div className="row">
                <h2>{row.user?.name || "Former member"}</h2>
                <span className="badge">{row.mood}</span>
              </div>
              <p className="muted">
                {new Date(row.date).toLocaleString()}{" "}
                {row.isLate ? "· After scheduled time" : ""}
              </p>
              <h3>Previously</h3>
              <p className="user-text">{row.yesterday}</p>
              <h3>Up next</h3>
              <p className="user-text">{row.today}</p>
              {row.blockers && row.blockers.trim().toLowerCase() !== "none" && (
                <div className="blocker">
                  <h3>Blocker · {row.blockerStatus || "open"}</h3>
                  <p className="user-text">{row.blockers}</p>
                  {(row.user?._id === user?._id ||
                    user?.role === "superadmin" ||
                    activeTeam?.admins.some(
                      (a) => (typeof a === "string" ? a : a._id) === user?._id,
                    )) && (
                    <button className="secondary" onClick={() => resolve(row)}>
                      {row.blockerStatus === "resolved"
                        ? "Reopen"
                        : "Mark resolved"}
                    </button>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
      <div className="pagination">
        <button
          className="secondary"
          disabled={page === 1 || busy}
          onClick={() => setPage((p) => p - 1)}
        >
          Previous
        </button>
        <span>Page {page}</span>
        <button
          className="secondary"
          disabled={rows.length < 25 || busy}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
      </div>
    </AppShell>
  );
}
