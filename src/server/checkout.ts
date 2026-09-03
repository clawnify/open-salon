// Money math for the till. Pure — no database, no Hono — so the arithmetic
// that decides what a client is charged can be tested on its own.
//
// Everything is computed in integer cents and only converted back to a
// decimal at the edges. The columns are REAL (to match `services.price` and
// `appointments.total_price`), but accumulating a ticket in floating point is
// how you end up a cent out on a six-line sale.

export type ItemKind = "service" | "product";

export type PaymentMethod = "cash" | "card" | "other";

export const PAYMENT_METHODS: PaymentMethod[] = ["cash", "card", "other"];

/** A percentage of the ticket, or a flat cash figure. */
export type Adjustment = { kind: "percent" | "amount"; value: number };

export interface SaleItemInput {
  kind: ItemKind;
  /** services.id or products.id. Kept for reporting; the line stands without it. */
  ref_id?: number | null;
  /** Snapshotted, so the receipt still reads correctly after a catalogue edit. */
  name: string;
  unit_price: number;
  qty: number;
}

export interface SaleInput {
  items: SaleItemInput[];
  discount?: Adjustment;
  tip?: Adjustment;
  payment_method: PaymentMethod;
}

export interface PricedLine extends SaleItemInput {
  line_total: number;
}

export interface PricedSale {
  lines: PricedLine[];
  subtotal: number;
  discount: number;
  /** Subtotal less discount. Not stored — the base the tip is taken on. */
  net: number;
  tip: number;
  total: number;
}

const toCents = (n: number): number => Math.round(n * 100);
const toMoney = (cents: number): number => cents / 100;

/** Percentage of a cent amount, rounded to the nearest cent. */
const pctOf = (cents: number, percent: number): number =>
  Math.round((cents * percent) / 100);

/** Rounds a decimal to cents. For summing figures already stored as REAL. */
export const round2 = (n: number): number => Math.round(n * 100) / 100;

export class CheckoutError extends Error {}

function fail(message: string): never {
  throw new CheckoutError(message);
}

function resolve(adj: Adjustment | undefined, baseCents: number, label: string): number {
  if (!adj) return 0;
  if (!Number.isFinite(adj.value)) fail(`${label} must be a number`);
  if (adj.value < 0) fail(`${label} cannot be negative`);
  if (adj.kind === "percent") {
    if (adj.value > 100) fail(`${label} percentage cannot exceed 100`);
    return pctOf(baseCents, adj.value);
  }
  if (adj.kind !== "amount") fail(`${label} kind must be "percent" or "amount"`);
  return toCents(adj.value);
}

/**
 * Prices a ticket. This is the authoritative calculation: the client sends
 * intent ("20% tip") and the server decides the number, so a tampered or
 * simply stale browser cannot dictate the total.
 *
 * A percentage tip is taken on the post-discount figure, which is what the
 * front desk expects — discount the service, then tip on what's actually owed.
 */
export function priceSale(input: SaleInput): PricedSale {
  if (!Array.isArray(input.items) || input.items.length === 0) {
    fail("a sale needs at least one line");
  }
  if (!PAYMENT_METHODS.includes(input.payment_method)) {
    fail(`payment_method must be one of ${PAYMENT_METHODS.join(", ")}`);
  }

  const lines: PricedLine[] = [];
  let subtotalCents = 0;

  for (const item of input.items) {
    if (item.kind !== "service" && item.kind !== "product") {
      fail(`line kind must be "service" or "product", got "${item.kind}"`);
    }
    const name = (item.name ?? "").trim();
    if (!name) fail("every line needs a name");
    if (!Number.isFinite(item.unit_price) || item.unit_price < 0) {
      fail(`"${name}" has an invalid price`);
    }
    if (!Number.isInteger(item.qty) || item.qty < 1) {
      fail(`"${name}" needs a whole quantity of at least 1`);
    }
    // A service is the appointment's own work: one of it, by definition.
    if (item.kind === "service" && item.qty !== 1) {
      fail(`"${name}" is a service, so its quantity must be 1`);
    }

    const lineCents = toCents(item.unit_price) * item.qty;
    subtotalCents += lineCents;
    lines.push({
      ...item,
      name,
      ref_id: item.ref_id ?? null,
      line_total: toMoney(lineCents),
    });
  }

  const discountCents = resolve(input.discount, subtotalCents, "discount");
  if (discountCents > subtotalCents) {
    fail("discount cannot exceed the subtotal");
  }

  const netCents = subtotalCents - discountCents;
  const tipCents = resolve(input.tip, netCents, "tip");
  const totalCents = netCents + tipCents;

  return {
    lines,
    subtotal: toMoney(subtotalCents),
    discount: toMoney(discountCents),
    net: toMoney(netCents),
    tip: toMoney(tipCents),
    total: toMoney(totalCents),
  };
}

/**
 * Collapses the product lines to one quantity per product.
 *
 * `stock_movements` is keyed on (sale_id, product_id) so that recording a
 * movement can only succeed once per sale — that uniqueness is what makes the
 * stock decrement safe to retry. The same product appearing on two lines has
 * to be summed here rather than written twice.
 */
export function stockDraw(lines: PricedLine[]): Array<{ product_id: number; qty: number }> {
  const byProduct = new Map<number, number>();
  for (const line of lines) {
    if (line.kind !== "product") continue;
    if (typeof line.ref_id !== "number") continue;
    byProduct.set(line.ref_id, (byProduct.get(line.ref_id) ?? 0) + line.qty);
  }
  return [...byProduct].map(([product_id, qty]) => ({ product_id, qty }));
}
