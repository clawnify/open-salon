import { useState, useMemo } from "preact/hooks";
import { useApp } from "../context";
import { Trash2, Receipt, Check } from "lucide-preact";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { Appointment } from "../types";
// The same money module the server prices with. Importing it rather than
// re-implementing the arithmetic here is what stops the figure on screen from
// disagreeing with the figure that gets charged.
import { priceSale, CheckoutError, type SaleItemInput, type Adjustment } from "../../server/checkout";

const TIP_PRESETS = [15, 18, 20];
const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
] as const;

/** 11px uppercase zone label — the house "eyebrow". */
function Eyebrow({ children }: { children: preact.ComponentChildren }) {
  return (
    <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
      {children}
    </p>
  );
}

interface Props {
  /** Omit for a walk-in sale — retail with no appointment behind it. */
  appointment?: Appointment | null;
  onClose: () => void;
  onDone?: () => void;
}

export function CheckoutDialog({ appointment, onClose, onDone }: Props) {
  const { products, services, staffLookup, clientLookup, recordSale, setError } = useApp();

  // A fresh id per checkout. The server treats it as the idempotency key, so a
  // double-submit or a retried request cannot ring the sale up twice.
  const [saleId] = useState(() => crypto.randomUUID());

  const [lines, setLines] = useState<SaleItemInput[]>(() =>
    (appointment?.appointment_services ?? []).map((s) => ({
      kind: "service" as const,
      ref_id: s.service_id,
      name: s.service_name || "Service",
      unit_price: s.price,
      qty: 1,
    })),
  );

  const [staffId, setStaffId] = useState(appointment?.staff_id ? String(appointment.staff_id) : "");
  const [clientId, setClientId] = useState(appointment?.client_id ? String(appointment.client_id) : "");

  const [discountKind, setDiscountKind] = useState<"percent" | "amount">("percent");
  const [discountValue, setDiscountValue] = useState("");
  const [tipKind, setTipKind] = useState<"percent" | "amount">("percent");
  const [tipValue, setTipValue] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "other">("card");
  const [saving, setSaving] = useState(false);

  const adjustment = (kind: "percent" | "amount", raw: string): Adjustment | undefined => {
    const value = parseFloat(raw);
    if (!raw.trim() || !Number.isFinite(value) || value <= 0) return undefined;
    return { kind, value };
  };

  const discount = adjustment(discountKind, discountValue);
  const tip = adjustment(tipKind, tipValue);

  // Preview only. The server prices the sale again on submit and its answer is
  // the one that counts — this exists so the desk can see the total first.
  const preview = useMemo(() => {
    try {
      return { sale: priceSale({ items: lines, discount, tip, payment_method: paymentMethod }), problem: null };
    } catch (err) {
      return {
        sale: null,
        problem: err instanceof CheckoutError ? err.message : "This ticket does not add up",
      };
    }
  }, [lines, discountKind, discountValue, tipKind, tipValue, paymentMethod]);

  const addProduct = (productId: string) => {
    const product = products.find((p) => p.id === Number(productId));
    if (!product) return;
    setLines((prev) => [
      ...prev,
      { kind: "product", ref_id: product.id, name: product.name, unit_price: product.price, qty: 1 },
    ]);
  };

  const addService = (serviceId: string) => {
    const service = services.find((s) => s.id === Number(serviceId));
    if (!service) return;
    setLines((prev) => [
      ...prev,
      { kind: "service", ref_id: service.id, name: service.name, unit_price: service.price, qty: 1 },
    ]);
  };

  const setQty = (index: number, qty: number) =>
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, qty: Math.max(1, qty) } : l)));

  const removeLine = (index: number) => setLines((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = async () => {
    if (!preview.sale) { setError(preview.problem); return; }
    setSaving(true);
    try {
      await recordSale({
        id: saleId,
        appointment_id: appointment?.id ?? null,
        client_id: clientId ? Number(clientId) : null,
        staff_id: staffId ? Number(staffId) : null,
        items: lines,
        discount,
        tip,
        payment_method: paymentMethod,
      });
      onDone?.();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const money = (n: number) => `$${n.toFixed(2)}`;

  return (
    <Dialog open onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Checkout
            {appointment && (
              <span className="text-sm font-normal text-muted-foreground">
                {appointment.identifier}
                {appointment.client_name ? ` · ${appointment.client_name}` : ""}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* ── Ticket ── */}
          <div>
            <Eyebrow>Ticket</Eyebrow>
            {lines.length === 0 ? (
              <p className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">
                Nothing on the ticket yet
              </p>
            ) : (
              <div className="divide-y rounded-md border">
                {lines.map((line, i) => (
                  <div key={`${line.kind}-${line.ref_id}-${i}`} className="flex items-center gap-2 px-3 py-2">
                    <span
                      className={cn(
                        "shrink-0 rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wide",
                        line.kind === "service"
                          ? "border-border bg-muted text-muted-foreground"
                          : "border-border bg-background text-muted-foreground",
                      )}
                    >
                      {line.kind === "service" ? "Svc" : "Retail"}
                    </span>
                    <span className="flex-1 truncate text-sm">{line.name}</span>
                    {line.kind === "product" ? (
                      <Input
                        type="number"
                        min={1}
                        className="h-7 w-14 text-center text-sm"
                        value={String(line.qty)}
                        onChange={(e: Event) => setQty(i, parseInt((e.target as HTMLInputElement).value, 10) || 1)}
                      />
                    ) : (
                      <span className="w-14 text-center text-xs text-muted-foreground">&times;1</span>
                    )}
                    <span className="w-20 text-right text-sm tabular-nums">
                      {money(line.unit_price * line.qty)}
                    </span>
                    <button
                      className="text-muted-foreground transition-colors hover:text-destructive"
                      aria-label={`Remove ${line.name}`}
                      onClick={() => removeLine(i)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-2 grid grid-cols-2 gap-2">
              <label className="sr-only" for="checkout-add-service">Add a service</label>
              <select
                id="checkout-add-service"
                className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value=""
                onChange={(e: Event) => { addService((e.target as HTMLSelectElement).value); (e.target as HTMLSelectElement).value = ""; }}
              >
                <option value="">+ Add service</option>
                {services.filter((s) => s.active).map((s) => (
                  <option key={s.id} value={s.id}>{s.name} &mdash; ${s.price.toFixed(2)}</option>
                ))}
              </select>
              <label className="sr-only" for="checkout-add-product">Add a retail product</label>
              <select
                id="checkout-add-product"
                className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value=""
                onChange={(e: Event) => { addProduct((e.target as HTMLSelectElement).value); (e.target as HTMLSelectElement).value = ""; }}
              >
                <option value="">+ Add retail</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} &mdash; ${p.price.toFixed(2)}{p.stock <= 0 ? " (out of stock)" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ── Who ── */}
          <div>
            <Eyebrow>Attributed to</Eyebrow>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Staff</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  value={staffId}
                  onChange={(e: Event) => setStaffId((e.target as HTMLSelectElement).value)}
                >
                  <option value="">Unassigned</option>
                  {staffLookup.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Client</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  value={clientId}
                  onChange={(e: Event) => setClientId((e.target as HTMLSelectElement).value)}
                >
                  <option value="">Walk-in</option>
                  {clientLookup.map((cl) => <option key={cl.id} value={cl.id}>{cl.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* ── Adjustments ── */}
          <div>
            <Eyebrow>Discount &amp; tip</Eyebrow>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Label className="w-16 text-xs text-muted-foreground">Discount</Label>
                <div className="flex overflow-hidden rounded-md border">
                  {(["percent", "amount"] as const).map((k) => (
                    <button
                      key={k}
                      className={cn(
                        "px-2 py-1.5 text-xs transition-colors",
                        discountKind === k ? "bg-muted font-medium" : "text-muted-foreground hover:bg-muted/50",
                      )}
                      onClick={() => setDiscountKind(k)}
                    >
                      {k === "percent" ? "%" : "$"}
                    </button>
                  ))}
                </div>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="0"
                  className="h-8 flex-1 text-sm"
                  value={discountValue}
                  onChange={(e: Event) => setDiscountValue((e.target as HTMLInputElement).value)}
                />
              </div>

              <div className="flex items-center gap-2">
                <Label className="w-16 text-xs text-muted-foreground">Tip</Label>
                <div className="flex gap-1">
                  {TIP_PRESETS.map((pct) => {
                    const active = tipKind === "percent" && tipValue === String(pct);
                    return (
                      <button
                        key={pct}
                        className={cn(
                          "rounded-md border px-2 py-1.5 text-xs transition-colors",
                          active
                            ? "border-primary bg-primary/5 font-medium text-primary"
                            : "border-border text-muted-foreground hover:border-primary/50",
                        )}
                        onClick={() => {
                          setTipKind("percent");
                          setTipValue(active ? "" : String(pct));
                        }}
                      >
                        {pct}%
                      </button>
                    );
                  })}
                </div>
                <div className="flex overflow-hidden rounded-md border">
                  {(["percent", "amount"] as const).map((k) => (
                    <button
                      key={k}
                      className={cn(
                        "px-2 py-1.5 text-xs transition-colors",
                        tipKind === k ? "bg-muted font-medium" : "text-muted-foreground hover:bg-muted/50",
                      )}
                      onClick={() => setTipKind(k)}
                    >
                      {k === "percent" ? "%" : "$"}
                    </button>
                  ))}
                </div>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="0"
                  className="h-8 flex-1 text-sm"
                  value={tipValue}
                  onChange={(e: Event) => setTipValue((e.target as HTMLInputElement).value)}
                />
              </div>
            </div>
          </div>

          {/* ── Payment ── */}
          <div>
            <Eyebrow>Payment</Eyebrow>
            <div className="flex gap-1.5">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m.value}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm transition-colors",
                    paymentMethod === m.value
                      ? "border-primary bg-primary/5 font-medium text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50",
                  )}
                  onClick={() => setPaymentMethod(m.value)}
                >
                  {paymentMethod === m.value && <Check className="h-3.5 w-3.5" strokeWidth={2.5} />}
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Totals ── */}
          <div className="rounded-md border bg-muted/30 px-3 py-2.5">
            <Eyebrow>Total</Eyebrow>
            {preview.sale ? (
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Subtotal</dt>
                  <dd className="tabular-nums">{money(preview.sale.subtotal)}</dd>
                </div>
                {preview.sale.discount > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Discount</dt>
                    <dd className="tabular-nums text-amber-600">&minus;{money(preview.sale.discount)}</dd>
                  </div>
                )}
                {preview.sale.tip > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Tip</dt>
                    <dd className="tabular-nums">{money(preview.sale.tip)}</dd>
                  </div>
                )}
                <div className="flex justify-between border-t pt-1 text-base font-bold">
                  <dt>Total</dt>
                  <dd className="tabular-nums">{money(preview.sale.total)}</dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-destructive">{preview.problem}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={saving || !preview.sale} onClick={handleSubmit}>
            {saving ? "Recording..." : "Complete sale"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
