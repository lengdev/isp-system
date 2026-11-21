export type CustomerStatus = 'Active' | 'Suspended' | 'Pending' | 'Disconnected' | 'Overdue';

export type ConnectionType = 'Fiber' | 'Wireless' | 'DSL';

export interface Plan {
  id: string;
  name: string;
  speedMbps: number; // Downlink
  uploadMbps: number;
  monthlyPrice: number;
  dataCapGB: number | null; // null = Unlimited
  type: ConnectionType;
  description?: string;
  isPopular?: boolean;
  subscribersCount?: number;
}

export interface Customer {
  id: string;
  code: string; // e.g. "CUST-1042"
  avatarUrl?: string;
  initials: string;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  planId: string;
  planName: string;
  monthlyPrice: number;
  connectionType: ConnectionType;
  ipAddress: string;
  macAddress: string;
  installationDate: string; // ISO or YYYY-MM-DD
  dueDate: string; // Day of month or YYYY-MM-DD
  dataUsageGB: number;
  dataCapGB: number | null; // null = Unlimited
  balanceDue: number; // 0 = paid up, >0 = owe
  status: CustomerStatus;
  rating: number; // 1.0 - 5.0
  notes?: string;
  onlineStatus: 'online' | 'offline';
  lastPingMs: number;
  assignedTechnician?: string;
  tags?: string[];
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  amount: number;
  date: string;
  dueDate: string;
  status: 'Paid' | 'Pending' | 'Overdue';
  items: { description: string; amount: number }[];
  paidAt?: string;
  paymentMethod?: string;
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  customerId: string;
  customerName: string;
  title: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  assignedTechnician?: string;
  category?: string;
  labels?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface NetworkDevice {
  id: string;
  name: string;
  type: 'OLT' | 'ONT' | 'Core Router' | 'Switch' | 'Access Point';
  ipAddress: string;
  location: string;
  status: 'Online' | 'Warning' | 'Offline';
  uptimeDays: number;
  cpuLoadPercent: number;
  connectedClients: number;
  firmwareVersion: string;
  lastPingMs: number;
}

export interface Technician {
  id: string;
  name: string;
  avatar: string;
  phone: string;
  email: string;
  zone: string;
  activeJobs: number;
  completedToday: number;
  rating: number;
  status: 'Available' | 'On Job' | 'Off Duty';
}

export interface InstallationSchedule {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  address: string;
  scheduledDate: string;
  timeSlot: string;
  technicianId: string;
  technicianName: string;
  planName: string;
  status: 'Scheduled' | 'In Progress' | 'Completed' | 'Rescheduled';
  notes?: string;
}

export interface ActivityLog {
  id: string;
  customerId?: string;
  action: string;
  details: string;
  actor: string;
  timestamp: string;
  type: 'billing' | 'status' | 'support' | 'network' | 'profile';
}

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  type: 'alert' | 'invoice' | 'ticket' | 'system' | 'critical' | 'payment';
  link?: string;
}

export type TableViewMode = 'table' | 'compact' | 'cards';

export interface ColumnSetting {
  id: string;
  label: string;
  visible: boolean;
  order: number;
}

export interface FilterState {
  status: string[]; // multi: ['Active', 'Suspended'] etc. Empty = all
  plan: string[]; // multi
  city: string[]; // multi
  connectionType: string[]; // multi
  technician: string[]; // multi
  minBalance?: number;
  maxBalance?: number;
  dateRange: 'all' | 'this_month' | 'last_30_days' | 'this_year';
  searchQuery: string;
}

export interface SortState {
  column: keyof Customer | 'planName';
  direction: 'asc' | 'desc';
}

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  undoAction?: () => void;
}

export type ThemeMode = 'light' | 'dark' | 'system';
export type ComfortMode = 'soft' | 'standard' | 'high-contrast';
export type DensityMode = 'compact' | 'comfortable';
export type AnimationMode = 'system' | 'on' | 'reduced';

