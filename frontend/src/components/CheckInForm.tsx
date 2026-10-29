"use client";
import Link from "next/link";
import { FormEvent, KeyboardEvent, useEffect, useState } from "react";
import { z } from "zod";
import { ArrowRight, CircleCheck, Clock } from "lucide-react";
import AppShell from "./AppShell";
import CheckInEntry from "./CheckInEntry";
import { Alert, Field, FeedSkeleton, SubmitButton } from "./ui";
import { useTeam } from "@/context/TeamContext";
import {
  api,
  formatClock,
  formatDay,
  formatTime,
  localDay,
  message,
} from "@/lib/api";
import { Standup } from "@/types";

const MAX = 4000;
const moods: [Standup["mood"], string][] = [
  ["great", "Great"],
  ["good", "Good"],
  ["meh", "Okay"],
  ["blocked", "Stuck"],
];
type Draft = { yesterday: string; today: string; blockers: string; mood: Standup["mood"] };
const blank: Draft = { yesterday: "", today: "", blockers: "", mood: "good" };
const draftKey = (teamId: string) => "daybrief:draft:" + teamId;

function readDraft(teamId: string): Draft {
  try {
    const raw = sessionStorage.getItem(draftKey(teamId));
    return raw ? { ...blank, ...JSON.parse(raw) } : blank;
  } catch {
    return blank;
  }
}

function Counter({ value }: { value: string }) {
  if (value.length < MAX - 500) return null;
  return (
    <span className="counter near" aria-live="polite">
      {MAX - value.length} characters left
    </span>
  );
}

/** Minutes past midnight right now in the team's time zone. */
function nowMinutes(timeZone: string) {
  const p = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const v = (t: string) => Number(p.find((x) => x.type === t)?.value);
  return v("hour") * 60 + v("minute");
}

export default function CheckInForm() {
  const { activeTeam, user } = useTeam();
  const [draft, setDraft] = useState<Draft>(blank),
    [posted, setPosted] = useState<Standup | null | undefined>(undefined),
    [justPosted, setJustPosted] = useState(false),
    [error, setError] = useState(""),
    [invalid, setInvalid] = useState<string[]>([]),
    [busy, setBusy] = useState(false),
    [revision, setRevision] = useState(0);

  // Restore an unsent draft for this team (kept only for this browser tab).
  useEffect(() => {
    if (activeTeam) setDraft(readDraft(activeTeam._id));
    setJustPosted(false);
    setError("");
  }, [activeTeam]);
  useEffect(() => {
    if (!activeTeam) return;
    try {
      if (draft === blank) return;
      sessionStorage.setItem(draftKey(activeTeam._id), JSON.stringify(draft));
    } catch {}
  }, [draft, activeTeam]);

  useEffect(() => {
    let live = true;
    if (!activeTeam || !user) return;
    setPosted(undefined);
    const params = new URLSearchParams({
      date: localDay(activeTeam.timezone),
      user: user._id,
      limit: "1",
    });
    api<Standup[]>("/api/standups/team/" + activeTeam._id + "?" + params)
      .then((d) => {
        if (live) setPosted(d[0] || null);
      })
      .catch((e) => {
        if (live) {
          setPosted(null);
          setError(message(e));
        }
      });
    return () => {
      live = false;
    };
  }, [activeTeam, user, revision]);

  const set = (k: keyof Draft) => (v: string) => {
    setDraft((d) => ({ ...d, [k]: v }));
    if (invalid.includes(k)) setInvalid((x) => x.filter((f) => f !== k));
  };

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!activeTeam) return;
    setError("");
    const schema = z.object({
      teamId: z.string(),
      yesterday: z.string().trim().min(1, "Add what you finished.").max(MAX),
      today: z.string().trim().min(1, "Add what you're working on next.").max(MAX),
      blockers: z.string().trim().max(MAX),
      mood: z.enum(["great", "good", "meh", "blocked"]),
    });
    const parsed = schema.safeParse({ teamId: activeTeam._id, ...draft });
    if (!parsed.success) {
      const fields = parsed.error.issues.map((i) => String(i.path[0]));
      setInvalid(fields);
      setError(parsed.error.issues.map((i) => i.message).join(" "));
      e.currentTarget
        .querySelector<HTMLElement>('[name="' + fields[0] + '"]')
        ?.focus();
      return;
    }
    setInvalid([]);
    setBusy(true);
    try {
      const created = await api<Standup>("/api/standups", {
        method: "POST",
        body: JSON.stringify(parsed.data),
      });
      try {
        sessionStorage.removeItem(draftKey(activeTeam._id));
      } catch {}
      setDraft(blank);
      setJustPosted(true);
      setPosted({ ...created, user: created.user || user! });
    } catch (e) {
      setError(message(e));
      if (e instanceof Error && e.message === "You already checked in today")
        setRevision((r) => r + 1);
    } finally {
      setBusy(false);
    }
  }

  function shortcut(e: KeyboardEvent<HTMLFormElement>) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      e.currentTarget.requestSubmit();
    }
  }

  const tz = activeTeam?.timezone || "UTC";
  const late =
    !!activeTeam &&
    nowMinutes(tz) >
      Number(activeTeam.standupTime.slice(0, 2)) * 60 +
        Number(activeTeam.standupTime.slice(3, 5));

  return (
    <AppShell
      title={posted ? "Today's check-in" : "Post a check-in"}
      description={
        activeTeam &&
        activeTeam.name + " · Today, " + formatDay(localDay(tz))
      }
    >
      {posted === undefined ? (
        <FeedSkeleton rows={1} />
      ) : posted ? (
        <div className="posted">
          {justPosted ? (
            <Alert tone="success">
              Check-in posted. Your team can see it in the feed now.
            </Alert>
          ) : (
            <div className="posted-head">
              <CircleCheck size={20} aria-hidden="true" />
              <div>
                <p className="section-title">
                  You checked in at {formatTime(posted.date, tz)}
                </p>
                <p className="section-desc">
                  You can post one check-in per team each day, and posted
                  check-ins can&apos;t be edited. Your next one opens tomorrow.
                </p>
              </div>
            </div>
          )}
          <ul className="feed">
            <CheckInEntry
              row={posted}
              team={activeTeam}
              user={user}
              onChange={() => setRevision((r) => r + 1)}
              onError={setError}
            />
          </ul>
          {error && <Alert>{error}</Alert>}
          <div>
            <Link className="btn btn-secondary" href="/dashboard">
              See the team feed
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
      ) : (
        <form
          className="panel composer"
          onSubmit={submit}
          onKeyDown={shortcut}
          noValidate
        >
          <Field
            label="What did you finish?"
            aside={<Counter value={draft.yesterday} />}
          >
            {({ id }) => (
              <textarea
                id={id}
                className="textarea"
                name="yesterday"
                aria-invalid={invalid.includes("yesterday") || undefined}
                required
                maxLength={MAX}
                rows={4}
                placeholder="Shipped the export fix, reviewed two pull requests…"
                value={draft.yesterday}
                onChange={(e) => set("yesterday")(e.target.value)}
              />
            )}
          </Field>
          <Field label="What's next?" aside={<Counter value={draft.today} />}>
            {({ id }) => (
              <textarea
                id={id}
                className="textarea"
                name="today"
                aria-invalid={invalid.includes("today") || undefined}
                required
                maxLength={MAX}
                rows={4}
                placeholder="Finish the onboarding copy, then pair on the billing bug…"
                value={draft.today}
                onChange={(e) => set("today")(e.target.value)}
              />
            )}
          </Field>
          <Field
            label="Anything blocking you?"
            optional
            hint="Leave this empty if you're unblocked. Blockers are highlighted in the feed until someone marks them resolved."
            aside={<Counter value={draft.blockers} />}
          >
            {({ id, hintId }) => (
              <textarea
                id={id}
                aria-describedby={hintId}
                className="textarea"
                name="blockers"
                maxLength={MAX}
                rows={3}
                placeholder="Waiting on design sign-off for the new settings page…"
                value={draft.blockers}
                onChange={(e) => set("blockers")(e.target.value)}
              />
            )}
          </Field>
          <fieldset className="field">
            <legend className="field-label mb-1.5">How&apos;s it going?</legend>
            <div className="chips">
              {moods.map(([value, label]) => (
                <label className="chip" key={value}>
                  <input
                    type="radio"
                    name="mood"
                    value={value}
                    checked={draft.mood === value}
                    onChange={() => set("mood")(value)}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </fieldset>
          {error && <Alert>{error}</Alert>}
          <div className="composer-foot">
            <p className="meta flex items-center gap-1.5">
              <Clock size={14} aria-hidden="true" />
              {activeTeam &&
                (late
                  ? "Due at " +
                    formatClock(activeTeam.standupTime) +
                    " team time. Posting now marks it late."
                  : "Due by " + formatClock(activeTeam.standupTime) + " team time.")}
            </p>
            <div className="form-actions">
              <span className="meta hidden sm:inline">
                <kbd className="kbd">Ctrl</kbd> + <kbd className="kbd">Enter</kbd>
              </span>
              <SubmitButton
                busy={busy}
                busyLabel="Posting…"
                disabled={!activeTeam}
              >
                Post check-in
              </SubmitButton>
            </div>
          </div>
        </form>
      )}
    </AppShell>
  );
}
