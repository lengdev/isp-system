import { prisma, dbStore } from '../db/store.js';
import { AuthService } from './auth.service.js';

export interface PermissionItem {
  id?: string;
  key: string;
  group: string;
  label: string;
  description: string;
  sortOrder: number;
}

export const PERMISSION_CATALOG: PermissionItem[] = [
  // 1. Customers (CRM)
  { key: 'customers.view', group: 'Customers (CRM)', label: 'View Customers', description: 'View customers, CRM accounts and profile data', sortOrder: 10 },
  { key: 'customers.create', group: 'Customers (CRM)', label: 'Create Customer', description: 'Register new customer accounts', sortOrder: 11 },
  { key: 'customers.edit', group: 'Customers (CRM)', label: 'Edit Customer', description: 'Update customer details, addresses and contacts', sortOrder: 12 },
  { key: 'customers.delete', group: 'Customers (CRM)', label: 'Delete Customer', description: 'Archive or permanently delete customer accounts', sortOrder: 13 },

  // 2. Packages & Subscriptions
  { key: 'packages.view', group: 'Packages & Subscriptions', label: 'View Packages', description: 'View internet service packages and pricing tiers', sortOrder: 20 },
  { key: 'packages.create', group: 'Packages & Subscriptions', label: 'Create Package', description: 'Define new internet plans and bandwidth limits', sortOrder: 21 },
  { key: 'packages.edit', group: 'Packages & Subscriptions', label: 'Edit Package', description: 'Modify pricing, speeds and package parameters', sortOrder: 22 },
  { key: 'packages.delete', group: 'Packages & Subscriptions', label: 'Delete Package', description: 'Archive or remove internet packages', sortOrder: 23 },
  { key: 'subscriptions.view', group: 'Packages & Subscriptions', label: 'View Subscriptions', description: 'View customer subscriptions and status', sortOrder: 24 },
  { key: 'subscriptions.create', group: 'Packages & Subscriptions', label: 'Create Subscription', description: 'Assign packages and activate subscriptions', sortOrder: 25 },
  { key: 'subscriptions.edit', group: 'Packages & Subscriptions', label: 'Edit Subscription', description: 'Upgrade, downgrade or renew subscriptions', sortOrder: 26 },
  { key: 'subscriptions.delete', group: 'Packages & Subscriptions', label: 'Delete Subscription', description: 'Cancel or terminate customer subscriptions', sortOrder: 27 },

  // 3. Network (routers, PPPoE, VLANs, IPAM, reboot router)
  { key: 'network.view', group: 'Network', label: 'View Network', description: 'Monitor network topology, devices and interface statuses', sortOrder: 30 },
  { key: 'network.create', group: 'Network', label: 'Add Network Device', description: 'Provision new routers, switches and OLTs', sortOrder: 31 },
  { key: 'network.edit', group: 'Network', label: 'Edit Network Config', description: 'Modify network configurations and interface bindings', sortOrder: 32 },
  { key: 'network.delete', group: 'Network', label: 'Delete Network Device', description: 'Remove network hardware from inventory', sortOrder: 33 },
  { key: 'routers.manage', group: 'Network', label: 'Manage Routers', description: 'Configure MikroTik and core routing devices', sortOrder: 34 },
  { key: 'routers.reboot', group: 'Network', label: 'Reboot Router', description: 'Send remote reboot and reload commands to routers', sortOrder: 35 },
  { key: 'pppoe.manage', group: 'Network', label: 'Manage PPPoE', description: 'Configure PPPoE server profiles, pools and active sessions', sortOrder: 36 },
  { key: 'vlans.manage', group: 'Network', label: 'Manage VLANs', description: 'Configure VLAN IDs, trunk ports and access tags', sortOrder: 37 },
  { key: 'ipam.manage', group: 'Network', label: 'Manage IPAM', description: 'Allocate IPv4/IPv6 subnets, pools and DHCP servers', sortOrder: 38 },

  // 4. Billing & Payments (invoices, record payment, KHQR)
  { key: 'billing.view', group: 'Billing & Payments', label: 'View Invoices', description: 'View customer invoices, balances and payment histories', sortOrder: 40 },
  { key: 'billing.create', group: 'Billing & Payments', label: 'Generate Invoices', description: 'Run billing runs and generate invoices', sortOrder: 41 },
  { key: 'billing.edit', group: 'Billing & Payments', label: 'Edit Invoices', description: 'Adjust line items, apply credits and discounts', sortOrder: 42 },
  { key: 'billing.delete', group: 'Billing & Payments', label: 'Void Invoices', description: 'Cancel or delete draft and unpaid invoices', sortOrder: 43 },
  { key: 'payments.view', group: 'Billing & Payments', label: 'View Payments', description: 'View payment transactions and payment method records', sortOrder: 44 },
  { key: 'payments.record', group: 'Billing & Payments', label: 'Record Payment', description: 'Accept and process manual cash/bank payments', sortOrder: 45 },
  { key: 'payments.khqr', group: 'Billing & Payments', label: 'Generate KHQR', description: 'Generate Bakong dynamic KHQR payment codes', sortOrder: 46 },
  { key: 'payments.delete', group: 'Billing & Payments', label: 'Void Payment', description: 'Void, reverse or refund received payments', sortOrder: 47 },

  // 5. Accounting (journals, reports)
  { key: 'accounting.view', group: 'Accounting', label: 'View General Ledger', description: 'Inspect chart of accounts and journal entries', sortOrder: 50 },
  { key: 'accounting.create', group: 'Accounting', label: 'Post Journal Entry', description: 'Create manual debit and credit journal entries', sortOrder: 51 },
  { key: 'accounting.edit', group: 'Accounting', label: 'Edit Journal Entry', description: 'Adjust draft or unposted accounting journals', sortOrder: 52 },
  { key: 'accounting.delete', group: 'Accounting', label: 'Reverse Journal', description: 'Reverse or void posted journal transactions', sortOrder: 53 },
  { key: 'accounting.reports', group: 'Accounting', label: 'Financial Reports', description: 'Generate balance sheets, profit & loss and trial balances', sortOrder: 54 },

  // 6. Inventory & Warehouses
  { key: 'inventory.view', group: 'Inventory & Warehouses', label: 'View Inventory', description: 'View stock levels, serialized ONUs and hardware items', sortOrder: 60 },
  { key: 'inventory.create', group: 'Inventory & Warehouses', label: 'Add Stock Item', description: 'Register new stock SKUs and receive hardware deliveries', sortOrder: 61 },
  { key: 'inventory.edit', group: 'Inventory & Warehouses', label: 'Edit Stock Item', description: 'Update stock counts, condition and serial numbers', sortOrder: 62 },
  { key: 'inventory.delete', group: 'Inventory & Warehouses', label: 'Delete Stock Item', description: 'Scrap or remove broken hardware from stock', sortOrder: 63 },
  { key: 'warehouses.manage', group: 'Inventory & Warehouses', label: 'Manage Warehouses', description: 'Create warehouse locations and execute stock transfers', sortOrder: 64 },

  // 7. Procurement
  { key: 'procurement.view', group: 'Procurement', label: 'View Purchase Orders', description: 'View supplier catalog and purchase orders', sortOrder: 70 },
  { key: 'procurement.create', group: 'Procurement', label: 'Create Purchase Order', description: 'Draft purchase orders and vendor requests', sortOrder: 71 },
  { key: 'procurement.edit', group: 'Procurement', label: 'Edit Purchase Order', description: 'Update PO items, prices and delivery dates', sortOrder: 72 },
  { key: 'procurement.delete', group: 'Procurement', label: 'Cancel Purchase Order', description: 'Cancel or purge vendor purchase orders', sortOrder: 73 },

  // 8. Operations (installations, tickets, technicians)
  { key: 'operations.view', group: 'Operations', label: 'View Operations', description: 'View operations dashboard, field dispatch and trouble tickets', sortOrder: 80 },
  { key: 'installations.manage', group: 'Operations', label: 'Manage Installations', description: 'Schedule, dispatch and complete fiber/wireless installs', sortOrder: 81 },
  { key: 'tickets.create', group: 'Operations', label: 'Create Ticket', description: 'Open customer support and network incident tickets', sortOrder: 82 },
  { key: 'tickets.edit', group: 'Operations', label: 'Edit Ticket', description: 'Update ticket priority, assign engineers and resolve issues', sortOrder: 83 },
  { key: 'tickets.delete', group: 'Operations', label: 'Delete Ticket', description: 'Remove invalid or duplicate support tickets', sortOrder: 84 },
  { key: 'technicians.manage', group: 'Operations', label: 'Manage Technicians', description: 'Assign work orders, track technician locations and shifts', sortOrder: 85 },

  // 9. Reports
  { key: 'reports.view', group: 'Reports', label: 'View Reports', description: 'View subscriber analytics, revenue charts and network uptime', sortOrder: 90 },
  { key: 'reports.create', group: 'Reports', label: 'Create Custom Reports', description: 'Build custom analytical queries and report definitions', sortOrder: 91 },
  { key: 'reports.export', group: 'Reports', label: 'Export Reports', description: 'Export report metrics to Excel, CSV and PDF documents', sortOrder: 92 },

  // 10. Automation
  { key: 'automation.view', group: 'Automation', label: 'View Automations', description: 'View scheduled jobs, event triggers and webhook definitions', sortOrder: 100 },
  { key: 'automation.create', group: 'Automation', label: 'Create Automation', description: 'Set up automated reminder messages and billing runs', sortOrder: 101 },
  { key: 'automation.edit', group: 'Automation', label: 'Edit Automation', description: 'Update automation triggers, conditions and action steps', sortOrder: 102 },
  { key: 'automation.delete', group: 'Automation', label: 'Delete Automation', description: 'Disable and remove automated workflows', sortOrder: 103 },

  // 11. Settings & Audit Logs
  { key: 'settings.view', group: 'Settings & Audit Logs', label: 'View Settings', description: 'View ISP system configurations and integration settings', sortOrder: 110 },
  { key: 'settings.edit', group: 'Settings & Audit Logs', label: 'Edit Settings', description: 'Update ISP branding, SMS gateways and payment credentials', sortOrder: 111 },
  { key: 'audit.view', group: 'Settings & Audit Logs', label: 'View Audit Logs', description: 'Inspect immutable security audit trails and user access logs', sortOrder: 112 },

  // 12. Users & Roles (roles.manage, users.manage)
  { key: 'users.view', group: 'Users & Roles', label: 'View Users', description: 'View staff user accounts and assignment status', sortOrder: 120 },
  { key: 'users.manage', group: 'Users & Roles', label: 'Manage Users', description: 'Create, update and manage staff accounts and role assignments', sortOrder: 121 },
  { key: 'roles.manage', group: 'Users & Roles', label: 'Manage Roles & Permissions', description: 'Configure custom roles and update permissions matrix', sortOrder: 122 },
];

/**
 * Dependency rule:
 * Action permissions require the resource's view permission.
 */
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

// Initial role definitions
export const INITIAL_ROLES = [
  {
    name: 'SUPER_ADMIN',
    description: 'Super Administrator with full unrestricted access to all features and settings',
    isSystem: true,
  },
  {
    name: 'NETWORK_ENGINEER',
    description: 'Network engineering, core routing, PPPoE pools, VLANs and field network operations',
    isSystem: true,
  },
  {
    name: 'BILLING_CASHIER',
    description: 'Billing, invoicing, KHQR payments and cashier transactions',
    isSystem: true,
  },
  {
    name: 'FIELD_TECHNICIAN',
    description: 'Field service, fiber installations, hardware provisioning and support tickets',
    isSystem: true,
  },
  {
    name: 'SUPPORT_AGENT',
    description: 'Customer inquiries, tickets, subscriptions and customer care',
    isSystem: true,
  },
  {
    name: 'ACCOUNTANT',
    description: 'General ledger, accounting entries, reconciliation and financial statements',
    isSystem: false,
  },
  {
    name: 'ADMINISTRATOR',
    description: 'Administrative officer managing daily operations, customers and billing',
    isSystem: false,
  },
  {
    name: 'CASHIER',
    description: 'Front-desk cashier accepting cash and bank payments',
    isSystem: false,
  },
  {
    name: 'TECHNICIAN',
    description: 'Technical field engineer for dispatch and repairs',
    isSystem: false,
  },
  {
    name: 'SALES_STAFF',
    description: 'Sales representative managing prospect customers and plan subscriptions',
    isSystem: false,
  },
  {
    name: 'WAREHOUSE_MANAGER',
    description: 'Hardware inventory, warehouse stock control and equipment tracking',
    isSystem: false,
  },
  {
    name: 'PROCUREMENT_OFFICER',
    description: 'Supplier purchasing, vendor quotes and purchase orders',
    isSystem: false,
  },
];

// Mapping from role name to default permission keys
export const DEFAULT_ROLE_PERMISSION_KEYS: Record<string, string[]> = {
  SUPER_ADMIN: PERMISSION_CATALOG.map((p) => p.key),
  NETWORK_ENGINEER: [
    'customers.view',
    'network.view',
    'network.create',
    'network.edit',
    'network.delete',
    'routers.manage',
    'routers.reboot',
    'pppoe.manage',
    'vlans.manage',
    'ipam.manage',
    'operations.view',
    'installations.manage',
    'tickets.create',
    'tickets.edit',
    'tickets.delete',
    'technicians.manage',
    'inventory.view',
    'reports.view',
    'reports.create',
    'reports.export',
  ],
  BILLING_CASHIER: [
    'customers.view',
    'billing.view',
    'billing.create',
    'billing.edit',
    'billing.delete',
    'payments.view',
    'payments.record',
    'payments.khqr',
    'payments.delete',
    'accounting.view',
  ],
  FIELD_TECHNICIAN: [
    'customers.view',
    'operations.view',
    'installations.manage',
    'technicians.manage',
    'tickets.create',
    'tickets.edit',
    'inventory.view',
  ],
  SUPPORT_AGENT: [
    'customers.view',
    'customers.create',
    'customers.edit',
    'packages.view',
    'subscriptions.view',
    'operations.view',
    'tickets.create',
    'tickets.edit',
  ],
  ACCOUNTANT: [
    'customers.view',
    'billing.view',
    'billing.create',
    'billing.edit',
    'billing.delete',
    'payments.view',
    'payments.record',
    'payments.khqr',
    'payments.delete',
    'accounting.view',
    'accounting.create',
    'accounting.edit',
    'accounting.delete',
    'accounting.reports',
    'reports.view',
    'reports.create',
    'reports.export',
    'procurement.view',
  ],
  ADMINISTRATOR: [
    'customers.view',
    'customers.create',
    'customers.edit',
    'packages.view',
    'packages.create',
    'packages.edit',
    'subscriptions.view',
    'subscriptions.create',
    'subscriptions.edit',
    'billing.view',
    'billing.create',
    'billing.edit',
    'payments.view',
    'payments.record',
    'payments.khqr',
    'network.view',
    'inventory.view',
    'accounting.view',
    'operations.view',
    'installations.manage',
    'tickets.create',
    'tickets.edit',
    'technicians.manage',
    'reports.view',
    'settings.view',
    'users.view',
    'users.manage',
  ],
  CASHIER: [
    'customers.view',
    'billing.view',
    'payments.view',
    'payments.record',
    'payments.khqr',
    'accounting.view',
  ],
  TECHNICIAN: [
    'customers.view',
    'operations.view',
    'installations.manage',
    'technicians.manage',
    'tickets.create',
    'tickets.edit',
    'inventory.view',
  ],
  SALES_STAFF: [
    'customers.view',
    'customers.create',
    'customers.edit',
    'packages.view',
    'subscriptions.view',
    'subscriptions.create',
    'subscriptions.edit',
    'billing.view',
    'operations.view',
    'installations.manage',
    'tickets.create',
  ],
  WAREHOUSE_MANAGER: [
    'inventory.view',
    'inventory.create',
    'inventory.edit',
    'inventory.delete',
    'warehouses.manage',
    'procurement.view',
    'procurement.create',
    'procurement.edit',
    'procurement.delete',
  ],
  PROCUREMENT_OFFICER: [
    'procurement.view',
    'procurement.create',
    'procurement.edit',
    'procurement.delete',
    'inventory.view',
  ],
};

// In-Memory Role Permissions Cache (TTL = 30s)
interface CacheEntry {
  permissions: Set<string>;
  timestamp: number;
}
const rolePermissionsCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30 * 1000;

export class RbacService {
  /**
   * Invalidate cache for a specific role or all roles
   */
  static invalidateCache(roleIdentifier?: string) {
    if (roleIdentifier) {
      rolePermissionsCache.delete(roleIdentifier);
    } else {
      rolePermissionsCache.clear();
    }
  }

  /**
   * Idempotently seeds all permissions, default roles, role-permissions,
   * and links existing users to their respective roles in UserRole table.
   */
  static async seedRbac() {
    // 1. Upsert Permissions
    for (const p of PERMISSION_CATALOG) {
      await prisma.permission.upsert({
        where: { key: p.key },
        update: {
          group: p.group,
          label: p.label,
          description: p.description,
          sortOrder: p.sortOrder,
        },
        create: {
          key: p.key,
          group: p.group,
          label: p.label,
          description: p.description,
          sortOrder: p.sortOrder,
        },
      });
    }

    const allDbPerms = await prisma.permission.findMany();
    const permMap = new Map<string, string>(allDbPerms.map((p) => [p.key, p.id]));

    // 2. Upsert Roles
    for (const r of INITIAL_ROLES) {
      const role = await prisma.role.upsert({
        where: { name: r.name },
        update: {
          description: r.description,
          isSystem: r.isSystem,
        },
        create: {
          name: r.name,
          description: r.description,
          isSystem: r.isSystem,
        },
      });

      // 3. Ensure Role Permissions
      const defaultKeys = DEFAULT_ROLE_PERMISSION_KEYS[r.name] || [];
      const keysToAssign = r.name === 'SUPER_ADMIN' ? PERMISSION_CATALOG.map((p) => p.key) : defaultKeys;

      for (const key of keysToAssign) {
        const permId = permMap.get(key);
        if (permId) {
          await prisma.rolePermission.upsert({
            where: {
              roleId_permissionId: {
                roleId: role.id,
                permissionId: permId,
              },
            },
            update: {},
            create: {
              roleId: role.id,
              permissionId: permId,
            },
          });
        }
      }
    }

    // 4. Ensure all existing users in User table have UserRole rows
    const allRoles = await prisma.role.findMany();
    const roleByName = new Map(allRoles.map((r) => [r.name, r.id]));
    const users = await prisma.user.findMany({ select: { id: true, role: true } });

    for (const u of users) {
      const roleId = roleByName.get(u.role);
      if (roleId) {
        await prisma.userRole.upsert({
          where: {
            userId_roleId: {
              userId: u.id,
              roleId: roleId,
            },
          },
          update: {},
          create: {
            userId: u.id,
            roleId: roleId,
          },
        });
      }
    }

    this.invalidateCache();
  }

  /**
   * Get permissions for a role (with 30s cache)
   */
  static async getRolePermissions(roleIdOrName: string): Promise<Set<string>> {
    const cached = rolePermissionsCache.get(roleIdOrName);
    const now = Date.now();
    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      return cached.permissions;
    }

    // Find role by id or name
    const role = await prisma.role.findFirst({
      where: {
        OR: [{ id: roleIdOrName }, { name: roleIdOrName }],
      },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });

    if (!role) {
      const emptySet = new Set<string>();
      return emptySet;
    }

    let permKeys: string[];
    if (role.name === 'SUPER_ADMIN') {
      // Super admin always has all catalog keys + '*'
      permKeys = ['*', ...PERMISSION_CATALOG.map((p) => p.key)];
    } else {
      permKeys = role.permissions.map((rp) => rp.permission.key);
    }

    const permSet = new Set<string>(permKeys);
    rolePermissionsCache.set(role.id, { permissions: permSet, timestamp: now });
    rolePermissionsCache.set(role.name, { permissions: permSet, timestamp: now });

    return permSet;
  }

  /**
   * Check if role has a permission, supporting dot, colon and wildcard syntax
   */
  static async checkPermission(roleIdOrName: string, requiredPermission: string): Promise<boolean> {
    if (roleIdOrName === 'SUPER_ADMIN') return true;

    const perms = await this.getRolePermissions(roleIdOrName);
    if (perms.has('*') || perms.has(requiredPermission)) return true;

    // Normalize separators: customers:read -> customers.view or customers.read
    const normalized = requiredPermission.replace(':', '.');
    if (perms.has(normalized)) return true;

    // Handle common alias conversions (e.g., customers:read -> customers.view)
    if (normalized.endsWith('.read')) {
      const viewKey = normalized.replace(/\.read$/, '.view');
      if (perms.has(viewKey)) return true;
    }
    if (normalized.endsWith('.update')) {
      const editKey = normalized.replace(/\.update$/, '.edit');
      if (perms.has(editKey)) return true;
    }

    // Check module wildcard (e.g. "billing.*" or "network.*")
    const parts = normalized.split('.');
    const module = parts[0];
    if (perms.has(`${module}.*`)) return true;

    // If still not matched, check legacy memory mapping
    const legacyRolePerms = (AuthService as any).ROLE_PERMISSIONS?.[roleIdOrName] || [];
    if (legacyRolePerms.includes('*') || legacyRolePerms.includes(requiredPermission)) return true;
    if (legacyRolePerms.includes(`${module}:*`)) return true;

    return false;
  }

  /**
   * GET /roles response payload
   */
  static async getRolesMatrix() {
    const [roles, permissions] = await Promise.all([
      prisma.role.findMany({
        include: {
          userRoles: { select: { userId: true } },
          permissions: {
            include: { permission: true },
          },
        },
        orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
      }),
      prisma.permission.findMany({
        orderBy: [{ sortOrder: 'asc' }, { key: 'asc' }],
      }),
    ]);

    const formattedRoles = roles.map((r) => {
      // Distinct user count
      const userCount = new Set(r.userRoles.map((ur) => ur.userId)).size;
      return {
        id: r.id,
        name: r.name,
        description: r.description,
        isSystem: r.isSystem,
        userCount,
        updatedAt: r.updatedAt.toISOString(),
      };
    });

    const formattedPermissions = permissions.map((p) => ({
      id: p.id,
      key: p.key,
      group: p.group,
      label: p.label,
      description: p.description,
      sortOrder: p.sortOrder,
    }));

    const matrix: Record<string, string[]> = {};
    for (const r of roles) {
      if (r.name === 'SUPER_ADMIN') {
        // SUPER_ADMIN has every permission
        matrix[r.id] = permissions.map((p) => p.key);
      } else {
        matrix[r.id] = r.permissions.map((rp) => rp.permission.key);
      }
    }

    return {
      roles: formattedRoles,
      permissions: formattedPermissions,
      matrix,
    };
  }

  /**
   * POST /roles - Create new custom role
   */
  static async createRole(
    data: { name: string; description?: string; copyFromRoleId?: string },
    actor: { id: string; username: string; ip: string }
  ) {
    const trimmedName = data.name.trim();
    if (!trimmedName) {
      throw new Error('Role name is required');
    }

    const existing = await prisma.role.findFirst({
      where: { name: { equals: trimmedName, mode: 'insensitive' } },
    });
    if (existing) {
      throw new Error(`Role "${trimmedName}" already exists`);
    }

    const newRole = await prisma.role.create({
      data: {
        name: trimmedName,
        description: data.description?.trim() || null,
        isSystem: false,
      },
    });

    // If copying from an existing role
    if (data.copyFromRoleId) {
      const sourceRole = await prisma.role.findUnique({
        where: { id: data.copyFromRoleId },
        include: { permissions: true },
      });

      if (sourceRole) {
        if (sourceRole.name === 'SUPER_ADMIN') {
          const allPerms = await prisma.permission.findMany();
          await prisma.rolePermission.createMany({
            data: allPerms.map((p) => ({
              roleId: newRole.id,
              permissionId: p.id,
            })),
          });
        } else {
          await prisma.rolePermission.createMany({
            data: sourceRole.permissions.map((sp) => ({
              roleId: newRole.id,
              permissionId: sp.permissionId,
            })),
          });
        }
      }
    }

    this.invalidateCache();

    await AuthService.logAudit(
      'ROLE_CREATE',
      'Role',
      newRole.id,
      `Created role "${newRole.name}"${data.copyFromRoleId ? ` (copied from ${data.copyFromRoleId})` : ''}`,
      actor.username,
      actor.ip,
      actor.id
    );

    return {
      id: newRole.id,
      name: newRole.name,
      description: newRole.description,
      isSystem: newRole.isSystem,
      userCount: 0,
      updatedAt: newRole.updatedAt.toISOString(),
    };
  }

  /**
   * PATCH /roles/:id - Rename or change description
   */
  static async updateRole(
    id: string,
    data: { name?: string; description?: string },
    actor: { id: string; username: string; ip: string }
  ) {
    const role = await prisma.role.findUnique({ where: { id } });
    if (!role) {
      throw new Error('Role not found');
    }

    if (role.name === 'SUPER_ADMIN') {
      throw new Error('Cannot modify the SUPER_ADMIN role');
    }

    const updateData: { name?: string; description?: string } = {};

    if (data.name !== undefined) {
      const trimmed = data.name.trim();
      if (!trimmed) throw new Error('Role name cannot be empty');

      if (trimmed !== role.name) {
        const existing = await prisma.role.findFirst({
          where: {
            name: { equals: trimmed, mode: 'insensitive' },
            id: { not: id },
          },
        });
        if (existing) {
          throw new Error(`Role "${trimmed}" already exists`);
        }
        updateData.name = trimmed;
      }
    }

    if (data.description !== undefined) {
      updateData.description = data.description.trim() || '';
    }

    const updated = await prisma.role.update({
      where: { id },
      data: updateData,
    });

    this.invalidateCache(role.id);
    this.invalidateCache(role.name);

    await AuthService.logAudit(
      'ROLE_UPDATE',
      'Role',
      updated.id,
      `Updated role details for "${updated.name}": ${JSON.stringify(updateData)}`,
      actor.username,
      actor.ip,
      actor.id
    );

    return updated;
  }

  /**
   * PUT /roles/:id/permissions - Update permissions for a role with OCC and dependency checks
   */
  static async updateRolePermissions(
    id: string,
    body: { add?: string[]; remove?: string[]; expectedUpdatedAt?: string },
    actor: { id: string; username: string; ip: string }
  ) {
    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        permissions: { include: { permission: true } },
      },
    });

    if (!role) {
      const err: any = new Error('Role not found');
      err.status = 404;
      throw err;
    }

    // Rule: SUPER_ADMIN role is immutable and always full
    if (role.name === 'SUPER_ADMIN') {
      const err: any = new Error('SUPER_ADMIN permissions are immutable and cannot be modified');
      err.status = 400;
      throw err;
    }

    // OCC Check: 409 if role changed since loaded
    if (body.expectedUpdatedAt) {
      const expectedTime = new Date(body.expectedUpdatedAt).getTime();
      const actualTime = role.updatedAt.getTime();
      if (Math.abs(actualTime - expectedTime) > 1000) {
        const err: any = new Error('Role was modified by another user. Please reload the latest permissions.');
        err.status = 409;
        err.code = 'STALE_UPDATE';
        throw err;
      }
    }

    const toAdd = new Set(body.add || []);
    const toRemove = new Set(body.remove || []);

    const currentKeys = new Set(role.permissions.map((rp) => rp.permission.key));
    const targetKeys = new Set(currentKeys);

    for (const k of toAdd) targetKeys.add(k);
    for (const k of toRemove) targetKeys.delete(k);

    // Rule: Dependency check - create/edit/delete on a resource require its view permission
    for (const key of targetKeys) {
      const requiredView = PERMISSION_DEPENDENCIES[key];
      if (requiredView && !targetKeys.has(requiredView)) {
        const err: any = new Error(`Permission "${key}" requires "${requiredView}" to be enabled.`);
        err.status = 400;
        throw err;
      }
    }

    // Rule: Lockout prevention
    // A user cannot remove "roles.manage" from the only role that holds it for them
    const userRoleLinks = await prisma.userRole.findMany({
      where: { userId: actor.id },
      include: {
        role: {
          include: {
            permissions: { include: { permission: true } },
          },
        },
      },
    });

    const actorIsSuperAdmin = userRoleLinks.some((ur) => ur.role.name === 'SUPER_ADMIN');
    if (!actorIsSuperAdmin && currentKeys.has('roles.manage') && !targetKeys.has('roles.manage')) {
      const actorHasThisRole = userRoleLinks.some((ur) => ur.roleId === role.id);
      if (actorHasThisRole) {
        // Check if actor has ANY other role granting roles.manage
        const otherRolesWithManage = userRoleLinks.filter(
          (ur) => ur.roleId !== role.id && ur.role.permissions.some((rp) => rp.permission.key === 'roles.manage')
        );
        if (otherRolesWithManage.length === 0) {
          const err: any = new Error(
            'Lockout prevention: You cannot remove "roles.manage" from the only role that grants you role management access.'
          );
          err.status = 400;
          throw err;
        }
      }
    }

    // Fetch permission records for additions and removals
    const allDbPerms = await prisma.permission.findMany();
    const permByKey = new Map(allDbPerms.map((p) => [p.key, p.id]));

    const permsToAdd = Array.from(toAdd)
      .map((k) => permByKey.get(k))
      .filter((id): id is string => Boolean(id) && !currentKeys.has(allDbPerms.find((p) => p.id === id)?.key || ''));

    const permsToRemove = Array.from(toRemove)
      .map((k) => permByKey.get(k))
      .filter((id): id is string => Boolean(id) && currentKeys.has(allDbPerms.find((p) => p.id === id)?.key || ''));

    // Execute in transaction
    await prisma.$transaction(async (tx) => {
      if (permsToRemove.length > 0) {
        await tx.rolePermission.deleteMany({
          where: {
            roleId: role.id,
            permissionId: { in: permsToRemove },
          },
        });
      }

      if (permsToAdd.length > 0) {
        for (const pid of permsToAdd) {
          await tx.rolePermission.upsert({
            where: {
              roleId_permissionId: {
                roleId: role.id,
                permissionId: pid,
              },
            },
            update: {},
            create: {
              roleId: role.id,
              permissionId: pid,
            },
          });
        }
      }

      await tx.role.update({
        where: { id: role.id },
        data: { updatedAt: new Date() },
      });
    });

    this.invalidateCache(role.id);
    this.invalidateCache(role.name);

    const updatedRole = await prisma.role.findUnique({
      where: { id: role.id },
      include: {
        permissions: { include: { permission: true } },
      },
    });

    // Write AuditLog
    await AuthService.logAudit(
      'ROLE_PERMISSIONS_UPDATE',
      'Role',
      role.id,
      JSON.stringify({
        roleName: role.name,
        added: Array.from(toAdd),
        removed: Array.from(toRemove),
        actor: actor.username,
      }),
      actor.username,
      actor.ip,
      actor.id
    );

    return {
      id: updatedRole!.id,
      name: updatedRole!.name,
      updatedAt: updatedRole!.updatedAt.toISOString(),
      permissionKeys: updatedRole!.permissions.map((rp) => rp.permission.key),
    };
  }

  /**
   * DELETE /roles/:id - Delete custom role only if not isSystem and userCount === 0
   */
  static async deleteRole(id: string, actor: { id: string; username: string; ip: string }) {
    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        userRoles: true,
      },
    });

    if (!role) {
      throw new Error('Role not found');
    }

    if (role.isSystem) {
      const err: any = new Error('Cannot delete system role');
      err.status = 400;
      throw err;
    }

    if (role.userRoles.length > 0) {
      const err: any = new Error(`Cannot delete role "${role.name}" because it is currently assigned to ${role.userRoles.length} user(s).`);
      err.status = 400;
      throw err;
    }

    await prisma.role.delete({ where: { id } });

    this.invalidateCache(role.id);
    this.invalidateCache(role.name);

    await AuthService.logAudit(
      'ROLE_DELETE',
      'Role',
      role.id,
      `Deleted role "${role.name}"`,
      actor.username,
      actor.ip,
      actor.id
    );

    return { success: true, message: `Role "${role.name}" deleted successfully` };
  }

  /**
   * POST /roles/:id/duplicate - Duplicate an existing role
   */
  static async duplicateRole(id: string, actor: { id: string; username: string; ip: string }) {
    const sourceRole = await prisma.role.findUnique({
      where: { id },
      include: {
        permissions: { include: { permission: true } },
      },
    });

    if (!sourceRole) {
      throw new Error('Source role not found');
    }

    // Determine unique name
    let copyName = `${sourceRole.name} (Copy)`;
    let counter = 1;
    while (await prisma.role.findFirst({ where: { name: copyName } })) {
      counter++;
      copyName = `${sourceRole.name} (Copy ${counter})`;
    }

    const newRole = await prisma.role.create({
      data: {
        name: copyName,
        description: `Duplicated from ${sourceRole.name}. ${sourceRole.description || ''}`.trim(),
        isSystem: false,
      },
    });

    // Copy permissions
    let permIds: string[];
    if (sourceRole.name === 'SUPER_ADMIN') {
      const allDbPerms = await prisma.permission.findMany();
      permIds = allDbPerms.map((p) => p.id);
    } else {
      permIds = sourceRole.permissions.map((rp) => rp.permissionId);
    }

    if (permIds.length > 0) {
      await prisma.rolePermission.createMany({
        data: permIds.map((pid) => ({
          roleId: newRole.id,
          permissionId: pid,
        })),
      });
    }

    this.invalidateCache();

    await AuthService.logAudit(
      'ROLE_DUPLICATE',
      'Role',
      newRole.id,
      `Duplicated role "${sourceRole.name}" into "${newRole.name}"`,
      actor.username,
      actor.ip,
      actor.id
    );

    return {
      id: newRole.id,
      name: newRole.name,
      description: newRole.description,
      isSystem: newRole.isSystem,
      userCount: 0,
      updatedAt: newRole.updatedAt.toISOString(),
    };
  }

  /**
   * GET /users - For Users tab
   */
  static async listUsersWithRoles() {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        phone: true,
        avatarUrl: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        userRoles: {
          include: {
            role: {
              select: { id: true, name: true, isSystem: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return users.map((u) => {
      const assignedRoles = u.userRoles.map((ur) => ur.role.name);
      const primaryRole = assignedRoles[0] || u.role;
      return {
        id: u.id,
        username: u.username,
        email: u.email,
        fullName: u.fullName,
        phone: u.phone,
        avatarUrl: u.avatarUrl,
        role: primaryRole,
        roles: assignedRoles.length > 0 ? assignedRoles : [u.role],
        roleIds: u.userRoles.map((ur) => ur.role.id),
        isActive: u.isActive,
        lastLoginAt: u.lastLoginAt?.toISOString() || null,
        createdAt: u.createdAt.toISOString(),
        updatedAt: u.updatedAt.toISOString(),
      };
    });
  }

  /**
   * PATCH /users/:id/roles - Update user's roles
   */
  static async updateUserRoles(
    targetUserId: string,
    roleIdsOrNames: string[],
    actor: { id: string; username: string; ip: string }
  ) {
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: {
        userRoles: {
          include: { role: true },
        },
      },
    });

    if (!targetUser) {
      throw new Error('User not found');
    }

    if (!roleIdsOrNames || roleIdsOrNames.length === 0) {
      throw new Error('At least one role must be assigned to the user');
    }

    // Resolve target roles
    const targetRoles = await prisma.role.findMany({
      where: {
        OR: [{ id: { in: roleIdsOrNames } }, { name: { in: roleIdsOrNames } }],
      },
    });

    if (targetRoles.length === 0) {
      throw new Error('No valid roles found');
    }

    const currentRoleNames = targetUser.userRoles.map((ur) => ur.role.name);
    const hasCurrentSuperAdmin = currentRoleNames.includes('SUPER_ADMIN') || targetUser.role === 'SUPER_ADMIN';
    const willHaveSuperAdmin = targetRoles.some((r) => r.name === 'SUPER_ADMIN');

    // Rule: Cannot demote yourself
    if (actor.id === targetUserId) {
      if (hasCurrentSuperAdmin && !willHaveSuperAdmin) {
        const err: any = new Error('You cannot remove the SUPER_ADMIN role from your own account.');
        err.status = 400;
        throw err;
      }
    }

    // Rule: Cannot remove the last SUPER_ADMIN
    if (hasCurrentSuperAdmin && !willHaveSuperAdmin) {
      const superAdminRole = await prisma.role.findUnique({
        where: { name: 'SUPER_ADMIN' },
        include: { userRoles: true },
      });

      const superAdminUserIds = new Set(superAdminRole?.userRoles.map((ur) => ur.userId) || []);
      // Also check User.role field for any legacy super admins
      const legacySuperAdmins = await prisma.user.findMany({
        where: { role: 'SUPER_ADMIN' },
        select: { id: true },
      });
      for (const lsa of legacySuperAdmins) superAdminUserIds.add(lsa.id);

      if (superAdminUserIds.size <= 1 && superAdminUserIds.has(targetUserId)) {
        const err: any = new Error('Cannot remove the last SUPER_ADMIN from the system.');
        err.status = 400;
        throw err;
      }
    }

    // Update in transaction
    await prisma.$transaction(async (tx) => {
      await tx.userRole.deleteMany({
        where: { userId: targetUserId },
      });

      for (const r of targetRoles) {
        await tx.userRole.create({
          data: {
            userId: targetUserId,
            roleId: r.id,
          },
        });
      }

      // Sync User.role enum if one of the roles matches UserRoleType
      const primaryRole = targetRoles[0];
      const validEnumRoles = [
        'SUPER_ADMIN',
        'ADMINISTRATOR',
        'MANAGER',
        'ACCOUNTANT',
        'CASHIER',
        'BILLING_CASHIER',
        'NETWORK_ENGINEER',
        'TECHNICIAN',
        'FIELD_TECHNICIAN',
        'SUPPORT_AGENT',
        'SALES_STAFF',
        'WAREHOUSE_MANAGER',
        'PROCUREMENT_OFFICER',
        'CUSTOMER',
      ];

      const matchedEnumRole = targetRoles.find((r) => validEnumRoles.includes(r.name));
      if (matchedEnumRole) {
        await tx.user.update({
          where: { id: targetUserId },
          data: { role: matchedEnumRole.name as any },
        });
      }
    });

    this.invalidateCache();

    await AuthService.logAudit(
      'USER_ROLE_UPDATE',
      'User',
      targetUserId,
      `Updated roles for user ${targetUser.username} to [${targetRoles.map((r) => r.name).join(', ')}]`,
      actor.username,
      actor.ip,
      actor.id
    );

    return {
      id: targetUser.id,
      username: targetUser.username,
      roles: targetRoles.map((r) => r.name),
    };
  }
}
