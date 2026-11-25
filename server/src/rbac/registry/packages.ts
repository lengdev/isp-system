import { RegistryPermission, RegistryFeature } from './types.js';

export const permissions: RegistryPermission[] = [
  { key: 'packages.view', group: 'Packages & Subscriptions', label: 'View Packages', description: 'View internet service packages and pricing tiers', sortOrder: 20, dependsOnKey: null },
  { key: 'packages.create', group: 'Packages & Subscriptions', label: 'Create Package', description: 'Define new internet plans and bandwidth limits', sortOrder: 21, dependsOnKey: 'packages.view' },
  { key: 'packages.edit', group: 'Packages & Subscriptions', label: 'Edit Package', description: 'Modify pricing, speeds and package parameters', sortOrder: 22, dependsOnKey: 'packages.view' },
  { key: 'packages.delete', group: 'Packages & Subscriptions', label: 'Delete Package', description: 'Archive or remove internet packages', sortOrder: 23, dependsOnKey: 'packages.view' },
  { key: 'subscriptions.view', group: 'Packages & Subscriptions', label: 'View Subscriptions', description: 'View customer subscriptions and status', sortOrder: 24, dependsOnKey: 'packages.view' },
  { key: 'subscriptions.create', group: 'Packages & Subscriptions', label: 'Create Subscription', description: 'Assign packages and activate subscriptions', sortOrder: 25, dependsOnKey: 'subscriptions.view' },
  { key: 'subscriptions.edit', group: 'Packages & Subscriptions', label: 'Edit Subscription', description: 'Upgrade, downgrade or renew subscriptions', sortOrder: 26, dependsOnKey: 'subscriptions.view' },
  { key: 'subscriptions.delete', group: 'Packages & Subscriptions', label: 'Delete Subscription', description: 'Cancel or terminate customer subscriptions', sortOrder: 27, dependsOnKey: 'subscriptions.view' },
];

export const features: RegistryFeature[] = [
  {
    key: 'nav.plans',
    type: 'MENU',
    label: 'Plans',
    path: '/plans',
    icon: 'Wifi',
    sortOrder: 40,
    permissionMode: 'ANY',
    defaultPermissions: ['packages.view'],
  },
  {
    key: 'page.plans',
    type: 'PAGE',
    label: 'Internet Plans',
    path: '/plans',
    parentKey: 'nav.plans',
    icon: 'Wifi',
    sortOrder: 41,
    permissionMode: 'ANY',
    defaultPermissions: ['packages.view'],
  },
  {
    key: 'packages.btn.create',
    type: 'ACTION',
    label: 'Create Plan Button',
    sortOrder: 42,
    permissionMode: 'ANY',
    defaultPermissions: ['packages.create'],
  },
  {
    key: 'packages.btn.edit',
    type: 'ACTION',
    label: 'Edit Plan Action',
    sortOrder: 43,
    permissionMode: 'ANY',
    defaultPermissions: ['packages.edit'],
  },
];
