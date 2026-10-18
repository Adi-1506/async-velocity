"use client";
import { useState, useEffect } from "react";
import AppShell from "@/components/AppShell";
import { useTeam } from "@/context/TeamContext";
import { api, message } from "@/lib/api";
import { Digest } from "@/types";
export default function Page() {
  const { activeTeam } = useTeam();
  const [rows, setRows] = useState<Digest[]>([]),
    [page, setPage] = useState(1),
    [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    if (activeTeam)
      api<Digest[]>("/api/digests/team/" + activeTeam._id + "?page=" + page)
        .then((d) => {
          if (live) setRows(d);
        })
        .catch((e) => {
          if (live) setError(message(e));
        });
    return () => {
      live = false;
    };
  }, [activeTeam, page]);
  return (
    <AppShell title="Team digests">
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {!rows.length && (
        <p className="card">
          Digests appear after the first completed daily or weekly period.
        </p>
      )}
      {rows.map((d) => (
        <section className="card" key={d._id}>
          <h2>
            {new Date(d.period.from).toLocaleDateString()} –{" "}
            {new Date(d.period.to).toLocaleDateString()}
          </h2>
          <p>{d.summary}</p>
          <p>
            {Math.round(d.participationRate)}% participation · {d.blockerCount}{" "}
            blockers
          </p>
        </section>
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
