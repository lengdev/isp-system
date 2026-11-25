import { RegistryPermission, RegistryFeature } from './types.js';

export const permissions: RegistryPermission[] = [
  {
    key: 'integrations.view',
    group: 'Integrations',
    label: 'View Integrations',
    description: 'Inspect third-party API configurations (MikroTik, Ubiquiti, Stripe, KHQR)',
    sortOrder: 140,
    dependsOnKey: null,
  },
  {
    key: 'integrations.manage',
    group: 'Integrations',
    label: 'Manage Integrations',
    description: 'Connect, disconnect and test third-party service credentials',
    sortOrder: 141,
    dependsOnKey: 'integrations.view',
  },
];

export const features: RegistryFeature[] = [
  {
    key: 'nav.integrations',
    type: 'MENU',
    label: 'Integrations',
    path: '/integrations',
    icon: 'Layers',
    sortOrder: 106,
    permissionMode: 'ANY',
    defaultPermissions: ['settings.view'],
  },
  {
    key: 'page.integrations',
    type: 'PAGE',
    label: 'System Integrations',
    path: '/integrations',
    parentKey: 'nav.integrations',
    icon: 'Layers',
    sortOrder: 107,
    permissionMode: 'ANY',
    defaultPermissions: ['settings.view'],
  },
];
