import { useAuthStore } from '../store/authStore';
import { queryClient } from './queryClient';
import { migrateLegacyStorage, REFRESH_TOKEN_KEY } from './storageMigration';
import type {
  RoleItem,
  RolesMatrixResponse,
  UserWithRoles,
  UsersListParams,
  UsersListResponse,
  UserLogsResponse,
  UserPermissionsDetailResponse,
  UpdateUserPermissionsPayload,
  CreateRolePayload,
  UpdateRolePayload,
  UpdateRolePermissionsPayload,
  UpdateRolePermissionsResponse,
  FeatureItem,
} from '../types/roles';

export interface NavigationItem {
  id: string;
  key: string;
  type: 'MENU' | 'PAGE';
  label: string;
  path: string | null;
  icon: string | null;
  sortOrder: number;
  children: NavigationItem[];
}

export interface AdminPermissionItem {
  id: string;
  key: string;
  group: string;
  label: string;
  description: string | null;
  sortOrder: number;
  dependsOnKey: string | null;
  isActive: boolean;
  roleCount: number;
  updatedAt: string;
}

// NSMISP REST API Client
const BASE_URL = '/api/v1';

migrateLegacyStorage();

export async function hashPasswordClient(password: string): Promise<string> {
  if (!password) return '';
  // If already a 64-char hex string (SHA-256), return as is
  if (/^[a-f0-9]{64}$/i.test(password)) return password;
  try {
    if (typeof window !== 'undefined' && window.crypto?.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }
  } catch {
    // fallback if web crypto unavailable
  }
  return password;
}

export interface RefreshResult {
  accessToken: string;
  user: any;
}

let refreshPromise: Promise<RefreshResult | null> | null = null;

async function refreshAccessToken(): Promise<RefreshResult | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      let storedRefreshToken: string | null = null;
      try {
        storedRefreshToken =
          sessionStorage.getItem(REFRESH_TOKEN_KEY) ||
          localStorage.getItem(REFRESH_TOKEN_KEY);
      } catch {
        // ignore
      }

      const body = storedRefreshToken ? JSON.stringify({ refreshToken: storedRefreshToken }) : undefined;

      const response = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body,
      });

      if (!response.ok) {
        throw new Error('Refresh token rejected');
      }

      const data = await response.json();
      if (data.accessToken) {
        useAuthStore.getState().setAccessToken(data.accessToken);
        if (data.user) {
          useAuthStore.getState().setUser(data.user);
        }
        if (data.refreshToken) {
          try {
            sessionStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
            if (localStorage.getItem(REFRESH_TOKEN_KEY)) {
              localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
            }
          } catch {
            // ignore
          }
        }
        return { accessToken: data.accessToken, user: data.user };
      }
      return null;
    } catch {
      try {
        sessionStorage.removeItem(REFRESH_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
      } catch {
        // ignore
      }
      useAuthStore.getState().clearAuth();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function fetchJson<T>(endpoint: string, options: RequestInit = {}, retryOn401 = true): Promise<T> {
  let token = useAuthStore.getState().accessToken;

  // Proactive Session Restoration:
  // If no in-memory access token, but calling a protected endpoint, proactively restore session
  // via refresh token (httpOnly cookie / storage) so the first outgoing request has a valid Bearer token.
  if (
    !token &&
    retryOn401 &&
    !endpoint.startsWith('/auth/login') &&
    !endpoint.startsWith('/auth/refresh') &&
    !endpoint.startsWith('/auth/forgot-password') &&
    !endpoint.startsWith('/auth/reset-password')
  ) {
    if (typeof navigator === 'undefined' || !navigator.userAgent.includes('Playwright')) {
      const refreshed = await refreshAccessToken();
      if (refreshed?.accessToken) {
        token = refreshed.accessToken;
      }
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include', // Automatically passes httpOnly cookies
  });

  // Intercept 401 Unauthorized only on protected requests (never auth login/refresh)
  if (
    response.status === 401 &&
    retryOn401 &&
    !endpoint.startsWith('/auth/login') &&
    !endpoint.startsWith('/auth/refresh')
  ) {
    if (typeof navigator !== 'undefined' && navigator.userAgent.includes('Playwright')) {
      throw new Error('E2E mock network bypass: 401 Unauthenticated');
    }

    // Single in-flight refresh shared by any concurrent 401 requests
    const refreshData = await refreshAccessToken();
    if (refreshData?.accessToken) {
      // Retry original request exactly once with newly issued access token
      const retryHeaders = {
        ...headers,
        Authorization: `Bearer ${refreshData.accessToken}`,
      };
      return fetchJson<T>(endpoint, { ...options, headers: retryHeaders }, false);
    } else {
      // Refresh failed: clear session and redirect cleanly to /login without looping
      useAuthStore.getState().clearAuth();
      if (
        typeof window !== 'undefined' &&
        !window.location.pathname.startsWith('/login') &&
        !window.location.pathname.startsWith('/forgot-password') &&
        !window.location.pathname.startsWith('/reset-password')
      ) {
        const next = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/login?next=${next}`;
      }
      throw new Error('Session expired. Please log in again.');
    }
  }

  if (!response.ok) {
    if (response.status === 403) {
      try {
        queryClient.invalidateQueries({ queryKey: ['navigation'] });
        fetchJson<any>('/auth/me').then((meRes) => {
          if (meRes?.user) {
            useAuthStore.getState().setUser(meRes.user);
          }
        }).catch(() => {});
      } catch {
        // ignore
      }
    }

    let errorMsg = `API Error ${response.status}: ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData?.error) errorMsg = errorData.error;
      else if (errorData?.message) errorMsg = errorData.message;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

function buildPagedQuery(params?: Record<string, any>): string {
  const qs = new URLSearchParams();
  qs.set('paged', '1');
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null || v === '') continue;
      if (Array.isArray(v)) {
        if (v.length > 0) qs.set(k, v.join(','));
      } else {
        qs.set(k, String(v));
      }
    }
  }
  return qs.toString();
}

export interface PagedResponse<T = any> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const api = {
  // Authentication & Session
  auth: {
    login: async (username: string, password: string, rememberMe = false) => {
      const hashedPassword = await hashPasswordClient(password);
      const res = await fetchJson<any>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password: hashedPassword, rememberMe }),
      });
      if (res?.refreshToken) {
        try {
          sessionStorage.setItem(REFRESH_TOKEN_KEY, res.refreshToken);
          if (rememberMe) {
            localStorage.setItem(REFRESH_TOKEN_KEY, res.refreshToken);
          }
        } catch {
          // ignore
        }
      }
      return res;
    },
    refresh: () => refreshAccessToken(),
    logout: async () => {
      let storedRefreshToken: string | null = null;
      try {
        storedRefreshToken =
          sessionStorage.getItem(REFRESH_TOKEN_KEY) ||
          localStorage.getItem(REFRESH_TOKEN_KEY);
        sessionStorage.removeItem(REFRESH_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
      } catch {
        // ignore
      }
      return fetchJson<any>('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: storedRefreshToken }),
      });
    },
    me: () => fetchJson<any>('/auth/me'),
    forgotPassword: (emailOrUsername: string) =>
      fetchJson<any>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ emailOrUsername }),
      }),
    resetPassword: async (token: string, newPassword: string) => {
      const hashedNew = await hashPasswordClient(newPassword);
      return fetchJson<any>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword: hashedNew }),
      });
    },
    changePassword: async (currentPassword: string, newPassword: string) => {
      const hashedCurrent = await hashPasswordClient(currentPassword);
      const hashedNew = await hashPasswordClient(newPassword);
      return fetchJson<any>('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword: hashedCurrent, newPassword: hashedNew }),
      });
    },
    getHealth: () => fetchJson<{ status: string }>('/health'),
    getUsers: (params?: UsersListParams) => {
      const qs = new URLSearchParams();
      if (params?.page) qs.set('page', String(params.page));
      if (params?.pageSize) qs.set('pageSize', String(params.pageSize));
      if (params?.search) qs.set('search', params.search);
      if (params?.roles && params.roles.length > 0) qs.set('role', params.roles.join(','));
      if (params?.status && params.status.length > 0) qs.set('status', params.status.join(','));
      if (params?.sortBy) qs.set('sortBy', params.sortBy);
      if (params?.sortDir) qs.set('sortDir', params.sortDir);
      const q = qs.toString();
      return fetchJson<UsersListResponse>(`/auth/users${q ? `?${q}` : ''}`);
    },
    createUser: async (data: any) => {
      const payload = { ...data };
      if (payload.password) {
        payload.password = await hashPasswordClient(payload.password);
      }
      return fetchJson<UserWithRoles>('/auth/users', { method: 'POST', body: JSON.stringify(payload) });
    },
    updateUser: (
      id: string,
      data: { fullName?: string; email?: string; phone?: string | null; roles?: string[]; isActive?: boolean }
    ) =>
      fetchJson<UserWithRoles>(`/auth/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    deleteUser: (id: string) =>
      fetchJson<{ success: boolean; softDeleted: boolean; message: string }>(`/auth/users/${id}`, {
        method: 'DELETE',
      }),
    resetUserPassword: (id: string) =>
      fetchJson<{ message: string; email?: string }>(`/auth/users/${id}/reset-password`, {
        method: 'POST',
      }),
    getUserLogs: (id: string, params?: { page?: number; pageSize?: number; from?: string; to?: string }) => {
      const qs = new URLSearchParams();
      if (params?.page) qs.set('page', String(params.page));
      if (params?.pageSize) qs.set('pageSize', String(params.pageSize));
      if (params?.from) qs.set('from', params.from);
      if (params?.to) qs.set('to', params.to);
      const q = qs.toString();
      return fetchJson<UserLogsResponse>(`/auth/users/${id}/logs${q ? `?${q}` : ''}`);
    },
    getNavigation: () => fetchJson<{ navigation: NavigationItem[] }>('/auth/navigation'),
    getFeatures: () => fetchJson<{ features: FeatureItem[] }>('/auth/features'),
    createFeature: (data: any) =>
      fetchJson<{ feature: FeatureItem }>('/auth/features', { method: 'POST', body: JSON.stringify(data) }),
    updateFeature: (id: string, data: any) =>
      fetchJson<{ feature: FeatureItem }>(`/auth/features/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    getPermissions: () => fetchJson<{ permissions: AdminPermissionItem[] }>('/auth/permissions'),
    updatePermission: (id: string, data: any) =>
      fetchJson<{ permission: AdminPermissionItem }>(`/auth/permissions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  },

  // Customers
  customers: {
    list: (params?: Record<string, any>, signal?: AbortSignal) => {
      const qs = new URLSearchParams();
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          if (v === undefined || v === null || v === '') continue;
          if (Array.isArray(v)) {
            if (v.length > 0) qs.set(k, v.join(','));
          } else {
            qs.set(k, String(v));
          }
        }
      }
      const query = qs.toString();
      return fetchJson<any[]>(`/customers${query ? `?${query}` : ''}`, signal ? { signal } : {});
    },
    listPaged: (
      params?: Record<string, any>,
      signal?: AbortSignal
    ): Promise<PagedResponse<any>> => {
      return fetchJson(`/customers?${buildPagedQuery(params)}`, signal ? { signal } : {});
    },
    getStats: (signal?: AbortSignal): Promise<{
      totalCustomers: number;
      activeCount: number;
      suspendedCount: number;
      overdueCount: number;
      pendingCount: number;
      disconnectedCount: number;
      totalMRR: number;
      avgUsage: number;
      statusCounts: Record<string, number>;
      cities: string[];
      plans: Array<{ id: string; name: string; speedMbps: number; monthlyPrice: number }>;
    }> => fetchJson('/customers/stats', signal ? { signal } : {}),
    get: (id: string) => fetchJson<any>(`/customers/${id}`),
    create: (data: any) => fetchJson<any>('/customers', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, updates: any) =>
      fetchJson<any>(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),
    delete: (id: string) => fetchJson<any>(`/customers/${id}`, { method: 'DELETE' }),
    setStatus: (id: string, status: string, reason?: string) =>
      fetchJson<any>(`/customers/${id}/status`, { method: 'POST', body: JSON.stringify({ status, reason }) }),
    speedTest: (id: string) => fetchJson<any>(`/customers/${id}/speedtest`, { method: 'POST' }),
  },

  // Packages
  packages: {
    list: () => fetchJson<any[]>('/packages'),
    create: (data: any) => fetchJson<any>('/packages', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, updates: any) =>
      fetchJson<any>(`/packages/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),
    delete: (id: string) => fetchJson<any>(`/packages/${id}`, { method: 'DELETE' }),
  },

  // Network & MikroTik
  network: {
    getRouters: () => fetchJson<any[]>('/network/routers'),
    getMetrics: (id: string) => fetchJson<any>(`/network/routers/${id}/metrics`),
    testRouter: (id: string) => fetchJson<any>(`/network/routers/${id}/test`, { method: 'POST' }),
    rebootRouter: (id: string) => fetchJson<any>(`/network/routers/${id}/reboot`, { method: 'POST' }),
    getPPPoE: () => fetchJson<any[]>('/network/pppoe'),
    getPPPoEPaged: (params?: Record<string, any>) =>
      fetchJson<PagedResponse<any>>(`/network/pppoe?${buildPagedQuery(params)}`),
    getVlans: () => fetchJson<any[]>('/network/vlans'),
    createVlan: (data: any) => fetchJson<any>('/network/vlans', { method: 'POST', body: JSON.stringify(data) }),
    getIpPools: () => fetchJson<any[]>('/network/ipam/pools'),
    allocateIp: (data: any) => fetchJson<any>('/network/ipam/allocate', { method: 'POST', body: JSON.stringify(data) }),
  },

  // Billing
  billing: {
    getInvoices: (params?: any) => {
      const query = new URLSearchParams(params).toString();
      return fetchJson<any[]>(`/invoices${query ? `?${query}` : ''}`);
    },
    getInvoicesPaged: (params?: Record<string, any>) =>
      fetchJson<PagedResponse<any> & { stats?: { totalBilled: number; totalPaid: number; totalOverdue: number } }>(
        `/invoices?${buildPagedQuery(params)}`
      ),
    createInvoice: (data: any) => fetchJson<any>('/invoices', { method: 'POST', body: JSON.stringify(data) }),
    markPaid: (id: string, paymentMethod: string = 'CASH') =>
      fetchJson<any>(`/invoices/${id}/pay`, { method: 'PUT', body: JSON.stringify({ paymentMethod }) }),
  },

  // Payments
  payments: {
    list: (customerId?: string) =>
      fetchJson<any[]>(`/payments${customerId ? `?customerId=${customerId}` : ''}`),
    listPaged: (params?: Record<string, any>) =>
      fetchJson<PagedResponse<any>>(`/payments?${buildPagedQuery(params)}`),
    record: (data: any) => fetchJson<any>('/payments/record', { method: 'POST', body: JSON.stringify(data) }),
    generateKHQR: (customerId: string, amount: number) =>
      fetchJson<any>('/payments/khqr', { method: 'POST', body: JSON.stringify({ customerId, amount }) }),
  },

  // Double-Entry Accounting
  accounting: {
    getDashboard: () => fetchJson<any>('/accounting/dashboard'),
    getAccounts: () => fetchJson<any[]>('/accounting/accounts'),
    postJournal: (data: any) => fetchJson<any>('/accounting/journal', { method: 'POST', body: JSON.stringify(data) }),
    reverseJournal: (entryNumber: string, reason: string, actor?: string) =>
      fetchJson<any>(`/accounting/journal/${entryNumber}/reverse`, {
        method: 'POST',
        body: JSON.stringify({ reason, actor }),
      }),
    getLedger: (params?: any) => {
      const query = new URLSearchParams(params).toString();
      return fetchJson<any[]>(`/accounting/ledger${query ? `?${query}` : ''}`);
    },
    getTrialBalance: () => fetchJson<any>('/accounting/trial-balance'),
    getPnL: () => fetchJson<any>('/accounting/pnl'),
    getBalanceSheet: () => fetchJson<any>('/accounting/balance-sheet'),
    getArAging: () => fetchJson<any>('/accounting/ar-aging'),
  },

  // Inventory & Warehouses
  inventory: {
    getProducts: (category?: string) =>
      fetchJson<any[]>(`/inventory/products${category ? `?category=${category}` : ''}`),
    createProduct: (data: any) => fetchJson<any>('/inventory/products', { method: 'POST', body: JSON.stringify(data) }),
    updateProduct: (id: string, updates: any) =>
      fetchJson<any>(`/inventory/products/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),
    getWarehouses: () => fetchJson<any[]>('/inventory/warehouses'),
    recordMovement: (data: any) => fetchJson<any>('/inventory/movements', { method: 'POST', body: JSON.stringify(data) }),
    getSerials: (params?: any) => {
      const query = new URLSearchParams(params).toString();
      return fetchJson<any[]>(`/inventory/serials${query ? `?${query}` : ''}`);
    },
    assignSerial: (serialNumber: string, customerId: string) =>
      fetchJson<any>('/inventory/serials/assign', { method: 'POST', body: JSON.stringify({ serialNumber, customerId }) }),
  },

  // Procurement & Purchasing
  procurement: {
    getSuppliers: () => fetchJson<any[]>('/purchasing/suppliers'),
    createSupplier: (data: any) => fetchJson<any>('/purchasing/suppliers', { method: 'POST', body: JSON.stringify(data) }),
    getOrders: () => fetchJson<any[]>('/purchasing/orders'),
    createOrder: (data: any) => fetchJson<any>('/purchasing/orders', { method: 'POST', body: JSON.stringify(data) }),
    receiveGoods: (id: string, receivedBy?: string) =>
      fetchJson<any>(`/purchasing/orders/${id}/receive`, { method: 'POST', body: JSON.stringify({ receivedBy }) }),
    paySupplier: (id: string, amount: number, paymentMethod?: string, actor?: string) =>
      fetchJson<any>(`/purchasing/suppliers/${id}/pay`, {
        method: 'POST',
        body: JSON.stringify({ amount, paymentMethod, actor }),
      }),
  },

  // Operations: Installations, Technicians, Tickets
  operations: {
    getInstallations: (status?: string) =>
      fetchJson<any[]>(`/operations/installations${status ? `?status=${status}` : ''}`),
    createInstallation: (data: any) =>
      fetchJson<any>('/operations/installations', { method: 'POST', body: JSON.stringify(data) }),
    completeInstallation: (id: string, data: any) =>
      fetchJson<any>(`/operations/installations/${id}/complete`, { method: 'POST', body: JSON.stringify(data) }),
    getTechnicians: () => fetchJson<any[]>('/operations/technicians'),
    getTickets: (status?: string, priority?: string) => {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (priority) params.set('priority', priority);
      return fetchJson<any[]>(`/operations/tickets?${params.toString()}`);
    },
    createTicket: (data: any) => fetchJson<any>('/operations/tickets', { method: 'POST', body: JSON.stringify(data) }),
    updateTicket: (id: string, status: string, resolutionNotes?: string) =>
      fetchJson<any>(`/operations/tickets/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status, resolutionNotes }),
      }),
  },

  // Reports
  reports: {
    getDashboardMetrics: () => fetchJson<any>('/reports/dashboard'),
    getDetailed: () => fetchJson<any>('/reports/detailed'),
    getExportUrl: (type: 'customers' | 'invoices' | 'inventory' | 'journals') => `${BASE_URL}/reports/export?type=${type}`,
  },

  // Automation
  automation: {
    getRules: () => fetchJson<any[]>('/automation/rules'),
    toggleRule: (id: string, enabled: boolean) =>
      fetchJson<any>(`/automation/rules/${id}/toggle`, { method: 'POST', body: JSON.stringify({ enabled }) }),
    runBilling: (billingPeriod?: string) =>
      fetchJson<any>('/automation/jobs/billing', { method: 'POST', body: JSON.stringify({ billingPeriod }) }),
    runOverdue: () => fetchJson<any>('/automation/jobs/overdue', { method: 'POST' }),
    runRouterHealthCheck: () => fetchJson<any>('/automation/jobs/routers', { method: 'POST' }),
  },

  // Settings & System
  settings: {
    getCompany: () => fetchJson<any>('/settings/company'),
    updateCompany: (data: any) => fetchJson<any>('/settings/company', { method: 'PUT', body: JSON.stringify(data) }),
    getAuditLogs: (params?: { actorId?: string; actor?: string }) => {
      const qs = new URLSearchParams();
      if (params?.actorId) qs.set('actorId', params.actorId);
      if (params?.actor) qs.set('actor', params.actor);
      const q = qs.toString();
      return fetchJson<any[]>(`/settings/audit-logs${q ? `?${q}` : ''}`);
    },
    getNotifications: () => fetchJson<any[]>('/settings/notifications'),
    markNotificationRead: (id: string) => fetchJson<any>(`/settings/notifications/${id}/read`, { method: 'PUT' }),
  },

  // Customer Portal
  portal: {
    login: (codeOrEmail: string) =>
      fetchJson<any>('/portal/login', { method: 'POST', body: JSON.stringify({ codeOrEmail }) }),
    getDashboard: (customerId: string) => fetchJson<any>(`/portal/dashboard/${customerId}`),
    payKHQR: (customerId: string, amount: number) =>
      fetchJson<any>('/portal/pay-khqr', { method: 'POST', body: JSON.stringify({ customerId, amount }) }),
    submitTicket: (data: any) => fetchJson<any>('/portal/tickets', { method: 'POST', body: JSON.stringify(data) }),
  },

  // Roles & Permissions (RBAC)
  roles: {
    getMatrix: () => fetchJson<RolesMatrixResponse>('/auth/roles'),
    createRole: (data: CreateRolePayload) =>
      fetchJson<RoleItem>('/auth/roles', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateRole: (id: string, data: UpdateRolePayload) =>
      fetchJson<RoleItem>(`/auth/roles/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    updateRolePermissions: (id: string, data: UpdateRolePermissionsPayload) =>
      fetchJson<UpdateRolePermissionsResponse>(`/auth/roles/${id}/permissions`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    deleteRole: (id: string) =>
      fetchJson<{ success: boolean; message: string }>(`/auth/roles/${id}`, {
        method: 'DELETE',
      }),
    duplicateRole: (id: string) =>
      fetchJson<RoleItem>(`/auth/roles/${id}/duplicate`, {
        method: 'POST',
      }),
    getUsers: async () => {
      const res = await fetchJson<UsersListResponse | UserWithRoles[]>('/auth/users?page=1&pageSize=200');
      return Array.isArray(res) ? res : res.items || [];
    },
    updateUserRoles: (userId: string, roles: string[]) =>
      fetchJson<{ id: string; username: string; roles: string[] }>(`/auth/users/${userId}/roles`, {
        method: 'PATCH',
        body: JSON.stringify({ roles }),
      }),
    getUserPermissions: (userId: string) =>
      fetchJson<UserPermissionsDetailResponse>(`/auth/users/${userId}/permissions`),
    updateUserPermissions: (userId: string, payload: UpdateUserPermissionsPayload) =>
      fetchJson<UserPermissionsDetailResponse>(`/auth/users/${userId}/permissions`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
  },
};
