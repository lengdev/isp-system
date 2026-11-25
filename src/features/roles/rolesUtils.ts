import { PERMISSION_DEPENDENCIES } from './constants.ts';
import type { RoleItem, RolePermissionDiff } from '../../types/roles.ts';

/**
 * Computes the tri-state for a group of permissions for a single role
 */
export function computeTriState(
  groupPermissionKeys: string[],
  rolePermissions: Set<string>
): 'checked' | 'unchecked' | 'indeterminate' {
  if (groupPermissionKeys.length === 0) return 'unchecked';

  let hasChecked = false;
  let hasUnchecked = false;

  for (const key of groupPermissionKeys) {
    if (rolePermissions.has(key)) {
      hasChecked = true;
    } else {
      hasUnchecked = true;
    }
    if (hasChecked && hasUnchecked) {
      return 'indeterminate';
    }
  }

  if (hasChecked && !hasUnchecked) return 'checked';
  return 'unchecked';
}

/**
 * Applies dependency rules when toggling a permission:
 * - Checking an action (create/edit/delete) auto-checks its required view permission.
 * - Unchecking a view unchecks its dependents and collects their names.
 */
export function applyDependencyRules(
  currentPerms: Set<string>,
  toggledKey: string,
  nextChecked: boolean
): {
  nextPerms: Set<string>;
  removedDependents: string[];
  addedDependencies: string[];
} {
  const nextPerms = new Set<string>(currentPerms);
  const removedDependents: string[] = [];
  const addedDependencies: string[] = [];

  if (nextChecked) {
    nextPerms.add(toggledKey);

    // Auto-check required dependencies
    let depKey = PERMISSION_DEPENDENCIES[toggledKey];
    while (depKey) {
      if (!nextPerms.has(depKey)) {
        nextPerms.add(depKey);
        addedDependencies.push(depKey);
      }
      depKey = PERMISSION_DEPENDENCIES[depKey];
    }
  } else {
    nextPerms.delete(toggledKey);

    // Recursively find and remove all permissions that depend on toggledKey
    const toCheck = [toggledKey];
    while (toCheck.length > 0) {
      const parentKey = toCheck.pop()!;
      for (const [dependent, requiredParent] of Object.entries(PERMISSION_DEPENDENCIES)) {
        if (requiredParent === parentKey && nextPerms.has(dependent)) {
          nextPerms.delete(dependent);
          removedDependents.push(dependent);
          toCheck.push(dependent);
        }
      }
    }
  }

  return { nextPerms, removedDependents, addedDependencies };
}

/**
 * Computes diff between current matrix and initial loaded matrix.
 * Returns array of diffs for roles that have changes.
 */
export function computeDirtyDiff(
  initialMatrix: Record<string, string[]>,
  currentMatrix: Record<string, string[]>,
  roles: RoleItem[]
): RolePermissionDiff[] {
  const diffs: RolePermissionDiff[] = [];
  const roleMap = new Map(roles.map((r) => [r.id, r]));

  for (const [roleId, currentKeys] of Object.entries(currentMatrix)) {
    const role = roleMap.get(roleId);
    if (!role || role.name === 'SUPER_ADMIN') continue;

    const initialKeys = new Set(initialMatrix[roleId] || []);
    const currentKeysSet = new Set(currentKeys);

    const add = currentKeys.filter((k) => !initialKeys.has(k));
    const remove = Array.from(initialKeys).filter((k) => !currentKeysSet.has(k));

    if (add.length > 0 || remove.length > 0) {
      diffs.push({
        roleId,
        add,
        remove,
        expectedUpdatedAt: role.updatedAt,
      });
    }
  }

  return diffs;
}

/**
 * Counts total number of changed cells across all roles and permissions
 */
export function countChangedCells(
  initialMatrix: Record<string, string[]>,
  currentMatrix: Record<string, string[]>
): number {
  let count = 0;

  for (const [roleId, currentKeys] of Object.entries(currentMatrix)) {
    const initialKeys = new Set(initialMatrix[roleId] || []);
    const currentKeysSet = new Set(currentKeys);

    for (const k of currentKeys) {
      if (!initialKeys.has(k)) count++;
    }
    for (const k of initialKeys) {
      if (!currentKeysSet.has(k)) count++;
    }
  }

  return count;
}

export type UserOverrideState = 'INHERIT' | 'GRANT' | 'DENY';

/**
 * Resolves effective permissions for a single user from role baseline + per-user GRANT/DENY overrides.
 */
export function computeUserEffectivePermissions(
  rolePermissions: Set<string>,
  grants: Set<string>,
  denies: Set<string>
): Set<string> {
  const effective = new Set<string>(rolePermissions);
  for (const key of grants) {
    effective.add(key);
  }
  for (const key of denies) {
    effective.delete(key);
  }
  return effective;
}

/**
 * Applies a 3-state per-user permission override (INHERIT | GRANT | DENY) with dependency awareness:
 * - Granting an action auto-grants required parent view dependencies not already effective from roles.
 * - Denying a view cascades removal/denial to any dependent actions currently held by the user.
 */
export function applyUserOverrideMode(
  rolePermissions: Set<string>,
  currentGrants: Set<string>,
  currentDenies: Set<string>,
  toggledKey: string,
  nextState: UserOverrideState
): {
  grants: Set<string>;
  denies: Set<string>;
  addedDependencies: string[];
  affectedDependents: string[];
} {
  const grants = new Set<string>(currentGrants);
  const denies = new Set<string>(currentDenies);
  const addedDependencies: string[] = [];
  const affectedDependents: string[] = [];

  if (nextState === 'INHERIT') {
    grants.delete(toggledKey);
    denies.delete(toggledKey);
    return { grants, denies, addedDependencies, affectedDependents };
  }

  if (nextState === 'GRANT') {
    denies.delete(toggledKey);
    grants.add(toggledKey);

    let depKey = PERMISSION_DEPENDENCIES[toggledKey];
    while (depKey) {
      const effectiveNow = (rolePermissions.has(depKey) && !denies.has(depKey)) || grants.has(depKey);
      if (!effectiveNow) {
        denies.delete(depKey);
        if (!rolePermissions.has(depKey)) {
          grants.add(depKey);
        }
        addedDependencies.push(depKey);
      }
      depKey = PERMISSION_DEPENDENCIES[depKey];
    }

    return { grants, denies, addedDependencies, affectedDependents };
  }

  // DENY
  grants.delete(toggledKey);
  denies.add(toggledKey);

  const toCheck = [toggledKey];
  while (toCheck.length > 0) {
    const parentKey = toCheck.pop()!;
    for (const [dependent, requiredParent] of Object.entries(PERMISSION_DEPENDENCIES)) {
      if (requiredParent !== parentKey) continue;
      const wasGranted = grants.has(dependent);
      const fromRole = rolePermissions.has(dependent) && !denies.has(dependent);
      if (wasGranted || fromRole) {
        grants.delete(dependent);
        if (rolePermissions.has(dependent)) {
          denies.add(dependent);
        }
        affectedDependents.push(dependent);
        toCheck.push(dependent);
      }
    }
  }

  return { grants, denies, addedDependencies, affectedDependents };
}
