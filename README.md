# NetPulse — ISP ERP, CRM & Network Operations Platform

NetPulse is a full-stack **ISP (Internet Service Provider)** ERP, CRM, and Network Operations platform built with **React 18, TypeScript, Vite, Express 5, Prisma ORM, and PostgreSQL 16**. It covers subscriber CRM, broadband packages & subscriptions, MikroTik RouterOS / VLAN / IPAM operations, billing & Bakong KHQR payments, double-entry accounting, multi-warehouse inventory & procurement, field dispatch, customer self-service portal, and a database-backed **Roles, Permissions & Dynamic Navigation** engine.

---

## Key Features

### 1. Subscriber CRM & Operations
- **Customers Hub (`/customers`)**: Search, multi-filter toolbar, status tabs (`Active`, `Suspended`, `Overdue`, `Pending`, `Disconnected`), bulk actions bar, table/compact/card views, column customization, CSV/XLSX export, and a 6-tab **Customer Detail Drawer** (Overview, Billing History, 14-day Usage Chart, Tickets, Activity Log, Internal Notes).
- **Modals & Diagnostics**: 3-step subscriber onboarding wizard (`React Hook Form` + `Zod`), payment recording, SMS/Email broadcast messaging, suspension status workflow, and diagnostic line speed tests.
- **Broadband Plans (`/plans`)**: Fiber, Wireless, and DSL package catalog synced with PostgreSQL via Prisma.
- **Network & Infrastructure (`/network`)**: MikroTik RouterOS fleet monitoring, PPPoE provisioning & active session telemetry, scope-aware VLAN catalog, and IPAM subnet/pool allocation (with built-in RouterOS simulator fallback).
- **Billing, Payments & Accounting (`/billing`, `/payments`, `/accounting`)**: Invoice lifecycle, cashier counter payments, Bakong KHQR payload generation, Chart of Accounts, balanced Journal Entries, Trial Balance, P&L, Balance Sheet, and AR Aging.
- **Inventory & Procurement (`/inventory/products`, `/inventory/warehouses`, `/inventory/procurement`)**: Multi-warehouse stock movements (`IN`, `OUT`, `TRANSFER`), serialized ONT/CPE tracking, suppliers, purchase orders, and Goods Received Notes (GRN).
- **Field Operations & Support (`/installations`, `/technicians`, `/tickets`)**: Installation dispatch workflow, technician roster, and support ticket queues.
- **Customer Portal (`/portal`) & Platform Tools (`/reports`, `/messages`, `/automation`, `/integrations`, `/settings`, `/settings/users`, `/settings/audit`)**: Self-service portal preview, automated billing/overdue/router health jobs, command palette (`Ctrl+K` / `⌘K`), and audit log viewer.

### 2. Dynamic RBAC, Permissions Matrix & Feature Navigation (`/settings/roles`)
- **Modular Registry (`server/src/rbac/registry/`)**: Single source of truth for permissions, UI features (`MENU`, `PAGE`, `TAB`, `ACTION`), dependency chains (`dependsOnKey`), and default role mappings, automatically synchronized to PostgreSQL at startup via `RbacService.syncRegistry()`.
- **Permissions Matrix**: Role-by-permission matrix with sticky column headers, tri-state module toggles, cascading dependency rules, keyboard navigation, Shift+click range selection, optimistic concurrency checks (`expectedUpdatedAt` / `409 STALE_UPDATE`), and custom role creation/duplication/renaming/deletion.
- **Users & Dynamic Menus**: Assign staff roles in the **Users** tab and configure sidebar menu items, route permissions, `ANY`/`ALL` evaluation mode, sort order, and active flags in the **Menus & Features** tab (`page.roles` is locked against accidental admin lockout).

---

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite 5, Tailwind CSS 3 (CSS variables, dark mode, eye-comfort & density modes), Framer Motion, Zustand, TanStack Query / Table / Virtual, Recharts, React Hook Form, Zod, Lucide React, SheetJS (`xlsx`).
- **Backend**: Node.js, Express 5, TypeScript, Prisma ORM, PostgreSQL 16, `jsonwebtoken`, `bcryptjs`, `cookie-parser`, `helmet`, `cors`, `zod`, OpenAPI 3.0 + Swagger UI (`/api/docs`).
- **Testing & Tooling**: Node built-in test runner (`node --test`), Playwright E2E (`@playwright/test`), ESLint 10, Docker & Nginx.

---

## Project Structure

```text
isp-system-2/
├── .env.example                 # Environment variable template
├── docker-compose.yml           # Postgres 16, Redis 7, Backend (:5000), Frontend Nginx (:80)
├── Dockerfile.backend           # Multi-stage Node 20 backend image
├── Dockerfile.frontend          # Vite build + Nginx runner image
├── nginx.conf                   # SPA fallback + /api reverse proxy
├── package.json                 # Scripts & workspace dependencies
├── playwright.config.ts         # Playwright E2E config (baseURL http://127.0.0.1:5173)
├── tailwind.config.js           # Tailwind theme tokens mapped to CSS variables
├── vite.config.ts               # Vite dev server (:5173) + /api proxy -> 127.0.0.1:5000
├── prisma/
│   ├── schema.prisma            # 56-model PostgreSQL schema
│   ├── seed.ts                  # Super Admin, dev demo users, and RBAC matrix seed
│   ├── migrations/              # Prisma SQL migrations
│   └── backups/                 # SQL backup snapshots
├── scripts/
│   ├── dev-all.mjs              # Compiles server, runs tsc -w + node --watch + vite
│   ├── seed-admin.mjs           # Standalone admin/demo user seed script
│   ├── db-backup.sh             # Compressed pg_dump backup script
│   ├── db-restore.sh            # Compressed psql restore script
│   ├── test-regression.mjs      # DataTable & UI regression test suite (22 checks)
│   └── test-auth-frontend.mjs   # Frontend auth & RBAC validation test suite (7 tests)
├── server/
│   ├── tsconfig.json            # Compiles server/src -> dist-server/
│   ├── src/
│   │   ├── server.ts            # Express app, DB startup check, RBAC sync, route mounts
│   │   ├── db/
│   │   │   ├── store.ts         # Prisma client, initDatabaseConnection(), in-memory dbStore
│   │   │   └── seedData.ts      # In-memory domain seed data
│   │   ├── docs/openapi.ts      # OpenAPI 3.0 spec served at /api/v1/openapi.json
│   │   ├── middleware/
│   │   │   └── auth.middleware.ts # JWT authenticate, authorize, requireRole, requireFeature, Zod
│   │   ├── rbac/registry/       # Modular permissions, features & default role definitions
│   │   ├── routes/              # Express v1 route modules (14 domain route files)
│   │   └── services/            # Domain & auth/RBAC services
│   └── test/
│       ├── netpulse.test.mjs    # Backend service integration suite
│       ├── rbac.test.mjs        # RBAC API & DB matrix suite
│       └── features-frontend.test.mjs # Feature permission mode evaluation tests
├── src/
│   ├── main.tsx                 # React 18 mount
│   ├── App.tsx                  # Router, theme/comfort/density init, session restore, route guards
│   ├── index.css                # Global CSS tokens (--brand #EA6A3C, light/dark themes)
│   ├── components/
│   │   ├── auth/                # ProtectedRoute, RequirePermission
│   │   ├── layout/              # Sidebar (dynamic navigation), TopBar, CommandPalette, NotificationPanel
│   │   └── ui/                  # Button, Combobox, DataTable, DatePicker, Drawer, Modal, etc.
│   ├── features/
│   │   ├── customers/           # CustomerTable, CustomerDetailDrawer, onboarding & action modals
│   │   ├── inventory/           # ProductsPage & product modals
│   │   └── roles/               # PermissionsMatrix, MatrixHeader, UsersTab, FeaturesTab, MobileRoleView
│   ├── lib/                     # api.ts (SHA-256 pre-hash + auto-refresh), permissions.ts, motion.ts
│   ├── pages/                   # Route pages (Dashboard, Billing, Network, RolesPage, etc.)
│   └── store/                   # authStore.ts (in-memory JWT) & useStore.ts (UI preferences)
├── test/unit/
│   └── rbac-matrix.test.mjs     # Matrix tri-state, dependency & diff unit tests
└── tests/                       # Playwright E2E specs (*.spec.ts)
```

---

## Local Setup & Installation

### Prerequisites
- **Node.js**: `v22.6+` recommended (`npm run db:seed` uses `node --experimental-strip-types` to run `prisma/seed.ts`; Node 20 works for build/runtime and `scripts/seed-admin.mjs`).
- **PostgreSQL 16**: Local instance or Docker container (`docker compose up -d postgres`).
- **npm**

### 1. Install Dependencies & Configure Environment

```bash
npm install
cp .env.example .env
```

Update `.env` so `DATABASE_URL` matches your PostgreSQL credentials:
- `.env.example` defaults to `postgresql://netpulse:netpulse@localhost:5432/netpulse?schema=public`
- `docker-compose.yml` provisions `POSTGRES_USER=netpulse`, `POSTGRES_PASSWORD=netpulse123`, `POSTGRES_DB=netpulse`

### 2. Initialize PostgreSQL, Generate Prisma Client & Seed

```bash
# Start PostgreSQL (if using Docker for DB only)
docker compose up -d postgres

# Generate Prisma Client and apply migrations
npx prisma generate
npx prisma migrate deploy

# Build the server first (prisma/seed.ts imports dist-server/services/rbac.service.js)
npm run build:server

# Seed Super Admin, dev demo users, roles, permissions, and features
npm run db:seed
```

### 3. Run Development Servers

```bash
npm run dev
```

`npm run dev` (alias for `npm run dev:all` / `scripts/dev-all.mjs`) runs:
1. Initial TypeScript compile of `server/` into `dist-server/`.
2. `tsc -p server/tsconfig.json -w` for incremental backend compilation.
3. `node --watch-path=dist-server dist-server/server.js` on **`http://localhost:5000`** (`PORT=5000`).
4. Vite frontend dev server on **`http://localhost:5173`**, proxying `/api/*` to `http://127.0.0.1:5000`.

Useful URLs in development:
- Frontend App: `http://localhost:5173`
- API Gateway: `http://localhost:5000/api/v1`
- Swagger API Docs: `http://localhost:5000/api/docs`

### Production Build & Docker Compose

```bash
# Local production build (backend -> dist-server/, frontend -> dist/)
npm run build:all
npm run start

# Full container stack (Postgres, Redis, Backend, Nginx Frontend on port 80)
docker compose up -d --build
```

> **Note for `NODE_ENV=production`:** `server/src/server.ts` requires `JWT_SECRET`, `JWT_REFRESH_SECRET`, and `COOKIE_SECURE` to be defined in the environment and exits at startup if any are missing.

---

## Database & Persistence Architecture

- **Startup Requirement (`server/src/db/store.ts` & `server/src/server.ts`)**:
  - `initDatabaseConnection()` connects via Prisma (`prisma.$connect()`) and executes `SELECT 1`.
  - `startServer()` runs `await initDatabaseConnection()` and `await RbacService.syncRegistry()` before binding Express to port `5000`. If PostgreSQL is unreachable, startup aborts with exit code `1`.
  - Runtime Prisma connectivity errors (`P1001`, `P1002`, `P1017`, `PrismaClientInitializationError`) are mapped to HTTP `503 Service temporarily unavailable`.
- **Current Service Storage Split**:
  - **PostgreSQL (Prisma ORM)**: Authentication, sessions, audit logs, staff users (`auth.service.ts`), RBAC roles/permissions/features/navigation (`rbac.service.ts`), customer profiles & subscriptions (`customer.service.ts`), and internet packages (`package.routes.ts`).
  - **In-Memory `dbStore` (`server/src/db/store.ts` + `seedData.ts`)**: Operational modules (`accounting`, `automation`, `billing`, `inventory`, `mikrotik`, `network`, `operations`, `payment`, `procurement`, `report`) currently operate on the pre-seeded in-memory `NetPulseDataStore` (`dbStore`).

---

## Authentication, Security & Seeded Accounts

- **Client Pre-Hashing**: `src/lib/api.ts` hashes passwords client-side with Web Crypto SHA-256 (`hashPasswordClient`) before sending login, password-reset, and password-change requests.
- **Tokens & Cookies**:
  - **Access Token (JWT)**: 15-minute lifetime, stored in memory in Zustand (`authStore.ts`).
  - **Refresh Token**: 256-bit random token stored as a SHA-256 hash in the PostgreSQL `Session` table, sent in an `httpOnly` `refresh_token` cookie (`path: '/api/v1/auth'`, `sameSite: 'lax'`, `secure` in production; 7-day default / 30-day Remember Me). Supports atomic token rotation, 5-second concurrent request grace window, and family-wide revocation on reuse detection.
- **Brute-Force Protection**: Sliding 15-minute window rate limiting (5 attempts per IP + username) and 15-minute account lockout (`lockedUntil`) recorded in `AuditLog`.

### Default Seeded Accounts (`prisma/seed.ts`)

| Role | Username | Email | Password |
|---|---|---|---|
| `SUPER_ADMIN` | `admin` | `admin@netpulse.net` | `ADMIN_PASSWORD` env var (default `StrongSuperAdminPassword2026!`) |
| `NETWORK_ENGINEER` | `engineer` | `noc@netpulse.net` | `Password123!` *(non-production only)* |
| `BILLING_CASHIER` | `cashier` | `cashier@netpulse.net` | `Password123!` *(non-production only)* |
| `FIELD_TECHNICIAN` | `tech` | `tech@netpulse.net` | `Password123!` *(non-production only)* |
| `SUPPORT_AGENT` | `support` | `support@netpulse.net` | `Password123!` *(non-production only)* |
| `ACCOUNTANT` | `accountant` | `finance@netpulse.net` | `Password123!` *(non-production only)* |

---

## Visual Design Tokens (`src/index.css`)

- **Primary Brand Accent**: `#EA6A3C` (`--brand`), hover `#D95A2C`, soft tint `#FDEFE8`
- **Light Mode Surfaces**: App background `#F7F7F5`, surface `#FFFFFF`, subtle `#F8F7F4` (plus `soft`, `standard`, and `high-contrast` comfort modes)
- **Dark Mode Surfaces**: App background `#111214`, sidebar `#16181D`, surface `#1A1C20`, raised `#212429`
- **Typography**: `Inter`, `Noto Sans Khmer`, `Kantumruy Pro`, `Plus Jakarta Sans`

---

## Scripts & Verification

```bash
# Lint & Typecheck / Build
npm run lint
npm run build:server
npm run build            # tsc -b && vite build
npm run build:all        # build:server && build

# Automated Tests
npm run test:unit        # DataTable & UI regression checks (scripts/test-regression.mjs)
npm run test:frontend-auth # Frontend auth & RBAC validation tests (scripts/test-auth-frontend.mjs)
npm run test:backend     # Backend domain suite (server/test/netpulse.test.mjs)
npm test                 # Runs test:unit, test:backend, and test:frontend-auth

# Additional Unit & Integration Suites
node --test test/unit/rbac-matrix.test.mjs
node --test server/test/features-frontend.test.mjs
node --test server/test/rbac.test.mjs   # Requires built dist-server & seeded PostgreSQL

# Playwright End-to-End Tests
npm run test:pw
```

For full architectural, schema, API, and RBAC details, see [documentation.md](./documentation.md).
