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
export const message = (e: unknown) =>
  e instanceof Error ? e.message : "Something went wrong";
export function localDay(timezone: string) {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (t: string) => p.find((x) => x.type === t)?.value;
  return part("year") + "-" + part("month") + "-" + part("day");
}
