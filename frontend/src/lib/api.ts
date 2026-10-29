export const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(API + path, {
    ...options,
    credentials: "include",
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  const data = await res.json().catch(() => ({ message: "Request failed" }));
  if (!res.ok)
    throw new Error(
      data.fields?.map((f: { message: string }) => f.message).join("; ") ||
        data.message ||
        "Request failed",
    );
  return data as T;
}
export function signOut() {
  localStorage.removeItem("activeTeamId");
  sessionStorage.clear();
  window.location.assign("/login");
}
// Server messages are kept stable for API clients; these are the
// friendlier versions people see in the interface.
const friendly: Record<string, string> = {
  "Request failed": "Something went wrong. Try again in a moment.",
  "Failed to fetch":
    "Daybrief can't be reached right now. Check your connection and try again.",
  "Invalid credentials":
    "That email, password, or authenticator code isn't right.",
  "Verify your email before signing in":
    "Verify your email address before signing in. Check your inbox for the link.",
  "You already checked in today":
    "You've already posted today's check-in for this team.",
  "Access denied": "You don't have permission to do that.",
  "Email delivery is not configured":
    "Email isn't set up for this workspace yet, so we can't send that message. Ask an administrator for help.",
  "Invalid or expired link":
    "This link is invalid or has expired. Request a new one.",
  "Invalid code": "That code isn't right. Check your authenticator app and try again.",
  "Recovery failed":
    "We couldn't recover your account with those details. Check your email, password, and recovery code.",
  "MFA is already enabled": "Two-step verification is already on.",
  "Enable MFA first": "Turn on two-step verification first.",
  "Notification not found": "That notification no longer exists.",
  "No registered user with that email. Ask them to register first.":
    "There's no Daybrief account with that email. Ask them to sign up first, then try again.",
  "User is already an administrator": "That person is already a team admin here.",
  "Archive the teams you own before deleting your account":
    "Archive the teams you created before deleting your account.",
  "The last super administrator cannot delete their account":
    "You're the only workspace admin, so this account can't be deleted.",
};
const friendlyNotices: Record<string, string> = {
  "If registration can proceed, your account is ready. If verification is enabled, check your email.":
    "Thanks for signing up. If you're new here, your account is ready and you can sign in. If we need to confirm your email, a link is on its way.",
  "If the account exists, a reset link will be sent":
    "If there's an account with that email, a reset link is on its way. It works for 30 minutes.",
  "If verification is needed, a link will be sent":
    "If your email still needs confirming, a new link is on its way.",
  "Password reset. Sign in again.": "Your password has been changed.",
  "Email verified": "Your email address is confirmed.",
};
/** Friendlier wording for success messages returned by the API. */
export const notice = (raw: string) => friendlyNotices[raw] || raw;
export const message = (e: unknown) => {
  const raw = e instanceof Error ? e.message : "";
  if (!raw) return "Something went wrong. Try again in a moment.";
  if (/NetworkError|Load failed/i.test(raw)) return friendly["Failed to fetch"];
  return friendly[raw] || raw;
};
export function localDay(timezone: string, date = new Date()) {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (t: string) => p.find((x) => x.type === t)?.value;
  return part("year") + "-" + part("month") + "-" + part("day");
}
/** Shift a YYYY-MM-DD key by whole days without time-zone drift. */
export function shiftDay(day: string, by: number) {
  const d = new Date(day + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + by);
  return d.toISOString().slice(0, 10);
}
/** "Thursday, 29 October" for a YYYY-MM-DD key. */
export function formatDay(day: string, withYear = false) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    ...(withYear ? { year: "numeric" } : {}),
    timeZone: "UTC",
  }).format(new Date(day + "T12:00:00Z"));
}
const valid = (iso?: string) => !!iso && !Number.isNaN(new Date(iso).getTime());
export function formatTime(iso: string, timeZone?: string) {
  if (!valid(iso)) return "";
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    ...(timeZone ? { timeZone } : {}),
  }).format(new Date(iso));
}
export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = {}) {
  if (!valid(iso)) return "";
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...opts,
  }).format(new Date(iso));
}
export function formatDateTime(iso: string) {
  if (!valid(iso)) return "";
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}
/** "Just now", "5 min ago", "3 hr ago", otherwise a short date. */
export function relativeTime(iso: string) {
  if (!valid(iso)) return "";
  const diff = (Date.now() - new Date(iso).getTime()) / 60000;
  if (diff < 1) return "Just now";
  if (diff < 60) return Math.floor(diff) + " min ago";
  if (diff < 60 * 24) return Math.floor(diff / 60) + " hr ago";
  return formatDateTime(iso);
}
/** "10:00" (24h team setting) → locale time like "10:00 AM". */
export function formatClock(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(Date.UTC(2000, 0, 1, h, m));
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(d);
}
