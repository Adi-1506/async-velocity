"use client";
import { useState, FormEvent } from "react";
import { z } from "zod";
import AppShell from "@/components/AppShell";
import { useTeam } from "@/context/TeamContext";
import { api, message } from "@/lib/api";
export default function Page() {
  const { activeTeam } = useTeam();
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!activeTeam) return;
    const form = e.currentTarget;
    const f = new FormData(form);
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const schema = z.object({
        teamId: z.string(),
        yesterday: z.string().trim().min(1).max(4000),
        today: z.string().trim().min(1).max(4000),
        blockers: z.string().max(4000),
        mood: z.enum(["great", "good", "meh", "blocked"]),
      });
      const body = schema.parse({
        teamId: activeTeam._id,
        ...Object.fromEntries(f),
      });
      await api("/api/standups", {
        method: "POST",
        body: JSON.stringify(body),
      });
      setNotice("Your check-in has been shared with the team.");
      form.reset();
    } catch (e) {
      setError(
        e instanceof z.ZodError
          ? "Complete the required fields (maximum 4,000 characters each)."
          : message(e),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <AppShell title="Daily check-in">
      <section className="card narrow">
        <p className="muted">
          One update per team each day, using your team's time zone.
        </p>
        <form onSubmit={submit}>
          <label>
            What did you work on?
            <textarea name="yesterday" required maxLength={4000} rows={4} />
          </label>
          <label>
            What will you work on next?
            <textarea name="today" required maxLength={4000} rows={4} />
          </label>
          <label>
            Anything blocking you?
            <textarea
              name="blockers"
              maxLength={4000}
              rows={3}
              placeholder="Leave blank if nothing is blocking you"
            />
          </label>
          <label>
            How are you feeling?
            <select name="mood" defaultValue="good">
              <option value="great">Great</option>
              <option value="good">Good</option>
              <option value="meh">Okay</option>
              <option value="blocked">Blocked</option>
            </select>
          </label>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="notice">
              {notice}
            </p>
          )}
          <button disabled={busy || !activeTeam}>
            {busy ? "Sharing…" : "Share check-in"}
          </button>
        </form>
      </section>
    </AppShell>
  );
}
