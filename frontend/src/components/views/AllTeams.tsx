"use client";
import { useState, FormEvent } from "react";
import { Archive, Layers, Plus, ShieldAlert } from "lucide-react";
import AppShell from "../AppShell";
import TimeZoneSelect, { browserZone } from "../TimeZoneSelect";
import { Alert, Empty, Field, Spinner, SubmitButton } from "../ui";
import { useTeam } from "@/context/TeamContext";
import { api, formatClock, message } from "@/lib/api";

export default function AllTeams() {
  const { teams, refresh, user, activeTeam, setActiveTeam } = useTeam();
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [pending, setPending] = useState(""),
    [busy, setBusy] = useState(false);
  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget,
      f = new FormData(form);
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api("/api/teams", {
        method: "POST",
        body: JSON.stringify({
          name: f.get("name"),
          timezone: f.get("timezone"),
        }),
      });
      form.reset();
      setNotice(String(f.get("name")) + " is ready. Add people from Members.");
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
        "Archive " +
          name +
          "?\n\nNobody will be able to see or post in it. Its check-ins and summaries are kept for 30 days, then permanently deleted.",
      )
    )
      return;
    setPending(id);
    setError("");
    setNotice("");
    try {
      await api("/api/teams/" + id, { method: "DELETE", body: "{}" });
      if (activeTeam?._id === id) setActiveTeam(null);
      setNotice(name + " was archived.");
      await refresh();
    } catch (e) {
      setError(message(e));
    } finally {
      setPending("");
    }
  }
  return (
    <AppShell
      title="All teams"
      wide
      needsTeam={false}
      description="Create teams and archive the ones you no longer need."
    >
      {user?.role !== "superadmin" ? (
        <Empty icon={ShieldAlert} title="Only workspace admins can manage teams">
          Ask a workspace admin if you need a new team.
        </Empty>
      ) : (
        <div className="grid gap-8">
          <section className="panel" aria-labelledby="new-team">
            <h2 className="section-title mb-4" id="new-team">
              New team
            </h2>
            <form
              className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end"
              onSubmit={create}
            >
              <Field label="Name">
                {({ id }) => (
                  <input
                    id={id}
                    className="input"
                    name="name"
                    required
                    maxLength={100}
                    placeholder="e.g. Design"
                  />
                )}
              </Field>
              <Field label="Time zone">
                {({ id }) => <TimeZoneSelect id={id} defaultValue={browserZone()} />}
              </Field>
              <SubmitButton busy={busy} busyLabel="Creating…">
                <Plus size={16} aria-hidden="true" />
                Create team
              </SubmitButton>
            </form>
            <p className="field-hint mt-3">
              New teams start with a {formatClock("09:00")} check-in on
              weekdays. Change that anytime in Team settings.
            </p>
          </section>
          <div className="grid gap-4">
            {error && <Alert>{error}</Alert>}
            {notice && <Alert tone="success">{notice}</Alert>}
            {teams.length === 0 ? (
              <Empty icon={Layers} title="No teams yet">
                Create the first one above.
              </Empty>
            ) : (
              <ul className="rows" aria-label="Teams">
                {teams.map((t) => (
                  <li key={t._id}>
                    <div className="row-main">
                      <h2 className="font-semibold">{t.name}</h2>
                      <p className="meta">
                        {t.admins.length + t.members.length}{" "}
                        {t.admins.length + t.members.length === 1 ? "person" : "people"} ·
                        Check-in at {formatClock(t.standupTime)},{" "}
                        {t.timezone.replaceAll("_", " ")}
                      </p>
                    </div>
                    <div className="row-actions">
                      <button
                        className="btn btn-danger-quiet btn-sm"
                        disabled={!!pending}
                        onClick={() => archive(t._id, t.name)}
                      >
                        {pending === t._id ? (
                          <Spinner size={14} />
                        ) : (
                          <Archive size={14} aria-hidden="true" />
                        )}
                        Archive
                        <span className="sr-only"> {t.name}</span>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
