import { prisma } from '../db/store.js';
import { AuthService } from './auth.service.js';
import {
  ALL_REGISTRY_PERMISSIONS,
  ALL_REGISTRY_FEATURES,
  INITIAL_ROLES,
  DEFAULT_ROLE_PERMISSION_KEYS,
  RegistryPermission,
} from '../rbac/registry/index.js';

export interface PermissionItem {
  id?: string;
  key: string;
  group: string;
  label: string;
  description: string;
  sortOrder: number;
}

/**
 * Dynamically generated from the modular registry (single source of truth).
 */
export const PERMISSION_CATALOG: PermissionItem[] = ALL_REGISTRY_PERMISSIONS.map((p) => ({
  key: p.key,
  group: p.group,
  label: p.label,
  description: p.description,
  sortOrder: p.sortOrder,
}));

/**
 * Dynamically generated from dependsOnKey in the modular registry.
 */
export const PERMISSION_DEPENDENCIES: Record<string, string> = Object.fromEntries(
  ALL_REGISTRY_PERMISSIONS.filter((p) => p.dependsOnKey).map((p) => [p.key, p.dependsOnKey!])
);

// Re-export role definitions for backward compatibility
export { INITIAL_ROLES, DEFAULT_ROLE_PERMISSION_KEYS };

// In-Memory Role Permissions Cache (TTL = 30s)
interface CacheEntry {
  permissions: Set<string>;
  timestamp: number;
}
const rolePermissionsCache = new Map<string, CacheEntry>();

interface UserOverrideCacheEntry {
  grants: string[];
  denies: string[];
  timestamp: number;
}
const userOverridesCache = new Map<string, UserOverrideCacheEntry>();

interface FeatureCacheEntry {
  feature: {
    id: string;
    key: string;
    type: string;
    label: string;
    path: string | null;
    icon: string | null;
    parentId: string | null;
    sortOrder: number;
    isActive: boolean;
    locked: boolean;
    permissionMode: 'ANY' | 'ALL';
    permissionKeys: string[];
  };
  timestamp: number;
}
const featureCache = new Map<string, FeatureCacheEntry>();

const CACHE_TTL_MS = 30 * 1000;

export class RbacService {
  /**
   * Invalidate cache for a specific role or all roles
   */
  static invalidateCache(roleIdentifier?: string) {
    if (roleIdentifier) {
      rolePermissionsCache.delete(roleIdentifier);
      userOverridesCache.clear();
    } else {
      rolePermissionsCache.clear();
      userOverridesCache.clear();
      this.invalidateFeatureCache();
    }
  }

  /**
   * Invalidate cached per-user permission overrides
   */
  static invalidateUserCache(userId?: string) {
    if (userId) {
      userOverridesCache.delete(userId);
    } else {
      userOverridesCache.clear();
    }
  }

  /**
   * Invalidate feature cache
   */
  static invalidateFeatureCache(keyOrId?: string) {
    if (keyOrId) {
      featureCache.delete(keyOrId);
    } else {
      featureCache.clear();
    }
  }

  /**
   * Synchronizes code-defined permissions and features into the database.
   * Runs at server startup and seeds.
   * - Upserts permissions and features by key
   * - Updates label, description, sortOrder, path, icon from code
   * - Sets default feature->permission mapping ONLY when the feature is first created
   * - Keys that disappeared from code become isActive = false (never deleted)
   */
  static async syncRegistry() {
    // 1. Sync permissions from registry
    const codePermKeys = new Set(ALL_REGISTRY_PERMISSIONS.map((p) => p.key));

    for (const p of ALL_REGISTRY_PERMISSIONS) {
      await prisma.permission.upsert({
        where: { key: p.key },
        update: {
          group: p.group,
          label: p.label,
          description: p.description,
          sortOrder: p.sortOrder,
          dependsOnKey: p.dependsOnKey || null,
          isActive: true,
        },
        create: {
          key: p.key,
          group: p.group,
          label: p.label,
          description: p.description,
          sortOrder: p.sortOrder,
          dependsOnKey: p.dependsOnKey || null,
          isActive: true,
        },
      });
    }

    // Deactivate missing permissions
    await prisma.permission.updateMany({
      where: {
        key: { notIn: Array.from(codePermKeys) },
        isActive: true,
      },
      data: { isActive: false },
    });

    const allDbPerms = await prisma.permission.findMany();
    const permMap = new Map<string, string>(allDbPerms.map((p) => [p.key, p.id]));

    // 2. Sync features from registry
    const codeFeatureKeys = new Set(ALL_REGISTRY_FEATURES.map((f) => f.key));
    const existingFeatures = await prisma.feature.findMany();
    const existingFeatureMap = new Map(existingFeatures.map((f) => [f.key, f]));

    for (const f of ALL_REGISTRY_FEATURES) {
      const isNew = !existingFeatureMap.has(f.key);
      const feature = await prisma.feature.upsert({
        where: { key: f.key },
        update: {
          type: f.type as any,
          label: f.label,
          path: f.path || null,
          icon: f.icon || null,
          sortOrder: f.sortOrder,
          locked: f.locked ?? false,
          isActive: true,
        },
        create: {
          key: f.key,
          type: f.type as any,
          label: f.label,
          path: f.path || null,
          icon: f.icon || null,
          sortOrder: f.sortOrder,
          locked: f.locked ?? false,
          isActive: true,
          permissionMode: (f.permissionMode || 'ANY') as any,
        },
      });

      // Set default feature->permission mapping ONLY when the feature is first created
      if (isNew && f.defaultPermissions && f.defaultPermissions.length > 0) {
        for (const pKey of f.defaultPermissions) {
          const permId = permMap.get(pKey);
          if (permId) {
            await prisma.featurePermission.upsert({
              where: {
                featureId_permissionId: {
                  featureId: feature.id,
                  permissionId: permId,
                },
              },
              update: {},
              create: {
                featureId: feature.id,
                permissionId: permId,
              },
            });
          }
        }
      }
    }

    // Second pass for parentId
    const allDbFeatures = await prisma.feature.findMany();
    const featureMapByKey = new Map(allDbFeatures.map((f) => [f.key, f.id]));

    for (const f of ALL_REGISTRY_FEATURES) {
      if (f.parentKey) {
        const parentId = featureMapByKey.get(f.parentKey);
        if (parentId) {
          await prisma.feature.update({
            where: { key: f.key },
            data: { parentId },
          });
        }
      }
    }

    // Deactivate missing features
    await prisma.feature.updateMany({
      where: {
        key: { notIn: Array.from(codeFeatureKeys) },
        isActive: true,
      },
      data: { isActive: false },
    });

    this.invalidateCache();
    this.invalidateFeatureCache();
  }

  /**
   * Idempotently seeds all permissions, default roles, role-permissions,
   * and links existing users to their respective roles in UserRole table.
   *
   * Crucial rule: seedRbac must NOT re-grant defaults on every run.
   * Grant DEFAULT_ROLE_PERMISSION_KEYS only when the Role (or Permission) row
   * is newly created. Never re-add a grant an admin removed.
   */
  static async seedRbac() {
    await this.syncRegistry();
    // Check existing roles and permissions prior to upsert
    const [existingRoles, existingPermissions] = await Promise.all([
      prisma.role.findMany({ select: { name: true } }),
      prisma.permission.findMany({ select: { key: true } }),
    ]);
    const existingRoleNames = new Set(existingRoles.map((r) => r.name));
    const existingPermKeys = new Set(existingPermissions.map((p) => p.key));

    const allDbPerms = await prisma.permission.findMany();
    const permMap = new Map<string, string>(allDbPerms.map((p) => [p.key, p.id]));

    // 2. Upsert Roles and assign default permissions only when newly created
    for (const r of INITIAL_ROLES) {
      const isNewRole = !existingRoleNames.has(r.name);
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
      if (r.name === 'SUPER_ADMIN') {
        // SUPER_ADMIN always has all permissions
        for (const p of allDbPerms) {
          await prisma.rolePermission.upsert({
            where: {
              roleId_permissionId: {
                roleId: role.id,
                permissionId: p.id,
              },
            },
            update: {},
            create: {
              roleId: role.id,
              permissionId: p.id,
            },
          });
        }
      } else if (isNewRole) {
        // Only grant defaults if role is newly created
        const defaultKeys = DEFAULT_ROLE_PERMISSION_KEYS[r.name] || [];
        for (const key of defaultKeys) {
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
      } else {
        // Role already existed: ONLY grant permissions that are newly added to the catalog
        // Never re-add a grant an admin removed!
        const defaultKeys = DEFAULT_ROLE_PERMISSION_KEYS[r.name] || [];
        for (const key of defaultKeys) {
          if (!existingPermKeys.has(key)) {
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
   * Check if role has a permission.
   * Strictly checks database permissions without legacy fallback or aliasing.
   */
  static async checkPermission(roleIdOrName: string, requiredPermission: string): Promise<boolean> {
    if (roleIdOrName === 'SUPER_ADMIN') return true;

    const perms = await this.getRolePermissions(roleIdOrName);
    if (perms.has('*') || perms.has(requiredPermission)) return true;

    return false;
  }

  /**
   * Load per-user GRANT / DENY permission overrides (30s TTL cache)
   */
  static async getUserPermissionOverrides(userId: string): Promise<{ grants: string[]; denies: string[] }> {
    const cached = userOverridesCache.get(userId);
    const now = Date.now();
    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      return { grants: [...cached.grants], denies: [...cached.denies] };
    }

    const rows = await prisma.userPermission.findMany({
      where: { userId },
      include: { permission: { select: { key: true, isActive: true } } },
    });

    const grants: string[] = [];
    const denies: string[] = [];
    for (const row of rows) {
      if (!row.permission.isActive) continue;
      if (row.effect === 'DENY') {
        denies.push(row.permission.key);
      } else {
        grants.push(row.permission.key);
      }
    }

    userOverridesCache.set(userId, { grants, denies, timestamp: now });
    return { grants: [...grants], denies: [...denies] };
  }

  /**
   * Get user's effective permissions: (role union ∪ user GRANTs) \ user DENYs.
   */
  static async getUserEffectivePermissions(userId: string, roleIdsOrNames: string[]): Promise<Set<string>> {
    const effective = new Set<string>();

    if (roleIdsOrNames.includes('SUPER_ADMIN')) {
      effective.add('*');
      for (const p of PERMISSION_CATALOG) effective.add(p.key);
      return effective;
    }

    for (const roleIdentifier of roleIdsOrNames) {
      const perms = await this.getRolePermissions(roleIdentifier);
      if (perms.has('*')) {
        effective.add('*');
        for (const p of PERMISSION_CATALOG) effective.add(p.key);
        return effective;
      }
      for (const p of perms) {
        effective.add(p);
      }
    }

    const { grants, denies } = await this.getUserPermissionOverrides(userId);
    for (const g of grants) {
      effective.add(g);
    }
    for (const d of denies) {
      effective.delete(d);
    }

    return effective;
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

    const newRole = await prisma.$transaction(async (tx) => {
      const created = await tx.role.create({
        data: {
          name: trimmedName,
          description: data.description?.trim() || null,
          isSystem: false,
        },
      });

      // If copying from an existing role
      if (data.copyFromRoleId) {
        const sourceRole = await tx.role.findUnique({
          where: { id: data.copyFromRoleId },
          include: { permissions: true },
        });

        if (sourceRole) {
          if (sourceRole.name === 'SUPER_ADMIN') {
            const allPerms = await tx.permission.findMany();
            await tx.rolePermission.createMany({
              data: allPerms.map((p) => ({
                roleId: created.id,
                permissionId: p.id,
              })),
            });
          } else {
            await tx.rolePermission.createMany({
              data: sourceRole.permissions.map((sp) => ({
                roleId: created.id,
                permissionId: sp.permissionId,
              })),
            });
          }
        }
      }

      return created;
    });

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

    const allDbPerms = await prisma.permission.findMany();
    const validPermMap = new Map(allDbPerms.map((p) => [p.key, p]));

    const bodyAdd = body.add || [];
    const bodyRemove = body.remove || [];

    // Reject unknown permission keys with 400
    for (const k of [...bodyAdd, ...bodyRemove]) {
      if (!validPermMap.has(k)) {
        const err: any = new Error(`Unknown permission key: "${k}"`);
        err.status = 400;
        throw err;
      }
    }

    // OCC Check: 409 if role changed since loaded (exact comparison)
    if (body.expectedUpdatedAt) {
      const expectedTime = new Date(body.expectedUpdatedAt).getTime();
      const actualTime = role.updatedAt.getTime();
      if (actualTime !== expectedTime) {
        const err: any = new Error('Role was modified by another user. Please reload the latest permissions.');
        err.status = 409;
        err.code = 'STALE_UPDATE';
        throw err;
      }
    }

    const toAdd = new Set(bodyAdd);
    const toRemove = new Set(bodyRemove);

    const currentKeys = new Set(role.permissions.map((rp) => rp.permission.key));
    const targetKeys = new Set(currentKeys);

    for (const k of toAdd) targetKeys.add(k);
    for (const k of toRemove) targetKeys.delete(k);

    // Rule: Dependency check - create/edit/delete on a resource require its view permission
    for (const key of targetKeys) {
      const permRecord = validPermMap.get(key) as any;
      const requiredView = permRecord?.dependsOnKey || PERMISSION_DEPENDENCIES[key];
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

    const newRole = await prisma.$transaction(async (tx) => {
      const created = await tx.role.create({
        data: {
          name: copyName,
          description: `Duplicated from ${sourceRole.name}. ${sourceRole.description || ''}`.trim(),
          isSystem: false,
        },
      });

      // Copy permissions
      let permIds: string[];
      if (sourceRole.name === 'SUPER_ADMIN') {
        const allDbPerms = await tx.permission.findMany();
        permIds = allDbPerms.map((p) => p.id);
      } else {
        permIds = sourceRole.permissions.map((rp) => rp.permissionId);
      }

      if (permIds.length > 0) {
        await tx.rolePermission.createMany({
          data: permIds.map((pid) => ({
            roleId: created.id,
            permissionId: pid,
          })),
        });
      }

      return created;
    });

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
   * GET /users - Paginated, sorted, searchable, filterable users list
   */
  static async listUsers(params: {
    page?: number;
    pageSize?: number;
    search?: string;
    roles?: string[];
    status?: string[];
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
  } = {}) {
    const page = Math.max(1, Number(params.page) || 1);
    const pageSize = Math.min(200, Math.max(1, Number(params.pageSize) || 10));
    const search = (params.search || '').trim().normalize('NFC');
    const roleFilters = (params.roles || []).map((r) => r.trim()).filter(Boolean);
    const statusFilters = (params.status || []).map((s) => s.trim().toLowerCase()).filter(Boolean);
    const sortDir: 'asc' | 'desc' = params.sortDir === 'desc' ? 'desc' : 'asc';
    const sortBy = (params.sortBy || 'createdAt').trim();

    const andConditions: any[] = [];

    if (search) {
      andConditions.push({
        OR: [
          { fullName: { contains: search, mode: 'insensitive' } },
          { username: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    if (roleFilters.length > 0) {
      const validEnums = [
        'SUPER_ADMIN', 'ADMINISTRATOR', 'MANAGER', 'ACCOUNTANT', 'CASHIER',
        'BILLING_CASHIER', 'NETWORK_ENGINEER', 'TECHNICIAN', 'FIELD_TECHNICIAN',
        'SUPPORT_AGENT', 'SALES_STAFF', 'WAREHOUSE_MANAGER', 'PROCUREMENT_OFFICER', 'CUSTOMER',
      ];
      const matchedEnums = roleFilters.filter((r) => validEnums.includes(r));
      andConditions.push({
        OR: [
          {
            userRoles: {
              some: {
                role: {
                  OR: [{ name: { in: roleFilters } }, { id: { in: roleFilters } }],
                },
              },
            },
          },
          ...(matchedEnums.length > 0
            ? [{ AND: [{ userRoles: { none: {} } }, { role: { in: matchedEnums as any } }] }]
            : []),
        ],
      });
    }

    if (statusFilters.length > 0) {
      const wantsActive = statusFilters.some((s) => s === 'active' || s === 'true' || s === 'enabled');
      const wantsDisabled = statusFilters.some((s) => s === 'disabled' || s === 'inactive' || s === 'false');
      if (wantsActive && !wantsDisabled) {
        andConditions.push({ isActive: true });
      } else if (wantsDisabled && !wantsActive) {
        andConditions.push({ isActive: false });
      }
    }

    const where = andConditions.length > 0 ? { AND: andConditions } : {};

    let orderBy: any = { createdAt: 'asc' };
    switch (sortBy) {
      case 'fullName':
      case 'user':
        orderBy = { fullName: sortDir };
        break;
      case 'username':
        orderBy = { username: sortDir };
        break;
      case 'email':
        orderBy = { email: sortDir };
        break;
      case 'status':
      case 'isActive':
        orderBy = { isActive: sortDir };
        break;
      case 'roles':
      case 'role':
        orderBy = { role: sortDir };
        break;
      case 'lastLoginAt':
        orderBy = { lastLoginAt: { sort: sortDir, nulls: 'last' } };
        break;
      case 'createdAt':
        orderBy = { createdAt: sortDir };
        break;
      default:
        orderBy = { createdAt: sortDir };
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy,
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
          userPermissions: {
            include: {
              permission: {
                select: { key: true, isActive: true },
              },
            },
          },
          _count: {
            select: { auditLogs: true },
          },
        },
      }),
    ]);

    const items = users.map((u) => {
      const assignedRoles = u.userRoles.map((ur) => ur.role.name);
      const primaryRole = assignedRoles[0] || u.role;
      const grants = u.userPermissions
        .filter((up) => up.permission.isActive && up.effect === 'GRANT')
        .map((up) => up.permission.key);
      const denies = u.userPermissions
        .filter((up) => up.permission.isActive && up.effect === 'DENY')
        .map((up) => up.permission.key);
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
        grants,
        denies,
        grantCount: grants.length,
        denyCount: denies.length,
        isActive: u.isActive,
        hasAuditHistory: u._count.auditLogs > 0,
        lastLoginAt: u.lastLoginAt?.toISOString() || null,
        createdAt: u.createdAt.toISOString(),
        updatedAt: u.updatedAt.toISOString(),
      };
    });

    return { items, total };
  }

  /**
   * Backward-compatible wrapper returning all users array
   */
  static async listUsersWithRoles() {
    const { items } = await this.listUsers({ page: 1, pageSize: 200 });
    return items;
  }

  /**
   * Helper: find distinct user IDs currently holding SUPER_ADMIN (optionally only active accounts)
   */
  private static async getSuperAdminUserIds(activeOnly: boolean = false): Promise<Set<string>> {
    const superAdminRole = await prisma.role.findUnique({
      where: { name: 'SUPER_ADMIN' },
      include: {
        userRoles: {
          include: {
            user: { select: { id: true, isActive: true } },
          },
        },
      },
    });

    const ids = new Set<string>();
    for (const ur of superAdminRole?.userRoles || []) {
      if (!activeOnly || ur.user.isActive) {
        ids.add(ur.userId);
      }
    }

    const legacySuperAdmins = await prisma.user.findMany({
      where: {
        role: 'SUPER_ADMIN',
        userRoles: { none: {} },
        ...(activeOnly ? { isActive: true } : {}),
      },
      select: { id: true },
    });
    for (const lsa of legacySuperAdmins) ids.add(lsa.id);

    return ids;
  }

  /**
   * PATCH /users/:id - Update profile, roles, and/or active status
   */
  static async updateUser(
    targetUserId: string,
    data: {
      fullName?: string;
      email?: string;
      phone?: string | null;
      roles?: string[];
      isActive?: boolean;
    },
    actor: { id: string; username: string; role?: string; roles?: string[]; ip: string }
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
      const err: any = new Error('User not found');
      err.status = 404;
      throw err;
    }

    const actorIsSuperAdmin =
      actor.role === 'SUPER_ADMIN' || Boolean(actor.roles?.includes('SUPER_ADMIN'));

    const currentRoles = targetUser.userRoles.map((ur) => ur.role.name);
    const effectiveCurrentRoles = currentRoles.length > 0 ? currentRoles : [targetUser.role];
    const hasCurrentSuperAdmin =
      effectiveCurrentRoles.includes('SUPER_ADMIN') || targetUser.role === 'SUPER_ADMIN';

    const updateFields: {
      fullName?: string;
      email?: string;
      phone?: string | null;
      isActive?: boolean;
      role?: any;
    } = {};
    const profileBefore: Record<string, any> = {};
    const profileAfter: Record<string, any> = {};

    if (data.fullName !== undefined) {
      const trimmed = String(data.fullName).trim().normalize('NFC');
      if (!trimmed) {
        const err: any = new Error('Full name cannot be empty');
        err.status = 400;
        throw err;
      }
      if (trimmed !== targetUser.fullName) {
        updateFields.fullName = trimmed;
        profileBefore.fullName = targetUser.fullName;
        profileAfter.fullName = trimmed;
      }
    }

    if (data.email !== undefined) {
      const trimmedEmail = String(data.email).trim();
      if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        const err: any = new Error('Please provide a valid email address');
        err.status = 400;
        throw err;
      }
      if (trimmedEmail.toLowerCase() !== targetUser.email.toLowerCase()) {
        const duplicateEmail = await prisma.user.findFirst({
          where: {
            email: { equals: trimmedEmail, mode: 'insensitive' },
            id: { not: targetUserId },
          },
        });
        if (duplicateEmail) {
          const err: any = new Error('Email address is already in use by another account.');
          err.status = 409;
          throw err;
        }
        updateFields.email = trimmedEmail;
        profileBefore.email = targetUser.email;
        profileAfter.email = trimmedEmail;
      }
    }

    if (data.phone !== undefined) {
      const normalizedPhone = data.phone === null ? null : String(data.phone).trim() || null;
      if (normalizedPhone !== (targetUser.phone || null)) {
        updateFields.phone = normalizedPhone;
        profileBefore.phone = targetUser.phone || null;
        profileAfter.phone = normalizedPhone;
      }
    }

    let resolvedRoles: { id: string; name: string }[] | null = null;
    let rolesChanged = false;
    if (data.roles !== undefined) {
      if (!Array.isArray(data.roles) || data.roles.length === 0) {
        const err: any = new Error('At least one role must be assigned to the user');
        err.status = 400;
        throw err;
      }
      const roleInputs = Array.from(new Set(data.roles.map((r) => String(r).trim()).filter(Boolean)));
      const foundRoles = await prisma.role.findMany({
        where: {
          OR: [{ id: { in: roleInputs } }, { name: { in: roleInputs } }],
        },
        select: { id: true, name: true },
      });
      if (foundRoles.length === 0) {
        const err: any = new Error('No valid roles found');
        err.status = 400;
        throw err;
      }

      const willHaveSuperAdmin = foundRoles.some((r) => r.name === 'SUPER_ADMIN');
      if (!actorIsSuperAdmin && hasCurrentSuperAdmin !== willHaveSuperAdmin) {
        const err: any = new Error('Only SUPER_ADMIN can assign or remove the SUPER_ADMIN role.');
        err.status = 403;
        throw err;
      }

      if (actor.id === targetUserId && hasCurrentSuperAdmin && !willHaveSuperAdmin) {
        const err: any = new Error('You cannot remove the SUPER_ADMIN role from your own account.');
        err.status = 400;
        throw err;
      }

      if (hasCurrentSuperAdmin && !willHaveSuperAdmin) {
        const superAdminIds = await this.getSuperAdminUserIds(false);
        if (superAdminIds.size <= 1 && superAdminIds.has(targetUserId)) {
          const err: any = new Error('Cannot remove the last SUPER_ADMIN from the system.');
          err.status = 409;
          throw err;
        }
      }

      const prevSorted = [...effectiveCurrentRoles].sort().join(',');
      const nextSorted = [...foundRoles.map((r) => r.name)].sort().join(',');
      if (prevSorted !== nextSorted) {
        rolesChanged = true;
        resolvedRoles = foundRoles;
        const validEnumRoles = [
          'SUPER_ADMIN', 'ADMINISTRATOR', 'MANAGER', 'ACCOUNTANT', 'CASHIER',
          'BILLING_CASHIER', 'NETWORK_ENGINEER', 'TECHNICIAN', 'FIELD_TECHNICIAN',
          'SUPPORT_AGENT', 'SALES_STAFF', 'WAREHOUSE_MANAGER', 'PROCUREMENT_OFFICER', 'CUSTOMER',
        ];
        const matchedEnumRole = foundRoles.find((r) => validEnumRoles.includes(r.name));
        if (matchedEnumRole) {
          updateFields.role = matchedEnumRole.name as any;
        }
      }
    }

    let statusChanged = false;
    if (data.isActive !== undefined) {
      const nextActive = Boolean(data.isActive);
      if (nextActive !== targetUser.isActive) {
        if (!nextActive) {
          if (actor.id === targetUserId) {
            const err: any = new Error('You cannot deactivate your own account.');
            err.status = 400;
            throw err;
          }
          if (!actorIsSuperAdmin && hasCurrentSuperAdmin) {
            const err: any = new Error('Only SUPER_ADMIN can deactivate a SUPER_ADMIN account.');
            err.status = 403;
            throw err;
          }
          if (hasCurrentSuperAdmin) {
            const activeSuperAdmins = await this.getSuperAdminUserIds(true);
            if (activeSuperAdmins.size <= 1 && activeSuperAdmins.has(targetUserId)) {
              const err: any = new Error('Cannot deactivate the last active SUPER_ADMIN account.');
              err.status = 409;
              throw err;
            }
          }
        }
        statusChanged = true;
        updateFields.isActive = nextActive;
      }
    }

    const shouldRevokeSessions = rolesChanged || (statusChanged && updateFields.isActive === false);

    await prisma.$transaction(async (tx) => {
      if (Object.keys(updateFields).length > 0) {
        await tx.user.update({
          where: { id: targetUserId },
          data: updateFields,
        });
      }

      if (rolesChanged && resolvedRoles) {
        await tx.userRole.deleteMany({ where: { userId: targetUserId } });
        for (const r of resolvedRoles) {
          await tx.userRole.create({
            data: { userId: targetUserId, roleId: r.id },
          });
        }
      }

      if (shouldRevokeSessions) {
        await tx.session.updateMany({
          where: { userId: targetUserId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
    });

    this.invalidateCache();
    this.invalidateUserCache(targetUserId);

    const targetSummary = {
      id: targetUser.id,
      username: targetUser.username,
      email: updateFields.email || targetUser.email,
    };

    if (Object.keys(profileAfter).length > 0) {
      await AuthService.logAudit(
        'USER_UPDATE',
        'User',
        targetUserId,
        JSON.stringify({
          actor: actor.username,
          target: targetSummary,
          before: profileBefore,
          after: profileAfter,
        }),
        actor.username,
        actor.ip,
        actor.id
      );
    }

    if (rolesChanged && resolvedRoles) {
      await AuthService.logAudit(
        'USER_ROLE_UPDATE',
        'User',
        targetUserId,
        JSON.stringify({
          actor: actor.username,
          target: targetSummary,
          before: { roles: effectiveCurrentRoles },
          after: { roles: resolvedRoles.map((r) => r.name) },
        }),
        actor.username,
        actor.ip,
        actor.id
      );
    }

    if (statusChanged) {
      await AuthService.logAudit(
        updateFields.isActive ? 'USER_ACTIVATE' : 'USER_DEACTIVATE',
        'User',
        targetUserId,
        JSON.stringify({
          actor: actor.username,
          target: targetSummary,
          before: { isActive: targetUser.isActive },
          after: { isActive: updateFields.isActive },
        }),
        actor.username,
        actor.ip,
        actor.id
      );
    }

    const updatedList = await this.listUsers({ page: 1, pageSize: 1, search: targetSummary.username });
    const updatedUser = updatedList.items.find((u) => u.id === targetUserId);
    if (updatedUser) return updatedUser;

    const refreshed = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: { userRoles: { include: { role: true } } },
    });
    const refreshedRoles = refreshed!.userRoles.map((ur) => ur.role.name);
    return {
      id: refreshed!.id,
      username: refreshed!.username,
      email: refreshed!.email,
      fullName: refreshed!.fullName,
      phone: refreshed!.phone,
      role: refreshedRoles[0] || refreshed!.role,
      roles: refreshedRoles.length > 0 ? refreshedRoles : [refreshed!.role],
      roleIds: refreshed!.userRoles.map((ur) => ur.role.id),
      isActive: refreshed!.isActive,
      lastLoginAt: refreshed!.lastLoginAt?.toISOString() || null,
      createdAt: refreshed!.createdAt.toISOString(),
      updatedAt: refreshed!.updatedAt.toISOString(),
    };
  }

  /**
   * DELETE /users/:id - Hard-delete if no audit history; soft-delete (isActive=false) otherwise
   */
  static async deleteUser(
    targetUserId: string,
    actor: { id: string; username: string; role?: string; roles?: string[]; ip: string }
  ) {
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: {
        userRoles: { include: { role: true } },
      },
    });

    if (!targetUser) {
      const err: any = new Error('User not found');
      err.status = 404;
      throw err;
    }

    if (actor.id === targetUserId) {
      const err: any = new Error('You cannot delete your own account.');
      err.status = 400;
      throw err;
    }

    const currentRoles = targetUser.userRoles.map((ur) => ur.role.name);
    const effectiveRoles = currentRoles.length > 0 ? currentRoles : [targetUser.role];
    const targetIsSuperAdmin =
      effectiveRoles.includes('SUPER_ADMIN') || targetUser.role === 'SUPER_ADMIN';
    const actorIsSuperAdmin =
      actor.role === 'SUPER_ADMIN' || Boolean(actor.roles?.includes('SUPER_ADMIN'));

    if (!actorIsSuperAdmin && targetIsSuperAdmin) {
      const err: any = new Error('Only SUPER_ADMIN can delete a SUPER_ADMIN account.');
      err.status = 403;
      throw err;
    }

    if (targetIsSuperAdmin) {
      const allSuperAdmins = await this.getSuperAdminUserIds(false);
      const activeSuperAdmins = await this.getSuperAdminUserIds(true);
      if (
        (allSuperAdmins.size <= 1 && allSuperAdmins.has(targetUserId)) ||
        (targetUser.isActive && activeSuperAdmins.size <= 1 && activeSuperAdmins.has(targetUserId))
      ) {
        const err: any = new Error('Cannot delete the last SUPER_ADMIN account.');
        err.status = 409;
        throw err;
      }
    }

    const auditHistoryCount = await prisma.auditLog.count({
      where: {
        OR: [
          { userId: targetUserId },
          { userEmail: targetUser.username },
          { userEmail: targetUser.email },
        ],
      },
    });

    const targetSummary = {
      id: targetUser.id,
      username: targetUser.username,
      email: targetUser.email,
    };

    if (auditHistoryCount > 0) {
      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: targetUserId },
          data: { isActive: false },
        });
        await tx.session.updateMany({
          where: { userId: targetUserId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      });

      this.invalidateCache();
      this.invalidateUserCache(targetUserId);

      await AuthService.logAudit(
        'USER_DELETE',
        'User',
        targetUserId,
        JSON.stringify({
          actor: actor.username,
          target: targetSummary,
          softDeleted: true,
          before: { isActive: targetUser.isActive },
          after: { isActive: false },
        }),
        actor.username,
        actor.ip,
        actor.id
      );

      return {
        success: true,
        softDeleted: true,
        message: `User "${targetUser.fullName}" has audit history and was deactivated instead of permanently deleted.`,
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.session.updateMany({
        where: { userId: targetUserId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await tx.user.delete({ where: { id: targetUserId } });
    });

    this.invalidateCache();
    this.invalidateUserCache(targetUserId);

    await AuthService.logAudit(
      'USER_DELETE',
      'User',
      targetUserId,
      JSON.stringify({
        actor: actor.username,
        target: targetSummary,
        softDeleted: false,
        before: {
          fullName: targetUser.fullName,
          username: targetUser.username,
          email: targetUser.email,
          roles: effectiveRoles,
          isActive: targetUser.isActive,
        },
        after: null,
      }),
      actor.username,
      actor.ip,
      actor.id
    );

    return {
      success: true,
      softDeleted: false,
      message: `User "${targetUser.fullName}" deleted permanently.`,
    };
  }

  /**
   * GET /users/:id/logs - Paginated user audit log events with optional date range
   */
  static async getUserAuditLogs(
    targetUserId: string,
    params: { page?: number; pageSize?: number; from?: string; to?: string } = {}
  ) {
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, username: true, email: true },
    });

    if (!targetUser) {
      const err: any = new Error('User not found');
      err.status = 404;
      throw err;
    }

    const page = Math.max(1, Number(params.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(params.pageSize) || 20));

    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (params.from) {
      const fromStr = params.from.trim();
      const parsedFrom = /^\d{4}-\d{2}-\d{2}$/.test(fromStr)
        ? new Date(`${fromStr}T00:00:00.000Z`)
        : new Date(fromStr);
      if (!isNaN(parsedFrom.getTime())) {
        dateFilter.gte = parsedFrom;
      }
    }
    if (params.to) {
      const toStr = params.to.trim();
      const parsedTo = /^\d{4}-\d{2}-\d{2}$/.test(toStr)
        ? new Date(`${toStr}T23:59:59.999Z`)
        : new Date(toStr);
      if (!isNaN(parsedTo.getTime())) {
        dateFilter.lte = parsedTo;
      }
    }

    const where: any = {
      AND: [
        {
          OR: [
            { userId: targetUser.id },
            { userEmail: targetUser.username },
            { userEmail: targetUser.email },
            { AND: [{ resource: 'User' }, { resourceId: targetUser.id }] },
          ],
        },
        ...(Object.keys(dateFilter).length > 0 ? [{ createdAt: dateFilter }] : []),
      ],
    };

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      items: logs.map((log) => ({
        id: log.id,
        action: log.action,
        resource: log.resource,
        resourceId: log.resourceId,
        details: log.details,
        actor: log.userEmail || 'system',
        ip: log.ipAddress || log.ip || '127.0.0.1',
        ipAddress: log.ipAddress || log.ip || '127.0.0.1',
        time: log.createdAt.toISOString(),
        timestamp: log.createdAt.toISOString(),
        createdAt: log.createdAt.toISOString(),
      })),
      total,
    };
  }

  /**
   * PATCH /users/:id/roles - Update user's roles
   */
  static async updateUserRoles(
    targetUserId: string,
    roleIdsOrNames: string[],
    actor: { id: string; username: string; role?: string; roles?: string[]; ip: string }
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
    const actorIsSuperAdmin =
      !actor.role && !actor.roles
        ? true
        : actor.role === 'SUPER_ADMIN' || Boolean(actor.roles?.includes('SUPER_ADMIN'));

    if (!actorIsSuperAdmin && hasCurrentSuperAdmin !== willHaveSuperAdmin) {
      const err: any = new Error('Only SUPER_ADMIN can assign or remove the SUPER_ADMIN role.');
      err.status = 403;
      throw err;
    }

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

    // Update in transaction and revoke existing sessions so role changes take effect on next refresh
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

      await tx.session.updateMany({
        where: { userId: targetUserId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });

    this.invalidateCache();

    await AuthService.logAudit(
      'USER_ROLE_UPDATE',
      'User',
      targetUserId,
      JSON.stringify({
        actor: actor.username,
        target: { id: targetUser.id, username: targetUser.username, email: targetUser.email },
        before: { roles: currentRoleNames.length > 0 ? currentRoleNames : [targetUser.role] },
        after: { roles: targetRoles.map((r) => r.name) },
      }),
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

  /**
   * GET /users/:id/permissions - Returns role baseline permissions, per-user GRANT/DENY overrides, and effective permissions
   */
  static async getUserPermissionsDetail(targetUserId: string) {
    const [targetUser, permissions] = await Promise.all([
      prisma.user.findUnique({
        where: { id: targetUserId },
        select: {
          id: true,
          username: true,
          fullName: true,
          email: true,
          role: true,
          userRoles: {
            include: {
              role: { select: { id: true, name: true } },
            },
          },
          userPermissions: {
            include: {
              permission: { select: { key: true, isActive: true } },
            },
          },
        },
      }),
      prisma.permission.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { key: 'asc' }],
      }),
    ]);

    if (!targetUser) {
      const err: any = new Error('User not found');
      err.status = 404;
      throw err;
    }

    const roleNames = targetUser.userRoles.map((ur) => ur.role.name);
    const roleIds = targetUser.userRoles.map((ur) => ur.role.id);
    const effectiveRoles = roleNames.length > 0 ? roleNames : [targetUser.role];
    const isSuperAdmin = effectiveRoles.includes('SUPER_ADMIN') || targetUser.role === 'SUPER_ADMIN';

    const rolePermSet = new Set<string>();
    if (isSuperAdmin) {
      for (const p of permissions) rolePermSet.add(p.key);
    } else {
      const identifiers = roleIds.length > 0 ? roleIds : effectiveRoles;
      for (const roleIdentifier of identifiers) {
        const perms = await this.getRolePermissions(roleIdentifier);
        if (perms.has('*')) {
          for (const p of permissions) rolePermSet.add(p.key);
          break;
        }
        for (const key of perms) rolePermSet.add(key);
      }
    }

    const grants = targetUser.userPermissions
      .filter((up) => up.permission.isActive && up.effect === 'GRANT')
      .map((up) => up.permission.key);
    const denies = targetUser.userPermissions
      .filter((up) => up.permission.isActive && up.effect === 'DENY')
      .map((up) => up.permission.key);

    const effectiveSet = new Set<string>(rolePermSet);
    if (!isSuperAdmin) {
      for (const g of grants) effectiveSet.add(g);
      for (const d of denies) effectiveSet.delete(d);
    }

    return {
      user: {
        id: targetUser.id,
        username: targetUser.username,
        fullName: targetUser.fullName,
        email: targetUser.email,
        role: effectiveRoles[0] || targetUser.role,
        roles: effectiveRoles,
        roleIds,
        isSuperAdmin,
      },
      permissions: permissions.map((p) => ({
        id: p.id,
        key: p.key,
        group: p.group,
        label: p.label,
        description: p.description,
        sortOrder: p.sortOrder,
      })),
      rolePermissions: Array.from(rolePermSet),
      grants,
      denies,
      effectivePermissions: Array.from(effectiveSet),
    };
  }

  /**
   * PUT /users/:id/permissions - Replace per-user GRANT/DENY permission overrides
   */
  static async updateUserPermissions(
    targetUserId: string,
    body: { grants?: string[]; denies?: string[] },
    actor: { id: string; username: string; ip: string }
  ) {
    const grants = Array.from(new Set((body.grants || []).filter(Boolean)));
    const denies = Array.from(new Set((body.denies || []).filter(Boolean)));

    const grantSet = new Set(grants);
    const conflicts = denies.filter((k) => grantSet.has(k));
    if (conflicts.length > 0) {
      const err: any = new Error(`Permissions cannot be both granted and denied: ${conflicts.join(', ')}`);
      err.status = 400;
      throw err;
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: {
        userRoles: { include: { role: true } },
        userPermissions: { include: { permission: true } },
      },
    });

    if (!targetUser) {
      const err: any = new Error('User not found');
      err.status = 404;
      throw err;
    }

    const isSuperAdmin =
      targetUser.role === 'SUPER_ADMIN' ||
      targetUser.userRoles.some((ur) => ur.role.name === 'SUPER_ADMIN');
    if (isSuperAdmin && (grants.length > 0 || denies.length > 0)) {
      const err: any = new Error('SUPER_ADMIN users always retain full system permissions and cannot use per-user overrides.');
      err.status = 400;
      throw err;
    }

    if (actor.id === targetUserId && denies.includes('roles.manage')) {
      const err: any = new Error('You cannot deny roles.manage on your own account.');
      err.status = 400;
      throw err;
    }

    const allKeys = [...grants, ...denies];
    const dbPerms = allKeys.length > 0
      ? await prisma.permission.findMany({ where: { key: { in: allKeys } } })
      : [];
    const permIdByKey = new Map(dbPerms.map((p) => [p.key, p.id]));
    const unknownKeys = allKeys.filter((k) => !permIdByKey.has(k));
    if (unknownKeys.length > 0) {
      const err: any = new Error(`Unknown permission key(s): ${unknownKeys.join(', ')}`);
      err.status = 400;
      throw err;
    }

    const before = {
      grants: targetUser.userPermissions.filter((up) => up.effect === 'GRANT').map((up) => up.permission.key),
      denies: targetUser.userPermissions.filter((up) => up.effect === 'DENY').map((up) => up.permission.key),
    };

    await prisma.$transaction(async (tx) => {
      await tx.userPermission.deleteMany({
        where: { userId: targetUserId },
      });

      const rowsToInsert = [
        ...grants.map((key) => ({
          userId: targetUserId,
          permissionId: permIdByKey.get(key)!,
          effect: 'GRANT' as const,
        })),
        ...denies.map((key) => ({
          userId: targetUserId,
          permissionId: permIdByKey.get(key)!,
          effect: 'DENY' as const,
        })),
      ];

      if (rowsToInsert.length > 0) {
        await tx.userPermission.createMany({ data: rowsToInsert });
      }
    });

    this.invalidateUserCache(targetUserId);

    await AuthService.logAudit(
      'USER_PERMISSION_UPDATE',
      'User',
      targetUserId,
      JSON.stringify({
        username: targetUser.username,
        before,
        after: { grants, denies },
      }),
      actor.username,
      actor.ip,
      actor.id
    );

    return await this.getUserPermissionsDetail(targetUserId);
  }

  /**
   * Get single feature with mapped permissions (30s cache)
   */
  static async getFeature(keyOrId: string) {
    const cached = featureCache.get(keyOrId);
    const now = Date.now();
    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      return cached.feature;
    }

    const feature = await prisma.feature.findFirst({
      where: {
        OR: [{ id: keyOrId }, { key: keyOrId }],
      },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });

    if (!feature) return null;

    const formatted = {
      id: feature.id,
      key: feature.key,
      type: feature.type,
      label: feature.label,
      path: feature.path,
      icon: feature.icon,
      parentId: feature.parentId,
      sortOrder: feature.sortOrder,
      isActive: feature.isActive,
      locked: feature.locked,
      permissionMode: feature.permissionMode as 'ANY' | 'ALL',
      permissionKeys: feature.permissions.map((fp) => fp.permission.key),
    };

    featureCache.set(feature.id, { feature: formatted, timestamp: now });
    featureCache.set(feature.key, { feature: formatted, timestamp: now });

    return formatted;
  }

  /**
   * Get navigation menu tree visible to a user given their effective permissions
   */
  static async getNavigationTree(userEffectivePerms: Set<string> | string[]) {
    const permSet = userEffectivePerms instanceof Set ? userEffectivePerms : new Set(userEffectivePerms);
    const features = await prisma.feature.findMany({
      where: {
        isActive: true,
        type: { in: ['MENU', 'PAGE'] },
      },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    });

    const isAllowed = (f: typeof features[0]) => {
      const permKeys = f.permissions.map((fp) => fp.permission.key);
      if (permKeys.length === 0) return true; // zero permissions = visible to any authenticated user
      if (permSet.has('*')) return true;
      if (f.permissionMode === 'ALL') {
        return permKeys.every((k) => permSet.has(k));
      }
      return permKeys.some((k) => permSet.has(k));
    };

    const allowedFeatures = features.filter(isAllowed);
    const allowedMap = new Map(allowedFeatures.map((f) => [f.id, f]));

    // Build hierarchy
    const rootItems: any[] = [];
    const childrenByParent = new Map<string, any[]>();

    for (const f of allowedFeatures) {
      const item = {
        id: f.id,
        key: f.key,
        type: f.type,
        label: f.label,
        path: f.path,
        icon: f.icon,
        sortOrder: f.sortOrder,
        children: [] as any[],
      };

      if (!f.parentId || !allowedMap.has(f.parentId)) {
        rootItems.push(item);
      } else {
        if (!childrenByParent.has(f.parentId)) {
          childrenByParent.set(f.parentId, []);
        }
        childrenByParent.get(f.parentId)!.push(item);
      }
    }

    for (const root of rootItems) {
      if (childrenByParent.has(root.id)) {
        root.children = childrenByParent.get(root.id)!.sort((a, b: any) => a.sortOrder - b.sortOrder);
      }
    }

    return rootItems.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  /**
   * Get all allowed feature keys for user
   */
  static async getAllowedFeatureKeys(userEffectivePerms: Set<string>): Promise<string[]> {
    const features = await prisma.feature.findMany({
      where: { isActive: true },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });

    const allowedKeys: string[] = [];
    for (const f of features) {
      const permKeys = f.permissions.map((fp) => fp.permission.key);
      if (permKeys.length === 0 || userEffectivePerms.has('*')) {
        allowedKeys.push(f.key);
        continue;
      }
      const hasAccess = f.permissionMode === 'ALL'
        ? permKeys.every((k) => userEffectivePerms.has(k))
        : permKeys.some((k) => userEffectivePerms.has(k));

      if (hasAccess) {
        allowedKeys.push(f.key);
      }
    }

    return allowedKeys;
  }

  /**
   * List all features with mapped permissions for admin table
   */
  static async listFeaturesAdmin() {
    const features = await prisma.feature.findMany({
      include: {
        permissions: {
          include: { permission: true },
        },
        parent: {
          select: { id: true, key: true, label: true },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    });

    return features.map((f) => ({
      id: f.id,
      key: f.key,
      type: f.type,
      label: f.label,
      path: f.path,
      icon: f.icon,
      parentId: f.parentId,
      parentKey: f.parent?.key || null,
      parentLabel: f.parent?.label || null,
      sortOrder: f.sortOrder,
      isActive: f.isActive,
      locked: f.locked,
      permissionMode: f.permissionMode,
      permissionKeys: f.permissions.map((fp) => fp.permission.key),
      updatedAt: f.updatedAt.toISOString(),
    }));
  }

  /**
   * Update feature configuration (locked features reject permission changes)
   */
  static async updateFeature(
    id: string,
    body: {
      label?: string;
      sortOrder?: number;
      parentId?: string | null;
      isActive?: boolean;
      permissionMode?: 'ANY' | 'ALL';
      permissionKeys?: string[];
    },
    actor: { id: string; username: string; ip: string }
  ) {
    const feature = await prisma.feature.findUnique({
      where: { id },
      include: {
        permissions: { include: { permission: true } },
      },
    });

    if (!feature) {
      const err: any = new Error('Feature not found');
      err.status = 404;
      throw err;
    }

    // Locked features reject permission changes
    if (feature.locked) {
      if (body.permissionKeys !== undefined || body.permissionMode !== undefined) {
        const err: any = new Error(`Feature "${feature.key}" is locked for system integrity and its permissions cannot be remapped.`);
        err.status = 400;
        throw err;
      }
    }

    const beforeMapping = {
      label: feature.label,
      sortOrder: feature.sortOrder,
      isActive: feature.isActive,
      permissionMode: feature.permissionMode,
      permissionKeys: feature.permissions.map((fp) => fp.permission.key),
    };

    const updateData: any = {};
    if (body.label !== undefined) updateData.label = body.label.trim();
    if (body.sortOrder !== undefined) updateData.sortOrder = Number(body.sortOrder);
    if (body.parentId !== undefined) updateData.parentId = body.parentId || null;
    if (body.isActive !== undefined) updateData.isActive = Boolean(body.isActive);
    if (body.permissionMode !== undefined) updateData.permissionMode = body.permissionMode;

    await prisma.$transaction(async (tx) => {
      await tx.feature.update({
        where: { id },
        data: updateData,
      });

      if (body.permissionKeys !== undefined) {
        // Find permission IDs for keys
        const allDbPerms = await tx.permission.findMany();
        const permByKey = new Map(allDbPerms.map((p) => [p.key, p.id]));

        // Delete existing mappings
        await tx.featurePermission.deleteMany({
          where: { featureId: id },
        });

        // Insert new mappings
        for (const pKey of body.permissionKeys) {
          const permId = permByKey.get(pKey);
          if (permId) {
            await tx.featurePermission.create({
              data: {
                featureId: id,
                permissionId: permId,
              },
            });
          }
        }
      }
    });

    this.invalidateFeatureCache(feature.id);
    this.invalidateFeatureCache(feature.key);

    const updated = await this.getFeature(id);

    await AuthService.logAudit(
      'FEATURE_UPDATE',
      'Feature',
      id,
      JSON.stringify({
        featureKey: feature.key,
        before: beforeMapping,
        after: {
          label: updated?.label,
          sortOrder: updated?.sortOrder,
          isActive: updated?.isActive,
          permissionMode: updated?.permissionMode,
          permissionKeys: updated?.permissionKeys,
        },
        actor: actor.username,
      }),
      actor.username,
      actor.ip,
      actor.id
    );

    return updated;
  }

  /**
   * List all permissions with details for admin table
   */
  static async listPermissionsAdmin() {
    const permissions = await prisma.permission.findMany({
      include: {
        rolePermissions: {
          select: { roleId: true },
        },
      },
      orderBy: [{ group: 'asc' }, { sortOrder: 'asc' }, { key: 'asc' }],
    });

    return permissions.map((p) => ({
      id: p.id,
      key: p.key,
      group: p.group,
      label: p.label,
      description: p.description,
      sortOrder: p.sortOrder,
      dependsOnKey: p.dependsOnKey,
      isActive: p.isActive,
      roleCount: p.rolePermissions.length,
      updatedAt: p.updatedAt.toISOString(),
    }));
  }

  /**
   * Update permission metadata (key is immutable)
   */
  static async updatePermission(
    id: string,
    body: {
      label?: string;
      description?: string;
      dependsOnKey?: string | null;
      isActive?: boolean;
    },
    actor: { id: string; username: string; ip: string }
  ) {
    const permission = await prisma.permission.findUnique({ where: { id } });
    if (!permission) {
      const err: any = new Error('Permission not found');
      err.status = 404;
      throw err;
    }

    const updateData: any = {};
    if (body.label !== undefined) updateData.label = body.label.trim();
    if (body.description !== undefined) updateData.description = body.description.trim();
    if (body.dependsOnKey !== undefined) updateData.dependsOnKey = body.dependsOnKey || null;
    if (body.isActive !== undefined) updateData.isActive = Boolean(body.isActive);

    const updated = await prisma.permission.update({
      where: { id },
      data: updateData,
    });

    this.invalidateCache();
    this.invalidateFeatureCache();

    await AuthService.logAudit(
      'PERMISSION_UPDATE',
      'Permission',
      id,
      `Updated permission "${permission.key}": ${JSON.stringify(updateData)}`,
      actor.username,
      actor.ip,
      actor.id
    );

    return updated;
  }

  /**
   * Create custom feature (e.g. MENU internal/external link)
   */
  static async createFeature(
    body: {
      key: string;
      type: 'MENU' | 'PAGE' | 'TAB' | 'ACTION';
      label: string;
      path?: string;
      icon?: string;
      parentId?: string;
      sortOrder?: number;
      permissionMode?: 'ANY' | 'ALL';
      permissionKeys?: string[];
    },
    actor: { id: string; username: string; ip: string }
  ) {
    const key = body.key.trim();
    const existing = await prisma.feature.findUnique({ where: { key } });
    if (existing) {
      const err: any = new Error(`Feature "${key}" already exists`);
      err.status = 400;
      throw err;
    }

    const feature = await prisma.feature.create({
      data: {
        key,
        type: body.type as any,
        label: body.label.trim(),
        path: body.path?.trim() || null,
        icon: body.icon?.trim() || null,
        parentId: body.parentId || null,
        sortOrder: body.sortOrder ? Number(body.sortOrder) : 0,
        permissionMode: (body.permissionMode || 'ANY') as any,
        isActive: true,
        locked: false,
      },
    });

    if (body.permissionKeys && body.permissionKeys.length > 0) {
      const allDbPerms = await prisma.permission.findMany();
      const permByKey = new Map(allDbPerms.map((p) => [p.key, p.id]));
      for (const pKey of body.permissionKeys) {
        const permId = permByKey.get(pKey);
        if (permId) {
          await prisma.featurePermission.create({
            data: { featureId: feature.id, permissionId: permId },
          });
        }
      }
    }

    this.invalidateFeatureCache();

    await AuthService.logAudit(
      'FEATURE_CREATE',
      'Feature',
      feature.id,
      `Created feature "${feature.key}"`,
      actor.username,
      actor.ip,
      actor.id
    );

    return await this.getFeature(feature.id);
  }
}
