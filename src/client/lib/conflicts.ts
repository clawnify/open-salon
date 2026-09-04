import { ApiError } from "../api";

/** One thing already in the way of a booking, as the API reports it. */
export type Conflict = {
  kind: "appointment" | "blocked";
  start_time: string;
  end_time: string;
  /** The client holding the slot, or the reason the time is blocked. */
  label: string;
};

/**
 * The clashes behind a rejected booking, or `null` if it failed for some other
 * reason. Lets a caller answer a clash in place and leave everything else to the
 * usual error path.
 */
export function conflictsFrom(err: unknown): Conflict[] | null {
  if (!(err instanceof ApiError) || err.status !== 409) return null;
  return (err.body as { conflicts?: Conflict[] }).conflicts ?? [];
}

/** `"10:00 - 11:00 booked for Jamie Rivera"`, or the reason for a blocked slot. */
export function describeConflict(c: Conflict): string {
  return `${c.start_time} - ${c.end_time} ${c.kind === "blocked" ? c.label : `booked for ${c.label}`}`;
}

/** One sentence, for the places with no room to list the clashes. */
export function conflictSentence(who: string, conflicts: Conflict[]): string {
  return `${who || "That staff member"} is not free then: ${conflicts.map(describeConflict).join(", ")}.`;
}
