import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../lib/api';
import { migrateLegacyStorage, STORAGE_PREFIX, STORE_PERSIST_KEY } from '../lib/storageMigration';

migrateLegacyStorage();
import {
  Customer,
  CustomerStatus,
  ConnectionType,
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
  Product,
  ProductLog,
} from '../types';
import {
  INITIAL_PLANS,
  INITIAL_COLUMNS,
  INITIAL_INVOICES,
  INITIAL_TICKETS,
  INITIAL_DEVICES,
  INITIAL_TECHNICIANS,
  INITIAL_SCHEDULES,
  INITIAL_NOTIFICATIONS,
  INITIAL_ACTIVITIES,
  INITIAL_PRODUCTS,
  INITIAL_PRODUCT_LOGS,
} from '../data/mockData';

export function normalizeApiCustomer(raw: any): Customer {
  const statusLower = String(raw.status || 'Active').toLowerCase();
  let status: CustomerStatus = 'Active';
  if (statusLower === 'active') status = 'Active';
  else if (statusLower === 'suspended') status = 'Suspended';
  else if (statusLower === 'pending') status = 'Pending';
  else if (statusLower === 'disconnected') status = 'Disconnected';
  else if (statusLower === 'overdue') status = 'Overdue';

  const typeLower = String(raw.connectionType || 'Fiber').toLowerCase();
  let connectionType: ConnectionType = 'Fiber';
  if (typeLower === 'wireless') connectionType = 'Wireless';
  else if (typeLower === 'dsl') connectionType = 'DSL';

  const fullName = raw.fullName || 'Unknown Customer';
  const nameParts = fullName.trim().split(/\s+/);
  const initials =
    raw.initials ||
    (nameParts.length === 1
      ? nameParts[0].slice(0, 2).toUpperCase()
      : (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase());

  return {
    id: String(raw.id),
    code: raw.code || `CUST-${raw.id}`,
    avatarUrl: raw.avatarUrl,
    initials,
    fullName,
    email: raw.email || '',
    phone: raw.phone || '',
    address: raw.address || '',
    city: raw.city || 'Phnom Penh',
    planId: raw.planId || 'pkg-2',
    planName: raw.planName || 'Fiber Ultra 300M',
    monthlyPrice: Number(raw.monthlyPrice) || 55,
    connectionType,
    ipAddress: raw.ipAddress || '10.20.1.42',
    macAddress: raw.macAddress || '48:8F:5A:12:44:01',
    installationDate: raw.installationDate || (raw.registrationDate ? String(raw.registrationDate).slice(0, 10) : '2026-01-15'),
    dueDate: raw.dueDate || '15th of month',
    dataUsageGB: typeof raw.dataUsageGB === 'number' ? raw.dataUsageGB : 120,
    dataCapGB: raw.dataCapGB ?? null,
    balanceDue: Number(raw.balanceDue) || 0,
    status,
    rating: Number(raw.rating) || 5.0,
    notes: raw.notes,
    onlineStatus: raw.onlineStatus || (status === 'Active' ? 'online' : 'offline'),
    lastPingMs: typeof raw.lastPingMs === 'number' ? raw.lastPingMs : 14,
    assignedTechnician: raw.assignedTechnician || 'Sok Chea',
    tags: Array.isArray(raw.tags) ? raw.tags : ['Fiber', 'Residential'],
    pppoeUsername: raw.pppoeUsername || '',
    routerModel: raw.routerModel || 'Huawei HG8245H5 ONT',
    coordinates: raw.coordinates || '11.5564° N, 104.9282° E',
  };
}

interface AppStore {
  // Data
  customers: Customer[];
  isCustomersLoading: boolean;
  plans: Plan[];
  invoices: Invoice[];
  tickets: SupportTicket[];
  devices: NetworkDevice[];
  technicians: Technician[];
  schedules: InstallationSchedule[];
  activities: ActivityLog[];
  notifications: NotificationItem[];
  products: Product[];
  productLogs: ProductLog[];
  showProductStats: boolean;

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
  themeMode: 'light' | 'dark' | 'system';
  comfort: 'soft' | 'standard' | 'high-contrast';
  density: 'compact' | 'comfortable';
  animations: 'system' | 'on' | 'reduced';
  sidebarCollapsed: boolean;
  sidebarUpgradeDismissed: boolean;
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
    addEditProduct: { isOpen: boolean; productId?: string };
    deleteProduct: { isOpen: boolean; productId?: string };
    productLog: { isOpen: boolean; productId?: string };
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
  toggleProductStats: () => void;
  toggleDarkMode: () => void;
  setDarkMode: (enabled: boolean) => void;
  setThemeMode: (mode: 'light' | 'dark' | 'system') => void;
  setComfort: (comfort: 'soft' | 'standard' | 'high-contrast') => void;
  setDensity: (density: 'compact' | 'comfortable') => void;
  setAnimations: (mode: 'system' | 'on' | 'reduced') => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebarCollapsed: () => void;
  setSidebarUpgradeDismissed: (dismissed: boolean) => void;
  setCurrency: (currency: string) => void;

  // Selection actions
  toggleSelectCustomer: (id: string) => void;
  selectAllCustomers: (ids: string[]) => void;
  setSelectedCustomerIds: (ids: string[]) => void;
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
  fetchCustomers: () => Promise<void>;
  setCustomers: (customers: Customer[]) => void;
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

  // Products & Inventory CRUD
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  bulkDeleteProducts: (ids: string[]) => void;
  addProductLog: (log: Omit<ProductLog, 'id' | 'timestamp'>) => void;

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
  toggleNotificationRead: (id: string) => void;
  deleteNotification: (id: string) => void;
  addNotification: (item: Omit<NotificationItem, 'id'>) => void;

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
      // Database-backed domains initialize empty until fetched from PostgreSQL API
      customers: [],
      isCustomersLoading: false,
      plans: INITIAL_PLANS,
      invoices: INITIAL_INVOICES,
      tickets: INITIAL_TICKETS,
      devices: INITIAL_DEVICES,
      technicians: INITIAL_TECHNICIANS,
      schedules: INITIAL_SCHEDULES,
      activities: INITIAL_ACTIVITIES,
      notifications: INITIAL_NOTIFICATIONS,
      products: INITIAL_PRODUCTS,
      productLogs: INITIAL_PRODUCT_LOGS,
      showProductStats: true,

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
      themeMode: 'light',
      comfort: (typeof window !== 'undefined' && (localStorage.getItem(`${STORAGE_PREFIX}_comfort`) as any)) || 'soft',
      density:
        (typeof window !== 'undefined' &&
          (localStorage.getItem(`${STORAGE_PREFIX}_density`) as any)) ||
        'compact',
      animations: 'system',
      sidebarCollapsed:
        (typeof window !== 'undefined' &&
          localStorage.getItem(`${STORAGE_PREFIX}_sidebar_collapsed`) === 'true') ||
        false,
      sidebarUpgradeDismissed:
        (typeof window !== 'undefined' &&
          localStorage.getItem(`${STORAGE_PREFIX}_upgrade_dismissed`) === 'true') ||
        false,
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
        addEditProduct: { isOpen: false },
        deleteProduct: { isOpen: false },
        productLog: { isOpen: false },
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
      toggleProductStats: () => set((state) => ({ showProductStats: !state.showProductStats })),

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
        set({ darkMode: enabled, themeMode: enabled ? 'dark' : 'light' });
        if (enabled) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      },
      setThemeMode: (themeMode) => {
        const isDark =
          themeMode === 'dark' ||
          (themeMode === 'system' &&
            typeof window !== 'undefined' &&
            window.matchMedia('(prefers-color-scheme: dark)').matches);
        set({ themeMode, darkMode: isDark });
        if (typeof document !== 'undefined') {
          if (isDark) {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        }
      },
      setComfort: (comfort) => {
        set({ comfort });
        if (typeof window !== 'undefined') {
          localStorage.setItem(`${STORAGE_PREFIX}_comfort`, comfort);
          document.documentElement.setAttribute('data-comfort', comfort);
        }
      },
      setDensity: (density) => {
        set({ density });
        if (typeof window !== 'undefined') {
          localStorage.setItem(`${STORAGE_PREFIX}_density`, density);
          document.documentElement.setAttribute('data-density', density);
        }
      },
      setAnimations: (animations) => {
        set({ animations });
        if (typeof document !== 'undefined') {
          document.documentElement.setAttribute('data-motion', animations);
        }
      },
      setSidebarCollapsed: (sidebarCollapsed) => {
        set({ sidebarCollapsed });
        if (typeof window !== 'undefined') {
          localStorage.setItem(`${STORAGE_PREFIX}_sidebar_collapsed`, String(sidebarCollapsed));
        }
      },
      toggleSidebarCollapsed: () => {
        const next = !get().sidebarCollapsed;
        set({ sidebarCollapsed: next });
        if (typeof window !== 'undefined') {
          localStorage.setItem(`${STORAGE_PREFIX}_sidebar_collapsed`, String(next));
        }
      },
      setSidebarUpgradeDismissed: (sidebarUpgradeDismissed) => {
        set({ sidebarUpgradeDismissed });
        if (typeof window !== 'undefined') {
          localStorage.setItem(`${STORAGE_PREFIX}_upgrade_dismissed`, String(sidebarUpgradeDismissed));
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
      setSelectedCustomerIds: (ids) => set({ selectedCustomerIds: ids }),
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
        const duration = toast.duration ?? (toast.type === 'error' ? 4000 : 3000);
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
      fetchCustomers: async () => {
        set({ isCustomersLoading: true });
        try {
          const res = await api.customers.list();
          if (Array.isArray(res)) {
            const normalized = res.map(normalizeApiCustomer);
            set({ customers: normalized });
          }
        } catch (err: any) {
          console.error('Failed to fetch customers from API:', err);
        } finally {
          set({ isCustomersLoading: false });
        }
      },

      setCustomers: (customers) => set({ customers }),

      addCustomer: async (customerData) => {
        await get().simulateLatency();
        try {
          const res = await api.customers.create({
            fullName: customerData.fullName,
            email: customerData.email,
            phone: customerData.phone,
            address: customerData.address,
            city: customerData.city,
            planId: customerData.planId,
            planName: customerData.planName,
            monthlyPrice: customerData.monthlyPrice,
            connectionType: (customerData.connectionType || 'Fiber').toUpperCase(),
            status: (customerData.status || 'Pending').toUpperCase(),
            ipAddress: customerData.ipAddress,
            macAddress: customerData.macAddress,
            routerModel: customerData.routerModel,
          });
          if (res) {
            const normalized = normalizeApiCustomer(res);
            set((state) => ({
              customers: [normalized, ...state.customers.filter((c) => c.id !== normalized.id)],
              activities: [
                {
                  id: 'act-' + Date.now(),
                  customerId: normalized.id,
                  action: 'Customer Onboarded',
                  details: `Added new subscriber ${normalized.fullName} with ${normalized.planName}`,
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
              message: `${normalized.fullName} (${normalized.code}) added successfully.`,
            });
            return;
          }
        } catch (err) {
          console.warn('API createCustomer failed, persisting locally:', err);
        }

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
        try {
          await api.customers.update(id, {
            ...updates,
            status: updates.status ? updates.status.toUpperCase() : undefined,
            connectionType: updates.connectionType ? updates.connectionType.toUpperCase() : undefined,
          });
        } catch (err) {
          console.warn('API updateCustomer failed, applying locally:', err);
        }

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
        try {
          await api.customers.delete(id);
        } catch (err) {
          console.warn('API deleteCustomer failed, applying locally:', err);
        }

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
        try {
          await Promise.all(ids.map((id) => api.customers.delete(id).catch(() => null)));
        } catch (err) {
          console.warn('API bulk delete failed:', err);
        }

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
        try {
          await api.customers.setStatus(id, status.toUpperCase(), reason);
        } catch (err) {
          console.warn('API setCustomerStatus failed, applying locally:', err);
        }

        set((state) => ({
          customers: state.customers.map((c) =>
            c.id === id
              ? {
                  ...c,
                  status,
                  onlineStatus: status === 'Active' ? 'online' : 'offline',
                }
              : c
          ),
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
        try {
          await Promise.all(
            ids.map((id) => api.customers.setStatus(id, status.toUpperCase(), reason).catch(() => null))
          );
        } catch (err) {
          console.warn('API bulk set status failed:', err);
        }

        set((state) => ({
          customers: state.customers.map((c) =>
            ids.includes(c.id)
              ? {
                  ...c,
                  status,
                  onlineStatus: status === 'Active' ? 'online' : 'offline',
                }
              : c
          ),
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

      // Products & Inventory
      addProduct: (productData) => {
        const id = 'prod-' + Date.now();
        const now = new Date().toISOString().split('T')[0];
        const newProduct: Product = {
          ...productData,
          id,
          createdAt: now,
          updatedAt: now,
        };
        const logItem: ProductLog = {
          id: 'plog-' + Date.now(),
          productId: id,
          productName: newProduct.name,
          sku: newProduct.sku,
          action: 'Created',
          change: `Initial stock: ${newProduct.quantity} units`,
          previousQuantity: 0,
          newQuantity: newProduct.quantity,
          actor: 'Admin (Hariharan B)',
          reason: 'Product created via Inventory Manager',
          timestamp: 'Just now',
        };
        set((state) => ({
          products: [newProduct, ...state.products],
          productLogs: [logItem, ...state.productLogs],
        }));
        get().addToast({
          type: 'success',
          title: 'Product Created',
          message: `${newProduct.name} (${newProduct.sku}) added to inventory.`,
        });
      },

      updateProduct: (id, updates) => {
        const now = new Date().toISOString().split('T')[0];
        const existing = get().products.find((p) => p.id === id);
        if (!existing) return;

        let changeNote = 'Product details updated';
        let action: ProductLog['action'] = 'Updated';

        if (updates.quantity !== undefined && updates.quantity !== existing.quantity) {
          const diff = updates.quantity - existing.quantity;
          action = diff > 0 ? 'Stock In' : 'Stock Out';
          changeNote = `${diff > 0 ? '+' : ''}${diff} units (${existing.quantity} -> ${updates.quantity})`;
        } else if (updates.unitPrice !== undefined && updates.unitPrice !== existing.unitPrice) {
          action = 'Price Changed';
          changeNote = `$${existing.unitPrice.toFixed(2)} -> $${updates.unitPrice.toFixed(2)}`;
        } else if (updates.status !== undefined && updates.status !== existing.status) {
          action = 'Status Changed';
          changeNote = `${existing.status} -> ${updates.status}`;
        }

        const logItem: ProductLog = {
          id: 'plog-' + Date.now(),
          productId: id,
          productName: updates.name || existing.name,
          sku: updates.sku || existing.sku,
          action,
          change: changeNote,
          previousQuantity: existing.quantity,
          newQuantity: updates.quantity !== undefined ? updates.quantity : existing.quantity,
          actor: 'Admin (Hariharan B)',
          reason: 'Inventory record modified',
          timestamp: 'Just now',
        };

        set((state) => ({
          products: state.products.map((p) => (p.id === id ? { ...p, ...updates, updatedAt: now } : p)),
          productLogs: [logItem, ...state.productLogs],
        }));

        get().addToast({
          type: 'success',
          title: 'Product Updated',
          message: `${existing.name} has been updated.`,
        });
      },

      deleteProduct: (id) => {
        const existing = get().products.find((p) => p.id === id);
        if (!existing) return;

        const logItem: ProductLog = {
          id: 'plog-' + Date.now(),
          productId: id,
          productName: existing.name,
          sku: existing.sku,
          action: 'Deleted',
          change: `Removed ${existing.quantity} units from catalog`,
          previousQuantity: existing.quantity,
          newQuantity: 0,
          actor: 'Admin (Hariharan B)',
          reason: 'Product deleted from inventory',
          timestamp: 'Just now',
        };

        set((state) => ({
          products: state.products.filter((p) => p.id !== id),
          productLogs: [logItem, ...state.productLogs],
        }));

        get().addToast({
          type: 'info',
          title: 'Product Deleted',
          message: `${existing.name} removed from inventory.`,
        });
      },

      bulkDeleteProducts: (ids) => {
        set((state) => ({
          products: state.products.filter((p) => !ids.includes(p.id)),
        }));
        get().addToast({
          type: 'info',
          title: 'Products Deleted',
          message: `${ids.length} products removed from inventory.`,
        });
      },

      addProductLog: (log) => {
        const newLog: ProductLog = {
          ...log,
          id: 'plog-' + Date.now(),
          timestamp: 'Just now',
        };
        set((state) => ({
          productLogs: [newLog, ...state.productLogs],
        }));
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
      toggleNotificationRead: (id) => {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: !n.read } : n
          ),
        }));
      },
      deleteNotification: (id) => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }));
      },
      addNotification: (item) => {
        const newItem: NotificationItem = {
          ...item,
          id: 'notif-' + Date.now(),
        };
        set((state) => ({
          notifications: [newItem, ...state.notifications],
        }));
      },

      // Reset Demo Data
      resetDemoData: () => {
        set({
          customers: [],
          plans: INITIAL_PLANS,
          invoices: INITIAL_INVOICES,
          tickets: INITIAL_TICKETS,
          devices: INITIAL_DEVICES,
          technicians: INITIAL_TECHNICIANS,
          schedules: INITIAL_SCHEDULES,
          activities: INITIAL_ACTIVITIES,
          notifications: INITIAL_NOTIFICATIONS,
          products: INITIAL_PRODUCTS,
          productLogs: INITIAL_PRODUCT_LOGS,
          showProductStats: true,
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
      name: STORE_PERSIST_KEY,
      partialize: (state) => ({
        plans: state.plans,
        invoices: state.invoices,
        tickets: state.tickets,
        devices: state.devices,
        products: state.products,
        productLogs: state.productLogs,
        showProductStats: state.showProductStats,
        columns: state.columns,
        showStatistics: state.showStatistics,
        darkMode: state.darkMode,
        themeMode: state.themeMode,
        comfort: state.comfort,
        density: state.density,
        animations: state.animations,
        sidebarCollapsed: state.sidebarCollapsed,
        sidebarUpgradeDismissed: state.sidebarUpgradeDismissed,
        currency: state.currency,
        viewMode: state.viewMode,
      }),
    }
  )
);
