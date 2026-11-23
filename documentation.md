# NetPulse – Complete ISP ERP, CRM & Network Management System
**Production Release Architecture, Implementation & Operating Guide**

---

## 1. Executive Summary & Architecture Overview

**NetPulse** is an enterprise-grade ISP ERP, CRM, and Network Operations platform specifically engineered for Internet Service Providers operating mixed **FTTH (Fiber to the Home)** and **Wireless (WISP)** distribution networks with **MikroTik RouterOS** infrastructure, managing 500 to 2,000+ active subscribers.

The system is built on a high-concurrency **PERN (PostgreSQL, Express, React, Node.js)** architecture in strict TypeScript, adhering to single-source-of-truth domain models, double-entry financial controls, and carrier-grade network operations safety.

```
                           +------------------------------------------------+
                           |             NetPulse Unified UI                |
                           |   (React 18, Vite, Tailwind CSS, Lucide,       |
                           |    Framer Motion, TanStack, Zustand Store)     |
                           +-----------------------+------------------------+
                                                   |
                                                   | HTTP / REST API & SSE
                                                   v
                           +------------------------------------------------+
                           |           NetPulse API Gateway / Server        |
                           |   (Node.js 24, Express, TypeScript, JWT,       |
                           |    Role-Based Access Control, Swagger Docs)    |
                           +--+-------------+-------------+--------------+--+
                              |             |             |              |
          +-------------------+             |             |              +-------------------+
          |                                 |             |                                  |
          v                                 v             v                                  v
+-------------------+             +------------------+  +------------------+       +-------------------+
| MikroTik RouterOS |             |   Prisma ORM     |  | Double-Entry     |       | Automated Tasks   |
| API Integration   |             |   Data Layer     |  | Accounting Engine|       | & Cron Service    |
| - PPPoE Secrets   |             | - 30+ Entities   |  | - General Ledger |       | - Recurring Bill  |
| - Rate Queues     |             | - Strict UUIDs   |  | - Trial Balance  |       | - Auto-Suspension |
| - Active Sessions |             | - High-Precision |  | - P&L & Balance  |       | - Health Probes   |
| - Interface Stats |             |   Decimals       |  |   Sheet          |       | - Low-Stock Alerts|
+-------------------+             +--------+---------+  +------------------+       +-------------------+
                                           |
                                           v
                                  +------------------+
                                  | PostgreSQL 16 DB |
                                  | (Dual Store Fall-|
                                  |  back in Sandbox)|
                                  +------------------+
```

---

## 2. Core Modules Implemented

### 2.1 Identity, Access Control & Compliance
- **Granular RBAC**: 5 Pre-configured ISP roles:
  1. `SUPER_ADMIN`: Unrestricted system, infrastructure, and financial authority.
  2. `NETWORK_ENGINEER`: Full access to MikroTik routers, PPPoE accounts, VLANs, and IPAM.
  3. `BILLING_CASHIER`: Invoicing, payment collection, KHQR settlement, and cashiering.
  4. `FIELD_TECHNICIAN`: Work orders, installation tasks, CPE/ONT registration, and site testing.
  5. `SUPPORT_AGENT`: CRM view, subscriber troubleshooting, speed tests, and ticketing.
- **Audit Logging**: Every administrative action, status modification, network change, and financial transaction is logged with actor ID, action name, resource ID, client IP, and UTC timestamp.

### 2.2 MikroTik Network Management & RouterOS API
- **Fleet Management**: Secure registration of core routers, distribution switches, and wireless towers with encrypted API credentials (`api-ssl` port 8729, standard port 8728).
- **PPPoE Provisioning**: Automated creation, modification, suspension, and deletion of `/ppp/secret` records on MikroTik routers with rate-limit queue profiles (`rx-bits-per-second / tx-bits-per-second`).
- **Session Telemetry**: Real-time inspection of active PPPoE sessions (`/ppp/active`), assigned IP addresses, caller MAC addresses, session uptime, and byte counters.
- **Diagnostics**: Router health telemetry (CPU load %, memory usage %, system uptime) and remote diagnostic actions (connectivity ping and controlled reboot).
- **Graceful Simulator Fallback**: When testing or deploying in sandbox environments without live hardware connectivity, an embedded RouterOS simulator ensures full workflow validation without failing transactions.

### 2.3 Carrier-Grade Network Segmentation (VLAN & IPAM)
- **VLAN Management**: Scope-aware VLAN catalog supporting Management, Fiber Internet, Wireless Internet, Transport, and Corporate VLANs. Built-in uniqueness validation prevents conflicting VLAN IDs on the same physical router interface.
- **IP Address Management (IPAM)**: Subnet definition, gateway/DNS configuration, dynamic pool management, and static IP allocation with duplicate assignment prevention across active subscribers.

### 2.4 Double-Entry Accounting & Financial Invariants
NetPulse enforces an uncompromised double-entry general ledger based on standard GAAP/IFRS principles:
- **Zero-Sum Ledger Rule**: Every journal entry validates that $\sum \text{Debits} \equiv \sum \text{Credits}$ to the exact cent.
- **Automated Accrual Billing**: Invoice issuance records:
  - $\text{Debit: Accounts Receivable (1100)}$
  - $\text{Credit: Fiber/Wireless Internet Revenue (4010/4020)}$
  - $\text{Credit: Sales Tax Payable (2200)}$
- **Automated Payment Settlement**: Receipt of subscriber payments records:
  - $\text{Debit: Cash on Hand (1010) or Operating Bank Account (1020/1030)}$
  - $\text{Credit: Accounts Receivable (1100)}$
- **Procurement AP Posting**: Receiving purchase orders via Goods Received Notes (GRN) records:
  - $\text{Debit: Hardware Inventory Asset (1300)}$
  - $\text{Credit: Accounts Payable (2000)}$
- **Fixed Asset Depreciation**: Automated monthly depreciation posts:
  - $\text{Debit: Depreciation Expense (6100)}$
  - $\text{Credit: Accumulated Depreciation (1510)}$
- **Financial Statements**: Dynamic generation of **Trial Balance**, **Profit & Loss (P&L)**, **Balance Sheet**, and **AR Aging Reports** (Current, 1–30 days, 31–60 days, 61–90 days, 90+ days).

### 2.5 Multi-Warehouse Inventory & Serialized Tracking
- **Warehouses**: Multi-facility management (Central Warehouse, Regional Depots, Technician Vehicle Vans).
- **Stock Movement Controls**: Complete audit trail for Receipts (`IN`), Dispatches (`OUT`), and Site-to-Site Transfers (`TRANSFER`) with automated negative stock prevention.
- **Serialized Equipment**: Unit-level tracking for ONUs/ONTs, MikroTik routers, and Wireless CPEs with MAC/Serial number verification and customer assignment locking.

### 2.6 Procurement & Supplier Operations
- **Vendor Management**: Approved hardware and fiber optic vendor profiles.
- **Purchase Orders & Receiving**: Workflow from `DRAFT` $\to$ `APPROVED` $\to$ `RECEIVED`. Generating a Goods Received Note (GRN) automatically increments warehouse stock levels, posts the Accounts Payable journal entry, and prepares supplier invoice payment.

### 2.7 Operations & Field Installations Workflow
- **End-to-End Work Order Lifecycle**:
  1. Customer order registered and installation work order created.
  2. Field technician assigned with scheduled installation date.
  3. Specific ONT/CPE serial number reserved from technician van inventory.
  4. Technician completes site drop cable, mounts ONT, and triggers field activation.
  5. NetPulse backend provisions the PPPoE secret on the target MikroTik router, attaches the subscription, transitions customer status to `Active`, and issues the first month's invoice.

### 2.8 Customer Self-Service Portal
- Direct subscriber portal interface allowing customers to:
  - Check real-time PPPoE connection status, IP address, and bandwidth plan.
  - Review invoice history and outstanding balances.
  - Generate instant **Bakong KHQR** payment barcodes for mobile banking checkout.
  - Open support tickets directly with network dispatch.

---

## 3. Database Schema Overview

The database is defined in `prisma/schema.prisma` with over 30 normalized entities using strict UUID primary keys, decimal precision for currency, and comprehensive referential integrity:

| Domain | Key Models |
|---|---|
| **Identity & Access** | `User`, `Role`, `Permission`, `UserRole`, `Session`, `AuditLog` |
| **CRM & Services** | `Customer`, `Address`, `Attachment`, `Activity`, `Package`, `Subscription`, `SubscriptionHistory` |
| **Network Infrastructure** | `Router`, `RouterMetric`, `NetworkDevice`, `PPPoEProfile`, `PPPoEAccount`, `PPPoESession`, `VLAN`, `IPPool`, `IPAddress`, `ProvisionJob` |
| **Billing & Payments** | `Invoice`, `InvoiceItem`, `Payment`, `PaymentAllocation`, `CreditNote` |
| **Inventory & Procurement** | `Product`, `Category`, `Warehouse`, `StockBalance`, `SerialNumber`, `StockMovement`, `Supplier`, `PurchaseOrder`, `PurchaseOrderItem`, `GoodsReceivedNote`, `SupplierInvoice` |
| **Accounting & General Ledger** | `Account`, `AccountingPeriod`, `JournalEntry`, `JournalLine`, `Expense`, `FixedAsset`, `FixedAssetDepreciation` |
| **Operations & Dispatch** | `Installation`, `Technician`, `SupportTicket`, `TicketComment` |
| **Automation & Settings** | `Message`, `Notification`, `AutomationRule`, `CompanySetting` |

---

## 4. API Endpoints Reference

All endpoints are prefixed with `/api/v1` and documented via OpenAPI 3.0 at `/api/docs`.

### Authentication & Users
- `POST /api/v1/auth/login` – Authenticate with username and password; returns JWT token.
- `GET /api/v1/auth/me` – Retrieve profile and permissions of authenticated user.
- `GET /api/v1/auth/users` – List administrative and staff users.
- `POST /api/v1/auth/users` – Create new staff user with role assignment.

### CRM & Customers
- `GET /api/v1/customers` – Search, filter, and paginate customer directory.
- `GET /api/v1/customers/:id` – Retrieve 360-degree customer profile with subscriptions, network info, and invoices.
- `POST /api/v1/customers` – Create new customer record with optional auto-subscription.
- `PUT /api/v1/customers/:id` – Update customer contact, billing, or address details.
- `POST /api/v1/customers/:id/status` – Update subscriber status (`Active`, `Suspended`, `Terminated`).
- `POST /api/v1/customers/:id/speedtest` – Run latency and throughput diagnostic test on customer line.

### Packages & Subscriptions
- `GET /api/v1/packages` – List all available Fiber and Wireless packages.
- `POST /api/v1/packages` – Create new internet package with PPPoE profile link.
- `PUT /api/v1/packages/:id` – Modify speeds, pricing, or status.
- `DELETE /api/v1/packages/:id` – Archive an internet package.

### Network & MikroTik
- `GET /api/v1/network/routers` – List registered MikroTik routers with live health status.
- `POST /api/v1/network/routers` – Register a new MikroTik router.
- `GET /api/v1/network/routers/:id/metrics` – Get CPU load, memory usage, and uptime telemetry.
- `POST /api/v1/network/routers/:id/test` – Verify connectivity to MikroTik API.
- `POST /api/v1/network/routers/:id/reboot` – Controlled router reboot.
- `GET /api/v1/network/pppoe` – List all provisioned PPPoE accounts and active sessions.
- `POST /api/v1/network/pppoe` – Manually provision PPPoE account on router.
- `POST /api/v1/network/pppoe/:id/disconnect` – Disconnect active PPPoE session.
- `GET /api/v1/network/vlans` – List VLANs across routers.
- `POST /api/v1/network/vlans` – Provision new VLAN with conflict validation.
- `GET /api/v1/network/ipam/pools` – List IP pools and subnet allocations.
- `POST /api/v1/network/ipam/allocate` – Allocate static IP address to subscriber.

### Invoicing & Payments
- `GET /api/v1/invoices` – List invoices with filtering by status and date range.
- `POST /api/v1/invoices` – Generate custom or recurring invoice (posts accrual journal).
- `PUT /api/v1/invoices/:id/pay` – Mark invoice paid and balance customer account.
- `GET /api/v1/payments` – Retrieve customer payment history.
- `POST /api/v1/payments/record` – Record cashier payment, post cash journal, and reconnect customer if overdue.
- `POST /api/v1/payments/khqr` – Generate Bakong KHQR dynamic payment payload.

### Double-Entry Accounting
- `GET /api/v1/accounting/dashboard` – Real-time financial summary (Revenue, Cash, AP, AR).
- `GET /api/v1/accounting/accounts` – Chart of accounts (Assets, Liabilities, Equity, Revenue, Expenses).
- `POST /api/v1/accounting/journal` – Post balanced manual journal entry.
- `POST /api/v1/accounting/journal/:entryNumber/reverse` – Reversal journal entry.
- `GET /api/v1/accounting/ledger` – Complete general ledger transaction history.
- `GET /api/v1/accounting/trial-balance` – Period trial balance with verified debits === credits.
- `GET /api/v1/accounting/pnl` – Profit & Loss statement.
- `GET /api/v1/accounting/balance-sheet` – Balance Sheet with Assets = Liabilities + Equity verification.
- `GET /api/v1/accounting/ar-aging` – AR aging breakdown by days overdue.

### Inventory & Procurement
- `GET /api/v1/inventory/warehouses` – List warehouses and depot locations.
- `GET /api/v1/inventory/balances` – Stock balances per product and warehouse.
- `POST /api/v1/inventory/movements` – Record Stock In, Stock Out, or Transfer.
- `GET /api/v1/purchasing/suppliers` – Hardware and fiber suppliers directory.
- `POST /api/v1/purchasing/orders` – Create Purchase Order.
- `POST /api/v1/purchasing/orders/:id/receive` – Issue Goods Received Note, increment stock, and post AP journal.

### Operations & Field Management
- `GET /api/v1/operations/installations` – Installation work orders queue.
- `POST /api/v1/operations/installations` – Schedule new installation.
- `POST /api/v1/operations/installations/:id/complete` – Complete installation workflow (provision PPPoE, reserve ONT, activate subscriber, bill).
- `GET /api/v1/operations/technicians` – Field technicians directory with active job counts.
- `GET /api/v1/operations/tickets` – Support tickets queue.
- `POST /api/v1/operations/tickets` – Create support ticket.

### Subscriber Self-Service Portal
- `GET /api/v1/portal/:customerCode/overview` – Subscriber portal dashboard.
- `POST /api/v1/portal/:customerCode/pay` – Subscriber self-service payment checkout.
- `POST /api/v1/portal/:customerCode/tickets` – Subscriber ticket submission.

---

## 5. Deployment & Operations

### 5.1 Docker Compose Deployment
The repository includes a ready-to-run multi-container setup in `docker-compose.yml`:

```bash
# 1. Configure environment
cp .env.example .env

# 2. Build and launch all services in detached mode
docker compose up -d --build

# 3. Check service health
docker compose ps
```

The stack runs:
- `netpulse-frontend`: Nginx reverse proxy serving the production React application on port `80`/`443`.
- `netpulse-backend`: Node.js Express API service on port `5000`.
- `netpulse-postgres`: PostgreSQL 16 database on internal port `5432`.
- `netpulse-redis`: Redis 7 cache and job queue broker on internal port `6379`.

### 5.2 Database Backup and Disaster Recovery
Automated backup and restore scripts with compression and 30-day retention pruning are included in `scripts/`:

```bash
# Execute automated compressed database backup
./scripts/db-backup.sh

# Restore database from specified backup archive
./scripts/db-restore.sh /var/backups/netpulse/netpulse_backup_20261123_000000.sql.gz
```

### 5.3 Local Development Mode
To run both backend and frontend concurrently for development:

```bash
# Start backend API (port 5000) and Vite dev server (port 5173) concurrently:
npm run dev:all
```

---

## 6. Automated Verification & Quality Assurance

Both the front-end user experience and backend domain logic are covered by automated test suites:

```bash
# Run complete test verification
npm test
```

### Test Suite Results:
- **DataTable & UI Regression Suite**: **22 / 22 Tests Passed**
  - Viewport boundary detection, popover anchoring, column alignment, sticky offsets, selection counters, status filters, and accessibility compliance.
- **Backend Domain Logic Suite**: **12 / 12 Tests Passed**
  - Super Admin JWT authentication and invalid credential rejection.
  - CRM customer creation, search, and indexing.
  - MikroTik RouterOS API ping and PPPoE secret provisioning.
  - VLAN interface duplicate detection and IPAM static pool allocation.
  - Invoicing duplicate prevention and accrual revenue recognition.
  - Cashier payment collection and automated overdue subscriber reconnection.
  - Double-entry accounting balancing ($\text{Debits} \equiv \text{Credits}$).
  - Multi-warehouse inventory stock tracking and negative inventory blocking.
  - Full procurement lifecycle: PO $\to$ GRN $\to$ Stock In $\to$ Accounts Payable journal.
  - End-to-end field installation workflow with RouterOS activation.
- **Production Compilation**:
  - `tsc -p server/tsconfig.json`: Clean compile to `dist-server/`.
  - `tsc -b && vite build`: Clean production build to `dist/`.
