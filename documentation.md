# NetPulse — Complete ISP ERP, CRM & Network Management System

**Architecture, Setup, Implementation & Operating Guide**

---

## 1. Executive Summary & Architecture Overview

**NetPulse** is a full-stack ISP (Internet Service Provider) ERP, CRM, and Network Operations platform built for operators running mixed **FTTH (Fiber to the Home)** and **Wireless (WISP)** networks with **MikroTik RouterOS** infrastructure.

The system follows a decoupled **PERN (PostgreSQL, Express 5, React 18, Node.js)** TypeScript architecture featuring database-backed authentication and dynamic RBAC, double-entry accounting invariants, multi-warehouse inventory tracking, and responsive UI primitives.

```text
+------------------------------------------------------------------+
|                        NetPulse Unified UI                       |
|   React 18 · TypeScript · Vite 5 · Tailwind CSS 3 · Zustand      |
|   TanStack Query / Table / Virtual · Framer Motion · Recharts    |
+---------------------------------+--------------------------------+
                                  |
                                  | HTTP / REST API (/api/v1, httpOnly Cookies + Bearer JWT)
                                  v
+------------------------------------------------------------------+
|                    NetPulse API Gateway (Express 5)              |
|   Node.js · TypeScript · Helmet · Zod · JWT · Dynamic RBAC       |
|   Swagger / OpenAPI 3.0 (/api/docs)                              |
+--------+-----------------+-------------------+-------------------+
         |                 |                   |
         v                 v                   v
+-----------------+ +---------------+ +----------------------------+
| Prisma ORM +    | | In-Memory     | | MikroTik RouterOS Layer    |
| PostgreSQL 16   | | dbStore       | | - Fleet Metrics & Ping     |
| - Auth & Session| | - Accounting  | | - PPPoE Secrets & Sessions |
| - Audit Logs    | | - Billing/Pay | | - Simulator Fallback       |
| - RBAC & Menus  | | - Inventory   | +----------------------------+
| - Customers     | | - Procurement |
| - Packages/Subs | | - Network/Ops |
+-----------------+ +---------------+
```

---

## 2. Repository Structure

```text
isp-system-2/
├── .env.example                     # Environment configuration template
├── docker-compose.yml               # Postgres 16, Redis 7, Backend (:5000), Frontend Nginx (:80)
├── Dockerfile.backend               # Production backend container (Node 20 Alpine)
├── Dockerfile.frontend              # Production frontend container (Node 20 build + Nginx)
├── nginx.conf                       # Nginx SPA fallback & /api proxy to backend:5000
├── eslint.config.js                 # ESLint configuration
├── index.html                       # SPA root document
├── package.json                     # npm scripts and dependencies
├── playwright.config.ts             # Playwright Chromium E2E configuration
├── postcss.config.js                # PostCSS configuration
├── tailwind.config.js               # Tailwind theme mapped to CSS custom properties
├── tsconfig.json                    # Frontend TypeScript configuration
├── tsconfig.node.json               # Vite/Node config TypeScript configuration
├── vite.config.ts                   # Vite dev server (:5173) + /api proxy -> 127.0.0.1:5000
├── prisma/
│   ├── schema.prisma                # PostgreSQL schema (56 models)
│   ├── seed.ts                      # Database seed (Super Admin, demo staff, RBAC matrix)
│   ├── migrations/                  # Prisma migration history (5 migrations)
│   └── backups/                     # SQL backup dumps
├── scripts/
│   ├── dev-all.mjs                  # Builds server, starts tsc -w, node --watch, and vite
│   ├── seed-admin.mjs               # Standalone Super Admin & dev user seed script
│   ├── db-backup.sh                 # Automated gzipped pg_dump script
│   ├── db-restore.sh                # Automated gunzip + psql restore script
│   ├── eslint-motion-rules.js       # Custom Framer Motion ESLint rule helpers
│   ├── test-auth-frontend.mjs       # Frontend auth schema & RBAC logic suite
│   ├── test-chip.mjs                # Chip UI script test
│   ├── test-combobox-styles.mjs     # Combobox style verification script
│   ├── test-datepicker.mjs          # DatePicker verification script
│   ├── test-regression.mjs          # DataTable & UI regression suite (22 checks)
│   └── test-search-boxes.mjs        # Search input verification script
├── server/
│   ├── tsconfig.json                # Compiles server/src -> dist-server/ (NodeNext)
│   ├── src/
│   │   ├── server.ts                # Express gateway, startup DB & RBAC sync, route mounts
│   │   ├── db/
│   │   │   ├── store.ts             # PrismaClient, initDatabaseConnection(), NetPulseDataStore
│   │   │   └── seedData.ts          # In-memory domain seed fixtures
│   │   ├── docs/openapi.ts          # OpenAPI 3.0 specification
│   │   ├── middleware/
│   │   │   └── auth.middleware.ts   # authenticate, authorize, requireRole, requireFeature, validateBody
│   │   ├── rbac/registry/           # Modular RBAC permissions, features & default roles (19 files)
│   │   ├── routes/                  # 14 Express route modules mounted under /api/v1
│   │   └── services/                # 13 backend service modules
│   └── test/
│       ├── netpulse.test.mjs        # Core domain & auth service integration tests
│       ├── netpulse.test.ts         # TypeScript source test reference
│       ├── rbac.test.mjs            # RBAC matrix, features & requireFeature API tests
│       └── features-frontend.test.mjs # Dynamic permission & ANY/ALL feature mode tests
├── src/
│   ├── main.tsx                     # React 18 entrypoint
│   ├── App.tsx                      # BrowserRouter, theme/comfort/density init, session restore, routes
│   ├── index.css                    # Design tokens & global field/search styles
│   ├── components/
│   │   ├── auth/                    # ProtectedRoute.tsx, RequirePermission.tsx
│   │   ├── layout/                  # Sidebar.tsx, TopBar.tsx, CommandPalette.tsx, NotificationPanel.tsx, ErrorBoundary.tsx
│   │   └── ui/                      # Reusable UI kit + DataTable/
│   ├── data/mockData.ts             # Static frontend helper/mock fixtures
│   ├── features/
│   │   ├── customers/               # CustomersPage, CustomerTable, CustomerDetailDrawer, modals
│   │   ├── inventory/               # ProductsPage, ProductModal, ProductLogModal, DeleteProductModal
│   │   └── roles/                   # RolesPage feature: PermissionsMatrix, FeaturesTab, UsersTab, hooks, utils
│   ├── lib/                         # api.ts, permissions.ts, motion.ts, queryClient.ts, utils.ts
│   ├── pages/                       # 28 application & dev pages
│   ├── store/                       # authStore.ts, useStore.ts
│   └── types/                       # Shared frontend TypeScript definitions
├── test/unit/
│   └── rbac-matrix.test.mjs         # Matrix tri-state, dependency & dirty diff unit tests
└── tests/
    ├── customers.spec.ts            # Customers Playwright E2E spec
    ├── features-permissions.spec.ts # Menus & Features tab E2E spec
    ├── inventory.spec.ts            # Inventory Playwright E2E spec
    ├── modals.spec.ts               # Modals Playwright E2E spec
    ├── responsive-and-motion.spec.ts# Responsive & reduced-motion E2E spec
    ├── roles-permissions.spec.ts    # Roles & Permissions matrix E2E spec
    └── smoke.spec.ts                # Application smoke E2E spec
```

---

## 3. Core Modules & Security Architecture

### 3.1 Enterprise Authentication & Session Management
- **Client-Side SHA-256 Pre-Hashing**: `src/lib/api.ts` (`hashPasswordClient`) hashes user passwords using `window.crypto.subtle.digest('SHA-256', ...)` before sending `/auth/login`, `/auth/reset-password`, and `/auth/change-password` payloads.
- **In-Memory JWT Access Tokens**: Access tokens expire in **15 minutes** (`JWT_ACCESS_EXPIRES_IN = '15m'`) and are held strictly in memory in `useAuthStore` (`src/store/authStore.ts`).
- **Secure Refresh Token Cookies**: 256-bit cryptographically random refresh tokens are stored as SHA-256 hashes in the PostgreSQL `Session` table and issued via `httpOnly`, `sameSite: 'lax'`, `path: '/api/v1/auth'` cookies (`secure: true` when `NODE_ENV === 'production'`; 7-day default or 30-day when "Remember Me" is enabled).
- **Token Rotation, Grace Window & Reuse Detection**: Every `/auth/refresh` atomically revokes the used session and creates a new session within the same `familyId` via `prisma.$transaction`. Reusing an already-revoked token outside the **5-second** same-client concurrency grace window revokes the entire session family and records a `REFRESH_REUSE_DETECTED` entry in `AuditLog`.
- **Brute-Force Defense & Account Lockout**: Sliding 15-minute attempt counter (5 failed attempts per IP + username) triggers rate limiting and locks existing accounts for **15 minutes** (`lockedUntil`), logging `ACCOUNT_LOCKED` to `AuditLog`.
- **Timing-Safe Comparison**: Non-existent usernames run a dummy `bcrypt.compare` against `DUMMY_HASH` to mitigate username enumeration timing differences.

### 3.2 Dynamic RBAC, Permissions & Feature Registry
NetPulse replaces static hardcoded role checks with a database-synchronized modular registry (`server/src/rbac/registry/`):

- **Registry Modules (`server/src/rbac/registry/`)**:
  - Domain definitions for `dashboard`, `customers`, `packages`, `network`, `billing`, `accounting`, `inventory`, `procurement`, `operations`, `reports`, `automation`, `portal`, `messages`, `integrations`, `settings`, and `users-roles`.
  - `roles.ts` defines **12 default roles**:
    - **5 System Roles (`isSystem: true`)**: `SUPER_ADMIN`, `NETWORK_ENGINEER`, `BILLING_CASHIER`, `FIELD_TECHNICIAN`, `SUPPORT_AGENT`.
    - **7 Predefined Custom-Editable Roles (`isSystem: false`)**: `ACCOUNTANT`, `ADMINISTRATOR`, `CASHIER`, `TECHNICIAN`, `SALES_STAFF`, `WAREHOUSE_MANAGER`, `PROCUREMENT_OFFICER`.
  - Custom roles can also be created, duplicated, renamed, and deleted from the UI.
- **Startup & Seed Synchronization (`RbacService.syncRegistry()` / `RbacService.seedRbac()`)**:
  - Runs automatically on server startup (`server/src/server.ts`) and during `npm run db:seed`.
  - Upserts `Permission` and `Feature` (`MENU`, `PAGE`, `TAB`, `ACTION`) records by `key`, marks removed code keys as `isActive: false` without deleting rows, and initializes default `FeaturePermission` links only when a feature is first created so admin edits are preserved.
- **Backend Enforcement (`server/src/middleware/auth.middleware.ts`)**:
  - `authenticate`: Verifies Bearer JWT and loads current `UserRole` assignments from PostgreSQL.
  - `authorize(...permissions)`: Checks effective role permissions (cached in-memory with a 30-second TTL, invalidated on role/permission updates).
  - `requireFeature(featureKey)`: Evaluates database-backed `Feature` + `FeaturePermission` mappings (`ANY` vs `ALL` mode; features with zero mapped permissions are open to all authenticated users).
  - `requireRole(...roles)`: Enforces route-level role groups in `server/src/server.ts`.
- **Frontend Enforcement & Navigation**:
  - `GET /api/v1/auth/navigation` builds the dynamic sidebar tree (`Sidebar.tsx`) filtered by the user's effective permissions.
  - `GET /api/v1/auth/me` returns effective `permissions` and `features` arrays.
  - `<ProtectedRoute>`, `<RequirePermission feature="...">`, `can()`, `useCan()`, and `<Can>` (`src/lib/permissions.ts`) guard pages and UI controls.
- **Roles & Permissions UI (`/settings/roles`, `src/pages/RolesPage.tsx`)**:
  - **Permissions Tab (`PermissionsMatrix.tsx` / `MobileRoleView.tsx`)**: Sticky-column matrix, tri-state module checkboxes, dependency cascading (`src/features/roles/utils/matrixUtils.ts`), keyboard navigation, Shift+click range selection, dirty counters, optimistic concurrency (`expectedUpdatedAt` returning `409 STALE_UPDATE`), and role management modals (`AddRoleModal`, `RenameRoleModal`).
  - **Users Tab (`UsersTab.tsx`)**: Search/filter staff accounts and reassign roles with confirmation modal.
  - **Menus & Features Tab (`FeaturesTab.tsx`)**: Hierarchical feature tree, multi-permission assignment, `ANY`/`ALL` mode toggle, active switch, sort reordering, locked anti-lockout protection (`page.roles`), and unassigned permission warnings.

### 3.3 Operational Domain Modules
- **MikroTik Network Management & RouterOS API (`mikrotik.service.ts`, `network.service.ts`)**: Fleet management, PPPoE secret provisioning/suspension/reconnection, active session inspection, CPU/memory/uptime metrics, controlled reboot, VLAN conflict validation, and IPAM pool/static IP allocation (with built-in simulator fallback when no live router hardware is reachable).
- **Double-Entry Accounting (`accounting.service.ts`)**: Zero-sum ledger validation ($\sum \text{Debits} \equiv \sum \text{Credits}$), Chart of Accounts, journal entries & reversals, Trial Balance, Profit & Loss, Balance Sheet, AR Aging, Expenses, and Fixed Asset tracking.
- **Multi-Warehouse Inventory & Procurement (`inventory.service.ts`, `procurement.service.ts`)**: Multi-location stock levels, `IN` / `OUT` / `TRANSFER` movements with negative stock prevention, serialized ONT/CPE tracking, suppliers, purchase orders, and Goods Received Notes (GRN).
- **Field Operations & Installations (`operations.service.ts`)**: Installation scheduling, technician roster, hardware serial allocation, PPPoE activation, and support ticket tracking.
- **Customer Self-Service Portal (`portal.routes.ts`, `CustomerPortalPage.tsx`)**: Customer login, connection/billing overview, Bakong KHQR payment checkout, and support ticket creation.

---

## 4. Application Bootstrapping, Startup & Database Layer

### 4.1 Concurrent Dev & Runtime Architecture

```text
[npm run dev] / [npm run dev:all] -> scripts/dev-all.mjs
       │
       ├──► 1. Initial server build: npm run build:server (tsc -p server/tsconfig.json -> dist-server/)
       ├──► 2. Compiler watcher:     npx tsc -p server/tsconfig.json -w
       ├──► 3. Backend Gateway:      node --watch-path=dist-server dist-server/server.js (Port :5000)
       └──► 4. Frontend Client:      npx vite (Port :5173, proxies /api/* -> http://127.0.0.1:5000)
```

### 4.2 Database Connection & Startup Sequence (`server/src/db/store.ts` & `server/src/server.ts`)

In `server/src/db/store.ts`:

```ts
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

let isPostgresConnected = false;

export async function initDatabaseConnection(): Promise<void> {
  await prisma.$connect();
  await prisma.$queryRaw`SELECT 1`;
  isPostgresConnected = true;
  console.log('✓ Successfully connected to PostgreSQL via Prisma ORM');
}

export function isUsingPostgres(): boolean {
  return isPostgresConnected;
}
```

In `server/src/server.ts`:

```ts
async function startServer() {
  try {
    await initDatabaseConnection();
    await RbacService.syncRegistry();
  } catch (err: any) {
    console.error('[NetPulse FATAL]: Database connection failed. Aborting startup.');
    process.exit(1);
  }
  ...
}
```

- **PostgreSQL Required on Startup**: If PostgreSQL is offline or `DATABASE_URL` is invalid, `initDatabaseConnection()` throws and `startServer()` exits with code `1`.
- **Runtime Database Error Mapping**: Express error middleware maps Prisma initialization/connection errors (`P1001`, `P1002`, `P1017`, `PrismaClientInitializationError`) to HTTP `503 Service temporarily unavailable`.
- **Hybrid Storage Across Services**:
  - **PostgreSQL via Prisma**: `auth.service.ts` (users, sessions, audit logs), `rbac.service.ts` (roles, permissions, features, role/feature/user mappings), `customer.service.ts` (customers, addresses, subscriptions, packages, activities), and `package.routes.ts` (packages).
  - **In-Memory `dbStore` (`NetPulseDataStore` in `server/src/db/store.ts`)**: `accounting.service.ts`, `automation.service.ts`, `billing.service.ts`, `inventory.service.ts`, `mikrotik.service.ts`, `network.service.ts`, `operations.service.ts`, `payment.service.ts`, `procurement.service.ts`, and `report.service.ts` currently read and mutate the seeded in-memory `dbStore` repository (and `auth.service.ts` mirrors audit log entries to `dbStore.logAudit(...)` as well as PostgreSQL).

### 4.3 Database Schema & Migrations (`prisma/schema.prisma`)

The Prisma schema defines **56 models** across 5 applied migrations (`20261123000000_init`, `20261123010000_auth_enhancements`, `20261123153906_session_family_id`, `20261124180000_rbac_permissions_matrix`, `20261124193500_features_and_permissions`):

| Domain | Models |
|---|---|
| **Identity, RBAC & Features** | `User`, `Role`, `Permission`, `Feature`, `FeaturePermission`, `UserRole`, `RolePermission`, `Session`, `AuditLog` |
| **CRM & Subscriptions** | `Customer`, `CustomerAddress`, `CustomerAttachment`, `CustomerActivity`, `Package`, `Subscription`, `SubscriptionHistory` |
| **Network & Provisioning** | `Router`, `RouterMetric`, `NetworkDevice`, `PPPoEProfile`, `PPPoEAccount`, `PPPoESession`, `VLAN`, `IPPool`, `IPAddress`, `NetworkProvisionJob` |
| **Billing & Payments** | `Invoice`, `InvoiceItem`, `Payment`, `PaymentAllocation`, `CreditNote` |
| **Inventory & Procurement** | `ProductCategory`, `Product`, `Warehouse`, `StockBalance`, `SerialNumber`, `StockMovement`, `Supplier`, `PurchaseOrder`, `PurchaseOrderItem`, `GoodsReceivedNote`, `GoodsReceivedItem`, `SupplierInvoice` |
| **Accounting & Ledger** | `Account`, `AccountingPeriod`, `JournalEntry`, `JournalEntryLine`, `Expense`, `FixedAsset` |
| **Operations, Automation & Config** | `Installation`, `Technician`, `SupportTicket`, `TicketMessage`, `Notification`, `AutomationRule`, `CompanySetting` |

---

## 5. API Endpoints Reference

All API routes are mounted under `/api/v1` (with `/api/health` and OpenAPI docs at `/api/docs` and `/api/v1/openapi.json`).

### System & Health
- `GET /api/v1/health` / `GET /api/health` – Public health probe
- `GET /api/v1/openapi.json` / `GET /api/docs` – OpenAPI JSON spec and Swagger UI

### Authentication, Navigation & RBAC (`/api/v1/auth`)
- `POST /api/v1/auth/login` – Authenticate with username/email + password (client SHA-256 pre-hashed); returns JWT access token and `refresh_token` httpOnly cookie
- `POST /api/v1/auth/refresh` – Rotate refresh token and issue new access token
- `POST /api/v1/auth/logout` – Revoke session and clear refresh cookies
- `GET /api/v1/auth/me` – Authenticated user profile, roles, effective `permissions`, and `features`
- `GET /api/v1/auth/navigation` – Dynamic sidebar menu tree for the authenticated user
- `POST /api/v1/auth/forgot-password` / `POST /api/v1/auth/reset-password` / `POST /api/v1/auth/change-password`
- `GET /api/v1/auth/users` / `POST /api/v1/auth/users` / `PATCH /api/v1/auth/users/:id/roles` *(requires `roles.manage`)*
- `GET /api/v1/auth/roles` / `POST /api/v1/auth/roles` / `PATCH /api/v1/auth/roles/:id` / `PUT /api/v1/auth/roles/:id/permissions` / `DELETE /api/v1/auth/roles/:id` / `POST /api/v1/auth/roles/:id/duplicate` *(requires `roles.manage`)*
- `GET /api/v1/auth/features` / `POST /api/v1/auth/features` / `PATCH /api/v1/auth/features/:id` *(requires `roles.manage`)*
- `GET /api/v1/auth/permissions` / `PATCH /api/v1/auth/permissions/:id` *(requires `roles.manage`)*

### Customers & Packages
- `GET /api/v1/customers` / `GET /api/v1/customers/:id` / `POST /api/v1/customers` / `PUT /api/v1/customers/:id` / `DELETE /api/v1/customers/:id` / `POST /api/v1/customers/:id/status` / `POST /api/v1/customers/:id/speedtest`
- `GET /api/v1/packages` / `POST /api/v1/packages` / `PUT /api/v1/packages/:id` / `DELETE /api/v1/packages/:id`

### Network & MikroTik (`/api/v1/network` & `/api/v1/routers`)
- `GET /api/v1/network/routers` / `GET /api/v1/network/routers/:id/metrics` / `POST /api/v1/network/routers/:id/test` / `POST /api/v1/network/routers/:id/reboot`
- `GET /api/v1/network/pppoe` / `GET /api/v1/network/vlans` / `POST /api/v1/network/vlans` / `GET /api/v1/network/ipam/pools` / `POST /api/v1/network/ipam/allocate`

### Billing, Payments & Accounting
- `GET /api/v1/invoices` / `POST /api/v1/invoices` / `PUT /api/v1/invoices/:id/pay` (also mounted at `/api/v1/billing`)
- `GET /api/v1/payments` / `POST /api/v1/payments/record` / `POST /api/v1/payments/khqr`
- `GET /api/v1/accounting/dashboard` / `/accounts` / `/ledger` / `/trial-balance` / `/pnl` / `/balance-sheet` / `/ar-aging`
- `POST /api/v1/accounting/journal` / `POST /api/v1/accounting/journal/:entryNumber/reverse`

### Inventory & Purchasing
- `GET /api/v1/inventory/products` / `POST /api/v1/inventory/products` / `PUT /api/v1/inventory/products/:id`
- `GET /api/v1/inventory/warehouses` / `POST /api/v1/inventory/movements` / `GET /api/v1/inventory/serials` / `POST /api/v1/inventory/serials/assign`
- `GET /api/v1/purchasing/suppliers` / `POST /api/v1/purchasing/suppliers` / `GET /api/v1/purchasing/orders` / `POST /api/v1/purchasing/orders` / `POST /api/v1/purchasing/orders/:id/receive` / `POST /api/v1/purchasing/suppliers/:id/pay`

### Operations, Reports, Automation, Settings & Portal
- `GET /api/v1/operations/installations` / `POST /api/v1/operations/installations` / `POST /api/v1/operations/installations/:id/complete` / `GET /api/v1/operations/technicians` / `GET /api/v1/operations/tickets` / `POST /api/v1/operations/tickets` / `PUT /api/v1/operations/tickets/:id/status` (also mounted at `/api/v1/installations`, `/api/v1/technicians`, `/api/v1/tickets`)
- `GET /api/v1/reports/dashboard` / `/detailed` / `/export`
- `GET /api/v1/automation/rules` / `POST /api/v1/automation/rules/:id/toggle` / `/jobs/billing` / `/jobs/overdue` / `/jobs/routers`
- `GET /api/v1/settings/company` / `PUT /api/v1/settings/company` / `GET /api/v1/settings/audit-logs` / `GET /api/v1/settings/notifications` / `PUT /api/v1/settings/notifications/:id/read`
- `POST /api/v1/portal/login` / `GET /api/v1/portal/dashboard/:customerId` / `POST /api/v1/portal/pay-khqr` / `POST /api/v1/portal/tickets`

---

## 6. Setup, Deployment & Operations

### 6.1 Local Development Setup

```bash
# 1. Install dependencies and prepare environment file
npm install
cp .env.example .env

# 2. Ensure PostgreSQL is running and DATABASE_URL in .env matches
docker compose up -d postgres

# 3. Generate Prisma client, run migrations, build server, and seed DB
npx prisma generate
npx prisma migrate deploy
npm run build:server
npm run db:seed

# 4. Launch backend watcher (:5000) + Vite frontend (:5173)
npm run dev
```

> **Note:** `npm run db:seed` executes `node --experimental-strip-types prisma/seed.ts` (requires Node.js v22.6+) and imports compiled JS from `dist-server/`, so `npm run build:server` must be run beforehand.

### 6.2 Docker Compose Deployment

```bash
docker compose up -d --build
docker compose ps
```

Services defined in `docker-compose.yml`:
- `netpulse-postgres`: PostgreSQL 16 (`5432`, user `netpulse`, password `netpulse123`, db `netpulse`)
- `netpulse-redis`: Redis 7 (`6379`)
- `netpulse-backend`: Express API (`5000`) built via `Dockerfile.backend`
- `netpulse-frontend`: Nginx (`80`) serving `dist/` and proxying `/api/` to `backend:5000` via `Dockerfile.frontend` and `nginx.conf`

> **Production Environment Variables:** `server/src/server.ts` enforces `JWT_SECRET`, `JWT_REFRESH_SECRET`, and `COOKIE_SECURE` when `NODE_ENV=production`. Ensure all three are provided in production overrides/environment configuration.

### 6.3 Database Backup & Restore

```bash
# Create compressed SQL backup in ./backups (or custom directory as $1)
./scripts/db-backup.sh

# Restore from a backup archive
./scripts/db-restore.sh ./backups/netpulse_backup_YYYYMMDD_HHMMSS.sql.gz
```

---

## 7. Pre-Configured Staff Accounts (`prisma/seed.ts`)

| Role | Username | Email | Seeded Password | Scope |
|---|---|---|---|---|
| `SUPER_ADMIN` | `admin` | `admin@netpulse.net` | `ADMIN_PASSWORD` env var *(default `StrongSuperAdminPassword2026!`)* | Full unrestricted access |
| `NETWORK_ENGINEER` | `engineer` | `noc@netpulse.net` | `Password123!` *(non-production only)* | Network, PPPoE, VLAN, IPAM, Operations, Inventory view, Reports |
| `BILLING_CASHIER` | `cashier` | `cashier@netpulse.net` | `Password123!` *(non-production only)* | Customers view, Billing, Payments, KHQR, Accounting view |
| `FIELD_TECHNICIAN` | `tech` | `tech@netpulse.net` | `Password123!` *(non-production only)* | Customers view, Installations, Technicians, Tickets, Inventory view |
| `SUPPORT_AGENT` | `support` | `support@netpulse.net` | `Password123!` *(non-production only)* | Customers, Packages/Subscriptions view, Tickets, Portal, Messages |
| `ACCOUNTANT` | `accountant` | `finance@netpulse.net` | `Password123!` *(non-production only)* | Billing, Payments, Accounting & Reports, Procurement view |

*(In `scripts/seed-admin.mjs`, `ADMIN_PASSWORD` falls back to `NetPulseAdmin2026!`.)*

---

## 8. Verification, Builds & Test Suites

```bash
# Build & Type Checking
npm run build:server     # tsc -p server/tsconfig.json -> dist-server/
npm run build            # tsc -b && vite build -> dist/
npm run build:all        # Both backend and frontend builds
npm run lint             # ESLint across repository

# Core Test Suites
npm run test:unit        # scripts/test-regression.mjs (22 DataTable & UI checks)
npm run test:frontend-auth # scripts/test-auth-frontend.mjs (7 auth & RBAC schema tests)
npm run test:backend     # server/test/netpulse.test.mjs
npm test                 # Runs test:unit, test:backend, and test:frontend-auth

# Additional Node Test Suites
node --test test/unit/rbac-matrix.test.mjs         # 6 matrix tri-state, dependency & diff tests
node --test server/test/features-frontend.test.mjs # 8 permission & feature ANY/ALL mode tests
node --test server/test/rbac.test.mjs              # 17 RBAC & requireFeature API/DB tests (requires built dist-server & PostgreSQL)

# Playwright E2E Suite
npm run test:pw          # Executes tests/*.spec.ts against http://127.0.0.1:5173
```
