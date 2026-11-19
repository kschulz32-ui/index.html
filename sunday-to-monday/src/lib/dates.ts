/** Today's date (YYYY-MM-DD) in an IANA timezone. */
export function todayInTz(tz: string, now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** Adds whole days to a YYYY-MM-DD date. */
export function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Most recent Sunday on or before today, in the church's timezone. */
export function lastSundayInTz(tz: string, now: Date = new Date()): string {
  const today = todayInTz(tz, now);
  const dow = new Date(today + "T00:00:00Z").getUTCDay();
  return addDays(today, -dow);
}

export function formatDate(isoDate: string): string {
  return new Date(isoDate + "T12:00:00Z").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
