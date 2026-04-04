import { createContext } from "preact";
import { useContext } from "preact/hooks";
import type {
  Appointment, Client, Staff, Service, Product, BlockedSlot, Stats, PaginatedState,
  ClientLookup, StaffLookup,
} from "./types";

export interface AppContextValue {
  navigate: (to: string) => void;
  isAgent: boolean;
  stats: Stats;

  // Appointments
  appointments: Appointment[];
  appointmentsPag: PaginatedState;
  setAppointmentsPage: (page: number) => void;
  appointmentsSearch: string;
  setAppointmentsSearch: (s: string) => void;
  appointmentsStatusFilter: string;
  setAppointmentsStatusFilter: (s: string) => void;
  addAppointment: (data: {
    client_id: number;
    staff_id?: number | null;
    scheduled_date: string;
    start_time?: string;
    notes?: string;
    is_recurring?: number;
    recurrence_interval?: string;
    service_ids?: number[];
  }) => Promise<void>;
  updateAppointment: (id: number, data: Partial<Appointment>) => Promise<void>;
  deleteAppointment: (id: number) => Promise<void>;

  // Appointment detail
  selectedAppointment: Appointment | null;
  selectAppointment: (id: number | null) => Promise<void>;
  addAppointmentNote: (aptId: number, content: string) => Promise<void>;
  deleteAppointmentNote: (noteId: number) => Promise<void>;

  // Calendar
  calendarAppointments: Appointment[];
  calendarBlocked: BlockedSlot[];
  calendarDate: string;
  setCalendarDate: (date: string) => void;
  addBlockedSlot: (data: { staff_id: number; blocked_date: string; start_time: string; end_time: string; reason?: string }) => Promise<void>;
  deleteBlockedSlot: (id: number) => Promise<void>;

  // Clients
  clients: Client[];
  clientsPag: PaginatedState;
  setClientsPage: (page: number) => void;
  clientsSearch: string;
  setClientsSearch: (s: string) => void;
  addClient: (data: Partial<Client>) => Promise<void>;
  updateClient: (id: number, data: Partial<Client>) => Promise<void>;
  deleteClient: (id: number) => Promise<void>;
  selectedClient: Client | null;
  selectedClientAppointments: Appointment[];
  selectClient: (id: number | null) => Promise<void>;

  // Staff
  staffMembers: Staff[];
  addStaff: (data: Partial<Staff>) => Promise<void>;
  updateStaff: (id: number, data: Partial<Staff>) => Promise<void>;
  deleteStaff: (id: number) => Promise<void>;

  // Services
  services: Service[];
  addService: (data: Partial<Service>) => Promise<void>;
  updateService: (id: number, data: Partial<Service>) => Promise<void>;
  deleteService: (id: number) => Promise<void>;

  // Products
  products: Product[];
  productsPag: PaginatedState;
  setProductsPage: (page: number) => void;
  productsSearch: string;
  setProductsSearch: (s: string) => void;
  addProduct: (data: Partial<Product>) => Promise<void>;
  updateProduct: (id: number, data: Partial<Product>) => Promise<void>;
  deleteProduct: (id: number) => Promise<void>;

  // Lookups
  clientLookup: ClientLookup[];
  staffLookup: StaffLookup[];

  loading: boolean;
  error: string | null;
  setError: (msg: string | null) => void;
}

export const AppContext = createContext<AppContextValue>(null!);

export function useApp() {
  return useContext(AppContext);
}
