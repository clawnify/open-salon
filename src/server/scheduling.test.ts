import { test } from "node:test";
import assert from "node:assert/strict";
import { toMinutes, overlaps, findConflicts, describeConflicts, type Busy } from "./scheduling.ts";

const appt = (start_time: string, end_time: string, label = "Jamie Rivera"): Busy =>
  ({ kind: "appointment", start_time, end_time, label });
const block = (start_time: string, end_time: string, label = "Lunch"): Busy =>
  ({ kind: "blocked", start_time, end_time, label });

test("toMinutes reads wall clock, and rejects nonsense", () => {
  assert.equal(toMinutes("00:00"), 0);
  assert.equal(toMinutes("09:30"), 570);
  assert.equal(toMinutes("23:59"), 1439);
  assert.equal(toMinutes("9:05"), 545);
  assert.equal(toMinutes("24:00"), null);
  assert.equal(toMinutes("10:75"), null);
  assert.equal(toMinutes("half ten"), null);
  assert.equal(toMinutes(""), null);
});

test("intervals are half-open, so back-to-back is not a clash", () => {
  // The next client sits down the minute the last one gets up.
  assert.equal(overlaps({ start: 600, end: 660 }, { start: 660, end: 720 }), false);
  assert.equal(overlaps({ start: 660, end: 720 }, { start: 600, end: 660 }), false);
  // One minute of genuine overlap is a clash.
  assert.equal(overlaps({ start: 600, end: 661 }, { start: 660, end: 720 }), true);
});

test("overlap is found however the two bookings sit", () => {
  const candidate = ["10:00", "11:00"] as const;
  const clash = (b: Busy) => findConflicts(candidate[0], candidate[1], [b]).length === 1;

  assert.ok(clash(appt("10:00", "11:00")), "identical");
  assert.ok(clash(appt("10:30", "11:30")), "starts inside");
  assert.ok(clash(appt("09:30", "10:30")), "ends inside");
  assert.ok(clash(appt("09:00", "12:00")), "swallows it");
  assert.ok(clash(appt("10:15", "10:45")), "sits inside");
  assert.ok(!clash(appt("11:00", "12:00")), "straight after");
  assert.ok(!clash(appt("09:00", "10:00")), "straight before");
  assert.ok(!clash(appt("14:00", "15:00")), "hours away");
});

test("blocked time is as binding as a booking", () => {
  const found = findConflicts("13:30", "14:30", [block("13:00", "14:00")]);
  assert.equal(found.length, 1);
  assert.equal(found[0].kind, "blocked");
});

test("every clash is reported, not just the first", () => {
  const found = findConflicts("10:00", "13:00", [
    appt("09:00", "09:30"),   // before
    appt("10:00", "11:00"),
    block("11:30", "12:00"),
    appt("14:00", "15:00"),   // after
  ]);
  assert.deepEqual(found.map((f) => f.start_time), ["10:00", "11:30"]);
});

test("a candidate that does not run forwards conflicts with nothing", () => {
  // Rejecting it is the route's job; answering from a nonsense interval is not.
  assert.deepEqual(findConflicts("14:00", "13:00", [appt("09:00", "20:00")]), []);
  assert.deepEqual(findConflicts("14:00", "14:00", [appt("09:00", "20:00")]), []);
  assert.deepEqual(findConflicts("nope", "11:00", [appt("09:00", "20:00")]), []);
});

test("a stored row that does not run forwards is skipped, not thrown on", () => {
  // Older builds could write these: patching start_time left end_time behind.
  assert.deepEqual(findConflicts("10:00", "11:00", [appt("10:00", "10:00")]), []);
});

test("the message tells the caller what is in the way and how to proceed", () => {
  const msg = describeConflicts("Alex", [appt("10:00", "11:00", "Jamie Rivera")]);
  assert.match(msg, /Alex is already booked at 10:00-11:00 \(Jamie Rivera\)/);
  assert.match(msg, /allow_conflict/);
});

test("time blocked off reads as unavailable rather than booked", () => {
  assert.match(describeConflicts("Alex", [block("13:00", "14:00", "Lunch")]), /unavailable at 13:00-14:00 \(Lunch\)/);
  // Mixed causes fall back to the stronger word.
  assert.match(describeConflicts("Alex", [block("13:00", "14:00"), appt("14:00", "15:00")]), /already booked/);
});

test("the message survives a staff member with no name on file", () => {
  assert.match(describeConflicts("", [appt("10:00", "11:00")]), /^That staff member is already booked/);
});
