export type View = "dashboard" | "calendar" | "appointments" | "clients" | "staff" | "services" | "products" | "reports";

export type AppointmentStatus = "booked" | "confirmed" | "in_progress" | "completed" | "cancelled" | "no_show";

export interface Appointment {
  id: number;
  identifier: string;
  client_id: number;
  staff_id: number | null;
  status: AppointmentStatus;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  total_price: number;
  notes: string;
  is_recurring: number;
  recurrence_interval: string;
  client_name?: string;
  client_phone?: string;
  staff_name?: string | null;
  staff_color?: string | null;
  appointment_services?: AppointmentService[];
  appointment_notes?: AppointmentNote[];
  created_at: string;
  updated_at: string;
}

export interface AppointmentService {
  id: number;
  appointment_id: number;
  service_id: number;
  service_name?: string;
  price: number;
  duration: number;
}

export interface AppointmentNote {
  id: number;
  appointment_id: number;
  content: string;
  created_at: string;
}

export interface Client {
  id: number;
  name: string;
  email: string;
  phone: string;
  notes: string;
  appointment_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Staff {
  id: number;
  name: string;
  email: string;
  phone: string;
  title: string;
  color: string;
  active: number;
  appointment_count?: number;
  created_at: string;
}

export interface Service {
  id: number;
  name: string;
  description: string;
  duration: number;
  price: number;
  color: string;
  category: string;
  active: number;
  created_at: string;
}

export interface BlockedSlot {
  id: number;
  staff_id: number;
  staff_name?: string;
  blocked_date: string;
  start_time: string;
  end_time: string;
  reason: string;
  created_at: string;
}

export interface Product {
  id: number;
  name: string;
  brand: string;
  category: string;
  sku: string;
  price: number;
  cost: number;
  stock: number;
  low_stock_alert: number;
  created_at: string;
  updated_at: string;
}

export interface Stats {
  appointments: number;
  clients: number;
  staff: number;
  services: number;
  products: number;
  today_appointments: number;
  upcoming_appointments: number;
  completed_appointments: number;
  revenue: number;
  low_stock_products: number;
}

export interface PaginatedState {
  page: number;
  limit: number;
  total: number;
}

export interface ClientLookup {
  id: number;
  name: string;
}

export interface StaffLookup {
  id: number;
  name: string;
  color: string;
}

// ── Checkout / till ───────────────────────────────────────────────────

export interface SaleItem {
  id: number;
  sale_id: string;
  line_no: number;
  kind: "service" | "product";
  ref_id: number | null;
  name: string;
  unit_price: number;
  qty: number;
  line_total: number;
}

export interface Sale {
  id: string;
  status: string;
  appointment_id: number | null;
  client_id: number | null;
  staff_id: number | null;
  subtotal: number;
  discount: number;
  tip: number;
  total: number;
  payment_method: string;
  note: string;
  created_at: string;
  closed_at: string | null;
  client_name?: string | null;
  staff_name?: string | null;
  appointment_identifier?: string | null;
  items?: SaleItem[];
}

export interface StaffTakings {
  staff_id: number | null;
  staff_name: string;
  staff_color: string;
  sale_count: number;
  service_revenue: number;
  retail_revenue: number;
  discount: number;
  tips: number;
  total: number;
}

export interface DayTakings {
  date: string;
  sale_count: number;
  subtotal: number;
  discount: number;
  tips: number;
  total: number;
}

export interface TakingsReport {
  from: string;
  to: string;
  totals: {
    sale_count: number;
    service_revenue: number;
    retail_revenue: number;
    discount: number;
    tips: number;
    total: number;
  };
  staff: StaffTakings[];
  days: DayTakings[];
}

export interface DateRange { from: string; to: string }
