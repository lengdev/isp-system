import { RegistryPermission, RegistryFeature } from './types.js';

export const permissions: RegistryPermission[] = [
  { key: 'procurement.view', group: 'Procurement', label: 'View Purchase Orders', description: 'View supplier catalog and purchase orders', sortOrder: 70, dependsOnKey: null },
  { key: 'procurement.create', group: 'Procurement', label: 'Create Purchase Order', description: 'Draft purchase orders and vendor requests', sortOrder: 71, dependsOnKey: 'procurement.view' },
  { key: 'procurement.edit', group: 'Procurement', label: 'Edit Purchase Order', description: 'Update PO items, prices and delivery dates', sortOrder: 72, dependsOnKey: 'procurement.view' },
  { key: 'procurement.delete', group: 'Procurement', label: 'Cancel Purchase Order', description: 'Cancel or purge vendor purchase orders', sortOrder: 73, dependsOnKey: 'procurement.view' },
];

export const features: RegistryFeature[] = [
  {
    key: 'page.procurement',
    type: 'PAGE',
    label: 'Procurement & POs',
    path: '/inventory/procurement',
    parentKey: 'nav.inventory',
    icon: 'ShoppingBag',
    sortOrder: 33,
    permissionMode: 'ANY',
    defaultPermissions: ['procurement.view'],
  },
  {
    key: 'procurement.btn.create',
    type: 'ACTION',
    label: 'Create Purchase Order Action',
    sortOrder: 34,
    permissionMode: 'ANY',
    defaultPermissions: ['procurement.create'],
  },
];
