import { useState, useCallback, useEffect } from "preact/hooks";
import { api } from "../api";
import type {
  Appointment, Client, Staff, Service, Product, BlockedSlot, Stats, PaginatedState,
  ClientLookup, StaffLookup,
} from "../types";
import type { AppContextValue } from "../context";

export function useAppState(isAgent: boolean, navigate: (to: string) => void): AppContextValue {
  const [stats, setStats] = useState<Stats>({ appointments: 0, clients: 0, staff: 0, services: 0, products: 0, today_appointments: 0, upcoming_appointments: 0, completed_appointments: 0, revenue: 0, low_stock_products: 0 });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Appointments
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [appointmentsPag, setAppointmentsPag] = useState<PaginatedState>({ page: 1, limit: 50, total: 0 });
  const [appointmentsSearch, setAppointmentsSearch] = useState("");
  const [appointmentsStatusFilter, setAppointmentsStatusFilter] = useState("");
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  // Calendar
  const todayStr = new Date().toISOString().split("T")[0];
  const [calendarDate, setCalendarDate] = useState(todayStr);
  const [calendarAppointments, setCalendarAppointments] = useState<Appointment[]>([]);
  const [calendarBlocked, setCalendarBlocked] = useState<BlockedSlot[]>([]);

  // Clients
  const [clients, setClients] = useState<Client[]>([]);
  const [clientsPag, setClientsPag] = useState<PaginatedState>({ page: 1, limit: 50, total: 0 });
  const [clientsSearch, setClientsSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedClientAppointments, setSelectedClientAppointments] = useState<Appointment[]>([]);

  // Staff, Services
  const [staffMembers, setStaffMembers] = useState<Staff[]>([]);
  const [services, setServices] = useState<Service[]>([]);

  // Products
  const [products, setProducts] = useState<Product[]>([]);
  const [productsPag, setProductsPag] = useState<PaginatedState>({ page: 1, limit: 50, total: 0 });
  const [productsSearch, setProductsSearch] = useState("");

  // Lookups
  const [clientLookup, setClientLookup] = useState<ClientLookup[]>([]);
  const [staffLookup, setStaffLookup] = useState<StaffLookup[]>([]);

  // ── Fetch helpers ──

  const fetchStats = useCallback(async () => {
    const data = await api<Stats>("GET", "/api/stats");
    setStats(data);
  }, []);

  const fetchAppointments = useCallback(async (pag: PaginatedState, search: string, status: string) => {
    const params = new URLSearchParams({ page: String(pag.page), limit: String(pag.limit) });
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    const data = await api<{ appointments: Appointment[]; total: number }>("GET", `/api/appointments?${params}`);
    setAppointments(data.appointments);
    setAppointmentsPag((prev) => ({ ...prev, total: data.total }));
  }, []);

  const fetchCalendar = useCallback(async (date: string) => {
    const data = await api<{ appointments: Appointment[]; blocked_slots: BlockedSlot[] }>("GET", `/api/calendar?start=${date}&end=${date}`);
    setCalendarAppointments(data.appointments);
    setCalendarBlocked(data.blocked_slots);
  }, []);

  const fetchClients = useCallback(async (pag: PaginatedState, search: string) => {
    const params = new URLSearchParams({ page: String(pag.page), limit: String(pag.limit) });
    if (search) params.set("search", search);
    const data = await api<{ clients: Client[]; total: number }>("GET", `/api/clients?${params}`);
    setClients(data.clients);
    setClientsPag((prev) => ({ ...prev, total: data.total }));
  }, []);

  const fetchStaff = useCallback(async () => {
    const data = await api<{ staff: Staff[] }>("GET", "/api/staff");
    setStaffMembers(data.staff);
  }, []);

  const fetchServices = useCallback(async () => {
    const data = await api<{ services: Service[] }>("GET", "/api/services");
    setServices(data.services);
  }, []);

  const fetchProducts = useCallback(async (pag: PaginatedState, search: string) => {
    const params = new URLSearchParams({ page: String(pag.page), limit: String(pag.limit) });
    if (search) params.set("search", search);
    const data = await api<{ products: Product[]; total: number }>("GET", `/api/products?${params}`);
    setProducts(data.products);
    setProductsPag((prev) => ({ ...prev, total: data.total }));
  }, []);

  const fetchLookups = useCallback(async () => {
    const [c, s] = await Promise.all([
      api<{ clients: ClientLookup[] }>("GET", "/api/clients/all"),
      api<{ staff: StaffLookup[] }>("GET", "/api/staff/all"),
    ]);
    setClientLookup(c.clients);
    setStaffLookup(s.staff);
  }, []);

  // ── Initial load ──

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchStats(),
          fetchAppointments(appointmentsPag, "", ""),
          fetchCalendar(calendarDate),
          fetchClients(clientsPag, ""),
          fetchStaff(),
          fetchServices(),
          fetchProducts(productsPag, ""),
          fetchLookups(),
        ]);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchAppointments(appointmentsPag, appointmentsSearch, appointmentsStatusFilter).catch((err) => setError((err as Error).message));
  }, [appointmentsPag.page, appointmentsSearch, appointmentsStatusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchCalendar(calendarDate).catch((err) => setError((err as Error).message));
  }, [calendarDate]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchClients(clientsPag, clientsSearch).catch((err) => setError((err as Error).message));
  }, [clientsPag.page, clientsSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchProducts(productsPag, productsSearch).catch((err) => setError((err as Error).message));
  }, [productsPag.page, productsSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Appointments CRUD ──

  const setAppointmentsPage = useCallback((page: number) => setAppointmentsPag((p) => ({ ...p, page })), []);

  const addAppointment = useCallback(async (data: {
    client_id: number; staff_id?: number | null; scheduled_date: string;
    start_time?: string; notes?: string; is_recurring?: number; recurrence_interval?: string; service_ids?: number[];
  }) => {
    await api("POST", "/api/appointments", data);
    await fetchAppointments(appointmentsPag, appointmentsSearch, appointmentsStatusFilter);
    await Promise.all([fetchStats(), fetchCalendar(calendarDate)]);
  }, [appointmentsPag, appointmentsSearch, appointmentsStatusFilter, calendarDate, fetchAppointments, fetchStats, fetchCalendar]);

  const updateAppointment = useCallback(async (id: number, data: Partial<Appointment>) => {
    await api("PUT", `/api/appointments/${id}`, data);
    await fetchAppointments(appointmentsPag, appointmentsSearch, appointmentsStatusFilter);
    if (selectedAppointment && selectedAppointment.id === id) {
      const res = await api<{ appointment: Appointment }>("GET", `/api/appointments/${id}`);
      setSelectedAppointment(res.appointment);
    }
    await Promise.all([fetchStats(), fetchCalendar(calendarDate)]);
  }, [appointmentsPag, appointmentsSearch, appointmentsStatusFilter, selectedAppointment, calendarDate, fetchAppointments, fetchStats, fetchCalendar]);

  const deleteAppointment = useCallback(async (id: number) => {
    await api("DELETE", `/api/appointments/${id}`);
    if (selectedAppointment && selectedAppointment.id === id) { setSelectedAppointment(null); navigate("/appointments"); }
    await fetchAppointments(appointmentsPag, appointmentsSearch, appointmentsStatusFilter);
    await Promise.all([fetchStats(), fetchCalendar(calendarDate)]);
  }, [appointmentsPag, appointmentsSearch, appointmentsStatusFilter, selectedAppointment, calendarDate, navigate, fetchAppointments, fetchStats, fetchCalendar]);

  const selectAppointment = useCallback(async (id: number | null) => {
    if (id === null) { setSelectedAppointment(null); return; }
    const res = await api<{ appointment: Appointment }>("GET", `/api/appointments/${id}`);
    setSelectedAppointment(res.appointment);
  }, []);

  const addAppointmentNote = useCallback(async (aptId: number, content: string) => {
    await api("POST", `/api/appointments/${aptId}/notes`, { content });
    const res = await api<{ appointment: Appointment }>("GET", `/api/appointments/${aptId}`);
    setSelectedAppointment(res.appointment);
  }, []);

  const deleteAppointmentNote = useCallback(async (noteId: number) => {
    await api("DELETE", `/api/notes/${noteId}`);
    if (selectedAppointment) {
      const res = await api<{ appointment: Appointment }>("GET", `/api/appointments/${selectedAppointment.id}`);
      setSelectedAppointment(res.appointment);
    }
  }, [selectedAppointment]);

  // ── Calendar / Blocked Slots ──

  const addBlockedSlot = useCallback(async (data: { staff_id: number; blocked_date: string; start_time: string; end_time: string; reason?: string }) => {
    await api("POST", "/api/blocked-slots", data);
    await fetchCalendar(calendarDate);
  }, [calendarDate, fetchCalendar]);

  const deleteBlockedSlot = useCallback(async (id: number) => {
    await api("DELETE", `/api/blocked-slots/${id}`);
    await fetchCalendar(calendarDate);
  }, [calendarDate, fetchCalendar]);

  // ── Clients CRUD ──

  const setClientsPage = useCallback((page: number) => setClientsPag((p) => ({ ...p, page })), []);

  const addClient = useCallback(async (data: Partial<Client>) => {
    await api("POST", "/api/clients", data);
    await fetchClients(clientsPag, clientsSearch);
    await Promise.all([fetchStats(), fetchLookups()]);
  }, [clientsPag, clientsSearch, fetchClients, fetchStats, fetchLookups]);

  const updateClient = useCallback(async (id: number, data: Partial<Client>) => {
    await api("PUT", `/api/clients/${id}`, data);
    await fetchClients(clientsPag, clientsSearch);
    await fetchLookups();
    if (selectedClient && selectedClient.id === id) {
      const res = await api<{ client: Client; appointments: Appointment[] }>("GET", `/api/clients/${id}`);
      setSelectedClient(res.client);
      setSelectedClientAppointments(res.appointments);
    }
  }, [clientsPag, clientsSearch, selectedClient, fetchClients, fetchLookups]);

  const deleteClient = useCallback(async (id: number) => {
    await api("DELETE", `/api/clients/${id}`);
    if (selectedClient && selectedClient.id === id) {
      setSelectedClient(null);
      setSelectedClientAppointments([]);
      navigate("/clients");
    }
    await fetchClients(clientsPag, clientsSearch);
    await Promise.all([fetchStats(), fetchLookups()]);
  }, [clientsPag, clientsSearch, selectedClient, navigate, fetchClients, fetchStats, fetchLookups]);

  const selectClient = useCallback(async (id: number | null) => {
    if (id === null) { setSelectedClient(null); setSelectedClientAppointments([]); return; }
    const res = await api<{ client: Client; appointments: Appointment[] }>("GET", `/api/clients/${id}`);
    setSelectedClient(res.client);
    setSelectedClientAppointments(res.appointments);
  }, []);

  // ── Staff CRUD ──

  const addStaff = useCallback(async (data: Partial<Staff>) => {
    await api("POST", "/api/staff", data);
    await fetchStaff();
    await Promise.all([fetchStats(), fetchLookups()]);
  }, [fetchStaff, fetchStats, fetchLookups]);

  const updateStaff = useCallback(async (id: number, data: Partial<Staff>) => {
    await api("PUT", `/api/staff/${id}`, data);
    await fetchStaff();
    await fetchLookups();
  }, [fetchStaff, fetchLookups]);

  const deleteStaff = useCallback(async (id: number) => {
    await api("DELETE", `/api/staff/${id}`);
    await fetchStaff();
    await Promise.all([fetchStats(), fetchLookups()]);
  }, [fetchStaff, fetchStats, fetchLookups]);

  // ── Services CRUD ──

  const addService = useCallback(async (data: Partial<Service>) => {
    await api("POST", "/api/services", data);
    await fetchServices();
    await fetchStats();
  }, [fetchServices, fetchStats]);

  const updateService = useCallback(async (id: number, data: Partial<Service>) => {
    await api("PUT", `/api/services/${id}`, data);
    await fetchServices();
  }, [fetchServices]);

  const deleteService = useCallback(async (id: number) => {
    await api("DELETE", `/api/services/${id}`);
    await fetchServices();
    await fetchStats();
  }, [fetchServices, fetchStats]);

  // ── Products CRUD ──

  const setProductsPage = useCallback((page: number) => setProductsPag((p) => ({ ...p, page })), []);

  const addProduct = useCallback(async (data: Partial<Product>) => {
    await api("POST", "/api/products", data);
    await fetchProducts(productsPag, productsSearch);
    await fetchStats();
  }, [productsPag, productsSearch, fetchProducts, fetchStats]);

  const updateProduct = useCallback(async (id: number, data: Partial<Product>) => {
    await api("PUT", `/api/products/${id}`, data);
    await fetchProducts(productsPag, productsSearch);
  }, [productsPag, productsSearch, fetchProducts]);

  const deleteProduct = useCallback(async (id: number) => {
    await api("DELETE", `/api/products/${id}`);
    await fetchProducts(productsPag, productsSearch);
    await fetchStats();
  }, [productsPag, productsSearch, fetchProducts, fetchStats]);

  return {
    navigate, isAgent, stats,
    appointments, appointmentsPag, setAppointmentsPage, appointmentsSearch, setAppointmentsSearch,
    appointmentsStatusFilter, setAppointmentsStatusFilter,
    addAppointment, updateAppointment, deleteAppointment,
    selectedAppointment, selectAppointment, addAppointmentNote, deleteAppointmentNote,
    calendarAppointments, calendarBlocked, calendarDate, setCalendarDate,
    addBlockedSlot, deleteBlockedSlot,
    clients, clientsPag, setClientsPage, clientsSearch, setClientsSearch,
    addClient, updateClient, deleteClient,
    selectedClient, selectedClientAppointments, selectClient,
    staffMembers, addStaff, updateStaff, deleteStaff,
    services, addService, updateService, deleteService,
    products, productsPag, setProductsPage, productsSearch, setProductsSearch,
    addProduct, updateProduct, deleteProduct,
    clientLookup, staffLookup,
    loading, error, setError,
  };
}
