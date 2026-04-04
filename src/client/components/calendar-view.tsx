import { useState } from "preact/hooks";
import { useApp } from "../context";
import { ChevronLeft, ChevronRight, Plus, X, Ban } from "lucide-preact";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreateAppointment } from "./create-appointment";
import { cn } from "@/lib/utils";

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7 AM to 8 PM

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function formatHour(h: number): string {
  if (h === 0) return "12 AM";
  if (h < 12) return `${h} AM`;
  if (h === 12) return "12 PM";
  return `${h - 12} PM`;
}

export function CalendarView() {
  const {
    calendarAppointments, calendarBlocked, calendarDate, setCalendarDate,
    staffLookup, navigate, deleteBlockedSlot, addBlockedSlot, isAgent,
  } = useApp();
  const [showCreate, setShowCreate] = useState(false);
  const [showBlockForm, setShowBlockForm] = useState(false);
  const [blockStaff, setBlockStaff] = useState("");
  const [blockStart, setBlockStart] = useState("12:00");
  const [blockEnd, setBlockEnd] = useState("13:00");
  const [blockReason, setBlockReason] = useState("");

  const dateObj = new Date(calendarDate + "T00:00:00");
  const todayStr = new Date().toISOString().split("T")[0];

  const shiftDay = (delta: number) => {
    const d = new Date(calendarDate + "T00:00:00");
    d.setDate(d.getDate() + delta);
    setCalendarDate(d.toISOString().split("T")[0]);
  };

  const dayStart = HOURS[0] * 60;
  const dayEnd = (HOURS[HOURS.length - 1] + 1) * 60;
  const totalMinutes = dayEnd - dayStart;
  const hourHeight = 64;
  const totalHeight = (totalMinutes / 60) * hourHeight;

  const handleAddBlock = async () => {
    if (!blockStaff) return;
    await addBlockedSlot({
      staff_id: parseInt(blockStaff),
      blocked_date: calendarDate,
      start_time: blockStart,
      end_time: blockEnd,
      reason: blockReason,
    });
    setShowBlockForm(false);
    setBlockReason("");
  };

  return (
    <div className="flex h-full flex-col space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setCalendarDate(todayStr)}>Today</Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => shiftDay(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[200px] text-center text-sm font-semibold">
            {dateObj.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" })}
          </span>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => shiftDay(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowBlockForm(!showBlockForm)}>
            <Ban className="mr-1 h-3.5 w-3.5" /> Block Time
          </Button>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="mr-1 h-3.5 w-3.5" /> New Booking
          </Button>
        </div>
      </div>

      {showBlockForm && (
        <Card>
          <CardContent className="flex items-end gap-3 p-4">
            <div className="space-y-1">
              <Label className="text-xs">Staff</Label>
              <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={blockStaff} onChange={(e) => setBlockStaff((e.target as HTMLSelectElement).value)}>
                <option value="">Select staff...</option>
                {staffLookup.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Start</Label>
              <Input type="time" className="h-9 w-28" value={blockStart} onChange={(e) => setBlockStart((e.target as HTMLInputElement).value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">End</Label>
              <Input type="time" className="h-9 w-28" value={blockEnd} onChange={(e) => setBlockEnd((e.target as HTMLInputElement).value)} />
            </div>
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Reason</Label>
              <Input className="h-9" placeholder="e.g. Lunch break" value={blockReason} onChange={(e) => setBlockReason((e.target as HTMLInputElement).value)} />
            </div>
            <Button size="sm" onClick={handleAddBlock}>Add Block</Button>
          </CardContent>
        </Card>
      )}

      {showCreate && <CreateAppointment onClose={() => setShowCreate(false)} defaultDate={calendarDate} />}

      <div className="flex flex-1 overflow-x-auto rounded-lg border bg-card">
        {/* Time gutter */}
        <div className="w-16 flex-shrink-0 border-r bg-muted/30 pt-10">
          {HOURS.map((h) => (
            <div key={h} className="flex h-16 items-start justify-end pr-2 text-xs text-muted-foreground" style={{ height: hourHeight }}>
              {formatHour(h)}
            </div>
          ))}
        </div>

        {/* Staff columns */}
        <div className="flex flex-1">
          {staffLookup.map((member) => {
            const memberAppts = calendarAppointments.filter((a) => a.staff_id === member.id);
            const memberBlocked = calendarBlocked.filter((b) => b.staff_id === member.id);
            return (
              <div key={member.id} className="flex min-w-[180px] flex-1 flex-col border-r last:border-r-0">
                <div className="flex items-center justify-center gap-2 border-b bg-muted/20 px-3 py-2.5">
                  <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: member.color }} />
                  <span className="text-sm font-medium">{member.name}</span>
                </div>
                <div className="relative" style={{ height: totalHeight }}>
                  {/* Hour lines */}
                  {HOURS.map((h) => (
                    <div
                      key={h}
                      className="absolute left-0 right-0 border-t border-dashed border-border/50"
                      style={{ top: ((h * 60 - dayStart) / totalMinutes) * totalHeight }}
                    />
                  ))}

                  {/* Blocked slots */}
                  {memberBlocked.map((block) => {
                    const startMin = timeToMinutes(block.start_time) - dayStart;
                    const endMin = timeToMinutes(block.end_time) - dayStart;
                    const top = (startMin / totalMinutes) * totalHeight;
                    const height = ((endMin - startMin) / totalMinutes) * totalHeight;
                    return (
                      <div
                        key={`b-${block.id}`}
                        className="absolute inset-x-1 z-10 flex items-center justify-between rounded bg-muted/60 px-2 text-xs text-muted-foreground"
                        style={{ top, height: Math.max(height, 20) }}
                      >
                        <span className="truncate">{block.reason || "Blocked"}</span>
                        <button
                          className="flex-shrink-0 rounded p-0.5 hover:bg-muted"
                          onClick={(e) => { e.stopPropagation(); deleteBlockedSlot(block.id); }}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}

                  {/* Appointments */}
                  {memberAppts.map((apt) => {
                    const startMin = timeToMinutes(apt.start_time) - dayStart;
                    const endMin = timeToMinutes(apt.end_time) - dayStart;
                    const top = (startMin / totalMinutes) * totalHeight;
                    const height = ((endMin - startMin) / totalMinutes) * totalHeight;
                    const services = apt.appointment_services?.map((s) => s.service_name).filter(Boolean).join(", ");
                    return (
                      <button
                        key={apt.id}
                        className={cn(
                          "absolute inset-x-1 z-20 cursor-pointer overflow-hidden rounded-md border-l-[3px] px-2 py-1 text-left transition-shadow hover:shadow-md",
                        )}
                        style={{
                          top,
                          height: Math.max(height, 28),
                          backgroundColor: `${member.color}14`,
                          borderLeftColor: member.color,
                        }}
                        onClick={() => navigate(`/appointments/${apt.id}`)}
                      >
                        <div className="text-[10px] font-medium text-muted-foreground">{apt.start_time} - {apt.end_time}</div>
                        <div className="truncate text-xs font-semibold">{apt.client_name}</div>
                        {services && height > 50 && <div className="truncate text-[10px] text-muted-foreground">{services}</div>}
                        {height > 40 && <div className="text-[10px] font-medium">${apt.total_price.toFixed(2)}</div>}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Unassigned column */}
          {(() => {
            const unassigned = calendarAppointments.filter((a) => !a.staff_id);
            if (unassigned.length === 0) return null;
            return (
              <div className="flex min-w-[180px] flex-1 flex-col border-r last:border-r-0">
                <div className="flex items-center justify-center gap-2 border-b bg-muted/20 px-3 py-2.5">
                  <span className="inline-block h-3 w-3 rounded-full bg-muted-foreground/40" />
                  <span className="text-sm font-medium text-muted-foreground">Unassigned</span>
                </div>
                <div className="relative" style={{ height: totalHeight }}>
                  {HOURS.map((h) => (
                    <div key={h} className="absolute left-0 right-0 border-t border-dashed border-border/50" style={{ top: ((h * 60 - dayStart) / totalMinutes) * totalHeight }} />
                  ))}
                  {unassigned.map((apt) => {
                    const startMin = timeToMinutes(apt.start_time) - dayStart;
                    const endMin = timeToMinutes(apt.end_time) - dayStart;
                    const top = (startMin / totalMinutes) * totalHeight;
                    const height = ((endMin - startMin) / totalMinutes) * totalHeight;
                    return (
                      <button
                        key={apt.id}
                        className="absolute inset-x-1 z-20 cursor-pointer overflow-hidden rounded-md border-l-[3px] border-l-muted-foreground/40 bg-muted/30 px-2 py-1 text-left transition-shadow hover:shadow-md"
                        style={{ top, height: Math.max(height, 28) }}
                        onClick={() => navigate(`/appointments/${apt.id}`)}
                      >
                        <div className="text-[10px] font-medium text-muted-foreground">{apt.start_time} - {apt.end_time}</div>
                        <div className="truncate text-xs font-semibold">{apt.client_name}</div>
                        <div className="text-[10px] font-medium">${apt.total_price.toFixed(2)}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
