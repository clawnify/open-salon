import { useState } from "preact/hooks";
import { useApp } from "../context";
import { ArrowLeft, Trash2, Save, Mail, Phone } from "lucide-preact";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "./status-badge";

export function ClientDetail() {
  const { selectedClient: client, selectedClientAppointments: appointments, navigate, updateClient, deleteClient } = useApp();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(client?.name || "");
  const [email, setEmail] = useState(client?.email || "");
  const [phone, setPhone] = useState(client?.phone || "");
  const [notes, setNotes] = useState(client?.notes || "");

  if (!client) return null;

  const handleSave = async () => {
    await updateClient(client.id, { name, email, phone, notes });
    setEditing(false);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/clients")}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        <h1 className="flex-1 text-2xl font-bold">{client.name}</h1>
        <Button variant="destructive" size="sm" onClick={() => deleteClient(client.id)}>
          <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Details</CardTitle>
            {!editing ? (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>Edit</Button>
            ) : (
              <Button size="sm" onClick={handleSave}><Save className="mr-1 h-3.5 w-3.5" /> Save</Button>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {editing ? (
              <>
                <div className="space-y-1.5"><Label>Name</Label><Input value={name} onChange={(e) => setName((e.target as HTMLInputElement).value)} /></div>
                <div className="space-y-1.5"><Label>Email</Label><Input value={email} onChange={(e) => setEmail((e.target as HTMLInputElement).value)} /></div>
                <div className="space-y-1.5"><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone((e.target as HTMLInputElement).value)} /></div>
                <div className="space-y-1.5"><Label>Notes</Label><Textarea rows={3} value={notes} onChange={(e) => setNotes((e.target as HTMLTextAreaElement).value)} /></div>
              </>
            ) : (
              <>
                {client.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    {client.email}
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    {client.phone}
                  </div>
                )}
                {client.notes && <p className="text-sm text-muted-foreground">{client.notes}</p>}
                <p className="text-xs text-muted-foreground">Client since {new Date(client.created_at).toLocaleDateString()}</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Appointment History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Date</TableHead>
                  <TableHead className="w-16">Time</TableHead>
                  <TableHead>Staff</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead className="w-20 text-right">Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointments.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No appointments yet</TableCell></TableRow>
                )}
                {appointments.map((apt) => (
                  <TableRow key={apt.id} className="cursor-pointer" onClick={() => navigate(`/appointments/${apt.id}`)}>
                    <TableCell className="text-xs">{apt.scheduled_date}</TableCell>
                    <TableCell className="text-xs">{apt.start_time}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1.5">
                        {apt.staff_name && <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: apt.staff_color || "#7c3aed" }} />}
                        <span className="text-sm">{apt.staff_name || "—"}</span>
                      </span>
                    </TableCell>
                    <TableCell><StatusBadge status={apt.status} /></TableCell>
                    <TableCell className="text-right">${apt.total_price.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
