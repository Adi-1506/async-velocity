"use client";
import { useState, useEffect } from "react";
import { Download } from "lucide-react";
import AppShell from "./AppShell";
import { Alert } from "./ui";
import { useTeam } from "@/context/TeamContext";
import { api, formatDay, message } from "@/lib/api";
type Data = {
  checkInRate: number;
  blockersReported: number;
  blockersResolved: number;
  consistencyChart: { date: string; count: number }[];
  participationBasis: string;
};
const periods = [
  ["7", "7 days"],
  ["14", "14 days"],
  ["30", "30 days"],
] as const;

export default function Insights() {
  const { activeTeam } = useTeam();
  const [days, setDays] = useState("7"),
    [data, setData] = useState<Data | null>(null),
    [loadedKey, setLoadedKey] = useState(""),
    [error, setError] = useState("");
  const key = activeTeam?._id + "|" + days;
  const loading = loadedKey !== key;
  useEffect(() => {
    let live = true;
    if (activeTeam)
      api<Data>("/api/insights/team/" + activeTeam._id + "?days=" + days)
        .then((d) => {
          if (live) {
            setData(d);
            setError("");
          }
        })
        .catch((e) => {
          if (live) setError(message(e));
        })
        .finally(() => {
          if (live) setLoadedKey(activeTeam._id + "|" + days);
        });
    return () => {
      live = false;
    };
  }, [activeTeam, days]);
  function download() {
    if (!data) return;
    const blob = new Blob(
      [JSON.stringify({ team: activeTeam?.name, days, ...data }, null, 2)],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = "daybrief-insights-" + days + "-days.json";
    a.click();
    URL.revokeObjectURL(url);
  }
  const peak = Math.max(1, ...(data?.consistencyChart.map((d) => d.count) || []));
  const open = data ? Math.max(0, data.blockersReported - data.blockersResolved) : 0;

  return (
    <AppShell
      title="Insights"
      description={activeTeam && "How " + activeTeam.name + " has been checking in."}
      actions={
        <button
          className="btn btn-secondary"
          disabled={!data || loading}
          onClick={download}
        >
          <Download size={16} aria-hidden="true" />
          Download JSON
        </button>
      }
    >
      <div className="toolbar">
        <fieldset className="segmented">
          <legend className="sr-only">Period</legend>
          {periods.map(([value, label]) => (
            <label key={value}>
              <input
                type="radio"
                name="period"
                value={value}
                checked={days === value}
                onChange={() => setDays(value)}
              />
              <span>Last {label}</span>
            </label>
          ))}
        </fieldset>
      </div>
      {error && (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      )}
      {!data ? (
        !error && (
          <div className="stats" aria-busy="true" aria-label="Loading">
            {[0, 1, 2].map((i) => (
              <div className="stat stack" key={i}>
                <span className="skeleton sk-line sk-w-60" />
                <span className="skeleton sk-line sk-w-30 h-8" />
              </div>
            ))}
          </div>
        )
      ) : (
        <div aria-busy={loading}>
          <dl className="stats">
            <div className="stat">
              <dt>Check-in rate</dt>
              <dd>{data.checkInRate}%</dd>
              <p className="meta">of expected check-ins on working days</p>
            </div>
            <div className="stat">
              <dt>Blockers raised</dt>
              <dd>{data.blockersReported}</dd>
              <p className="meta">
                {data.blockersReported === 0
                  ? "Nobody reported being blocked"
                  : open === 0
                    ? "All of them resolved"
                    : open + " still open"}
              </p>
            </div>
            <div className="stat">
              <dt>Blockers resolved</dt>
              <dd>{data.blockersResolved}</dd>
              <p className="meta">of the blockers raised in this period</p>
            </div>
          </dl>
          <section aria-labelledby="per-day">
            <h2 id="per-day" className="section-title mb-3">
              Check-ins per day
            </h2>
            {data.consistencyChart.length === 0 ? (
              <p className="meta">No working days in this period yet.</p>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th scope="col">Day</th>
                      <th scope="col" className="num">
                        Check-ins
                      </th>
                      <th scope="col" className="w-1/2">
                        <span className="sr-only">Relative volume</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...data.consistencyChart].reverse().map((d) => (
                      <tr key={d.date}>
                        <td>{formatDay(d.date.slice(0, 10))}</td>
                        <td className="num">{d.count}</td>
                        <td>
                          <progress
                            className="bar"
                            max={peak}
                            value={d.count}
                            aria-hidden="true"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="meta mt-3">
              The check-in rate counts current team members on the team&apos;s
              working days. Earlier membership changes aren&apos;t reflected.
            </p>
          </section>
        </div>
      )}
    </AppShell>
  );
}
