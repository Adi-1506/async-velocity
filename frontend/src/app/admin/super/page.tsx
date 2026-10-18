"use client";
import { useState, FormEvent } from "react";
import AppShell from "@/components/AppShell";
import { useTeam } from "@/context/TeamContext";
import { api, message } from "@/lib/api";
export default function Page() {
  const { teams, refresh, user } = useTeam();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget,
      f = new FormData(form);
    setBusy(true);
    setError("");
    try {
      await api("/api/teams", {
        method: "POST",
        body: JSON.stringify({
          name: f.get("name"),
          timezone: f.get("timezone"),
        }),
      });
      form.reset();
      await refresh();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function archive(id: string, name: string) {
    if (
      !window.confirm(
        'Archive "' +
          name +
          '"? Team data is retained for 30 days, then purged.',
      )
    )
      return;
    try {
      await api("/api/teams/" + id, { method: "DELETE", body: "{}" });
      await refresh();
    } catch (e) {
      setError(message(e));
    }
  }
  return (
    <AppShell title="Manage teams">
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {user?.role === "superadmin" ? (
        <>
          <section className="card narrow">
            <h2>Create a team</h2>
            <form onSubmit={create}>
              <label>
                Name
                <input name="name" required maxLength={100} />
              </label>
              <label>
                Time zone
                <input name="timezone" defaultValue="Asia/Kolkata" required />
              </label>
              <button disabled={busy}>Create team</button>
            </form>
          </section>
          <div className="feed-grid">
            {teams.map((t) => (
              <section className="card" key={t._id}>
                <h2>{t.name}</h2>
                <p>
                  {t.timezone} · {t.standupTime}
                </p>
                <button
                  className="danger"
                  onClick={() => archive(t._id, t.name)}
                >
                  Archive team
                </button>
              </section>
            ))}
          </div>
        </>
      ) : (
        <p className="card">Super administrator access is required.</p>
      )}
    </AppShell>
  );
}
