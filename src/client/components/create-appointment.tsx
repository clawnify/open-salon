import { useState } from "preact/hooks";
import { useApp } from "../context";
import { X } from "lucide-preact";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface Props {
  onClose: () => void;
  defaultDate?: string;
}

export function CreateAppointment({ onClose, defaultDate }: Props) {
  const { addAppointment, clientLookup, staffLookup, services, setError } = useApp();
  const [clientId, setClientId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [date, setDate] = useState(defaultDate || new Date().toISOString().split("T")[0]);
  const [startTime, setStartTime] = useState("09:00");
  const [selectedServices, setSelectedServices] = useState<number[]>([]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const toggleService = (id: number) => {
    setSelectedServices((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const totalPrice = services
    .filter((s) => selectedServices.includes(s.id))
    .reduce((sum, s) => sum + s.price, 0);

  const totalDuration = services
    .filter((s) => selectedServices.includes(s.id))
    .reduce((sum, s) => sum + s.duration, 0);

  const handleSubmit = async () => {
    if (!clientId) { setError("Please select a client"); return; }
    setSaving(true);
    try {
      await addAppointment({
        client_id: parseInt(clientId),
        staff_id: staffId ? parseInt(staffId) : null,
        scheduled_date: date,
        start_time: startTime,
        notes,
        service_ids: selectedServices,
      });
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Booking</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Client *</Label>
              <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={clientId} onChange={(e) => setClientId((e.target as HTMLSelectElement).value)}>
                <option value="">Select client...</option>
                {clientLookup.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Staff</Label>
              <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={staffId} onChange={(e) => setStaffId((e.target as HTMLSelectElement).value)}>
                <option value="">Unassigned</option>
                {staffLookup.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate((e.target as HTMLInputElement).value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Start Time</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime((e.target as HTMLInputElement).value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Services</Label>
            <div className="flex flex-wrap gap-2">
              {services.filter((s) => s.active).map((svc) => (
                <button
                  key={svc.id}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    selectedServices.includes(svc.id)
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border bg-background text-muted-foreground hover:border-primary/50"
                  )}
                  onClick={() => toggleService(svc.id)}
                >
                  <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: svc.color }} />
                  {svc.name}
                  <span className="text-[10px] opacity-70">{svc.duration}m &middot; ${svc.price}</span>
                </button>
              ))}
            </div>
            {selectedServices.length > 0 && (
              <p className="text-xs font-medium text-primary">
                Total: {totalDuration} min &middot; ${totalPrice.toFixed(2)}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea rows={3} placeholder="Special requests, preferences..." value={notes} onChange={(e) => setNotes((e.target as HTMLTextAreaElement).value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={saving} onClick={handleSubmit}>
            {saving ? "Booking..." : "Create Booking"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
