# NSMISP — ISP ERP, CRM & Network Operations Platform

NSMISP *(formerly NetPulse)* is a full-stack **ISP (Internet Service Provider)** ERP, CRM, and Network Operations platform built for operators running mixed **FTTH (Fiber to the Home)** and **Wireless (WISP)** networks with **MikroTik RouterOS** infrastructure.

The system follows a decoupled **PERN (PostgreSQL, Express 5, React 18, Node.js)** TypeScript architecture featuring database-backed authentication, a dynamic RBAC & feature-navigation registry, double-entry accounting invariants, multi-warehouse inventory tracking, and responsive UI primitives.

---

## Architecture Overview

```text
+------------------------------------------------------------------+
|                         NSMISP Unified UI                        |
|   React 18 · TypeScript · Vite 5 · Tailwind CSS 3 · Zustand      |
|   TanStack Query / Table / Virtual · Framer Motion · Recharts    |
+---------------------------------+--------------------------------+
                                  |
                                  | HTTP / REST API (/api/v1, httpOnly Cookies + Bearer JWT)
                                  v
+------------------------------------------------------------------+
|                     NSMISP API Gateway (Express 5)               |
|   Node.js · TypeScript · Helmet · Zod · JWT · Dynamic RBAC       |
|   Swagger / OpenAPI 3.0 (/api/docs)                              |
+-----------------+--------------------------------+---------------+
                  |                                |
                  v                                v
+-----------------------------------+ +----------------------------+
| Prisma ORM + PostgreSQL 16        | | MikroTik RouterOS Layer    |
| - Auth, Sessions, RBAC & AuditLog | | - Fleet Metrics & Ping     |
| - Customers, Packages & Subs      | | - PPPoE Secrets & Sessions |
| - Billing, Payments & Accounting  | | - Simulator Fallback       |
| - Inventory, Procurement & Ops    | +----------------------------+
| - Network, Reports & Automation   |
+-----------------------------------+
```

---

## Key Features & Core Modules

### 1. Subscriber CRM & Operations
- **Customers Hub (`/customers`)**: Search, multi-filter toolbar, status tabs (`Active`, `Suspended`, `Overdue`, `Pending`, `Disconnected`), bulk actions bar, table/compact/card views, column customization, CSV/XLSX export, and a 6-tab **Customer Detail Drawer** (Overview, Billing History, 14-day Usage Chart, Tickets, Activity Log, Internal Notes).
- **Modals & Diagnostics**: 3-step subscriber onboarding wizard (`React Hook Form` + `Zod`), payment recording, SMS/Email broadcast messaging, suspension status workflow, and diagnostic line speed tests.
- **Broadband Plans (`/plans`)**: Fiber, Wireless, and DSL package catalog synced with PostgreSQL via Prisma.
- **MikroTik Network Management & RouterOS API (`/network`, `mikrotik.service.ts`, `network.service.ts`)**: Fleet monitoring, PPPoE secret provisioning/suspension/reconnection, active session telemetry, CPU/memory/uptime metrics, controlled reboot, scope-aware VLAN conflict validation, and IPAM pool/static IP allocation (with built-in RouterOS simulator fallback when no live hardware is reachable).
- **Double-Entry Accounting (`/accounting`, `accounting.service.ts`)**: Zero-sum ledger validation ($\sum \text{Debits} \equiv \sum \text{Credits}$), Chart of Accounts, balanced Journal Entries & reversals, Trial Balance, Profit & Loss, Balance Sheet, AR Aging, Expenses, and Fixed Asset tracking.
- **Billing & Payments (`/billing`, `/payments`)**: Invoice lifecycle, cashier counter payments, and Bakong KHQR payload generation.
- **Multi-Warehouse Inventory & Procurement (`/inventory/products`, `/inventory/warehouses`, `/inventory/procurement`, `inventory.service.ts`, `procurement.service.ts`)**: Multi-location stock movements (`IN`, `OUT`, `TRANSFER`) with negative stock prevention, serialized ONT/CPE tracking, suppliers, purchase orders, and Goods Received Notes (GRN).
- **Field Operations & Installations (`/installations`, `/technicians`, `/tickets`, `operations.service.ts`)**: Installation scheduling, technician roster, hardware serial allocation, PPPoE activation, and support ticket queues.
- **Customer Self-Service Portal (`/portal`, `portal.routes.ts`, `CustomerPortalPage.tsx`)**: Customer login, connection/billing overview, Bakong KHQR payment checkout, and support ticket creation.
- **Platform Tools (`/reports`, `/messages`, `/automation`, `/integrations`, `/settings`, `/settings/users`, `/settings/audit`)**: Automated billing/overdue/router health jobs, command palette (`Ctrl+K` / `⌘K`), toast notifications, and audit log viewer.

### 2. Enterprise Authentication & Session Management
- **Client-Side SHA-256 Pre-Hashing**: `src/lib/api.ts` (`hashPasswordClient`) hashes user passwords using `window.crypto.subtle.digest('SHA-256', ...)` before sending `/auth/login`, `/auth/reset-password`, and `/auth/change-password` payloads.
- **In-Memory JWT Access Tokens**: Access tokens expire in **15 minutes** (`JWT_ACCESS_EXPIRES_IN = '15m'`) and are held strictly in memory in `useAuthStore` (`src/store/authStore.ts`).
- **Secure Refresh Token Cookies**: 256-bit cryptographically random refresh tokens are stored as SHA-256 hashes in the PostgreSQL `Session` table and issued via `httpOnly`, `sameSite: 'lax'`, `path: '/api/v1/auth'` cookies (`secure: true` when `NODE_ENV === 'production'`; 7-day default or 30-day when "Remember Me" is enabled).
- **Token Rotation, Grace Window & Reuse Detection**: Every `/auth/refresh` atomically revokes the used session and creates a new session within the same `familyId` via `prisma.$transaction`. Reusing an already-revoked token outside the **5-second** same-client concurrency grace window revokes the entire session family and records a `REFRESH_REUSE_DETECTED` entry in `AuditLog`.
- **Brute-Force Defense & Account Lockout**: Sliding 15-minute attempt counter (5 failed attempts per IP + username) triggers rate limiting and locks existing accounts for **15 minutes** (`lockedUntil`), logging `ACCOUNT_LOCKED` to `AuditLog`.
- **Timing-Safe Comparison**: Non-existent usernames run a dummy `bcrypt.compare` against `DUMMY_HASH` to mitigate username enumeration timing differences.

### 3. Dynamic RBAC, Permissions Matrix, Per-User Overrides & Feature Registry (`/settings/roles`)
NSMISP replaces static hardcoded role checks with a database-synchronized modular registry (`server/src/rbac/registry/`) and three-layer authorization model:

```text
Effective Permissions = (Union of Assigned Role Permissions ∪ User GRANTs) \ User DENYs
```

- **Registry Modules (`server/src/rbac/registry/`)**:
  - Domain definitions for `dashboard`, `customers`, `packages`, `network`, `billing`, `accounting`, `inventory`, `procurement`, `operations`, `reports`, `automation`, `portal`, `messages`, `integrations`, `settings`, and `users-roles`.
  - `roles.ts` defines **12 default roles**:
    - **5 System Roles (`isSystem: true`)**: `SUPER_ADMIN`, `NETWORK_ENGINEER`, `BILLING_CASHIER`, `FIELD_TECHNICIAN`, `SUPPORT_AGENT`.
    - **7 Predefined Custom-Editable Roles (`isSystem: false`)**: `ACCOUNTANT`, `ADMINISTRATOR`, `CASHIER`, `TECHNICIAN`, `SALES_STAFF`, `WAREHOUSE_MANAGER`, `PROCUREMENT_OFFICER`.
  - Custom roles can also be created, duplicated, renamed, and deleted from the UI.
- **Per-User Permission Overrides (`UserPermission`: `INHERIT` / `GRANT` / `DENY`)**:
  - When two staff members share the same role (for example, two `FIELD_TECHNICIAN` or `BILLING_CASHIER` users), an admin can customize permissions for **just one user** without altering the shared role.
  - Each permission per user has 3 states:
    - **Inherit** *(no row in `UserPermission`)*: uses the user's assigned role(s).
    - **Grant** *(`effect = GRANT`)*: grants that extra permission only to this user (prerequisite `view` permissions are auto-granted when needed).
    - **Deny** *(`effect = DENY`)*: blocks a permission for this user even if their role includes it (`DENY` wins over role grants; dependent actions cascade when a parent `view` is denied).
  - **Safeguards**: `SUPER_ADMIN` accounts always retain full `*` access and reject restriction overrides, and admins cannot deny `roles.manage` on their own account.
- **Menus & Features (`Feature` & `FeaturePermission`)**:
  - Controls which sidebar links, pages, tabs, action buttons, and API endpoints require which permissions:
    - **`MENU`** *(blue)*: Top-level sidebar navigation entries (`/dashboard`, `/customers`) rendered by `Sidebar.tsx` via `GET /api/v1/auth/navigation`.
    - **`PAGE`** *(green)*: Route/page access and submenu items guarded by `<RequirePermission feature="...">` and backend `requireFeature(...)`.
    - **`TAB`** *(purple)*: Individual tabs inside pages/drawers (such as showing or hiding a subscriber's billing tab independently of overview).
    - **`ACTION`** *(amber)*: Action buttons (`Create`, `Edit`, `Delete`) and corresponding write API endpoints.
  - **Permission Mode (`ANY` / `ALL` / Public)**: Features with **no permissions attached** (`Public`) are accessible to any authenticated user; `ANY` grants access if the user has at least one listed permission, while `ALL` requires every listed permission.
  - **Active & Sort Controls**: Turning a feature's **Active** switch off hides it in the UI and causes `requireFeature(...)` to return `404` for non-`SUPER_ADMIN` users; **Sort** controls sidebar order; **Locked** (`locked: true`, e.g. `page.roles`) protects critical admin screens from permission remapping or deactivation.
- **Startup & Seed Synchronization (`RbacService.syncRegistry()` / `RbacService.seedRbac()`)**:
  - Runs automatically on server startup (`server/src/server.ts`) and during `npm run db:seed`.
  - Upserts `Permission` and `Feature` (`MENU`, `PAGE`, `TAB`, `ACTION`) records by `key`, marks removed code keys as `isActive: false` without deleting rows, and initializes default `FeaturePermission` links only when a feature is first created so admin edits are preserved.
- **Backend Enforcement (`server/src/middleware/auth.middleware.ts`)**:
  - `authenticate`: Verifies Bearer JWT and loads current `UserRole` assignments from PostgreSQL.
  - `authorize(...permissions)`: Evaluates effective user permissions (`Roles ∪ User GRANTs \ User DENYs`, cached with a 30-second TTL and invalidated immediately on role, user-role, or user-permission updates).
  - `requireFeature(featureKey)`: Evaluates database-backed `Feature` + `FeaturePermission` mappings (`ANY` vs `ALL` mode) against the user's effective permissions.
  - `requireRole(...roles)`: Enforces route-level role groups in `server/src/server.ts`.
- **Frontend Enforcement & Navigation**:
  - `GET /api/v1/auth/navigation` builds the dynamic sidebar tree (`Sidebar.tsx`) filtered by the user's effective permissions (including per-user overrides).
  - `GET /api/v1/auth/me` returns effective `permissions` and `features` arrays.
  - `<ProtectedRoute>`, `<RequirePermission feature="...">`, `can()`, `useCan()`, and `<Can>` (`src/lib/permissions.ts`) guard pages and UI controls.
- **Roles & Permissions UI (`/settings/roles`, `src/pages/RolesPage.tsx` -> `src/features/roles/RolesPage.tsx`)**:
  - **Permissions Tab (`PermissionsMatrix.tsx` / `MobileRoleView.tsx`)**: Sticky-column matrix, tri-state module checkboxes, dependency cascading (`src/features/roles/rolesUtils.ts`), keyboard navigation, Shift+click range selection, dirty counters, optimistic concurrency (`expectedUpdatedAt` returning `409 STALE_UPDATE`), and role management modals (`AddRoleModal`, `RenameRoleModal`).
  - **Users Tab (`UsersTab.tsx` + `UserPermissionsModal.tsx`)**: Search/filter staff accounts, reassign roles with confirmation, inspect custom override badges (`+Granted / -Denied`), and open the **Permissions** modal to configure per-user `Inherit / Grant / Deny` overrides without modifying the shared role.
  - **Menus & Features Tab (`FeaturesTab.tsx`)**: Hierarchical feature tree, multi-permission assignment, `ANY`/`ALL` mode toggle, active switch, sort reordering, locked anti-lockout protection (`page.roles`), and unassigned permission warnings.

---

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite 5, Tailwind CSS 3 (CSS variables, dark mode, eye-comfort & density modes), Framer Motion, Zustand, TanStack Query / Table / Virtual, Recharts, React Hook Form, Zod, Lucide React, SheetJS (`xlsx`).
- **Backend**: Node.js, Express 5, TypeScript, Prisma ORM, PostgreSQL 16, `jsonwebtoken`, `bcryptjs`, `cookie-parser`, `helmet`, `cors`, `zod`, OpenAPI 3.0 + Swagger UI (`/api/docs`).
- **Testing & Tooling**: Node built-in test runner (`node --test`), Playwright E2E (`@playwright/test`), ESLint 10, Docker & Nginx.

---

## Repository Structure

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
├── playwright.config.ts             # Playwright Chromium E2E configuration (baseURL http://127.0.0.1:5173)
├── postcss.config.js                # PostCSS configuration
├── tailwind.config.js               # Tailwind theme mapped to CSS custom properties
├── tsconfig.json                    # Frontend TypeScript configuration
├── tsconfig.node.json               # Vite/Node config TypeScript configuration
├── vite.config.ts                   # Vite dev server (:5173) + /api proxy -> 127.0.0.1:5000
├── prisma/
│   ├── schema.prisma                # PostgreSQL schema (57 models)
│   ├── seed.ts                      # Database seed (Super Admin, demo staff, RBAC matrix)
│   ├── migrations/                  # Prisma migration history (7 migrations)
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
│   │   │   └── store.ts             # Shared PrismaClient, initDatabaseConnection(), logAudit()
│   │   ├── docs/openapi.ts          # OpenAPI 3.0 specification
│   │   ├── middleware/
│   │   │   └── auth.middleware.ts   # authenticate, authorize, requireRole, requireFeature, validateBody
│   │   ├── rbac/registry/           # Modular RBAC permissions, features & default roles (19 files)
│   │   ├── routes/                  # 14 Express route modules mounted under /api/v1
│   │   └── services/                # 13 backend service modules
│   └── test/
│       ├── nsmisp.test.mjs          # Core domain & auth service integration tests
│       ├── nsmisp.test.ts           # TypeScript source test reference
│       ├── rbac.test.mjs            # RBAC matrix, features & requireFeature API tests
│       └── features-frontend.test.mjs # Dynamic permission & ANY/ALL feature mode tests
├── src/
│   ├── main.tsx                     # React 18 entrypoint
│   ├── App.tsx                      # BrowserRouter, theme/comfort/density init, session restore, routes
│   ├── index.css                    # Design tokens (--brand #EA6A3C, light/dark themes) & global styles
│   ├── components/
│   │   ├── auth/                    # ProtectedRoute.tsx, RequirePermission.tsx
│   │   ├── layout/                  # Sidebar.tsx, TopBar.tsx, CommandPalette.tsx, NotificationPanel.tsx, ErrorBoundary.tsx
│   │   └── ui/                      # Reusable UI kit + DataTable/
│   ├── data/mockData.ts             # Static frontend helper/mock fixtures
│   ├── features/
│   │   ├── customers/               # CustomersPage, CustomerTable, CustomerDetailDrawer, modals
│   │   ├── inventory/               # ProductsPage, ProductModal, ProductLogModal, DeleteProductModal
│   │   └── roles/                   # Flat roles feature: index.ts, RolesPage, PermissionsMatrix, MatrixHeader, MatrixCheckbox, UsersTab, UserPermissionsModal, FeaturesTab, MobileRoleView, modals, hooks, constants, rolesUtils.ts, rolesUtils.test.ts
│   ├── lib/                         # api.ts, permissions.ts, motion.ts, queryClient.ts, utils.ts
│   ├── pages/                       # 28 application & dev pages
│   ├── store/                       # authStore.ts, useStore.ts
│   └── types/                       # Shared frontend TypeScript definitions (index.ts, roles.ts)
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

## Application Bootstrapping & Database Layer

### 1. Concurrent Dev & Runtime Architecture

```text
[npm run dev] / [npm run dev:all] -> scripts/dev-all.mjs
       │
       ├──► 1. Initial server build: npm run build:server (tsc -p server/tsconfig.json -> dist-server/)
       ├──► 2. Compiler watcher:     npx tsc -p server/tsconfig.json -w
       ├──► 3. Backend Gateway:      node --watch-path=dist-server dist-server/server.js (Port :5000)
       └──► 4. Frontend Client:      npx vite (Port :5173, proxies /api/* -> http://127.0.0.1:5000)
```

### 2. Database Connection & Startup Sequence (`server/src/db/store.ts` & `server/src/server.ts`)

In `server/src/db/store.ts`:

```ts
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

export async function initDatabaseConnection(): Promise<void> {
  await prisma.$connect();
  await prisma.$queryRaw`SELECT 1`;
  console.log('✓ Successfully connected to PostgreSQL via Prisma ORM');
}
```

In `server/src/server.ts`:

```ts
async function startServer() {
  try {
    await initDatabaseConnection();
    await RbacService.syncRegistry();
  } catch (err: any) {
    console.error('[NSMISP FATAL]: Database connection failed. Aborting startup.');
    process.exit(1);
  }
  ...
}
```

- **PostgreSQL Required on Startup**: If PostgreSQL is offline or `DATABASE_URL` is invalid, `initDatabaseConnection()` throws and `startServer()` exits with code `1`.
- **Runtime Database Error Mapping**: Express error middleware maps Prisma initialization/connection errors (`P1001`, `P1002`, `P1017`, `PrismaClientInitializationError`) to HTTP `503 Service temporarily unavailable`.
- **Full PostgreSQL Persistence**: All 13 backend services (`auth`, `rbac`, `customer`, `accounting`, `automation`, `billing`, `inventory`, `mikrotik`, `network`, `operations`, `payment`, `procurement`, and `report`) and audit logging (`logAudit`) read and mutate PostgreSQL directly through the shared `prisma` client without an in-memory fallback store.

### 3. Database Schema & Migrations (`prisma/schema.prisma`)

The Prisma schema defines **57 models** across applied migrations (`20261123000000_init`, `20261123010000_auth_enhancements`, `20261123153906_session_family_id`, `20261124180000_rbac_permissions_matrix`, `20261124193500_features_and_permissions`, `20261125000000_rename_brand_to_nsmisp`, `20261125150000_user_permission_overrides`):

| Domain | Models |
|---|---|
| **Identity, RBAC & Features** | `User`, `Role`, `Permission`, `Feature`, `FeaturePermission`, `UserRole`, `RolePermission`, `UserPermission`, `Session`, `AuditLog` |
| **CRM & Subscriptions** | `Customer`, `CustomerAddress`, `CustomerAttachment`, `CustomerActivity`, `Package`, `Subscription`, `SubscriptionHistory` |
| **Network & Provisioning** | `Router`, `RouterMetric`, `NetworkDevice`, `PPPoEProfile`, `PPPoEAccount`, `PPPoESession`, `VLAN`, `IPPool`, `IPAddress`, `NetworkProvisionJob` |
| **Billing & Payments** | `Invoice`, `InvoiceItem`, `Payment`, `PaymentAllocation`, `CreditNote` |
| **Inventory & Procurement** | `ProductCategory`, `Product`, `Warehouse`, `StockBalance`, `SerialNumber`, `StockMovement`, `Supplier`, `PurchaseOrder`, `PurchaseOrderItem`, `GoodsReceivedNote`, `GoodsReceivedItem`, `SupplierInvoice` |
| **Accounting & Ledger** | `Account`, `AccountingPeriod`, `JournalEntry`, `JournalEntryLine`, `Expense`, `FixedAsset` |
| **Operations, Automation & Config** | `Installation`, `Technician`, `SupportTicket`, `TicketMessage`, `Notification`, `AutomationRule`, `CompanySetting` |

---

## Database Diagram

The repository includes an automated Prisma DMMF → draw.io ER diagram at [`docs/erd/nsmisp-erd.drawio`](docs/erd/nsmisp-erd.drawio) containing an **Overview** page, one detailed page per domain (with cross-domain reference boxes), and a **Legend** page.

- **Regenerate** after updating `prisma/schema.prisma`:
  ```bash
  npx prisma generate
  npm run db:diagram
  ```
- **Open & view**: Open `docs/erd/nsmisp-erd.drawio` in **draw.io Desktop**, or go to [app.diagrams.net](https://app.diagrams.net) and select **File > Open from > Device...** (or **File > Open**).

---

## Setup, Deployment & Operations

### Prerequisites
- **Node.js**: `v22.6+` recommended (`npm run db:seed` uses `node --experimental-strip-types` to run `prisma/seed.ts`; Node 20 works for build/runtime and `scripts/seed-admin.mjs`).
- **PostgreSQL 16**: Local instance or Docker container (`docker compose up -d postgres`).
- **npm**

### 1. Local Development Setup

```bash
# 1. Install dependencies and prepare environment file
npm install
cp .env.example .env

# 2. Ensure PostgreSQL is running and DATABASE_URL in .env matches
#    Both .env.example and docker-compose.yml default to user=nsmisp, password=nsmisp123, db=nsmisp
docker compose up -d postgres

# 3. Generate Prisma client, run migrations, build server, and seed DB
npx prisma generate
npx prisma migrate deploy
npm run build:server
npm run db:seed

# 4. Launch backend watcher (:5000) + Vite frontend (:5173)
npm run dev
```

> **Note:** `npm run db:seed` executes `node --experimental-strip-types prisma/seed.ts` and imports compiled JS from `dist-server/services/rbac.service.js`, so `npm run build:server` must be run beforehand.

Useful URLs in development:
- Frontend App: `http://localhost:5173`
- API Gateway: `http://localhost:5000/api/v1`
- Swagger API Docs: `http://localhost:5000/api/docs`

### 2. Production Build & Docker Compose

```bash
# Local production build (backend -> dist-server/, frontend -> dist/)
npm run build:all
npm run start

# Full container stack (Postgres, Redis, Backend, Nginx Frontend on port 80)
docker compose up -d --build
docker compose ps
```

Services defined in `docker-compose.yml`:
- `nsmisp-postgres`: PostgreSQL 16 (`5432`, user `nsmisp`, password `nsmisp123`, db `nsmisp`)
- `nsmisp-redis`: Redis 7 (`6379`)
- `nsmisp-backend`: Express API (`5000`) built via `Dockerfile.backend`
- `nsmisp-frontend`: Nginx (`80`) serving `dist/` and proxying `/api/` to `backend:5000` via `Dockerfile.frontend` and `nginx.conf`

> **Production Environment Variables:** `server/src/server.ts` enforces `JWT_SECRET`, `JWT_REFRESH_SECRET`, and `COOKIE_SECURE` when `NODE_ENV=production` and exits at startup if any are missing. Ensure all three are provided in production overrides/environment configuration.

### 3. Database Backup & Restore

```bash
# Create compressed SQL backup in ./backups (or custom directory as $1)
./scripts/db-backup.sh

# Restore from a backup archive
./scripts/db-restore.sh ./backups/nsmisp_backup_YYYYMMDD_HHMMSS.sql.gz
```

> **Upgrading from an earlier NetPulse database/volume:** Renaming `DATABASE_URL` or Docker volume names does not move existing rows. Before switching `.env` to `nsmisp` or recreating containers, dump the legacy `netpulse` database with `pg_dump`, restore into `nsmisp`, verify row counts, and run `npx prisma migrate deploy`.

---

## Pre-Configured Staff Accounts (`prisma/seed.ts`)

| Role | Username | Email | Seeded Password | Scope |
|---|---|---|---|---|
| `SUPER_ADMIN` | `admin` | `admin@nsmisp.net` | `ADMIN_PASSWORD` env var *(default `StrongSuperAdminPassword2026!`)* | Full unrestricted access |
| `NETWORK_ENGINEER` | `engineer` | `noc@nsmisp.net` | `Password123!` *(non-production only)* | Network, PPPoE, VLAN, IPAM, Operations, Inventory view, Reports |
| `BILLING_CASHIER` | `cashier` | `cashier@nsmisp.net` | `Password123!` *(non-production only)* | Customers view, Billing, Payments, KHQR, Accounting view |
| `FIELD_TECHNICIAN` | `tech` | `tech@nsmisp.net` | `Password123!` *(non-production only)* | Customers view, Installations, Technicians, Tickets, Inventory view |
| `SUPPORT_AGENT` | `support` | `support@nsmisp.net` | `Password123!` *(non-production only)* | Customers, Packages/Subscriptions view, Tickets, Portal, Messages |
| `ACCOUNTANT` | `accountant` | `finance@nsmisp.net` | `Password123!` *(non-production only)* | Billing, Payments, Accounting & Reports, Procurement view |

*(In `scripts/seed-admin.mjs`, `ADMIN_PASSWORD` falls back to `NsmispAdmin2026!`.)*

---

## API Endpoints Reference

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
- `GET /api/v1/auth/users` / `POST /api/v1/auth/users` / `PATCH /api/v1/auth/users/:id/roles` / `GET /api/v1/auth/users/:id/permissions` / `PUT /api/v1/auth/users/:id/permissions` *(requires `roles.manage`)*
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

## Visual Design Tokens (`src/index.css`)

- **Primary Brand Accent**: `#EA6A3C` (`--brand`), hover `#D95A2C`, soft tint `#FDEFE8`
- **Light Mode Surfaces**: App background `#F7F7F5`, surface `#FFFFFF`, subtle `#F8F7F4` (plus `soft`, `standard`, and `high-contrast` comfort modes)
- **Dark Mode Surfaces**: App background `#111214`, sidebar `#16181D`, surface `#1A1C20`, raised `#212429`
- **Typography**: `Inter`, `Noto Sans Khmer`, `Kantumruy Pro`, `Plus Jakarta Sans`

---

## Verification, Builds & Test Suites

```bash
# Build & Type Checking
npm run build:server       # tsc -p server/tsconfig.json -> dist-server/
npm run build              # tsc -b && vite build -> dist/
npm run build:all          # Both backend and frontend builds
npm run lint               # ESLint across repository

# Core Test Suites
npm run test:unit          # scripts/test-regression.mjs (22 DataTable & UI checks)
npm run test:frontend-auth # scripts/test-auth-frontend.mjs (7 auth & RBAC schema tests)
npm run test:backend       # server/test/nsmisp.test.mjs
npm test                   # Runs test:unit, test:backend, and test:frontend-auth

# Additional Node Test Suites
node --test src/features/roles/rolesUtils.test.ts  # 7 matrix & per-user override unit tests
node --test server/test/features-frontend.test.mjs # 8 permission & feature ANY/ALL mode tests
node --test server/test/rbac.test.mjs              # 21 RBAC, feature & per-user override API/DB tests (requires built dist-server & PostgreSQL)

# Playwright E2E Suite
npm run test:pw            # Executes tests/*.spec.ts against http://127.0.0.1:5173
```
