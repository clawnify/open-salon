import { test } from "node:test";
import assert from "node:assert/strict";
import { packLanes } from "./overlap.ts";

/** `packLanes` output as `"start-end:lane/lanes"`, sorted, for readable asserts. */
const shape = (spans: { start: number; end: number }[]) =>
  packLanes(spans).map((p) => `${p.start}-${p.end}:${p.lane}/${p.lanes}`);

test("a day with no overlaps keeps every appointment full width", () => {
  assert.deepEqual(shape([{ start: 600, end: 660 }, { start: 720, end: 780 }]),
    ["600-660:0/1", "720-780:0/1"]);
});

test("back-to-back appointments do not split the column", () => {
  assert.deepEqual(shape([{ start: 600, end: 660 }, { start: 660, end: 720 }]),
    ["600-660:0/1", "660-720:0/1"]);
});

test("two overlapping appointments each take half the column", () => {
  assert.deepEqual(shape([{ start: 600, end: 660 }, { start: 630, end: 690 }]),
    ["600-660:0/2", "630-690:1/2"]);
});

test("a third overlapping appointment takes a third each", () => {
  assert.deepEqual(shape([
    { start: 600, end: 690 },
    { start: 610, end: 700 },
    { start: 620, end: 710 },
  ]), ["600-690:0/3", "610-700:1/3", "620-710:2/3"]);
});

test("a lane is reused once its appointment has ended", () => {
  // A long booking overlaps two short ones that follow each other, so the
  // column splits in two rather than three.
  assert.deepEqual(shape([
    { start: 600, end: 780 },
    { start: 610, end: 660 },
    { start: 660, end: 720 },
  ]), ["600-780:0/2", "610-660:1/2", "660-720:1/2"]);
});

test("overlaps chained through a middle booking share one cluster", () => {
  // First and last do not touch each other but both touch the middle, so all
  // three are laid out together. Two lanes is enough: the first and last never
  // share a minute, so they can stack in the same one and nothing is hidden.
  assert.deepEqual(shape([
    { start: 600, end: 640 },
    { start: 630, end: 700 },
    { start: 660, end: 720 },
  ]), ["600-640:0/2", "630-700:1/2", "660-720:0/2"]);
});

test("a busy morning does not widen a quiet afternoon", () => {
  assert.deepEqual(shape([
    { start: 600, end: 660 },
    { start: 630, end: 690 },
    { start: 840, end: 900 },
  ]), ["600-660:0/2", "630-690:1/2", "840-900:0/1"]);
});

test("input order does not change the layout", () => {
  const spans = [{ start: 630, end: 690 }, { start: 600, end: 660 }];
  assert.deepEqual(shape(spans), ["600-660:0/2", "630-690:1/2"]);
});

test("the caller's own fields survive, and its array is left alone", () => {
  const spans = [{ start: 630, end: 690, id: "b" }, { start: 600, end: 660, id: "a" }];
  assert.deepEqual(packLanes(spans).map((p) => p.id), ["a", "b"]);
  assert.deepEqual(spans.map((s) => s.id), ["b", "a"]);
});

test("an empty column is not a crash", () => {
  assert.deepEqual(packLanes([]), []);
});
