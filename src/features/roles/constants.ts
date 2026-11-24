export const PERMISSION_DEPENDENCIES: Record<string, string> = {
  'customers.create': 'customers.view',
  'customers.edit': 'customers.view',
  'customers.delete': 'customers.view',

  'packages.create': 'packages.view',
  'packages.edit': 'packages.view',
  'packages.delete': 'packages.view',
  'subscriptions.view': 'packages.view',
  'subscriptions.create': 'subscriptions.view',
  'subscriptions.edit': 'subscriptions.view',
  'subscriptions.delete': 'subscriptions.view',

  'network.create': 'network.view',
  'network.edit': 'network.view',
  'network.delete': 'network.view',
  'routers.manage': 'network.view',
  'routers.reboot': 'network.view',
  'pppoe.manage': 'network.view',
  'vlans.manage': 'network.view',
  'ipam.manage': 'network.view',

  'billing.create': 'billing.view',
  'billing.edit': 'billing.view',
  'billing.delete': 'billing.view',
  'payments.view': 'billing.view',
  'payments.record': 'payments.view',
  'payments.khqr': 'payments.view',
  'payments.delete': 'payments.view',

  'accounting.create': 'accounting.view',
  'accounting.edit': 'accounting.view',
  'accounting.delete': 'accounting.view',
  'accounting.reports': 'accounting.view',

  'inventory.create': 'inventory.view',
  'inventory.edit': 'inventory.view',
  'inventory.delete': 'inventory.view',
  'warehouses.manage': 'inventory.view',

  'procurement.create': 'procurement.view',
  'procurement.edit': 'procurement.view',
  'procurement.delete': 'procurement.view',

  'installations.manage': 'operations.view',
  'tickets.create': 'operations.view',
  'tickets.edit': 'operations.view',
  'tickets.delete': 'operations.view',
  'technicians.manage': 'operations.view',

  'reports.create': 'reports.view',
  'reports.export': 'reports.view',

  'automation.create': 'automation.view',
  'automation.edit': 'automation.view',
  'automation.delete': 'automation.view',

  'settings.edit': 'settings.view',
  'audit.view': 'settings.view',

  'users.manage': 'users.view',
  'roles.manage': 'users.view',
};
