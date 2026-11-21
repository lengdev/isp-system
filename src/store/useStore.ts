import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  Customer,
  CustomerStatus,
  Plan,
  Invoice,
  SupportTicket,
  NetworkDevice,
  Technician,
  InstallationSchedule,
  ActivityLog,
  NotificationItem,
  TableViewMode,
  ColumnSetting,
  FilterState,
  SortState,
  ToastItem,
} from '../types';
import {
  INITIAL_PLANS,
  INITIAL_COLUMNS,
  generateSeedCustomers,
  INITIAL_INVOICES,
  INITIAL_TICKETS,
  INITIAL_DEVICES,
  INITIAL_TECHNICIANS,
  INITIAL_SCHEDULES,
  INITIAL_NOTIFICATIONS,
  INITIAL_ACTIVITIES,
} from '../data/mockData';

interface AppStore {
  // Data
  customers: Customer[];
  plans: Plan[];
  invoices: Invoice[];
  tickets: SupportTicket[];
  devices: NetworkDevice[];
  technicians: Technician[];
  schedules: InstallationSchedule[];
  activities: ActivityLog[];
  notifications: NotificationItem[];

  // Selection & Detail
  selectedCustomerIds: string[];
  activeCustomerId: string | null;
  activeDrawerTab: 'overview' | 'billing' | 'usage' | 'tickets' | 'activity' | 'notes';
  isDrawerOpen: boolean;

  // Filter & View State
  filters: FilterState;
  sort: SortState;
  pagination: { page: number; pageSize: number };
  viewMode: TableViewMode;
  columns: ColumnSetting[];
  showStatistics: boolean;
  isCommandPaletteOpen: boolean;
  isLoading: boolean;
  darkMode: boolean;
  currency: string;

  // Undo and feedback
  lastDeletedCustomers: Customer[];
  toasts: ToastItem[];

  // Modals state
  modalState: {
    addEditCustomer: { isOpen: boolean; customerId?: string };
    deleteConfirmation: { isOpen: boolean; customerIds: string[]; isBulk: boolean };
    statusConfirmation: { isOpen: boolean; customerIds: string[]; targetStatus: CustomerStatus };
    recordPayment: { isOpen: boolean; customerId?: string };
    sendMessage: { isOpen: boolean; customerId?: string; isBulk: boolean };
    createTicket: { isOpen: boolean; customerId?: string };
    speedTest: { isOpen: boolean; customerId?: string };
    customizeView: { isOpen: boolean };
    addEditPlan: { isOpen: boolean; planId?: string };
  };

  // Actions
  setFilters: (filters: Partial<FilterState>) => void;
  resetFilters: () => void;
  setSort: (column: keyof Customer | 'planName') => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  setViewMode: (mode: TableViewMode) => void;
  toggleColumn: (columnId: string) => void;
  reorderColumns: (columns: ColumnSetting[]) => void;
  toggleStatistics: () => void;
  toggleDarkMode: () => void;
  setDarkMode: (enabled: boolean) => void;
  setCurrency: (currency: string) => void;

  // Selection actions
  toggleSelectCustomer: (id: string) => void;
  selectAllCustomers: (ids: string[]) => void;
  clearSelectedCustomers: () => void;

  // Drawer
  openDrawer: (customerId: string, tab?: AppStore['activeDrawerTab']) => void;
  closeDrawer: () => void;
  setDrawerTab: (tab: AppStore['activeDrawerTab']) => void;

  // Command Palette
  setCommandPaletteOpen: (open: boolean) => void;

  // Toasts
  addToast: (toast: Omit<ToastItem, 'id'>) => void;
  removeToast: (id: string) => void;

  // Modals
  openModal: <K extends keyof AppStore['modalState']>(modal: K, payload?: Partial<AppStore['modalState'][K]>) => void;
  closeModal: (modal: keyof AppStore['modalState']) => void;

  // Customers CRUD
  addCustomer: (customerData: Omit<Customer, 'id' | 'code'>) => Promise<void>;
  updateCustomer: (id: string, updates: Partial<Customer>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  bulkDeleteCustomers: (ids: string[]) => Promise<void>;
  undoDelete: () => Promise<void>;
  setCustomerStatus: (id: string, status: CustomerStatus, reason?: string) => Promise<void>;
  bulkSetCustomerStatus: (ids: string[], status: CustomerStatus, reason?: string) => Promise<void>;

  // Plans CRUD
  addPlan: (plan: Omit<Plan, 'id'>) => void;
  updatePlan: (id: string, plan: Partial<Plan>) => void;
  deletePlan: (id: string) => void;

  // Invoices & Billing
  recordPayment: (customerId: string, amount: number, method: string, reference?: string) => Promise<void>;
  markInvoicePaid: (invoiceId: string) => void;

  // Tickets
  createTicket: (ticket: Omit<SupportTicket, 'id' | 'ticketNumber' | 'createdAt' | 'updatedAt'>) => void;
  updateTicketStatus: (ticketId: string, status: SupportTicket['status']) => void;
  assignTicketTechnician: (ticketId: string, techName: string) => void;

  // Devices
  rebootDevice: (deviceId: string) => Promise<void>;

  // Notifications
  markAllNotificationsRead: () => void;
  markNotificationRead: (id: string) => void;

  // System
  resetDemoData: () => void;
  simulateLatency: () => Promise<void>;
}

const DEFAULT_FILTERS: FilterState = {
  status: [],
  plan: [],
  city: [],
  connectionType: [],
  technician: [],
  minBalance: undefined,
  maxBalance: undefined,
  dateRange: 'all',
  searchQuery: '',
};

export const useStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // Seed data
      customers: generateSeedCustomers(),
      plans: INITIAL_PLANS,
      invoices: INITIAL_INVOICES,
      tickets: INITIAL_TICKETS,
      devices: INITIAL_DEVICES,
      technicians: INITIAL_TECHNICIANS,
      schedules: INITIAL_SCHEDULES,
      activities: INITIAL_ACTIVITIES,
      notifications: INITIAL_NOTIFICATIONS,

      selectedCustomerIds: [],
      activeCustomerId: null,
      activeDrawerTab: 'overview',
      isDrawerOpen: false,

      filters: DEFAULT_FILTERS,
      sort: { column: 'id', direction: 'asc' },
      pagination: { page: 1, pageSize: 10 },
      viewMode: 'table',
      columns: INITIAL_COLUMNS,
      showStatistics: true,
      isCommandPaletteOpen: false,
      isLoading: false,
      darkMode: false,
      currency: '$',

      lastDeletedCustomers: [],
      toasts: [],

      modalState: {
        addEditCustomer: { isOpen: false },
        deleteConfirmation: { isOpen: false, customerIds: [], isBulk: false },
        statusConfirmation: { isOpen: false, customerIds: [], targetStatus: 'Suspended' },
        recordPayment: { isOpen: false },
        sendMessage: { isOpen: false, isBulk: false },
        createTicket: { isOpen: false },
        speedTest: { isOpen: false },
        customizeView: { isOpen: false },
        addEditPlan: { isOpen: false },
      },

      // Latency simulator (300ms - 500ms)
      simulateLatency: async () => {
        set({ isLoading: true });
        const delay = Math.floor(Math.random() * 200) + 300;
        await new Promise((resolve) => setTimeout(resolve, delay));
        set({ isLoading: false });
      },

      // Filters
      setFilters: (newFilters) => {
        set((state) => ({
          filters: { ...state.filters, ...newFilters },
          pagination: { ...state.pagination, page: 1 },
        }));
      },
      resetFilters: () => {
        set({ filters: DEFAULT_FILTERS, pagination: { page: 1, pageSize: 10 } });
      },

      // Sorting
      setSort: (column) => {
        set((state) => {
          if (state.sort.column === column) {
            return {
              sort: {
                column,
                direction: state.sort.direction === 'asc' ? 'desc' : 'asc',
              },
            };
          }
          return {
            sort: { column, direction: 'asc' },
          };
        });
      },

      setPage: (page) => set((state) => ({ pagination: { ...state.pagination, page } })),
      setPageSize: (pageSize) => set((state) => ({ pagination: { page: 1, pageSize } })),
      setViewMode: (viewMode) => set({ viewMode }),

      toggleColumn: (columnId) => {
        set((state) => ({
          columns: state.columns.map((col) =>
            col.id === columnId ? { ...col, visible: !col.visible } : col
          ),
        }));
      },
      reorderColumns: (columns) => set({ columns }),

      toggleStatistics: () => set((state) => ({ showStatistics: !state.showStatistics })),

      toggleDarkMode: () => {
        const nextDark = !get().darkMode;
        set({ darkMode: nextDark });
        if (nextDark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      },
      setDarkMode: (enabled) => {
        set({ darkMode: enabled });
        if (enabled) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      },
      setCurrency: (currency) => set({ currency }),

      // Selection
      toggleSelectCustomer: (id) => {
        set((state) => {
          const exists = state.selectedCustomerIds.includes(id);
          return {
            selectedCustomerIds: exists
              ? state.selectedCustomerIds.filter((item) => item !== id)
              : [...state.selectedCustomerIds, id],
          };
        });
      },
      selectAllCustomers: (ids) => {
        set((state) => {
          const allSelected = ids.every((id) => state.selectedCustomerIds.includes(id));
          return {
            selectedCustomerIds: allSelected
              ? state.selectedCustomerIds.filter((id) => !ids.includes(id))
              : Array.from(new Set([...state.selectedCustomerIds, ...ids])),
          };
        });
      },
      clearSelectedCustomers: () => set({ selectedCustomerIds: [] }),

      // Drawer
      openDrawer: (customerId, tab = 'overview') => {
        set({ activeCustomerId: customerId, activeDrawerTab: tab, isDrawerOpen: true });
      },
      closeDrawer: () => set({ isDrawerOpen: false, activeCustomerId: null }),
      setDrawerTab: (tab) => set({ activeDrawerTab: tab }),

      // Command palette
      setCommandPaletteOpen: (open) => set({ isCommandPaletteOpen: open }),

      // Toasts
      addToast: (toast) => {
        const id = 'toast-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
        set((state) => ({
          toasts: [...state.toasts, { ...toast, id }],
        }));
        const duration = toast.duration ?? (toast.type === 'error' ? 6000 : 4000);
        setTimeout(() => {
          get().removeToast(id);
        }, duration);
      },
      removeToast: (id) => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      },

      // Modals
      openModal: (modal, payload = {}) => {
        set((state) => ({
          modalState: {
            ...state.modalState,
            [modal]: { ...state.modalState[modal], ...payload, isOpen: true },
          },
        }));
      },
      closeModal: (modal) => {
        set((state) => ({
          modalState: {
            ...state.modalState,
            [modal]: { ...state.modalState[modal], isOpen: false },
          },
        }));
      },

      // Customer CRUD
      addCustomer: async (customerData) => {
        await get().simulateLatency();
        const nextId = 'cust-' + (get().customers.length + 1);
        const nextCode = `CUST-${1000 + get().customers.length + 1}`;
        const newCustomer: Customer = {
          ...customerData,
          id: nextId,
          code: nextCode,
        };
        set((state) => ({
          customers: [newCustomer, ...state.customers],
          activities: [
            {
              id: 'act-' + Date.now(),
              customerId: nextId,
              action: 'Customer Onboarded',
              details: `Added new subscriber ${newCustomer.fullName} with ${newCustomer.planName}`,
              actor: 'Admin',
              timestamp: 'Just now',
              type: 'profile',
            },
            ...state.activities,
          ],
        }));
        get().addToast({
          type: 'success',
          title: 'Customer Created',
          message: `${newCustomer.fullName} (${nextCode}) added successfully.`,
        });
      },

      updateCustomer: async (id, updates) => {
        await get().simulateLatency();
        set((state) => ({
          customers: state.customers.map((c) => (c.id === id ? { ...c, ...updates } : c)),
          activities: [
            {
              id: 'act-' + Date.now(),
              customerId: id,
              action: 'Profile Updated',
              details: `Account attributes updated for ${updates.fullName || id}`,
              actor: 'Admin',
              timestamp: 'Just now',
              type: 'profile',
            },
            ...state.activities,
          ],
        }));
        get().addToast({
          type: 'success',
          title: 'Customer Updated',
          message: 'Changes saved successfully.',
        });
      },

      deleteCustomer: async (id) => {
        const customer = get().customers.find((c) => c.id === id);
        if (!customer) return;

        await get().simulateLatency();
        set((state) => ({
          customers: state.customers.filter((c) => c.id !== id),
          selectedCustomerIds: state.selectedCustomerIds.filter((cid) => cid !== id),
          lastDeletedCustomers: [customer],
          isDrawerOpen: state.activeCustomerId === id ? false : state.isDrawerOpen,
        }));

        get().addToast({
          type: 'info',
          title: 'Customer Deleted',
          message: `${customer.fullName} was deleted.`,
          undoAction: () => {
            get().undoDelete();
          },
        });
      },

      bulkDeleteCustomers: async (ids) => {
        const deleted = get().customers.filter((c) => ids.includes(c.id));
        await get().simulateLatency();
        set((state) => ({
          customers: state.customers.filter((c) => !ids.includes(c.id)),
          selectedCustomerIds: [],
          lastDeletedCustomers: deleted,
        }));
        get().addToast({
          type: 'info',
          title: `${ids.length} Customers Deleted`,
          message: 'Bulk deletion completed.',
          undoAction: () => {
            get().undoDelete();
          },
        });
      },

      undoDelete: async () => {
        const restored = get().lastDeletedCustomers;
        if (!restored.length) return;
        set((state) => ({
          customers: [...restored, ...state.customers],
          lastDeletedCustomers: [],
        }));
        get().addToast({
          type: 'success',
          title: 'Restored',
          message: `Restored ${restored.length} customer(s).`,
        });
      },

      setCustomerStatus: async (id, status, reason) => {
        await get().simulateLatency();
        set((state) => ({
          customers: state.customers.map((c) => (c.id === id ? { ...c, status } : c)),
          activities: [
            {
              id: 'act-' + Date.now(),
              customerId: id,
              action: `Status set to ${status}`,
              details: reason ? `Reason: ${reason}` : `Status manually updated to ${status}`,
              actor: 'Admin',
              timestamp: 'Just now',
              type: 'status',
            },
            ...state.activities,
          ],
        }));
        get().addToast({
          type: 'success',
          title: 'Status Updated',
          message: `Subscriber marked as ${status}.`,
        });
      },

      bulkSetCustomerStatus: async (ids, status, reason) => {
        await get().simulateLatency();
        set((state) => ({
          customers: state.customers.map((c) => (ids.includes(c.id) ? { ...c, status } : c)),
          selectedCustomerIds: [],
        }));
        get().addToast({
          type: 'success',
          title: 'Bulk Status Updated',
          message: `Updated status to ${status} for ${ids.length} customers.`,
        });
      },

      // Plans
      addPlan: (plan) => {
        const newPlan: Plan = {
          ...plan,
          id: 'plan-' + Date.now(),
          subscribersCount: 0,
        };
        set((state) => ({
          plans: [...state.plans, newPlan],
        }));
        get().addToast({
          type: 'success',
          title: 'Plan Added',
          message: `${newPlan.name} created.`,
        });
      },
      updatePlan: (id, updates) => {
        set((state) => ({
          plans: state.plans.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        }));
        get().addToast({
          type: 'success',
          title: 'Plan Updated',
          message: 'Internet plan updated.',
        });
      },
      deletePlan: (id) => {
        set((state) => ({
          plans: state.plans.filter((p) => p.id !== id),
        }));
        get().addToast({
          type: 'info',
          title: 'Plan Removed',
          message: 'Plan deleted from catalog.',
        });
      },

      // Billing & Invoices
      recordPayment: async (customerId, amount, method, reference) => {
        await get().simulateLatency();
        const customer = get().customers.find((c) => c.id === customerId);
        const newInvoice: Invoice = {
          id: 'inv-' + Date.now(),
          invoiceNumber: `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
          customerId,
          customerName: customer ? customer.fullName : 'Customer',
          customerEmail: customer ? customer.email : '',
          amount,
          date: new Date().toISOString().split('T')[0],
          dueDate: new Date().toISOString().split('T')[0],
          status: 'Paid',
          items: [{ description: 'Payment Received / Credit Balance', amount }],
          paidAt: new Date().toISOString(),
          paymentMethod: `${method}${reference ? ` (${reference})` : ''}`,
        };

        set((state) => ({
          invoices: [newInvoice, ...state.invoices],
          customers: state.customers.map((c) => {
            if (c.id === customerId) {
              const newBal = Math.max(0, Number((c.balanceDue - amount).toFixed(2)));
              return {
                ...c,
                balanceDue: newBal,
                status: c.status === 'Overdue' && newBal === 0 ? 'Active' : c.status,
              };
            }
            return c;
          }),
          activities: [
            {
              id: 'act-' + Date.now(),
              customerId,
              action: 'Payment Recorded',
              details: `Received ${get().currency}${amount.toFixed(2)} via ${method}`,
              actor: 'Billing Cashier',
              timestamp: 'Just now',
              type: 'billing',
            },
            ...state.activities,
          ],
        }));

        get().addToast({
          type: 'success',
          title: 'Payment Recorded',
          message: `Recorded payment of ${get().currency}${amount.toFixed(2)}.`,
        });
      },

      markInvoicePaid: (invoiceId) => {
        set((state) => ({
          invoices: state.invoices.map((inv) =>
            inv.id === invoiceId ? { ...inv, status: 'Paid', paidAt: new Date().toISOString() } : inv
          ),
        }));
        get().addToast({
          type: 'success',
          title: 'Invoice Marked Paid',
          message: 'Invoice status has been updated.',
        });
      },

      // Tickets
      createTicket: (ticket) => {
        const newTicket: SupportTicket = {
          ...ticket,
          id: 'tkt-' + Date.now(),
          ticketNumber: 'TKT-' + Math.floor(4000 + Math.random() * 2000),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((state) => ({
          tickets: [newTicket, ...state.tickets],
          activities: [
            {
              id: 'act-' + Date.now(),
              customerId: ticket.customerId,
              action: `Ticket Opened (#${newTicket.ticketNumber})`,
              details: ticket.title,
              actor: 'Support Agent',
              timestamp: 'Just now',
              type: 'support',
            },
            ...state.activities,
          ],
        }));
        get().addToast({
          type: 'success',
          title: 'Ticket Created',
          message: `Ticket #${newTicket.ticketNumber} opened.`,
        });
      },

      updateTicketStatus: (ticketId, status) => {
        set((state) => ({
          tickets: state.tickets.map((t) =>
            t.id === ticketId ? { ...t, status, updatedAt: new Date().toISOString() } : t
          ),
        }));
        get().addToast({
          type: 'info',
          title: 'Ticket Updated',
          message: `Ticket marked as ${status}.`,
        });
      },

      assignTicketTechnician: (ticketId, techName) => {
        set((state) => ({
          tickets: state.tickets.map((t) =>
            t.id === ticketId
              ? { ...t, assignedTechnician: techName, updatedAt: new Date().toISOString() }
              : t
          ),
        }));
        get().addToast({
          type: 'info',
          title: 'Technician Assigned',
          message: `Assigned to ${techName}.`,
        });
      },

      // Devices
      rebootDevice: async (deviceId) => {
        set((state) => ({
          devices: state.devices.map((d) => (d.id === deviceId ? { ...d, status: 'Warning' } : d)),
        }));
        get().addToast({
          type: 'info',
          title: 'Rebooting Hardware...',
          message: 'Sending reboot command via SSH/SNMP.',
        });
        await new Promise((resolve) => setTimeout(resolve, 2000));
        set((state) => ({
          devices: state.devices.map((d) => (d.id === deviceId ? { ...d, status: 'Online', uptimeDays: 0 } : d)),
        }));
        get().addToast({
          type: 'success',
          title: 'Device Online',
          message: 'Hardware rebooted successfully with all services restored.',
        });
      },

      // Notifications
      markAllNotificationsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        }));
      },
      markNotificationRead: (id) => {
        set((state) => ({
          notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
        }));
      },

      // Reset Demo Data
      resetDemoData: () => {
        set({
          customers: generateSeedCustomers(),
          plans: INITIAL_PLANS,
          invoices: INITIAL_INVOICES,
          tickets: INITIAL_TICKETS,
          devices: INITIAL_DEVICES,
          technicians: INITIAL_TECHNICIANS,
          schedules: INITIAL_SCHEDULES,
          activities: INITIAL_ACTIVITIES,
          notifications: INITIAL_NOTIFICATIONS,
          selectedCustomerIds: [],
          activeCustomerId: null,
          isDrawerOpen: false,
          filters: DEFAULT_FILTERS,
          pagination: { page: 1, pageSize: 10 },
        });
        get().addToast({
          type: 'success',
          title: 'Demo Data Reset',
          message: 'All customer records and operational metrics have been restored to initial state.',
        });
      },
    }),
    {
      name: 'netpulse_isp_store_v1',
      partialize: (state) => ({
        customers: state.customers,
        plans: state.plans,
        invoices: state.invoices,
        tickets: state.tickets,
        devices: state.devices,
        columns: state.columns,
        showStatistics: state.showStatistics,
        darkMode: state.darkMode,
        currency: state.currency,
        viewMode: state.viewMode,
      }),
    }
  )
);
