# NetPulse - Modern ISP Customer Management & Operations Platform

NetPulse is a production-grade ISP (Internet Service Provider) Customer Management and Network Operations web application. It features a SaaS administrative dashboard designed with an orange accent visual language (`#F26B3A`), warm off-white background (`#FAF7F5`), collapsible statistics, interactive Recharts graphs, and full dark-mode support.

---

## 🌟 Key Features

### 1. Customers Page (Main Hub)
- **Live Stat Cards**: Total Subscribers, Monthly Recurring Revenue (MRR), Active Connections, and Average Monthly Usage with animated count-ups and month-over-month indicators.
- **Collapsible Stats Toolbar**: Animated height expand/collapse toggle ("Show Statistics").
- **Dynamic Filter Pills**: Live subscriber count pills for `All Customers`, `Active`, `Suspended`, `Overdue`, `Pending`, and `Disconnected`.
- **Advanced Filter Popover**: Filter by Internet Plan, Connection Type (Fiber, Wireless, DSL), City, Balance status, and Date ranges.
- **Interactive Data Table**:
  - Checkbox selection with select-all and animated floating **Bulk Action Bar** (Activate, Suspend, Message, Export CSV, Bulk Delete).
  - Sortable column headers with animated direction arrows.
  - Row hover and selected row warm peach tint (`#FFF6F2` / `dark:bg-orange-950/20`).
  - Inline status changer directly from status badges.
  - Star ratings, data usage progress bars, and "..." row actions menu.
  - Multi-view switcher: **Table View**, **Compact View**, and **Card Grid View**.
- **Customer Detail Drawer**:
  - Slides in smoothly from the right on row click.
  - 6 interactive tabs: **Overview**, **Billing History**, **Traffic & Usage Chart** (14-day interactive Recharts Area Chart), **Tickets**, **Activity Log**, and **Internal Notes**.
- **Modals & Dialogs**:
  - **Add / Edit Subscriber**: 3-step animated onboarding wizard with Zod validation.
  - **Customize View**: Toggle and persist column visibility.
  - **Delete Confirmation**: Single and bulk safety dialog (requires typing "DELETE").
  - **Record Payment**: Ledger adjustment with real-time balance deductions.
  - **Send Message**: SMS and Email templates with character counters.
  - **Diagnostic Speed Test**: Live mock gauge measuring Latency, Jitter, Download, and Upload throughput.
  - **Status Change**: Suspension reason modal.

### 2. Operational Pages & Features
- **Dashboard**: Core transit traffic graph (Gbps), MRR growth bars, hardware health, and audit trail.
- **Internet Plans Catalog**: Full CRUD for Fiber, Wireless, and DSL broadband plans.
- **Billing & Invoices**: Invoice management, status filtering, "Mark as Paid", and receipt downloads.
- **Support Tickets & Dispatch**: Priority management, ticket statuses, technician assignment.
- **Network Infrastructure**: OLT and Core Router fleet monitoring with remote hardware reboot action.
- **Technicians & Installations**: Engineer roster and daily optical installation schedule.
- **Subscriber Messaging**: SMS & Email broadcast dispatch to subscriber cohorts.
- **ISP Automation**: Configurable automated triggers (e.g. past-due suspension, auto-backup, signal alerts).
- **Integrations**: Mikrotik RouterOS, Ubiquiti UISP, Stripe, Twilio, and FreeRADIUS.
- **System Settings**: Business profile customization, regional currency selection (`$`, `€`, `£`, `₹`), theme switcher, and demo data reset.
- **Command Palette (`Ctrl+K` / `⌘K`)**: Fast global search across subscribers, IP addresses, MAC addresses, navigation, and quick actions.
- **Toast Notifications**: Animated toast stack in bottom right with **Undo** capability for deletes.

---

## 🛠️ Tech Stack
- **Framework**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS with CSS Variables & Dark Mode
- **Animations**: Framer Motion (page transitions, spring modals, drawers, floating action bars)
- **State Management**: Zustand with `localStorage` persistence
- **Icons**: Lucide React
- **Charts**: Recharts (Responsive Area, Bar, and Line charts)
- **Forms & Validation**: React Hook Form + Zod
- **Date Handling**: date-fns

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm or pnpm

### Installation & Run

```bash
# 1. Install dependencies
npm install

# 2. Start the local development server
npm run dev
```

The application will launch at `http://localhost:5173/` (or the port specified in terminal).

### Production Build

```bash
npm run build
npm run preview
```

---

## 🎨 Visual Language & Design Tokens
- **Primary Brand Accent**: `#F26B3A` (Warm Vibrant Orange)
- **Brand Tint / Selected**: `#FFF1EA` / `#FFF6F2`
- **Warm Background**: `#FAF7F5`
- **Dark Mode Surface**: `#141416` / `#1C1C1F`
- **Typography**: Plus Jakarta Sans / Inter
