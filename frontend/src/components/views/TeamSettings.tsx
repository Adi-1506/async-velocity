"use client";
import { useState, FormEvent } from "react";
import { ShieldAlert } from "lucide-react";
import AppShell from "../AppShell";
import TimeZoneSelect from "../TimeZoneSelect";
import { Alert, Empty, Field, SubmitButton } from "../ui";
import { useTeam } from "@/context/TeamContext";
import { api, message } from "@/lib/api";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const fullDays = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export default function TeamSettings() {
  const { activeTeam, refresh, user } = useTeam();
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!activeTeam) return;
    const f = new FormData(e.currentTarget);
    setError("");
    setNotice("");
    const workdays = f.getAll("workdays").map(Number);
    if (workdays.length === 0) {
      setError("Choose at least one working day.");
      return;
    }
    setBusy(true);
    try {
      await api("/api/teams/" + activeTeam._id + "/settings", {
        method: "PATCH",
        body: JSON.stringify({
          standupTime: f.get("standupTime"),
          timezone: f.get("timezone"),
          digestFrequency: f.get("digestFrequency"),
          workdays,
        }),
      });
      await refresh();
      setNotice("Settings saved.");
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  const member = user?.role === "member";
  return (
    <AppShell
      title="Team settings"
      description={
        activeTeam && !member
          ? "Schedule and summaries for " + activeTeam.name + "."
          : undefined
      }
    >
      {member ? (
        <Empty icon={ShieldAlert} title="Only team admins can change settings">
          Ask a team admin if something about the schedule needs to change.
        </Empty>
      ) : (
        activeTeam && (
          <form
            key={activeTeam._id}
            onSubmit={save}
            className="sections"
          >
            <section className="settings-section" aria-labelledby="schedule">
              <header>
                <h2 className="section-title" id="schedule">
                  Check-in schedule
                </h2>
                <p className="section-desc">
                  Check-ins posted after this time are marked late. Reminders
                  and missed check-ins follow the same schedule.
                </p>
              </header>
              <div className="form">
                <Field label="Check-in time">
                  {({ id }) => (
                    <input
                      id={id}
                      className="input max-w-[10rem]"
                      type="time"
                      name="standupTime"
                      defaultValue={activeTeam.standupTime}
                      required
                    />
                  )}
                </Field>
                <Field label="Time zone" hint="Used for the check-in time and for deciding which day a check-in belongs to.">
                  {({ id, hintId }) => (
                    <TimeZoneSelect
                      id={id}
                      describedBy={hintId}
                      defaultValue={activeTeam.timezone}
                    />
                  )}
                </Field>
                <fieldset className="field">
                  <legend className="field-label mb-1.5">Working days</legend>
                  <div className="chips weekdays">
                    {days.map((d, i) => (
                      <label className="chip" key={d}>
                        <input
                          type="checkbox"
                          name="workdays"
                          value={i + 1}
                          aria-label={fullDays[i]}
                          defaultChecked={(
                            activeTeam.workdays || [1, 2, 3, 4, 5]
                          ).includes(i + 1)}
                        />
                        <span aria-hidden="true">{d}</span>
                      </label>
                    ))}
                  </div>
                  <p className="field-hint mt-1.5">
                    Only working days count toward the check-in rate.
                  </p>
                </fieldset>
              </div>
            </section>
            <section className="settings-section" aria-labelledby="summaries">
              <header>
                <h2 className="section-title" id="summaries">
                  Summaries
                </h2>
                <p className="section-desc">
                  A recap is created after each period ends. If the server was
                  down, missed recaps from the past week are created when it
                  restarts.
                </p>
              </header>
              <div className="form">
                <Field label="Summary frequency">
                  {({ id }) => (
                    <select
                      id={id}
                      className="select max-w-[14rem]"
                      name="digestFrequency"
                      defaultValue={activeTeam.digestFrequency}
                    >
                      <option value="daily">Every day</option>
                      <option value="weekly">Every week</option>
                    </select>
                  )}
                </Field>
              </div>
            </section>
            <div className="py-6 grid gap-4 max-w-[640px]">
              {error && <Alert>{error}</Alert>}
              {notice && <Alert tone="success">{notice}</Alert>}
              <div className="form-actions">
                <SubmitButton busy={busy} busyLabel="Saving…">
                  Save settings
                </SubmitButton>
              </div>
            </div>
          </form>
        )
      )}
    </AppShell>
  );
}
