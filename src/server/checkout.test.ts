import { test } from "node:test";
import assert from "node:assert/strict";
import { priceSale, stockDraw, CheckoutError, type SaleInput } from "./checkout.ts";

const service = (name: string, price: number) => ({
  kind: "service" as const,
  ref_id: 1,
  name,
  unit_price: price,
  qty: 1,
});

const product = (id: number, name: string, price: number, qty = 1) => ({
  kind: "product" as const,
  ref_id: id,
  name,
  unit_price: price,
  qty,
});

const base = (over: Partial<SaleInput> = {}): SaleInput => ({
  items: [service("Standard Session", 50)],
  payment_method: "cash",
  ...over,
});

test("prices a plain single-service ticket", () => {
  const s = priceSale(base());
  assert.equal(s.subtotal, 50);
  assert.equal(s.discount, 0);
  assert.equal(s.tip, 0);
  assert.equal(s.total, 50);
});

test("the worked example from the design holds end to end", () => {
  // Cut & Style 50 + Express Touch-up 20 + shampoo 24.99 = 94.99
  // less 10% (9.50) = 85.49, plus a 20% tip (17.10) = 102.59
  const s = priceSale({
    items: [
      service("Cut & Style", 50),
      { kind: "service", ref_id: 4, name: "Express Touch-up", unit_price: 20, qty: 1 },
      product(1, "Professional Shampoo", 24.99),
    ],
    discount: { kind: "percent", value: 10 },
    tip: { kind: "percent", value: 20 },
    payment_method: "card",
  });
  assert.equal(s.subtotal, 94.99);
  assert.equal(s.discount, 9.5);
  assert.equal(s.net, 85.49);
  assert.equal(s.tip, 17.1);
  assert.equal(s.total, 102.59);
});

test("a percentage tip is taken on the post-discount figure, not the subtotal", () => {
  const s = priceSale(base({
    items: [service("Session", 100)],
    discount: { kind: "amount", value: 50 },
    tip: { kind: "percent", value: 20 },
  }));
  assert.equal(s.tip, 10, "20% of 50, not 20% of 100");
  assert.equal(s.total, 60);
});

test("flat discount and flat tip are taken verbatim", () => {
  const s = priceSale(base({
    items: [service("Session", 80)],
    discount: { kind: "amount", value: 12.5 },
    tip: { kind: "amount", value: 7.25 },
  }));
  assert.equal(s.discount, 12.5);
  assert.equal(s.net, 67.5);
  assert.equal(s.tip, 7.25);
  assert.equal(s.total, 74.75);
});

test("many awkward lines still total to the cent", () => {
  // Six lines that each round badly in binary floating point. Summing these
  // as floats drifts; summing as cents does not.
  const s = priceSale(base({
    items: Array.from({ length: 6 }, (_, i) => product(i + 1, `Item ${i + 1}`, 0.07)),
  }));
  assert.equal(s.subtotal, 0.42);
  assert.equal(s.total, 0.42);
});

test("a repeated-price ticket does not drift", () => {
  const s = priceSale(base({
    items: [product(1, "Cream", 32.99, 3), product(2, "Oil", 45.99, 7)],
  }));
  // 98.97 + 321.93
  assert.equal(s.subtotal, 420.9);
});

test("percentages round to the nearest cent", () => {
  const s = priceSale(base({
    items: [service("Session", 33.33)],
    discount: { kind: "percent", value: 15 },
  }));
  // 15% of 3333c = 499.95c -> 500c
  assert.equal(s.discount, 5);
  assert.equal(s.net, 28.33);
});

test("a 100% discount is allowed and zeroes the ticket", () => {
  const s = priceSale(base({ discount: { kind: "percent", value: 100 } }));
  assert.equal(s.discount, 50);
  assert.equal(s.net, 0);
  assert.equal(s.total, 0);
});

test("a tip on a fully discounted ticket is still honoured", () => {
  const s = priceSale(base({
    discount: { kind: "percent", value: 100 },
    tip: { kind: "amount", value: 5 },
  }));
  assert.equal(s.net, 0);
  assert.equal(s.tip, 5);
  assert.equal(s.total, 5);
});

// ── Trust boundary ────────────────────────────────────────────────────
// The browser sends intent; these are the things it must not be able to talk
// the server into.

test("an empty ticket is refused", () => {
  assert.throws(() => priceSale(base({ items: [] })), CheckoutError);
});

test("a discount larger than the subtotal is refused", () => {
  assert.throws(
    () => priceSale(base({ discount: { kind: "amount", value: 50.01 } })),
    /discount cannot exceed the subtotal/,
  );
});

test("a percentage over 100 is refused", () => {
  assert.throws(
    () => priceSale(base({ discount: { kind: "percent", value: 101 } })),
    /cannot exceed 100/,
  );
});

test("negative money is refused", () => {
  assert.throws(() => priceSale(base({ tip: { kind: "amount", value: -1 } })), /negative/);
  assert.throws(
    () => priceSale(base({ items: [{ ...service("S", -5) }] })),
    /invalid price/,
  );
});

test("non-finite money is refused", () => {
  assert.throws(() => priceSale(base({ tip: { kind: "amount", value: NaN } })), /must be a number/);
  assert.throws(
    () => priceSale(base({ items: [{ ...service("S", Infinity) }] })),
    /invalid price/,
  );
});

test("fractional and zero quantities are refused", () => {
  assert.throws(() => priceSale(base({ items: [product(1, "Cream", 10, 1.5)] })), /whole quantity/);
  assert.throws(() => priceSale(base({ items: [product(1, "Cream", 10, 0)] })), /whole quantity/);
});

test("a nameless line is refused", () => {
  assert.throws(() => priceSale(base({ items: [{ ...service("   ", 10) }] })), /needs a name/);
});

test("an unknown line kind is refused", () => {
  assert.throws(
    () => priceSale(base({ items: [{ ...service("S", 10), kind: "tip" as never }] })),
    /line kind must be/,
  );
});

test("an unknown payment method is refused", () => {
  assert.throws(
    () => priceSale(base({ payment_method: "crypto" as never })),
    /payment_method must be one of/,
  );
});

test("a service cannot be rung up more than once", () => {
  assert.throws(
    () => priceSale(base({ items: [{ ...service("Session", 50), qty: 2 }] })),
    /quantity must be 1/,
  );
});

test("line names are trimmed and a missing ref becomes null", () => {
  const s = priceSale(base({
    items: [{ kind: "product", name: "  Loose item  ", unit_price: 3, qty: 1 }],
  }));
  assert.equal(s.lines[0].name, "Loose item");
  assert.equal(s.lines[0].ref_id, null);
});

// ── Stock draw ────────────────────────────────────────────────────────

test("stock draw ignores services and keeps products", () => {
  const s = priceSale(base({
    items: [service("Session", 50), product(7, "Gel", 15.99, 2)],
  }));
  assert.deepEqual(stockDraw(s.lines), [{ product_id: 7, qty: 2 }]);
});

test("the same product on two lines is summed into one movement", () => {
  // (sale_id, product_id) is the primary key of stock_movements, so writing
  // two rows for one product would fail and leave the stock short.
  const s = priceSale(base({
    items: [product(7, "Gel", 15.99, 2), product(7, "Gel", 15.99, 3)],
  }));
  assert.deepEqual(stockDraw(s.lines), [{ product_id: 7, qty: 5 }]);
});

test("an untracked product line draws no stock", () => {
  const s = priceSale(base({
    items: [{ kind: "product", name: "Ad-hoc item", unit_price: 5, qty: 1 }],
  }));
  assert.deepEqual(stockDraw(s.lines), []);
});
