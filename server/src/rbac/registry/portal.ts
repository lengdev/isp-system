import { RegistryPermission, RegistryFeature } from './types.js';

export const permissions: RegistryPermission[] = [
  {
    key: 'portal.view',
    group: 'Customer Portal',
    label: 'View Customer Portal',
    description: 'Access subscriber self-service portal preview',
    sortOrder: 130,
    dependsOnKey: null,
  },
];

export const features: RegistryFeature[] = [
  {
    key: 'nav.portal',
    type: 'MENU',
    label: 'Customer Portal',
    path: '/portal',
    icon: 'Globe',
    sortOrder: 100,
    permissionMode: 'ANY',
    defaultPermissions: [], // Accessible to all authenticated users by default
  },
  {
    key: 'page.portal',
    type: 'PAGE',
    label: 'Customer Portal Preview',
    path: '/portal',
    parentKey: 'nav.portal',
    icon: 'Globe',
    sortOrder: 101,
    permissionMode: 'ANY',
    defaultPermissions: [],
  },
];
