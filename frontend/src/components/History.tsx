"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { History as HistoryIcon, PenLine } from "lucide-react";
import AppShell from "./AppShell";
import CheckInEntry from "./CheckInEntry";
import { Alert, Empty, FeedSkeleton, Pager } from "./ui";
import { useTeam } from "@/context/TeamContext";
import { api, formatDay, localDay, message } from "@/lib/api";
import { Standup } from "@/types";

const PAGE = 25;

/** Your own check-ins across every team you belong to, newest first. */
export default function History() {
  const { teams, user } = useTeam();
  const [rows, setRows] = useState<Standup[]>([]),
    [page, setPage] = useState(1),
    [error, setError] = useState(""),
    [loadedPage, setLoadedPage] = useState(0),
    [revision, setRevision] = useState(0);
  const loading = loadedPage !== page;

  useEffect(() => {
    let live = true;
    api<Standup[]>("/api/standups/mine?page=" + page + "&limit=" + PAGE)
      .then((d) => {
        if (!live) return;
        setRows(d);
        setError("");
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

  const teamOf = (r: Standup) => {
    const id = typeof r.team === "string" ? r.team : r.team?._id;
    return teams.find((t) => t._id === id) || null;
  };
  // Group by the calendar day in each check-in's team time zone.
  const groups: { day: string; items: Standup[] }[] = [];
  for (const r of rows) {
    const t = teamOf(r);
    const day = localDay(t?.timezone || "UTC", new Date(r.date));
    const last = groups.at(-1);
    if (last?.day === day) last.items.push(r);
    else groups.push({ day, items: [r] });
  }
  const multiTeam = teams.length > 1;

  return (
    <AppShell
      title="My check-ins"
      description={
        multiTeam
          ? "Everything you've posted, across all your teams."
          : "Everything you've posted, newest first."
      }
    >
      {error && (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      )}
      {loading && rows.length === 0 ? (
        <FeedSkeleton />
      ) : rows.length === 0 ? (
        <Empty
          icon={HistoryIcon}
          title="You haven't posted a check-in yet"
          action={
            <Link className="btn btn-primary" href="/check-in">
              <PenLine size={16} aria-hidden="true" />
              Post a check-in
            </Link>
          }
        >
          Your check-ins collect here, so you can look back on what you worked
          on.
        </Empty>
      ) : (
        <div aria-busy={loading}>
          {groups.map((g) => (
            <section
              className="date-group"
              key={g.day + g.items[0]._id}
              aria-label={formatDay(g.day, true)}
            >
              <h2>{formatDay(g.day, true)}</h2>
              <ul className="feed">
                {g.items.map((r) => (
                  <CheckInEntry
                    key={r._id}
                    row={r}
                    team={teamOf(r)}
                    user={user}
                    heading={
                      multiTeam ? teamOf(r)?.name || "Archived team" : "You"
                    }
                    onChange={() => setRevision((x) => x + 1)}
                    onError={setError}
                  />
                ))}
              </ul>
            </section>
          ))}
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
