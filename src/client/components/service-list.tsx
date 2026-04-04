import { useState } from "preact/hooks";
import { useApp } from "../context";
import { Plus, Trash2 } from "lucide-preact";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CreateService } from "./create-service";

export function ServiceList() {
  const { services, deleteService, updateService } = useApp();
  const [showCreate, setShowCreate] = useState(false);

  const categories = [...new Set(services.map((s) => s.category).filter(Boolean))];

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Services</h1>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Add Service
        </Button>
      </div>

      {showCreate && <CreateService onClose={() => setShowCreate(false)} />}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Name</TableHead>
                <TableHead className="w-28">Category</TableHead>
                <TableHead className="w-24 text-center">Duration</TableHead>
                <TableHead className="w-20 text-right">Price</TableHead>
                <TableHead className="w-20">Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.length === 0 && (
                <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">No services yet</TableCell></TableRow>
              )}
              {services.map((svc) => (
                <TableRow key={svc.id}>
                  <TableCell>
                    <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: svc.color }} />
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{svc.name}</div>
                    {svc.description && <div className="text-xs text-muted-foreground">{svc.description}</div>}
                  </TableCell>
                  <TableCell>
                    {svc.category && <Badge variant="outline" className="text-xs">{svc.category}</Badge>}
                  </TableCell>
                  <TableCell className="text-center">{svc.duration} min</TableCell>
                  <TableCell className="text-right font-medium">${svc.price.toFixed(2)}</TableCell>
                  <TableCell>
                    <button
                      className={`text-xs font-medium ${svc.active ? "text-emerald-600" : "text-muted-foreground"}`}
                      onClick={() => updateService(svc.id, { active: svc.active ? 0 : 1 })}
                    >
                      {svc.active ? "Active" : "Inactive"}
                    </button>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteService(svc.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
