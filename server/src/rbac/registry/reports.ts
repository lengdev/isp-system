import { RegistryPermission, RegistryFeature } from './types.js';

export const permissions: RegistryPermission[] = [
  { key: 'reports.view', group: 'Reports', label: 'View Reports', description: 'View subscriber analytics, revenue charts and network uptime', sortOrder: 90, dependsOnKey: null },
  { key: 'reports.create', group: 'Reports', label: 'Create Custom Reports', description: 'Build custom analytical queries and report definitions', sortOrder: 91, dependsOnKey: 'reports.view' },
  { key: 'reports.export', group: 'Reports', label: 'Export Reports', description: 'Export report metrics to Excel, CSV and PDF documents', sortOrder: 92, dependsOnKey: 'reports.view' },
];

export const features: RegistryFeature[] = [
  {
    key: 'nav.reports',
    type: 'MENU',
    label: 'Reports',
    path: '/reports',
    icon: 'BarChart3',
    sortOrder: 90,
    permissionMode: 'ANY',
    defaultPermissions: ['reports.view'],
  },
  {
    key: 'page.reports',
    type: 'PAGE',
    label: 'Analytics & Reports',
    path: '/reports',
    parentKey: 'nav.reports',
    icon: 'BarChart3',
    sortOrder: 91,
    permissionMode: 'ANY',
    defaultPermissions: ['reports.view'],
  },
  {
    key: 'reports.btn.export',
    type: 'ACTION',
    label: 'Export Report Action',
    sortOrder: 92,
    permissionMode: 'ANY',
    defaultPermissions: ['reports.export'],
  },
];
