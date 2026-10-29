"use client";
import { useState, useEffect } from "react";
import { FileText } from "lucide-react";
import AppShell from "../AppShell";
import { Alert, Empty, Pager } from "../ui";
import { useTeam } from "@/context/TeamContext";
import { api, formatDate, message } from "@/lib/api";
import { Digest } from "@/types";

const PAGE = 25;

function range(from: string, to: string, timeZone?: string) {
  // Periods end at the start of the next day, so step back a moment for display.
  const end = new Date(new Date(to).getTime() - 1).toISOString();
  const a = formatDate(from, { timeZone }),
    b = formatDate(end, { timeZone });
  return a === b ? a : a + " – " + b;
}

export default function Summaries() {
  const { activeTeam } = useTeam();
  const [rows, setRows] = useState<Digest[]>([]),
    [page, setPage] = useState(1),
    [loadedKey, setLoadedKey] = useState(""),
    [error, setError] = useState("");
  const key = activeTeam?._id + "|" + page;
  const loading = loadedKey !== key;
  useEffect(() => {
    let live = true;
    if (activeTeam)
      api<Digest[]>("/api/digests/team/" + activeTeam._id + "?page=" + page)
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
          if (live) setLoadedKey(activeTeam._id + "|" + page);
        });
    return () => {
      live = false;
    };
  }, [activeTeam, page]);

  const cadence = activeTeam?.digestFrequency === "weekly" ? "week" : "day";
  return (
    <AppShell
      title="Summaries"
      description={
        activeTeam &&
        "A recap of " + activeTeam.name + " after each " + cadence + " ends."
      }
    >
      {error && (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      )}
      {loading && rows.length === 0 ? (
        <div className="stack" aria-busy="true" aria-label="Loading">
          {[0, 1, 2].map((i) => (
            <div className="stack" key={i}>
              <span className="skeleton sk-line sk-w-30 h-5" />
              <span className="skeleton sk-line sk-w-60" />
            </div>
          ))}
        </div>
      ) : rows.length === 0 ? (
        !error && (
          <Empty icon={FileText} title="No summaries yet">
            The first one appears after this {cadence} ends. Team admins get a
            notification when it&apos;s ready.
          </Empty>
        )
      ) : (
        <ol className="summary-list" aria-busy={loading}>
          {rows.map((d) => {
            const count = Array.isArray(d.standups) ? d.standups.length : null;
            return (
              <li className="summary" key={d._id}>
                <div className="summary-head">
                  <h2>{range(d.period.from, d.period.to, activeTeam?.timezone)}</h2>
                  <span className="meta">
                    Ready {formatDate(d.createdAt, { hour: "numeric", minute: "2-digit" })}
                  </span>
                </div>
                <div className="summary-facts">
                  {count !== null && (
                    <span className="pill">
                      {count} {count === 1 ? "check-in" : "check-ins"}
                    </span>
                  )}
                  <span className="pill pill-teal">
                    {Math.round(d.participationRate)}% participation
                  </span>
                  <span className={"pill " + (d.blockerCount ? "pill-rust" : "pill-ok")}>
                    {d.blockerCount === 0
                      ? "No blockers"
                      : d.blockerCount === 1
                        ? "1 blocker"
                        : d.blockerCount + " blockers"}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
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
