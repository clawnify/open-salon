# Open Salon: The Open-Source Salonist & Fresha Alternative

An appointment booking and business management app for salons, spas, barbershops, tattoo studios, and any appointment-based business. Part of the [OpenClaw](https://github.com/openclaw/openclaw) ecosystem. Zero cloud dependencies — runs locally with SQLite.

Built with **Preact + Tailwind CSS v4 + shadcn/ui + Hono + SQLite**. Ships with a day calendar with staff columns, appointment scheduling, client database, service catalog, product inventory, and blocked time slots.

<img width="1728" height="991" alt="Image" src="https://github.com/user-attachments/assets/76b121ae-32f7-49fd-bf97-46475c014603" />

## What Is It?

Open Salon is a production-ready appointment scheduling platform designed for the OpenClaw community. Think of it as an open-source alternative to **Salonist**, **Fresha**, **Square Appointments**, **Vagaro**, or **Booksy** — a complete booking and staff management system you can self-host, customize, and embed in any SaaS product.

Unlike Salonist or Fresha, this runs entirely on your own infrastructure. No per-user fees, no booking commissions, no vendor lock-in. Manage your entire appointment-based operation from scheduling to inventory.

## Built for Every Appointment-Based Business

Open Salon is **vertical-agnostic** — configure services, pricing, and staff for any industry:

| Industry | Example Services |
|----------|-----------------|
| **Barbershops** | Haircut, beard trim, shave, lineup, hair coloring, kids cut |
| **Hair Salons** | Cut & style, blowout, balayage, highlights, keratin treatment, extensions |
| **Spas & Massage** | Swedish massage, deep tissue, hot stone, facial, body wrap, aromatherapy |
| **Tattoo Studios** | Consultation, small tattoo, large piece, cover-up, touch-up, piercing |
| **Nail Salons** | Manicure, pedicure, gel nails, acrylic, nail art, dip powder |
| **Lash & Brow Studios** | Lash extensions, lash lift, brow lamination, microblading, tinting |
| **Med Spas & Aesthetics** | Botox, fillers, chemical peel, laser treatment, microneedling, IV therapy |
| **Personal Trainers & Gyms** | PT session, group class, assessment, nutrition consult, recovery session |
| **Yoga & Pilates Studios** | Group class, private session, workshop, teacher training, meditation |
| **Physiotherapy & Chiropractic** | Initial assessment, follow-up, manual therapy, dry needling, rehab session |
| **Tutoring & Coaching** | 1-on-1 session, group session, assessment, exam prep, mentoring |
| **Pet Grooming** | Bath & brush, full groom, nail trim, teeth cleaning, de-shedding, puppy intro |

## Features

- **Day calendar view** — visual schedule with staff columns, colored appointment blocks, and day navigation (like Salonist/Square)
- **Appointment booking** — create bookings with client, staff, date/time, and multiple services; auto-calculates duration and total price
- **Blocked time slots** — mark breaks, lunch hours, or days off per staff member directly on the calendar
- **Client management** — full database with contact info, notes, preferences, and appointment history
- **Staff management** — team directory with color coding, titles/roles, activate/deactivate, and appointment counts
- **Service catalog** — configurable services with duration, price, color, and category grouping
- **Product inventory** — track retail products with cost/price, stock levels, low stock alerts, brand, and SKU
- **Multi-service bookings** — select multiple services per appointment with automatic duration and price calculation
- **Status workflow** — booked → confirmed → in progress → completed (or cancelled/no show)
- **Activity notes** — timestamped notes on every appointment for internal communication
- **Dashboard** — at-a-glance KPIs: today's appointments, upcoming count, revenue, client count, low stock alerts
- **Search & filter** — find appointments by status, search clients by name/email/phone
- **URL routing** — bookmarkable pages (`/calendar`, `/appointments/123`, `/clients`, `/staff`, `/services`, `/products`)
- **Dual-mode UI** — human-optimized + AI-agent-optimized (`?agent`)

## Quickstart

```bash
git clone https://github.com/clawnify/open-salon.git
cd open-salon
pnpm install
pnpm run dev
```

Open `http://localhost:5174` in your browser. Data persists in `data.db`.

### Agent Mode (for OpenClaw / Claude Code)

Append `?agent` to the URL:

```
http://localhost:5174/?agent
```

This activates an agent-friendly UI with:
- Explicit delete/action buttons always visible (no hover-to-reveal)
- Large click targets for reliable browser automation
- All controls accessible without drag interactions

### Using with Claude Code

Claude Code can interact with the salon through the REST API:

```bash
# Create a client
curl -X POST http://localhost:3004/api/clients \
  -H "Content-Type: application/json" \
  -d '{"name": "Jane Smith", "phone": "555-0100", "email": "jane@example.com"}'

# Book an appointment with multiple services
curl -X POST http://localhost:3004/api/appointments \
  -H "Content-Type: application/json" \
  -d '{"client_id": 1, "staff_id": 1, "scheduled_date": "2025-01-15", "start_time": "10:00", "service_ids": [1, 2]}'

# Block a time slot for lunch
curl -X POST http://localhost:3004/api/blocked-slots \
  -H "Content-Type: application/json" \
  -d '{"staff_id": 1, "blocked_date": "2025-01-15", "start_time": "12:00", "end_time": "13:00", "reason": "Lunch"}'
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Preact, TypeScript, Vite |
| **Styling** | Tailwind CSS v4, shadcn/ui |
| **Backend** | Hono, Node.js |
| **Database** | SQLite (better-sqlite3) |
| **Validation** | Zod, @hono/zod-openapi |
| **Icons** | Lucide |

### Prerequisites

- Node.js 20+
- pnpm (or npm/yarn)

## Architecture

```
src/
  server/
    schema.sql  — SQLite schema (clients, staff, services, appointments, products)
    db.ts       — SQLite wrapper (query, get, run, transaction)
    index.ts    — Hono REST API with OpenAPI schemas
    dev.ts      — Dev server with static file serving
  client/
    app.tsx           — Root component with URL routing
    context.tsx       — App context (state interface)
    lib/
      utils.ts        — cn() utility for Tailwind class merging
    hooks/
      use-app.ts      — State management, CRUD operations, API calls
      use-router.ts   — pushState URL routing
    components/
      ui/                    — shadcn/ui primitives (button, card, dialog, etc.)
      sidebar.tsx            — Navigation with appointment/client counts
      dashboard.tsx          — Stats cards + today's schedule
      calendar-view.tsx      — Day calendar with staff columns
      appointment-list.tsx   — Paginated appointment list with status filters
      appointment-detail.tsx — Appointment detail with services, notes
      create-appointment.tsx — New booking dialog with service picker
      client-list.tsx        — Paginated client list with search
      client-detail.tsx      — Client profile + appointment history
      create-client.tsx      — New client dialog
      staff-list.tsx         — Staff card grid with color avatars
      create-staff.tsx       — New staff dialog with color picker
      service-list.tsx       — Service catalog with category grouping
      create-service.tsx     — New service dialog
      product-list.tsx       — Product inventory with low stock alerts
      create-product.tsx     — New product dialog
      status-badge.tsx       — Appointment status badges
      pagination.tsx         — Pagination controls
      error-banner.tsx       — Toast-style error display
```

### Data Model

```sql
clients              (id, name, email, phone, notes)
staff                (id, name, email, phone, title, color, active)
services             (id, name, description, duration, price, color, category, active)
appointments         (id, identifier, client_id, staff_id, status, scheduled_date,
                      start_time, end_time, total_price, notes, is_recurring,
                      recurrence_interval)
appointment_services (id, appointment_id, service_id, price, duration)
appointment_notes    (id, appointment_id, content)
blocked_slots        (id, staff_id, blocked_date, start_time, end_time, reason)
products             (id, name, brand, category, sku, price, cost, stock,
                      low_stock_alert)
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stats` | Dashboard statistics |
| GET | `/api/calendar` | Appointments + blocked slots for date range |
| GET | `/api/appointments` | List appointments (paginated, filterable) |
| POST | `/api/appointments` | Create appointment with service IDs |
| GET | `/api/appointments/:id` | Appointment detail with services and notes |
| PUT | `/api/appointments/:id` | Update appointment |
| DELETE | `/api/appointments/:id` | Delete appointment |
| POST | `/api/appointments/:id/notes` | Add appointment note |
| DELETE | `/api/notes/:id` | Delete a note |
| GET | `/api/clients` | List clients (paginated, searchable) |
| GET | `/api/clients/all` | All clients for lookup dropdowns |
| POST | `/api/clients` | Create a client |
| GET | `/api/clients/:id` | Client detail with appointment history |
| PUT | `/api/clients/:id` | Update a client |
| DELETE | `/api/clients/:id` | Delete a client |
| GET | `/api/staff` | List staff with appointment counts |
| GET | `/api/staff/all` | Active staff for lookup dropdowns |
| POST | `/api/staff` | Create staff member |
| PUT | `/api/staff/:id` | Update staff member |
| DELETE | `/api/staff/:id` | Delete staff member |
| GET | `/api/services` | List services |
| POST | `/api/services` | Create a service |
| PUT | `/api/services/:id` | Update a service |
| DELETE | `/api/services/:id` | Delete a service |
| POST | `/api/blocked-slots` | Create blocked time slot |
| DELETE | `/api/blocked-slots/:id` | Delete blocked time slot |
| GET | `/api/products` | List products (paginated, searchable) |
| POST | `/api/products` | Create a product |
| PUT | `/api/products/:id` | Update a product |
| DELETE | `/api/products/:id` | Delete a product |

## SEO Keywords

Open-source salon management software, free appointment booking software, open-source Salonist alternative, open-source Fresha alternative, free barbershop scheduling software, open-source Square Appointments alternative, open-source Vagaro alternative, free spa management software, open-source Booksy alternative, salon booking app, appointment scheduling software, staff scheduling software, beauty salon management, open-source booking system, free nail salon software, tattoo studio management, pet grooming software, self-hosted appointment booking, open-source salon POS, free yoga studio software, physiotherapy scheduling software, tutoring booking software, med spa management software.

## Community & Contributions

This project is part of the [OpenClaw](https://github.com/openclaw/openclaw) ecosystem. Contributions are welcome — open an issue or submit a PR.

## License

AGPL-3.0
