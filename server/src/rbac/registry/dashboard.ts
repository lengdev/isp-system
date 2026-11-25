import { RegistryPermission, RegistryFeature } from './types.js';

export const permissions: RegistryPermission[] = [];

export const features: RegistryFeature[] = [
  {
    key: 'nav.dashboard',
    type: 'MENU',
    label: 'Dashboard',
    path: '/dashboard',
    icon: 'LayoutDashboard',
    sortOrder: 10,
    permissionMode: 'ANY',
    defaultPermissions: [], // zero permissions: visible to all authenticated users
  },
  {
    key: 'page.dashboard',
    type: 'PAGE',
    label: 'Dashboard Overview',
    path: '/dashboard',
    parentKey: 'nav.dashboard',
    icon: 'LayoutDashboard',
    sortOrder: 11,
    permissionMode: 'ANY',
    defaultPermissions: [], // zero permissions: visible to all authenticated users
  },
];
