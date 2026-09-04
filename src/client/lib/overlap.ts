/**
 * Side-by-side layout for a calendar column.
 *
 * A staff column draws every appointment at full width, so two bookings on the
 * same person at the same time land exactly on top of each other and the one
 * underneath disappears. Overlaps are rarer now the API rejects them, but they
 * still happen on purpose (a colour processes while the next client is cut) and
 * every database written by an older build is full of accidental ones. A double
 * booking you cannot see is worse than one you can.
 *
 * Spans are laid out the way every day-view calendar does it: anything that
 * overlaps shares the column, split evenly.
 */

export type Span = { start: number; end: number };

/** Which slice of the column a span gets: lane `i` of `lanes`. */
export type Placed<T> = T & { lane: number; lanes: number };

/**
 * Assign each span a lane so overlapping spans sit next to each other.
 *
 * Spans that overlap, directly or through a chain of others, form a cluster and
 * share the column between them. A span alone in its cluster keeps the full
 * width, so a normal day looks exactly as it did before.
 */
export function packLanes<T extends Span>(spans: T[]): Placed<T>[] {
  const sorted = [...spans].sort((a, b) => a.start - b.start || a.end - b.end);
  const placed: Placed<T>[] = [];

  let cluster: Placed<T>[] = [];
  // The end of each open lane in the current cluster.
  let laneEnds: number[] = [];

  const closeCluster = () => {
    for (const p of cluster) p.lanes = laneEnds.length;
    placed.push(...cluster);
    cluster = [];
    laneEnds = [];
  };

  for (const span of sorted) {
    // A span starting after everything so far has ended begins a new cluster.
    if (cluster.length > 0 && span.start >= Math.max(...laneEnds)) closeCluster();

    let lane = laneEnds.findIndex((end) => end <= span.start);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = span.end;
    cluster.push({ ...span, lane, lanes: 1 });
  }
  closeCluster();

  return placed;
}
