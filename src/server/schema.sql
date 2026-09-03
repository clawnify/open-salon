-- Clients (customers who book appointments)
CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Staff members (stylists, therapists, technicians, etc.)
CREATE TABLE IF NOT EXISTS staff (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  title TEXT DEFAULT '',
  color TEXT NOT NULL DEFAULT '#7c3aed',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Services offered (haircut, massage, manicure, etc.)
CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  duration INTEGER NOT NULL DEFAULT 60,
  price REAL NOT NULL DEFAULT 0,
  color TEXT NOT NULL DEFAULT '#6b7280',
  category TEXT DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Appointments (bookings)
CREATE TABLE IF NOT EXISTS appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  identifier TEXT NOT NULL UNIQUE,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  staff_id INTEGER REFERENCES staff(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'booked',
  scheduled_date TEXT NOT NULL DEFAULT (date('now')),
  start_time TEXT NOT NULL DEFAULT '09:00',
  end_time TEXT NOT NULL DEFAULT '10:00',
  total_price REAL NOT NULL DEFAULT 0,
  notes TEXT DEFAULT '',
  is_recurring INTEGER NOT NULL DEFAULT 0,
  recurrence_interval TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Services included in an appointment (many-to-many)
CREATE TABLE IF NOT EXISTS appointment_services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  appointment_id INTEGER NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  price REAL NOT NULL DEFAULT 0,
  duration INTEGER NOT NULL DEFAULT 60
);

-- Appointment notes / activity log
CREATE TABLE IF NOT EXISTS appointment_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  appointment_id INTEGER NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Blocked time slots (breaks, days off, lunch, etc.)
CREATE TABLE IF NOT EXISTS blocked_slots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  staff_id INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  blocked_date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  reason TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);

-- Products (inventory: shampoo, creams, tools, etc.)
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  brand TEXT DEFAULT '',
  category TEXT DEFAULT '',
  sku TEXT DEFAULT '',
  price REAL NOT NULL DEFAULT 0,
  cost REAL NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  low_stock_alert INTEGER NOT NULL DEFAULT 5,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Auto-incrementing identifier counter
CREATE TABLE IF NOT EXISTS _meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
INSERT OR IGNORE INTO _meta (key, value) VALUES ('appointment_counter', '0');
INSERT OR IGNORE INTO _meta (key, value) VALUES ('appointment_prefix', 'APT');

-- Example staff
INSERT OR IGNORE INTO staff (id, name, email, title, color)
VALUES
  (1, 'Alex', 'alex@example.com', 'Senior Stylist', '#3b82f6'),
  (2, 'Jordan', 'jordan@example.com', 'Therapist', '#10b981'),
  (3, 'Sam', 'sam@example.com', 'Specialist', '#f59e0b'),
  (4, 'Taylor', 'taylor@example.com', 'Junior Stylist', '#8b5cf6');

-- Example services (generic so they work across verticals)
INSERT OR IGNORE INTO services (id, name, description, duration, price, color, category)
VALUES
  (1, 'Standard Session', 'Standard appointment', 60, 50, '#3b82f6', 'General'),
  (2, 'Quick Service', 'Short appointment', 30, 30, '#10b981', 'General'),
  (3, 'Premium Session', 'Extended premium service', 90, 85, '#8b5cf6', 'Premium'),
  (4, 'Express Touch-up', 'Quick 15-minute service', 15, 20, '#f59e0b', 'Express'),
  (5, 'Consultation', 'Initial consultation', 30, 0, '#6b7280', 'General'),
  (6, 'Package Deal', 'Multiple services bundled', 120, 120, '#ec4899', 'Premium');

-- Example clients
INSERT OR IGNORE INTO clients (id, name, email, phone)
VALUES
  (1, 'Jamie Rivera', 'jamie@example.com', '555-0101'),
  (2, 'Casey Morgan', 'casey@example.com', '555-0102'),
  (3, 'Riley Chen', 'riley@example.com', '555-0103'),
  (4, 'Dakota Smith', 'dakota@example.com', '555-0104');

-- Example products
INSERT OR IGNORE INTO products (id, name, brand, category, price, cost, stock)
VALUES
  (1, 'Professional Shampoo', 'ProCare', 'Hair Care', 24.99, 12.00, 25),
  (2, 'Styling Gel', 'ProCare', 'Styling', 15.99, 7.50, 40),
  (3, 'Moisturizing Cream', 'SkinLux', 'Skin Care', 32.99, 16.00, 18),
  (4, 'Essential Oil Set', 'AromaPlus', 'Wellness', 45.99, 22.00, 12);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_appointments_client ON appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_staff ON appointments(staff_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointment_services_apt ON appointment_services(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointment_notes_apt ON appointment_notes(appointment_id);
CREATE INDEX IF NOT EXISTS idx_blocked_slots_staff ON blocked_slots(staff_id);
CREATE INDEX IF NOT EXISTS idx_blocked_slots_date ON blocked_slots(blocked_date);
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);

-- ── Checkout / till ────────────────────────────────────────────────────
--
-- A sale is the money record: what was actually taken, as opposed to
-- `appointments.total_price`, which is what was quoted when the booking was
-- made. Keeping them separate is the whole point — the gap between booked and
-- taken (discounts given, tips earned, retail added at the desk) is what the
-- staff report is made of, and overwriting the quote would destroy it.
--
-- `appointment_id` is nullable on purpose: a walk-in buying shampoo is a sale
-- with no appointment. Square models this the same way — its Order object
-- carries no booking reference at all.
--
-- WRITE ORDER MATTERS. There is no transaction available here: the app's db
-- surface (@clawnify/db query/get/run) is one statement per call, with no
-- multi-statement batching on either supported storage backend. Foreign keys
-- are enforced, so children cannot be written before their parent. The sale
-- is therefore written header-first as
-- status='open', then its items, and the final flip to 'closed' is the commit
-- point. Reports count 'closed' only, so a half-written sale is invisible
-- rather than wrong, and replaying the same sale id completes it instead of
-- duplicating it.
CREATE TABLE IF NOT EXISTS sales (
  -- Caller-supplied UUID. This is the idempotency key: retrying a checkout
  -- with the same id resumes it rather than ringing it up twice.
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'open',
  appointment_id INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
  client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  staff_id INTEGER REFERENCES staff(id) ON DELETE SET NULL,
  -- Money is REAL to match `services.price` / `appointments.total_price`.
  -- Integer cents would be more correct; two money conventions in one app
  -- would be worse. Totals are rounded to 2dp as they are computed.
  subtotal REAL NOT NULL DEFAULT 0,
  discount REAL NOT NULL DEFAULT 0,
  tip REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  note TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  closed_at TEXT
);

-- One row per line on the ticket. `name` and `unit_price` are snapshots: a
-- closed sale must keep reading the same way after someone edits the service
-- catalogue or a product price.
CREATE TABLE IF NOT EXISTS sale_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  -- Position on the ticket. Paired with sale_id this makes writing a line
  -- idempotent (INSERT OR IGNORE) while still allowing the same product to
  -- appear twice, which is a normal thing for a front desk to do.
  line_no INTEGER NOT NULL,
  kind TEXT NOT NULL,                -- 'service' | 'product'
  ref_id INTEGER,                    -- services.id or products.id, if it still exists
  name TEXT NOT NULL,
  unit_price REAL NOT NULL DEFAULT 0,
  qty INTEGER NOT NULL DEFAULT 1,
  line_total REAL NOT NULL DEFAULT 0,
  UNIQUE (sale_id, line_no)
);

-- Why this table exists: `UPDATE products SET stock = stock - ?` is not
-- idempotent, and without a transaction a retried checkout would decrement
-- twice. This row is the guard — INSERT OR IGNORE on (sale_id, product_id)
-- succeeds exactly once per sale, and the stock decrement is applied only
-- when it does. It doubles as the audit trail for reconciling on-hand counts.
CREATE TABLE IF NOT EXISTS stock_movements (
  sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  qty INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (sale_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_sales_status_closed ON sales(status, closed_at);
CREATE INDEX IF NOT EXISTS idx_sales_staff ON sales(staff_id);
CREATE INDEX IF NOT EXISTS idx_sales_appointment ON sales(appointment_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
