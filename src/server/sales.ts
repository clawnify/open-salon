// Recording and reporting the till.
//
// The write order in `recordSale` is not stylistic — it is the only safe order
// available here. There is no transaction: the app's database surface
// (`query` / `get` / `run` from @clawnify/db) is one statement per call, with
// no multi-statement batching on either supported storage backend. Foreign
// keys are enforced, so a child row cannot be written before its parent.
//
// So the sale is written parent-first as `status='open'`, then its lines, and
// the flip to `'closed'` is the commit point. Reports only ever count closed
// sales, which means a write that dies half way through leaves something
// invisible rather than something wrong.

import { query, get, run } from "./db.js";
import { priceSale, stockDraw, type SaleInput, type PaymentMethod } from "./checkout.js";

export interface RecordSaleInput extends SaleInput {
  /** Caller-supplied UUID. Doubles as the idempotency key. */
  id: string;
  appointment_id?: number | null;
  client_id?: number | null;
  staff_id?: number | null;
  note?: string;
}

export interface SaleRow {
  id: string;
  status: string;
  appointment_id: number | null;
  client_id: number | null;
  staff_id: number | null;
  subtotal: number;
  discount: number;
  tip: number;
  total: number;
  payment_method: PaymentMethod;
  note: string;
  created_at: string;
  closed_at: string | null;
  client_name?: string | null;
  staff_name?: string | null;
  appointment_identifier?: string | null;
  items?: unknown[];
}

/** The receipt: one sale, its lines, and the names behind its ids. */
export async function readSale(id: string): Promise<SaleRow | undefined> {
  const sale = await get<SaleRow>(
    `SELECT sa.*, cl.name AS client_name, st.name AS staff_name,
            a.identifier AS appointment_identifier
     FROM sales sa
     LEFT JOIN clients cl ON cl.id = sa.client_id
     LEFT JOIN staff st ON st.id = sa.staff_id
     LEFT JOIN appointments a ON a.id = sa.appointment_id
     WHERE sa.id = ?`,
    [id],
  );
  if (!sale) return undefined;
  sale.items = await query(
    "SELECT * FROM sale_items WHERE sale_id = ? ORDER BY line_no",
    [id],
  );
  return sale;
}

/**
 * Rings up a ticket. Safe to call twice with the same `id` — a completed sale
 * is handed straight back rather than charged again.
 */
export async function recordSale(input: RecordSaleInput): Promise<SaleRow> {
  const id = (input.id ?? "").trim();
  if (!id) throw new Error("a sale needs an id");

  const existing = await get<{ status: string }>("SELECT status FROM sales WHERE id = ?", [id]);
  if (existing?.status === "closed") {
    // Already rung up. The client is retrying a request that in fact
    // succeeded, so give it the receipt instead of taking the money twice.
    return (await readSale(id))!;
  }

  // Prices the ticket server-side. The browser sends intent ("20% tip"); the
  // total is decided here, so a stale or tampered client cannot set it.
  const priced = priceSale(input);

  // 1. Header, open. Counted by nothing until step 4.
  await run(
    `INSERT OR IGNORE INTO sales
       (id, status, appointment_id, client_id, staff_id,
        subtotal, discount, tip, total, payment_method, note)
     VALUES (?, 'open', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, input.appointment_id ?? null, input.client_id ?? null, input.staff_id ?? null,
      priced.subtotal, priced.discount, priced.tip, priced.total,
      input.payment_method, input.note ?? "",
    ],
  );
  // Resuming an abandoned open sale: bring the header in line with this
  // attempt. Guarded on status so a closed sale can never be re-priced.
  await run(
    `UPDATE sales SET appointment_id = ?, client_id = ?, staff_id = ?,
            subtotal = ?, discount = ?, tip = ?, total = ?, payment_method = ?, note = ?
     WHERE id = ? AND status = 'open'`,
    [
      input.appointment_id ?? null, input.client_id ?? null, input.staff_id ?? null,
      priced.subtotal, priced.discount, priced.tip, priced.total,
      input.payment_method, input.note ?? "", id,
    ],
  );

  // 2. Lines, rewritten wholesale. Safe because an open sale counts for
  //    nothing, so there is no partial state to preserve.
  await run("DELETE FROM sale_items WHERE sale_id = ?", [id]);
  for (const [i, line] of priced.lines.entries()) {
    await run(
      `INSERT OR IGNORE INTO sale_items
         (sale_id, line_no, kind, ref_id, name, unit_price, qty, line_total)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, i, line.kind, line.ref_id ?? null, line.name, line.unit_price, line.qty, line.line_total],
    );
  }

  // 3. Stock. The movement row is the guard, not a log: its primary key is
  //    (sale_id, product_id), so it can be written at most once per sale, and
  //    the decrement runs only on the attempt that wrote it. That is what
  //    makes an untransacted `stock = stock - ?` safe to retry.
  //
  //    shortcut: if the process dies between the movement row and the
  //    decrement, on-hand is left one draw high. Reconcile from
  //    stock_movements; revisit if a real cash-drawer audit ever needs to be
  //    exact to the unit.
  for (const draw of stockDraw(priced.lines)) {
    const movement = await run(
      "INSERT OR IGNORE INTO stock_movements (sale_id, product_id, qty) VALUES (?, ?, ?)",
      [id, draw.product_id, draw.qty],
    );
    if (movement.changes > 0) {
      await run(
        "UPDATE products SET stock = stock - ?, updated_at = datetime('now') WHERE id = ?",
        [draw.qty, draw.product_id],
      );
    }
  }

  // 4. Commit.
  await run(
    "UPDATE sales SET status = 'closed', closed_at = datetime('now') WHERE id = ? AND status = 'open'",
    [id],
  );

  // A paid-up appointment is a finished one.
  if (input.appointment_id) {
    await run(
      "UPDATE appointments SET status = 'completed', updated_at = datetime('now') WHERE id = ? AND status != 'cancelled'",
      [input.appointment_id],
    );
  }

  return (await readSale(id))!;
}

export interface StaffTakings {
  staff_id: number | null;
  staff_name: string;
  staff_color: string;
  sale_count: number;
  service_revenue: number;
  retail_revenue: number;
  discount: number;
  tips: number;
  total: number;
}

/**
 * Takings per staff member over a date range.
 *
 * Deliberately two queries. Joining `sale_items` to `sales` to get both the
 * line split and the tip in one pass multiplies the tip by the number of
 * lines on the ticket — a three-line sale would report triple tips. The
 * sale-level figures and the line-level figures are aggregated separately and
 * stitched together here.
 */
export async function staffTakings(from: string, to: string): Promise<StaffTakings[]> {
  const perSale = await query<{
    staff_id: number | null; staff_name: string | null; staff_color: string | null;
    sale_count: number; discount: number; tips: number; total: number;
  }>(
    `SELECT sa.staff_id,
            st.name AS staff_name,
            st.color AS staff_color,
            COUNT(*) AS sale_count,
            COALESCE(SUM(sa.discount), 0) AS discount,
            COALESCE(SUM(sa.tip), 0) AS tips,
            COALESCE(SUM(sa.total), 0) AS total
     FROM sales sa
     LEFT JOIN staff st ON st.id = sa.staff_id
     WHERE sa.status = 'closed' AND date(sa.closed_at) BETWEEN ? AND ?
     GROUP BY sa.staff_id`,
    [from, to],
  );

  const perLine = await query<{ staff_id: number | null; kind: string; revenue: number }>(
    `SELECT sa.staff_id, si.kind, COALESCE(SUM(si.line_total), 0) AS revenue
     FROM sales sa
     JOIN sale_items si ON si.sale_id = sa.id
     WHERE sa.status = 'closed' AND date(sa.closed_at) BETWEEN ? AND ?
     GROUP BY sa.staff_id, si.kind`,
    [from, to],
  );

  const lineIndex = new Map<string, number>();
  for (const row of perLine) {
    lineIndex.set(`${row.staff_id ?? "none"}:${row.kind}`, row.revenue);
  }

  return perSale
    .map((row) => {
      const key = row.staff_id ?? "none";
      return {
        staff_id: row.staff_id,
        staff_name: row.staff_name ?? "Unassigned",
        staff_color: row.staff_color ?? "#6b7280",
        sale_count: row.sale_count,
        service_revenue: lineIndex.get(`${key}:service`) ?? 0,
        retail_revenue: lineIndex.get(`${key}:product`) ?? 0,
        discount: row.discount,
        tips: row.tips,
        total: row.total,
      };
    })
    .sort((a, b) => b.total - a.total);
}

export interface DayTakings {
  date: string;
  sale_count: number;
  subtotal: number;
  discount: number;
  tips: number;
  total: number;
}

/** Takings per day over a date range, most recent first. */
export async function dailyTakings(from: string, to: string): Promise<DayTakings[]> {
  return query<DayTakings>(
    `SELECT date(closed_at) AS date,
            COUNT(*) AS sale_count,
            COALESCE(SUM(subtotal), 0) AS subtotal,
            COALESCE(SUM(discount), 0) AS discount,
            COALESCE(SUM(tip), 0) AS tips,
            COALESCE(SUM(total), 0) AS total
     FROM sales
     WHERE status = 'closed' AND date(closed_at) BETWEEN ? AND ?
     GROUP BY date(closed_at)
     ORDER BY date(closed_at) DESC`,
    [from, to],
  );
}
