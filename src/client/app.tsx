import { useEffect, useMemo } from "preact/hooks";
import { AppContext } from "./context";
import { useAppState } from "./hooks/use-app";
import { useRouter } from "./hooks/use-router";
import { Sidebar } from "./components/sidebar";
import { Dashboard } from "./components/dashboard";
import { CalendarView } from "./components/calendar-view";
import { AppointmentList } from "./components/appointment-list";
import { AppointmentDetail } from "./components/appointment-detail";
import { ClientList } from "./components/client-list";
import { ClientDetail } from "./components/client-detail";
import { StaffList } from "./components/staff-list";
import { ServiceList } from "./components/service-list";
import { ProductList } from "./components/product-list";
import { ErrorBanner } from "./components/error-banner";

export function App() {
  const isAgent = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.has("agent") || params.get("mode") === "agent";
  }, []);

  useEffect(() => {
    if (isAgent) {
      document.documentElement.setAttribute("data-agent", "");
    }
  }, [isAgent]);

  const { view, id, navigate } = useRouter();
  const appState = useAppState(isAgent, navigate);

  useEffect(() => {
    if (view === "appointments" && id) {
      appState.selectAppointment(parseInt(id, 10));
    } else if (view === "clients" && id) {
      appState.selectClient(parseInt(id, 10));
    }
  }, [view, id]); // eslint-disable-line react-hooks/exhaustive-deps

  const renderMain = () => {
    if (view === "appointments" && id && appState.selectedAppointment) return <AppointmentDetail />;
    if (view === "clients" && id && appState.selectedClient) return <ClientDetail />;
    switch (view) {
      case "calendar": return <CalendarView />;
      case "appointments": return <AppointmentList />;
      case "clients": return <ClientList />;
      case "staff": return <StaffList />;
      case "services": return <ServiceList />;
      case "products": return <ProductList />;
      default: return <Dashboard />;
    }
  };

  return (
    <AppContext.Provider value={appState}>
      <div className="flex h-screen overflow-hidden">
        <Sidebar currentView={view} />
        <main className="flex-1 overflow-y-auto bg-background">
          {appState.loading ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">Loading...</div>
          ) : (
            renderMain()
          )}
        </main>
      </div>
      <ErrorBanner />
    </AppContext.Provider>
  );
}
