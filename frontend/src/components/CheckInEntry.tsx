"use client";
import { useState } from "react";
import { CircleAlert, CircleCheck, Clock } from "lucide-react";
import { api, formatClock, formatTime, message } from "@/lib/api";
import { Standup, Team, User } from "@/types";
import { Avatar, Spinner } from "./ui";

export const moodLabel: Record<Standup["mood"], string> = {
  great: "Feeling great",
  good: "Feeling good",
  meh: "Feeling okay",
  blocked: "Feeling stuck",
};

export function hasBlocker(s: Standup) {
  return !!s.blockers && s.blockers.trim().toLowerCase() !== "none";
}

export function canResolve(s: Standup, user: User | null, team: Team | null) {
  return (
    s.user?._id === user?._id ||
    user?.role === "superadmin" ||
    !!team?.admins.some(
      (a) => (typeof a === "string" ? a : a._id) === user?._id,
    )
  );
}

/** One check-in in a feed: who, when, what they finished, what's next, and any blocker. */
export default function CheckInEntry({
  row,
  team,
  user,
  showDate,
  heading,
  onChange,
  onError,
}: {
  row: Standup;
  team: Team | null;
  user: User | null;
  showDate?: boolean;
  /** Replaces the author's name, e.g. with the team name in your own history. */
  heading?: string;
  onChange?: () => void;
  onError?: (message: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const blocked = hasBlocker(row),
    resolved = row.blockerStatus === "resolved";
  const tz = team?.timezone;
  const when = showDate
    ? new Intl.DateTimeFormat(undefined, {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
        ...(tz ? { timeZone: tz } : {}),
      }).format(new Date(row.date))
    : formatTime(row.date, tz);
  const name = row.user?.name || "Former member";

  async function toggle() {
    setBusy(true);
    try {
      await api("/api/standups/" + row._id + "/blocker", {
        method: "PATCH",
        body: JSON.stringify({ status: resolved ? "open" : "resolved" }),
      });
      onChange?.();
    } catch (e) {
      onError?.(message(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="entry" id={"checkin-" + row._id}>
      <Avatar name={name} seed={row.user?._id} large />
      <div className="min-w-0">
        <div className="entry-head">
          <h2 className="entry-name">
            {heading ||
              (row.user?._id && row.user._id === user?._id
                ? name + " (you)"
                : name)}
          </h2>
          <span className="meta">
            <time dateTime={row.date}>{when}</time>
          </span>
          <span className="entry-tags">
            {row.isLate && (
              <span
                className="pill pill-warn"
                title={
                  team
                    ? "Posted after the " + formatClock(team.standupTime) + " check-in time"
                    : "Posted after the team's check-in time"
                }
              >
                <Clock size={12} aria-hidden="true" />
                Late
              </span>
            )}
            {row.mood !== "good" && (
              <span className="pill">{moodLabel[row.mood]}</span>
            )}
          </span>
        </div>
        <div className="entry-body">
          <div className="entry-part">
            <h3>Finished</h3>
            <p className="user-text">{row.yesterday}</p>
          </div>
          <div className="entry-part">
            <h3>Next</h3>
            <p className="user-text">{row.today}</p>
          </div>
          {blocked && (
            <div className={"blocker" + (resolved ? " resolved" : "")}>
              <h3>
                {resolved ? (
                  <CircleCheck size={14} aria-hidden="true" />
                ) : (
                  <CircleAlert size={14} aria-hidden="true" />
                )}
                {resolved ? "Blocker resolved" : "Blocked"}
              </h3>
              <p className="user-text">{row.blockers}</p>
              {canResolve(row, user, team) && (
                <div className="blocker-foot">
                  <span className="meta">
                    {resolved
                      ? "Reopen it if the problem comes back."
                      : "Resolved? Let the team know."}
                  </span>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={toggle}
                    disabled={busy}
                  >
                    {busy ? (
                      <Spinner size={14} />
                    ) : resolved ? null : (
                      <CircleCheck size={14} aria-hidden="true" />
                    )}
                    {resolved ? "Reopen blocker" : "Mark resolved"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
