import { RegistryPermission, RegistryFeature } from './types.js';

export const permissions: RegistryPermission[] = [
  { key: 'settings.view', group: 'Settings & Audit Logs', label: 'View Settings', description: 'View ISP system configurations and integration settings', sortOrder: 110, dependsOnKey: null },
  { key: 'settings.edit', group: 'Settings & Audit Logs', label: 'Edit Settings', description: 'Update ISP branding, SMS gateways and payment credentials', sortOrder: 111, dependsOnKey: 'settings.view' },
  { key: 'audit.view', group: 'Settings & Audit Logs', label: 'View Audit Logs', description: 'Inspect immutable security audit trails and user access logs', sortOrder: 112, dependsOnKey: 'settings.view' },
];

export const features: RegistryFeature[] = [
  {
    key: 'nav.settings',
    type: 'MENU',
    label: 'Settings',
    path: '/settings',
    icon: 'Settings',
    sortOrder: 110,
    permissionMode: 'ANY',
    defaultPermissions: ['settings.view'],
  },
  {
    key: 'page.settings',
    type: 'PAGE',
    label: 'General Settings',
    path: '/settings',
    parentKey: 'nav.settings',
    icon: 'Settings',
    sortOrder: 111,
    permissionMode: 'ANY',
    defaultPermissions: ['settings.view'],
  },
  {
    key: 'page.audit',
    type: 'PAGE',
    label: 'Audit Logs',
    path: '/settings/audit',
    parentKey: 'nav.settings',
    icon: 'ShieldCheck',
    sortOrder: 112,
    permissionMode: 'ANY',
    defaultPermissions: ['audit.view'],
  },
];
