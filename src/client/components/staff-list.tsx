import { useState } from "preact/hooks";
import { useApp } from "../context";
import { Plus, Trash2, Pencil } from "lucide-preact";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateStaff } from "./create-staff";

export function StaffList() {
  const { staffMembers, deleteStaff, updateStaff } = useApp();
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Staff</h1>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Add Staff
        </Button>
      </div>

      {showCreate && <CreateStaff onClose={() => setShowCreate(false)} />}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {staffMembers.map((s) => (
          <Card key={s.id}>
            <CardContent className="flex items-start gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-white" style={{ backgroundColor: s.color }}>
                {s.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{s.name}</h3>
                  {!s.active && <Badge variant="secondary">Inactive</Badge>}
                </div>
                {s.title && <p className="text-sm text-muted-foreground">{s.title}</p>}
                {s.email && <p className="text-xs text-muted-foreground">{s.email}</p>}
                {s.phone && <p className="text-xs text-muted-foreground">{s.phone}</p>}
                <p className="mt-1 text-xs text-muted-foreground">{s.appointment_count || 0} appointments</p>
              </div>
              <div className="flex gap-1">
                {s.active ? (
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => updateStaff(s.id, { active: 0 })}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => updateStaff(s.id, { active: 1 })}>Activate</Button>
                )}
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteStaff(s.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {staffMembers.length === 0 && (
          <p className="col-span-full py-12 text-center text-muted-foreground">No staff members yet</p>
        )}
      </div>
    </div>
  );
}
