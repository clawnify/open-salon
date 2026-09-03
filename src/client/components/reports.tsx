import { useEffect } from "preact/hooks";
import { useApp } from "../context";
import { Scissors, ShoppingBag, Coins, Wallet } from "lucide-preact";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const money = (n: number) => `$${n.toFixed(2)}`;

/** 11px uppercase zone label — the house "eyebrow". */
function Eyebrow({ children }: { children: preact.ComponentChildren }) {
  return (
    <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
      {children}
    </p>
  );
}

export function Reports() {
  const { takings, takingsRange, setTakingsRange, loadTakings } = useApp();

  useEffect(() => { void loadTakings(); }, [loadTakings]);

  const totals = takings?.totals;

  // Retail as a share of the till. The number salon owners actually chase —
  // service revenue is capped by hours in the day, retail is not.
  const retailShare = totals && totals.total > 0
    ? Math.round((totals.retail_revenue / totals.total) * 100)
    : 0;

  const cards = [
    { label: "Service revenue", value: money(totals?.service_revenue ?? 0), meta: `${totals?.sale_count ?? 0} sales`, icon: Scissors, tone: "text-violet-600 bg-violet-50" },
    { label: "Retail revenue", value: money(totals?.retail_revenue ?? 0), meta: `${retailShare}% of takings`, icon: ShoppingBag, tone: "text-emerald-600 bg-emerald-50" },
    { label: "Tips", value: money(totals?.tips ?? 0), meta: "paid to staff", icon: Coins, tone: "text-amber-600 bg-amber-50" },
    { label: "Total taken", value: money(totals?.total ?? 0), meta: totals && totals.discount > 0 ? `after ${money(totals.discount)} discounts` : "no discounts", icon: Wallet, tone: "text-blue-600 bg-blue-50" },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground">
            What was actually taken, not what was booked.
          </p>
        </div>
        <div className="flex items-end gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground" for="takings-from">From</Label>
            <Input
              id="takings-from"
              type="date"
              className="h-9 w-[9.5rem]"
              value={takingsRange.from}
              onChange={(e: Event) => setTakingsRange({ ...takingsRange, from: (e.target as HTMLInputElement).value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground" for="takings-to">To</Label>
            <Input
              id="takings-to"
              type="date"
              className="h-9 w-[9.5rem]"
              value={takingsRange.to}
              onChange={(e: Event) => setTakingsRange({ ...takingsRange, to: (e.target as HTMLInputElement).value })}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${card.tone}`}>
                <card.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xl font-bold tabular-nums">{card.value}</div>
                <div className="truncate text-xs text-muted-foreground">{card.label}</div>
                {/* Fixed height so the meta line appearing never shifts the row. */}
                <div className="h-4 truncate text-[11px] text-muted-foreground/70">{card.meta}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <Eyebrow>By staff member</Eyebrow>
        {!takings || takings.staff.length === 0 ? (
          <p className="rounded-md border border-dashed py-10 text-center text-sm text-muted-foreground">
            No sales in this period. Check an appointment out to start recording takings.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff</TableHead>
                  <TableHead className="w-20 text-right">Sales</TableHead>
                  <TableHead className="w-28 text-right">Services</TableHead>
                  <TableHead className="w-28 text-right">Retail</TableHead>
                  <TableHead className="w-28 text-right">Tips</TableHead>
                  <TableHead className="w-28 text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {takings.staff.map((row) => (
                  <TableRow key={row.staff_id ?? "none"}>
                    <TableCell className="font-medium">
                      <span className="flex items-center gap-2">
                        <span
                          className="inline-block h-2 w-2 rounded-full"
                          style={{ backgroundColor: row.staff_color }}
                        />
                        {row.staff_name}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{row.sale_count}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(row.service_revenue)}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(row.retail_revenue)}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(row.tips)}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{money(row.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              {/* Footer aggregate — a numeric table should always sum itself. */}
              <TableFooter>
                <TableRow>
                  <TableCell className="font-medium">All staff</TableCell>
                  <TableCell className="text-right tabular-nums">{totals?.sale_count ?? 0}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(totals?.service_revenue ?? 0)}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(totals?.retail_revenue ?? 0)}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(totals?.tips ?? 0)}</TableCell>
                  <TableCell className="text-right font-bold tabular-nums">{money(totals?.total ?? 0)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        )}
      </div>

      {takings && takings.days.length > 0 && (
        <div>
          <Eyebrow>By day</Eyebrow>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-20 text-right">Sales</TableHead>
                  <TableHead className="w-28 text-right">Subtotal</TableHead>
                  <TableHead className="w-28 text-right">Discounts</TableHead>
                  <TableHead className="w-28 text-right">Tips</TableHead>
                  <TableHead className="w-28 text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {takings.days.map((day) => (
                  <TableRow key={day.date}>
                    <TableCell className="font-medium">{day.date}</TableCell>
                    <TableCell className="text-right tabular-nums">{day.sale_count}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(day.subtotal)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {day.discount > 0 ? `−${money(day.discount)}` : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{money(day.tips)}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{money(day.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
