import assert from "node:assert/strict";
import { test } from "node:test";
import { formatDate, parseDate, shiftDate, today } from "./dates.ts";

/** Run `fn` as if the browser were in `zone`. Node re-reads TZ per call. */
function inZone(zone: string, fn: () => void) {
  const previous = process.env.TZ;
  process.env.TZ = zone;
  try {
    fn();
  } finally {
    process.env.TZ = previous;
  }
}

const AHEAD_OF_UTC = ["Europe/Rome", "Australia/Sydney", "Asia/Kolkata"];
const BEHIND_UTC = ["America/New_York", "America/Los_Angeles"];

test("shiftDate moves a day in every zone", () => {
  for (const zone of [...AHEAD_OF_UTC, ...BEHIND_UTC, "UTC"]) {
    inZone(zone, () => {
      // The regression in issue #5: this returned "2026-08-29" east of UTC,
      // so the calendar's next-day button silently did nothing.
      assert.equal(shiftDate("2026-08-29", 1), "2026-08-30", zone);
      assert.equal(shiftDate("2026-08-29", -1), "2026-08-28", zone);
    });
  }
});

test("shiftDate crosses month, year and leap-day boundaries", () => {
  assert.equal(shiftDate("2026-08-31", 1), "2026-09-01");
  assert.equal(shiftDate("2026-01-01", -1), "2025-12-31");
  assert.equal(shiftDate("2028-02-28", 1), "2028-02-29");
});

test("today() is the user's local day, not the UTC day", () => {
  // 21:30 in New York is already tomorrow in UTC. A salon is still open.
  inZone("America/New_York", () => {
    assert.equal(today(new Date("2026-09-04T01:30:00Z")), "2026-09-03");
  });
  // 01:30 in Rome is still yesterday in UTC.
  inZone("Europe/Rome", () => {
    assert.equal(today(new Date("2026-09-03T23:30:00Z")), "2026-09-04");
  });
});

test("shiftDate survives zones that change the clock at midnight", () => {
  // Santiago springs forward at 00:00, so local midnight does not exist that
  // night; a midnight-anchored implementation slips a day here.
  inZone("America/Santiago", () => {
    assert.equal(shiftDate("2026-09-05", 1), "2026-09-06");
    assert.equal(shiftDate("2026-09-06", -1), "2026-09-05");
  });
});

test("parseDate round-trips through formatDate", () => {
  for (const zone of [...AHEAD_OF_UTC, ...BEHIND_UTC]) {
    inZone(zone, () => {
      assert.equal(formatDate(parseDate("2026-08-29")), "2026-08-29", zone);
    });
  }
});
