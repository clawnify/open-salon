import { useState } from "preact/hooks";
import { useApp } from "../context";
import { Plus, Search, Trash2 } from "lucide-preact";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "./status-badge";
import { Pagination } from "./pagination";
import { CreateAppointment } from "./create-appointment";

export function AppointmentList() {
  const {
    appointments, appointmentsPag, setAppointmentsPage,
    appointmentsSearch, setAppointmentsSearch,
    appointmentsStatusFilter, setAppointmentsStatusFilter,
    deleteAppointment, navigate,
  } = useApp();
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Appointments</h1>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="mr-1 h-3.5 w-3.5" /> New Booking
        </Button>
      </div>

      {showCreate && <CreateAppointment onClose={() => setShowCreate(false)} />}

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search appointments..."
            value={appointmentsSearch}
            onInput={(e) => setAppointmentsSearch((e.target as HTMLInputElement).value)}
          />
        </div>
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={appointmentsStatusFilter}
          onChange={(e) => setAppointmentsStatusFilter((e.target as HTMLSelectElement).value)}
        >
          <option value="">All Statuses</option>
          <option value="booked">Booked</option>
          <option value="confirmed">Confirmed</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="no_show">No Show</option>
        </select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">ID</TableHead>
                <TableHead className="w-24">Date</TableHead>
                <TableHead className="w-16">Time</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="w-28">Staff</TableHead>
                <TableHead className="w-24">Status</TableHead>
                <TableHead className="w-20 text-right">Price</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {appointments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">No appointments found</TableCell>
                </TableRow>
              )}
              {appointments.map((apt) => (
                <TableRow key={apt.id} className="cursor-pointer" onClick={() => navigate(`/appointments/${apt.id}`)}>
                  <TableCell className="font-medium text-primary">{apt.identifier}</TableCell>
                  <TableCell className="text-xs">{apt.scheduled_date}</TableCell>
                  <TableCell className="text-xs">{apt.start_time}</TableCell>
                  <TableCell>{apt.client_name}</TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1.5">
                      {apt.staff_name && <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: apt.staff_color || "#7c3aed" }} />}
                      <span className="text-sm">{apt.staff_name || "—"}</span>
                    </span>
                  </TableCell>
                  <TableCell><StatusBadge status={apt.status} /></TableCell>
                  <TableCell className="text-right">${apt.total_price.toFixed(2)}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={(e) => { e.stopPropagation(); deleteAppointment(apt.id); }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Pagination pag={appointmentsPag} setPage={setAppointmentsPage} />
    </div>
  );
}
