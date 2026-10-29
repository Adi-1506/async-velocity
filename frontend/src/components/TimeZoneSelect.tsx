"use client";
import { useMemo } from "react";

/** A time-zone picker using the browser's IANA list, keeping any saved value selectable. */
export default function TimeZoneSelect({
  id,
  defaultValue,
  describedBy,
}: {
  id: string;
  defaultValue: string;
  describedBy?: string;
}) {
  const zones = useMemo(() => {
    let list: string[] = [];
    try {
      list = Intl.supportedValuesOf("timeZone");
    } catch {}
    if (!list.includes("UTC")) list = ["UTC", ...list];
    if (defaultValue && !list.includes(defaultValue)) list = [defaultValue, ...list];
    return list;
  }, [defaultValue]);
  return (
    <select
      id={id}
      className="select"
      name="timezone"
      defaultValue={defaultValue}
      aria-describedby={describedBy}
      required
    >
      {zones.map((z) => (
        <option key={z} value={z}>
          {z.replaceAll("_", " ")}
        </option>
      ))}
    </select>
  );
}

export function browserZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}
