import { RegistryPermission, RegistryFeature } from './types.js';

export const permissions: RegistryPermission[] = [
  { key: 'inventory.view', group: 'Inventory & Warehouses', label: 'View Inventory', description: 'View stock levels, serialized ONUs and hardware items', sortOrder: 60, dependsOnKey: null },
  { key: 'inventory.create', group: 'Inventory & Warehouses', label: 'Add Stock Item', description: 'Register new stock SKUs and receive hardware deliveries', sortOrder: 61, dependsOnKey: 'inventory.view' },
  { key: 'inventory.edit', group: 'Inventory & Warehouses', label: 'Edit Stock Item', description: 'Update stock counts, condition and serial numbers', sortOrder: 62, dependsOnKey: 'inventory.view' },
  { key: 'inventory.delete', group: 'Inventory & Warehouses', label: 'Delete Stock Item', description: 'Scrap or remove broken hardware from stock', sortOrder: 63, dependsOnKey: 'inventory.view' },
  { key: 'warehouses.manage', group: 'Inventory & Warehouses', label: 'Manage Warehouses', description: 'Create warehouse locations and execute stock transfers', sortOrder: 64, dependsOnKey: 'inventory.view' },
];

export const features: RegistryFeature[] = [
  {
    key: 'nav.inventory',
    type: 'MENU',
    label: 'Inventory',
    path: '/inventory/products',
    icon: 'Boxes',
    sortOrder: 30,
    permissionMode: 'ANY',
    defaultPermissions: ['inventory.view'],
  },
  {
    key: 'page.products',
    type: 'PAGE',
    label: 'Product Catalog',
    path: '/inventory/products',
    parentKey: 'nav.inventory',
    icon: 'Box',
    sortOrder: 31,
    permissionMode: 'ANY',
    defaultPermissions: ['inventory.view'],
  },
  {
    key: 'page.warehouses',
    type: 'PAGE',
    label: 'Warehouses & Stock',
    path: '/inventory/warehouses',
    parentKey: 'nav.inventory',
    icon: 'Warehouse',
    sortOrder: 32,
    permissionMode: 'ANY',
    defaultPermissions: ['inventory.view'],
  },
  {
    key: 'inventory.btn.create',
    type: 'ACTION',
    label: 'Add Product Item Action',
    sortOrder: 35,
    permissionMode: 'ANY',
    defaultPermissions: ['inventory.create'],
  },
];
