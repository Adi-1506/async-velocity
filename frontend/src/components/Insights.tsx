"use client";
import { useState, useEffect } from "react";
import AppShell from "./AppShell";
import { useTeam } from "@/context/TeamContext";
import { api, message } from "@/lib/api";
type Data = {
  checkInRate: number;
  blockersReported: number;
  blockersResolved: number;
  consistencyChart: { date: string; count: number }[];
  participationBasis: string;
};
export default function Insights() {
  const { activeTeam } = useTeam();
  const [days, setDays] = useState("7"),
    [data, setData] = useState<Data | null>(null),
    [error, setError] = useState("");
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
    a.download = "standup-insights.json";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <AppShell title="Team insights">
      <div className="toolbar">
        <label>
          Period
          <select value={days} onChange={(e) => setDays(e.target.value)}>
            <option value="7">Last 7 days</option>
            <option value="14">Last 14 days</option>
            <option value="30">Last 30 days</option>
          </select>
        </label>
        <button className="secondary" disabled={!data} onClick={download}>
          Download report
        </button>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {data && (
        <>
          <div className="stats">
            <div className="card">
              <p>Check-in rate</p>
              <strong>{data.checkInRate}%</strong>
            </div>
            <div className="card">
              <p>Blockers reported</p>
              <strong>{data.blockersReported}</strong>
            </div>
            <div className="card">
              <p>Blockers resolved</p>
              <strong>{data.blockersResolved}</strong>
            </div>
          </div>
          <section className="card">
            <h2>Daily participation</h2>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Check-ins</th>
                </tr>
              </thead>
              <tbody>
                {data.consistencyChart.map((d) => (
                  <tr key={d.date}>
                    <td>{d.date}</td>
                    <td>{d.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="muted">{data.participationBasis}</p>
          </section>
        </>
      )}
    </AppShell>
  );
}
