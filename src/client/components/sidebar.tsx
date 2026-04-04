import { useApp } from "../context";
import { Scissors, LayoutDashboard, CalendarDays, Clock, Users, UserCog, Sparkles, Package } from "lucide-preact";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { View } from "../types";

const navItems: { view: View; path: string; label: string; icon: typeof LayoutDashboard }[] = [
  { view: "dashboard", path: "/", label: "Dashboard", icon: LayoutDashboard },
  { view: "calendar", path: "/calendar", label: "Calendar", icon: CalendarDays },
  { view: "appointments", path: "/appointments", label: "Appointments", icon: Clock },
  { view: "clients", path: "/clients", label: "Clients", icon: Users },
  { view: "staff", path: "/staff", label: "Staff", icon: UserCog },
  { view: "services", path: "/services", label: "Services", icon: Sparkles },
  { view: "products", path: "/products", label: "Products", icon: Package },
];

export function Sidebar({ currentView }: { currentView: View }) {
  const { navigate, stats } = useApp();

  return (
    <aside className="flex h-screen w-60 flex-col border-r bg-sidebar">
      <div className="flex items-center gap-2 px-4 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Scissors className="h-4 w-4" />
        </div>
        <span className="text-base font-semibold text-sidebar-foreground">Salon Manager</span>
      </div>
      <Separator />
      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-3">
        <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Menu</p>
        {navItems.map((item) => (
          <button
            key={item.view}
            className={cn(
              "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              currentView === item.view
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            )}
            onClick={() => navigate(item.path)}
          >
            <item.icon className="h-4 w-4" />
            <span className="flex-1 text-left">{item.label}</span>
            {item.view === "appointments" && stats.appointments > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-xs">{stats.appointments}</Badge>
            )}
            {item.view === "clients" && stats.clients > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-xs">{stats.clients}</Badge>
            )}
            {item.view === "products" && stats.low_stock_products > 0 && (
              <Badge variant="destructive" className="h-5 px-1.5 text-xs">{stats.low_stock_products}</Badge>
            )}
          </button>
        ))}
      </nav>
      <Separator />
      <div className="flex items-center justify-around px-4 py-4">
        <div className="text-center">
          <div className="text-lg font-bold text-sidebar-foreground">{stats.today_appointments}</div>
          <div className="text-xs text-muted-foreground">Today</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-sidebar-foreground">{stats.upcoming_appointments}</div>
          <div className="text-xs text-muted-foreground">Upcoming</div>
        </div>
      </div>
    </aside>
  );
}
