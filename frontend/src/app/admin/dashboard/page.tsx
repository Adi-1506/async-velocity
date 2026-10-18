"use client";
import { useState, FormEvent } from "react";
import AppShell from "@/components/AppShell";
import { useTeam } from "@/context/TeamContext";
import { api, message } from "@/lib/api";
export default function Page() {
  const { activeTeam, refresh, user } = useTeam();
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!activeTeam) return;
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api("/api/teams/" + activeTeam._id + "/settings", {
        method: "PATCH",
        body: JSON.stringify({
          standupTime: f.get("standupTime"),
          timezone: f.get("timezone"),
          digestFrequency: f.get("digestFrequency"),
          workdays: f.getAll("workdays").map(Number),
        }),
      });
      await refresh();
      setNotice("Team settings saved.");
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <AppShell title="Team settings">
      {user?.role === "member" ? (
        <p className="card">
          Sign in through the administrator portal to manage team settings.
        </p>
      ) : (
        activeTeam && (
          <section className="card narrow">
            <h2>{activeTeam.name}</h2>
            <form key={activeTeam._id} onSubmit={save}>
              <label>
                Daily check-in time
                <input
                  type="time"
                  name="standupTime"
                  defaultValue={activeTeam.standupTime}
                  required
                />
              </label>
              <label>
                Time zone
                <input
                  name="timezone"
                  defaultValue={activeTeam.timezone}
                  placeholder="Asia/Kolkata"
                  required
                  maxLength={100}
                />
              </label>
              <label>
                Digest frequency
                <select
                  name="digestFrequency"
                  defaultValue={activeTeam.digestFrequency}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </label>
              <fieldset>
                <legend>Working days</legend>
                <div className="weekday-list">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
                    (d, i) => (
                      <label key={d}>
                        <input
                          type="checkbox"
                          name="workdays"
                          value={i + 1}
                          defaultChecked={(
                            activeTeam.workdays || [1, 2, 3, 4, 5]
                          ).includes(i + 1)}
                        />
                        {d}
                      </label>
                    ),
                  )}
                </div>
              </fieldset>
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              {notice && <p className="notice">{notice}</p>}
              <button disabled={busy}>Save settings</button>
            </form>
            <p className="muted">
              Digests are generated after each period ends. Missed jobs catch up
              when the server restarts.
            </p>
          </section>
        )
      )}
    </AppShell>
  );
}
