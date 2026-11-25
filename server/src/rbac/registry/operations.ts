import { RegistryPermission, RegistryFeature } from './types.js';

export const permissions: RegistryPermission[] = [
  { key: 'operations.view', group: 'Operations', label: 'View Operations', description: 'View operations dashboard, field dispatch and trouble tickets', sortOrder: 80, dependsOnKey: null },
  { key: 'installations.manage', group: 'Operations', label: 'Manage Installations', description: 'Schedule, dispatch and complete fiber/wireless installs', sortOrder: 81, dependsOnKey: 'operations.view' },
  { key: 'tickets.create', group: 'Operations', label: 'Create Ticket', description: 'Open customer support and network incident tickets', sortOrder: 82, dependsOnKey: 'operations.view' },
  { key: 'tickets.edit', group: 'Operations', label: 'Edit Ticket', description: 'Update ticket priority, assign engineers and resolve issues', sortOrder: 83, dependsOnKey: 'operations.view' },
  { key: 'tickets.delete', group: 'Operations', label: 'Delete Ticket', description: 'Remove invalid or duplicate support tickets', sortOrder: 84, dependsOnKey: 'operations.view' },
  { key: 'technicians.manage', group: 'Operations', label: 'Manage Technicians', description: 'Assign work orders, track technician locations and shifts', sortOrder: 85, dependsOnKey: 'operations.view' },
];

export const features: RegistryFeature[] = [
  {
    key: 'nav.operations',
    type: 'MENU',
    label: 'Operations',
    path: '/tickets',
    icon: 'Wrench',
    sortOrder: 80,
    permissionMode: 'ANY',
    defaultPermissions: ['operations.view', 'installations.manage', 'technicians.manage'],
  },
  {
    key: 'page.tickets',
    type: 'PAGE',
    label: 'Support Tickets',
    path: '/tickets',
    parentKey: 'nav.operations',
    icon: 'LifeBuoy',
    sortOrder: 81,
    permissionMode: 'ANY',
    defaultPermissions: ['operations.view'],
  },
  {
    key: 'page.installations',
    type: 'PAGE',
    label: 'Installations',
    path: '/installations',
    parentKey: 'nav.operations',
    icon: 'Wrench',
    sortOrder: 82,
    permissionMode: 'ANY',
    defaultPermissions: ['installations.manage'],
  },
  {
    key: 'page.technicians',
    type: 'PAGE',
    label: 'Technicians',
    path: '/technicians',
    parentKey: 'nav.operations',
    icon: 'Users',
    sortOrder: 83,
    permissionMode: 'ANY',
    defaultPermissions: ['technicians.manage'],
  },
  {
    key: 'tickets.btn.create',
    type: 'ACTION',
    label: 'Open Ticket Action',
    sortOrder: 84,
    permissionMode: 'ANY',
    defaultPermissions: ['tickets.create'],
  },
];
