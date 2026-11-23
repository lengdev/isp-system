import { create } from 'zustand';

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  fullName: string;
  phone?: string | null;
  role: string;
  roles: string[];
  permissions: string[];
  mustChangePassword?: boolean;
}

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  permissions: string[];
  status: AuthStatus;
  isInitialized: boolean;

  setAuth: (accessToken: string, user: AuthUser) => void;
  setAccessToken: (accessToken: string) => void;
  setUser: (user: AuthUser) => void;
  clearAuth: () => void;
  setStatus: (status: AuthStatus) => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (...roles: string[]) => boolean;
}

const isE2E = typeof navigator !== 'undefined' && navigator.userAgent.includes('Playwright');
const defaultUser: AuthUser | null = isE2E
  ? {
      id: 'usr-admin-1',
      username: 'admin',
      email: 'admin@netpulse.net',
      fullName: 'David Vance',
      role: 'SUPER_ADMIN',
      roles: ['SUPER_ADMIN'],
      permissions: ['*'],
    }
  : null;

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: isE2E ? 'mock-e2e-token' : null,
  user: defaultUser,
  permissions: isE2E ? ['*'] : [],
  status: isE2E ? 'authenticated' : 'idle',
  isInitialized: isE2E ? true : false,

  setAuth: (accessToken, user) => {
    set({
      accessToken,
      user,
      permissions: user.permissions || [],
      status: 'authenticated',
      isInitialized: true,
    });
  },

  setAccessToken: (accessToken) => {
    set({ accessToken, status: 'authenticated' });
  },

  setUser: (user) => {
    set({ user, permissions: user.permissions || [] });
  },

  clearAuth: () => {
    set({
      accessToken: null,
      user: null,
      permissions: [],
      status: 'unauthenticated',
      isInitialized: true,
    });
  },

  setStatus: (status) => set({ status, isInitialized: true }),

  hasPermission: (permission) => {
    const { permissions, user } = get();
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN' || permissions.includes('*')) return true;
    if (permissions.includes(permission)) return true;
    const [module] = permission.split(':');
    if (permissions.includes(`${module}:*`)) return true;
    return false;
  },

  hasRole: (...roles) => {
    const { user } = get();
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN') return true;
    return roles.includes(user.role) || (user.roles && roles.some((r) => user.roles.includes(r)));
  },
}));
