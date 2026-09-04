/**
 * Booking conflict detection.
 *
 * Pure interval maths, no database, so the rules can be unit-tested directly.
 *
 * Intervals are half-open `[start, end)`. That is the whole reason a 10:00-11:00
 * cut and an 11:00-12:00 colour are back-to-back rather than a clash: in a salon
 * the next client sits down the minute the last one gets up.
 *
 * Times are `HH:MM` wall clock in the business's own day. Minutes are counted
 * from midnight.
 */

export type Interval = { start: number; end: number };

/** Something already occupying a staff member's day. */
export type Busy = {
  kind: "appointment" | "blocked";
  start_time: string;
  end_time: string;
  /** Who or what holds the slot: the client's name, or the reason for the block. */
  label: string;
};

/** `"09:30"` -> `570`. Returns `null` for anything unparseable. */
export function toMinutes(time: string): number | null {
  const m = /^(\d{1,2}):(\d{2})/.exec(time ?? "");
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** Do two half-open intervals share any minute? */
export function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

/**
 * Everything in `busy` that collides with `[start_time, end_time)`.
 *
 * A candidate that does not parse, or that does not run forwards, is treated as
 * having no conflicts: it is the caller's job to reject it, and answering
 * "clashes with nothing" is safer than answering from a nonsense interval.
 */
export function findConflicts(start_time: string, end_time: string, busy: Busy[]): Busy[] {
  const start = toMinutes(start_time);
  const end = toMinutes(end_time);
  if (start === null || end === null || end <= start) return [];
  return busy.filter((b) => {
    const bs = toMinutes(b.start_time);
    const be = toMinutes(b.end_time);
    if (bs === null || be === null || be <= bs) return false;
    return overlaps({ start, end }, { start: bs, end: be });
  });
}

/**
 * The 409 message.
 *
 * Written to be acted on rather than just read: an agent booking on behalf of
 * the owner gets the times that are taken and the two ways out, so it can offer
 * another slot instead of failing the request back to a human.
 */
export function describeConflicts(staffName: string, conflicts: Busy[]): string {
  const who = staffName || "That staff member";
  const list = conflicts
    .map((c) => `${c.start_time}-${c.end_time} (${c.label})`)
    .join(", ");
  const what = conflicts.every((c) => c.kind === "blocked") ? "unavailable" : "already booked";
  return `${who} is ${what} at ${list}. Choose another time or staff member, or send allow_conflict: true to book over it anyway.`;
}
