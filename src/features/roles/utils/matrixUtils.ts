import { PERMISSION_DEPENDENCIES } from '../constants';
import type { RoleItem, RolePermissionDiff } from '../types';

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
