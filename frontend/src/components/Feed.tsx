"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import {
  ArrowRight,
  CircleAlert,
  CircleCheck,
  ChevronLeft,
  ChevronRight,
  Inbox,
  PenLine,
  Search,
  SearchX,
} from "lucide-react";
import AppShell from "./AppShell";
import CheckInEntry, { hasBlocker } from "./CheckInEntry";
import { Alert, Empty, FeedSkeleton, Pager } from "./ui";
import { useTeam } from "@/context/TeamContext";
import {
  api,
  API,
  message,
  localDay,
  shiftDay,
  formatDay,
  formatTime,
} from "@/lib/api";
import { Standup } from "@/types";

const PAGE = 25;

export default function Feed() {
  const { activeTeam, user } = useTeam();
  const [rows, setRows] = useState<Standup[]>([]),
    [day, setDay] = useState(""),
    [query, setQuery] = useState(""),
    [page, setPage] = useState(1),
    [error, setError] = useState(""),
    [loadedKey, setLoadedKey] = useState(""),
    [revision, setRevision] = useState(0),
    [mine, setMine] = useState<Standup | null | undefined>(undefined);

  const today = activeTeam ? localDay(activeTeam.timezone) : "";
  const date = day || today;
  const searching = query.trim().length > 0;
  const key = [activeTeam?._id, date, query, page].join("|");
  const loading = loadedKey !== key;

  useEffect(() => {
    let live = true;
    if (!activeTeam) return;
    const params = new URLSearchParams({
      teamId: activeTeam._id,
      date,
      page: String(page),
      limit: String(PAGE),
    });
    if (query.trim()) params.set("q", query.trim());
    const path = query.trim()
      ? "/api/standups/search?" + params
      : "/api/standups/team/" + activeTeam._id + "?" + params;
    const timer = setTimeout(() => {
      api<Standup[]>(path)
        .then((data) => {
          if (!live) return;
          setRows(data);
          setError("");
        })
        .catch((e) => {
          if (live) setError(message(e));
        })
        .finally(() => {
          if (live) setLoadedKey(key);
        });
    }, 200);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [activeTeam, date, query, page, revision, key]);

  // Has the signed-in person already checked in today?
  useEffect(() => {
    let live = true;
    if (!activeTeam || !user) return;
    const params = new URLSearchParams({
      date: localDay(activeTeam.timezone),
      user: user._id,
      limit: "1",
    });
    api<Standup[]>("/api/standups/team/" + activeTeam._id + "?" + params)
      .then((d) => {
        if (live) setMine(d[0] || null);
      })
      .catch(() => {
        if (live) setMine(undefined);
      });
    return () => {
      live = false;
    };
  }, [activeTeam, user, revision]);

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

  const isToday = date === today;
  const openBlockers = rows.filter(
    (r) => hasBlocker(r) && r.blockerStatus !== "resolved",
  );
  const go = (d: string) => {
    setDay(d === today ? "" : d);
    setPage(1);
  };

  const actions =
    mine === undefined ? null : mine ? (
      <span className="pill pill-ok">
        <CircleCheck size={13} aria-hidden="true" />
        You checked in at {formatTime(mine.date, activeTeam?.timezone)}
      </span>
    ) : (
      <Link className="btn btn-primary max-[899px]:hidden" href="/check-in">
        <PenLine size={16} aria-hidden="true" />
        Post a check-in
      </Link>
    );

  return (
    <AppShell
      title="Team feed"
      description={
        activeTeam &&
        (searching
          ? "Searching every check-in in " + activeTeam.name
          : (isToday ? "Today, " : "") + formatDay(date) + " · " + activeTeam.name)
      }
      actions={actions}
    >
      <div className="toolbar">
        {!searching && (
          <div className="day-nav" role="group" aria-label="Choose a day">
            <button
              className="btn btn-secondary btn-icon"
              aria-label="Previous day"
              onClick={() => go(shiftDay(date, -1))}
            >
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            <label className="sr-only" htmlFor="feed-date">
              Date
            </label>
            <input
              id="feed-date"
              className="input"
              type="date"
              value={date}
              max={today}
              onChange={(e) => e.target.value && go(e.target.value)}
            />
            <button
              className="btn btn-secondary btn-icon"
              aria-label="Next day"
              disabled={isToday}
              onClick={() => go(shiftDay(date, 1))}
            >
              <ChevronRight size={18} aria-hidden="true" />
            </button>
            {!isToday && (
              <button className="btn btn-ghost btn-sm" onClick={() => go(today)}>
                Back to today
              </button>
            )}
          </div>
        )}
        <div className="grow input-with-icon">
          <Search size={16} aria-hidden="true" />
          <label className="sr-only" htmlFor="feed-search">
            Search check-ins
          </label>
          <input
            id="feed-search"
            className="input"
            type="search"
            placeholder="Search all check-ins"
            value={query}
            maxLength={100}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {error && (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      )}

      {loading &&
      (rows.length === 0 || !loadedKey.startsWith(activeTeam?._id + "|")) ? (
        <FeedSkeleton />
      ) : rows.length === 0 ? (
        searching ? (
          <Empty icon={SearchX} title={"Nothing matches “" + query.trim() + "”"}>
            Try a different word, or clear the search to go back to the daily
            feed.
          </Empty>
        ) : isToday ? (
          <Empty icon={Inbox} title="No check-ins yet today">
            Updates show up here as soon as people post them.
          </Empty>
        ) : (
          <Empty icon={Inbox} title={"No check-ins on " + formatDay(date)}>
            Nobody posted that day. Use the arrows to look at another day.
          </Empty>
        )
      ) : (
        <div aria-busy={loading}>
          <p className="feed-summary" aria-live="polite">
            <span>
              <strong>{rows.length}</strong>{" "}
              {searching
                ? rows.length === 1
                  ? "match"
                  : "matches"
                : rows.length === 1
                  ? "check-in"
                  : "check-ins"}
              {rows.length === PAGE && " on this page"}
            </span>
            {openBlockers.length > 0 && (
              <span className="rust">
                <strong className="rust">{openBlockers.length}</strong> open{" "}
                {openBlockers.length === 1 ? "blocker" : "blockers"}
              </span>
            )}
          </p>

          {openBlockers.length > 0 && !searching && (
            <section className="help-list" aria-labelledby="needs-help">
              <h2 id="needs-help">
                <CircleAlert size={16} aria-hidden="true" />
                Needs help
              </h2>
              <ul>
                {openBlockers.map((r) => (
                  <li key={r._id}>
                    <a href={"#checkin-" + r._id}>
                      <span className="who">
                        {r.user?.name || "Former member"}
                      </span>
                      <span className="what">{r.blockers}</span>
                      <ArrowRight size={15} aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <ul className="feed" aria-label="Check-ins">
            {rows.map((row) => (
              <CheckInEntry
                key={row._id}
                row={row}
                team={activeTeam}
                user={user}
                showDate={searching}
                onChange={() => setRevision((r) => r + 1)}
                onError={setError}
              />
            ))}
          </ul>
        </div>
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
