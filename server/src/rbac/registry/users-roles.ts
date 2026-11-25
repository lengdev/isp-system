import { RegistryPermission, RegistryFeature } from './types.js';

export const permissions: RegistryPermission[] = [
  { key: 'users.view', group: 'Users & Roles', label: 'View Users', description: 'View user accounts and assignment status', sortOrder: 120, dependsOnKey: null },
  { key: 'users.manage', group: 'Users & Roles', label: 'Manage Users', description: 'Create, update and manage user accounts and role assignments', sortOrder: 121, dependsOnKey: 'users.view' },
  { key: 'roles.manage', group: 'Users & Roles', label: 'Manage Roles & Permissions', description: 'Configure custom roles and update permissions matrix', sortOrder: 122, dependsOnKey: 'users.view' },
];

export const features: RegistryFeature[] = [
  {
    key: 'page.users',
    type: 'PAGE',
    label: 'Users',
    path: '/settings/users',
    parentKey: 'nav.settings',
    icon: 'Users',
    sortOrder: 121,
    locked: true,
    permissionMode: 'ANY',
    defaultPermissions: ['users.view', 'users.manage'],
  },
  {
    key: 'page.roles',
    type: 'PAGE',
    label: 'Roles & Permissions',
    path: '/settings/roles',
    parentKey: 'nav.settings',
    icon: 'Key',
    sortOrder: 122,
    locked: true,
    permissionMode: 'ANY',
    defaultPermissions: ['roles.manage'],
  },
];
