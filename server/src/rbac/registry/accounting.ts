import { RegistryPermission, RegistryFeature } from './types.js';

export const permissions: RegistryPermission[] = [
  { key: 'accounting.view', group: 'Accounting', label: 'View General Ledger', description: 'Inspect chart of accounts and journal entries', sortOrder: 50, dependsOnKey: null },
  { key: 'accounting.create', group: 'Accounting', label: 'Post Journal Entry', description: 'Create manual debit and credit journal entries', sortOrder: 51, dependsOnKey: 'accounting.view' },
  { key: 'accounting.edit', group: 'Accounting', label: 'Edit Journal Entry', description: 'Adjust draft or unposted accounting journals', sortOrder: 52, dependsOnKey: 'accounting.view' },
  { key: 'accounting.delete', group: 'Accounting', label: 'Reverse Journal', description: 'Reverse or void posted journal transactions', sortOrder: 53, dependsOnKey: 'accounting.view' },
  { key: 'accounting.reports', group: 'Accounting', label: 'Financial Reports', description: 'Generate balance sheets, profit & loss and trial balances', sortOrder: 54, dependsOnKey: 'accounting.view' },
];

export const features: RegistryFeature[] = [
  {
    key: 'nav.accounting',
    type: 'MENU',
    label: 'Accounting & GL',
    path: '/accounting',
    icon: 'Scale',
    sortOrder: 70,
    permissionMode: 'ANY',
    defaultPermissions: ['accounting.view'],
  },
  {
    key: 'page.accounting',
    type: 'PAGE',
    label: 'General Ledger',
    path: '/accounting',
    parentKey: 'nav.accounting',
    icon: 'Scale',
    sortOrder: 71,
    permissionMode: 'ANY',
    defaultPermissions: ['accounting.view'],
  },
  {
    key: 'accounting.btn.post',
    type: 'ACTION',
    label: 'Post Journal Entry Action',
    sortOrder: 72,
    permissionMode: 'ANY',
    defaultPermissions: ['accounting.create'],
  },
];
