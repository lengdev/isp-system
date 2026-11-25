import { RegistryPermission, RegistryFeature } from './types.js';

export const permissions: RegistryPermission[] = [
  { key: 'customers.view', group: 'Customers (CRM)', label: 'View Customers', description: 'View customers, CRM accounts and profile data', sortOrder: 10, dependsOnKey: null },
  { key: 'customers.create', group: 'Customers (CRM)', label: 'Create Customer', description: 'Register new customer accounts', sortOrder: 11, dependsOnKey: 'customers.view' },
  { key: 'customers.edit', group: 'Customers (CRM)', label: 'Edit Customer', description: 'Update customer details, addresses and contacts', sortOrder: 12, dependsOnKey: 'customers.view' },
  { key: 'customers.delete', group: 'Customers (CRM)', label: 'Delete Customer', description: 'Archive or permanently delete customer accounts', sortOrder: 13, dependsOnKey: 'customers.view' },
];

export const features: RegistryFeature[] = [
  {
    key: 'nav.customers',
    type: 'MENU',
    label: 'Customers',
    path: '/customers',
    icon: 'Users',
    sortOrder: 20,
    permissionMode: 'ANY',
    defaultPermissions: ['customers.view'],
  },
  {
    key: 'page.customers',
    type: 'PAGE',
    label: 'Customers Directory',
    path: '/customers',
    parentKey: 'nav.customers',
    icon: 'Users',
    sortOrder: 21,
    permissionMode: 'ANY',
    defaultPermissions: ['customers.view'],
  },
  {
    key: 'customers.btn.create',
    type: 'ACTION',
    label: 'Create Customer Button',
    sortOrder: 22,
    permissionMode: 'ANY',
    defaultPermissions: ['customers.create'],
  },
  {
    key: 'customers.btn.edit',
    type: 'ACTION',
    label: 'Edit Customer Action',
    sortOrder: 23,
    permissionMode: 'ANY',
    defaultPermissions: ['customers.edit'],
  },
  {
    key: 'customers.btn.delete',
    type: 'ACTION',
    label: 'Delete Customer Action',
    sortOrder: 24,
    permissionMode: 'ANY',
    defaultPermissions: ['customers.delete'],
  },
  {
    key: 'customers.tab.overview',
    type: 'TAB',
    label: 'Customer Overview Tab',
    sortOrder: 25,
    permissionMode: 'ANY',
    defaultPermissions: ['customers.view'],
  },
  {
    key: 'customers.tab.billing',
    type: 'TAB',
    label: 'Customer Invoices Tab',
    sortOrder: 26,
    permissionMode: 'ANY',
    defaultPermissions: ['billing.view'],
  },
];
