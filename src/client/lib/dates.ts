/**
 * Local calendar-date helpers.
 *
 * Dates in this app are bare `YYYY-MM-DD` strings meaning "a day at the salon" —
 * no time, no zone. `Date#toISOString()` formats the *UTC* instant, so building
 * one of these strings from it shifts the day for anyone whose local date
 * differs from the UTC date, which is most of the world for part of every day.
 * Everything here stays on the local calendar instead.
 */

const pad = (n: number) => String(n).padStart(2, "0");

/** `YYYY-MM-DD` for a Date, read off its local calendar fields. */
export function formatDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** The day the user is currently living in, as `YYYY-MM-DD`. */
export function today(now: Date = new Date()): string {
  return formatDate(now);
}

/**
 * Parse `YYYY-MM-DD` into a local Date.
 *
 * Anchored at noon rather than midnight. A few zones move the clock at 00:00
 * (Santiago, Havana), so on those nights local midnight is a time that does not
 * exist and the Date silently lands on 01:00. Day arithmetic still works from
 * there, but it leaves an hour of margin against a boundary instead of twelve;
 * noon costs nothing and keeps every case far away from one.
 */
export function parseDate(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
}

/** Move a `YYYY-MM-DD` by whole days, staying on the local calendar. */
export function shiftDate(date: string, days: number): string {
  const d = parseDate(date);
  d.setDate(d.getDate() + days);
  return formatDate(d);
}
