import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useStore } from '../../store/useStore';
import {
  computeDirtyDiff,
  countChangedCells,
  applyDependencyRules,
} from './rolesUtils';
import type {
  RoleItem,
  PermissionItem,
  RolesMatrixResponse,
  UserWithRoles,
  CreateRolePayload,
  UpdateRolePayload,
} from '../../types/roles';

export function useRolesMatrix() {
  const queryClient = useQueryClient();
  const addToast = useStore((s) => s.addToast);

  // 1. Fetch Roles & Permissions Matrix
  const {
    data: matrixData,
    isLoading: isMatrixLoading,
    isError: isMatrixError,
    error: matrixError,
    refetch: refetchMatrix,
  } = useQuery<RolesMatrixResponse, Error>({
    queryKey: ['rolesMatrix'],
    queryFn: api.roles.getMatrix,
    staleTime: 15 * 1000,
  });

  // 2. Fetch Users
  const {
    data: usersData,
    isLoading: isUsersLoading,
    isError: isUsersError,
    error: usersError,
    refetch: refetchUsers,
  } = useQuery<UserWithRoles[], Error>({
    queryKey: ['rolesUsers'],
    queryFn: api.roles.getUsers,
    staleTime: 15 * 1000,
  });

  // Working state for matrix edits
  const [currentMatrix, setCurrentMatrix] = useState<Record<string, string[]>>({});
  const [initialMatrix, setInitialMatrix] = useState<Record<string, string[]>>({});
  const [focusedColumnId, setFocusedColumnId] = useState<string | undefined>();

  // Synchronize server data to working copy when loaded or refreshed
  useEffect(() => {
    if (matrixData?.matrix) {
      setInitialMatrix(matrixData.matrix);
      setCurrentMatrix(matrixData.matrix);
    }
  }, [matrixData]);

  // Compute dirty state
  const roles = matrixData?.roles || [];
  const permissions = matrixData?.permissions || [];
  const users = usersData || [];

  const dirtyDiff = useMemo(
    () => computeDirtyDiff(initialMatrix, currentMatrix, roles),
    [initialMatrix, currentMatrix, roles]
  );

  const dirtyCount = useMemo(
    () => countChangedCells(initialMatrix, currentMatrix),
    [initialMatrix, currentMatrix]
  );

  // Warn before browser unload if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirtyCount > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [dirtyCount]);

  // Toggle single cell with automatic dependency cascading
  const toggleCell = useCallback(
    (roleId: string, permissionKey: string, nextChecked: boolean) => {
      const role = roles.find((r) => r.id === roleId);
      if (!role || role.name === 'SUPER_ADMIN') return;

      setCurrentMatrix((prev) => {
        const currentPerms = new Set(prev[roleId] || []);
        const { nextPerms, removedDependents } = applyDependencyRules(
          currentPerms,
          permissionKey,
          nextChecked
        );

        if (removedDependents.length > 0) {
          addToast({
            type: 'info',
            title: 'Dependent Permissions Removed',
            message: `Also removed: ${removedDependents.join(', ')}`,
          });
        }

        return {
          ...prev,
          [roleId]: Array.from(nextPerms),
        };
      });
    },
    [roles, addToast]
  );

  // Toggle entire module group for a role
  const toggleGroup = useCallback(
    (roleId: string, groupKeys: string[], nextChecked: boolean) => {
      const role = roles.find((r) => r.id === roleId);
      if (!role || role.name === 'SUPER_ADMIN') return;

      setCurrentMatrix((prev) => {
        let currentPerms = new Set(prev[roleId] || []);
        const allRemovedDependents: string[] = [];

        for (const key of groupKeys) {
          const { nextPerms, removedDependents } = applyDependencyRules(
            currentPerms,
            key,
            nextChecked
          );
          currentPerms = nextPerms;
          for (const rem of removedDependents) {
            if (!allRemovedDependents.includes(rem)) allRemovedDependents.push(rem);
          }
        }

        if (allRemovedDependents.length > 0) {
          addToast({
            type: 'info',
            title: 'Dependent Permissions Removed',
            message: `Also removed: ${allRemovedDependents.join(', ')}`,
          });
        }

        return {
          ...prev,
          [roleId]: Array.from(currentPerms),
        };
      });
    },
    [roles, addToast]
  );

  // Range select between two permissions in a role column (Shift+Click)
  const rangeSelect = useCallback(
    (roleId: string, startKey: string, endKey: string, checked: boolean) => {
      const role = roles.find((r) => r.id === roleId);
      if (!role || role.name === 'SUPER_ADMIN') return;

      const startIdx = permissions.findIndex((p) => p.key === startKey);
      const endIdx = permissions.findIndex((p) => p.key === endKey);
      if (startIdx === -1 || endIdx === -1) return;

      const minIdx = Math.min(startIdx, endIdx);
      const maxIdx = Math.max(startIdx, endIdx);
      const rangeKeys = permissions.slice(minIdx, maxIdx + 1).map((p) => p.key);

      setCurrentMatrix((prev) => {
        let currentPerms = new Set(prev[roleId] || []);
        for (const k of rangeKeys) {
          const { nextPerms } = applyDependencyRules(currentPerms, k, checked);
          currentPerms = nextPerms;
        }
        return {
          ...prev,
          [roleId]: Array.from(currentPerms),
        };
      });
    },
    [roles, permissions]
  );

  // Discard all unsaved changes
  const discardChanges = useCallback(() => {
    setCurrentMatrix(initialMatrix);
    addToast({
      type: 'info',
      title: 'Changes Discarded',
      message: 'Reverted matrix to saved state.',
    });
  }, [initialMatrix, addToast]);

  // Save changes mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      for (const diff of dirtyDiff) {
        await api.roles.updateRolePermissions(diff.roleId, {
          add: diff.add,
          remove: diff.remove,
          expectedUpdatedAt: diff.expectedUpdatedAt,
        });
      }
    },
    onSuccess: async () => {
      addToast({
        type: 'success',
        title: 'Permissions Saved',
        message: 'Updated role permissions matrix successfully.',
      });
      await queryClient.invalidateQueries({ queryKey: ['rolesMatrix'] });
      await refetchMatrix();
    },
    onError: (err: any) => {
      if (err?.code === 'STALE_UPDATE' || err?.status === 409) {
        addToast({
          type: 'error',
          title: 'Conflict Detected',
          message: 'This role was changed by someone else. Please reload.',
        });
      } else {
        addToast({
          type: 'error',
          title: 'Save Failed',
          message: err?.message || 'Failed to update permissions.',
        });
      }
    },
  });

  const saveChanges = useCallback(() => {
    if (dirtyCount === 0 || saveMutation.isPending) return;
    saveMutation.mutate();
  }, [dirtyCount, saveMutation]);

  // Global Cmd+S / Ctrl+S save shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveChanges();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveChanges]);

  // Create role mutation
  const createRoleMutation = useMutation({
    mutationFn: (payload: CreateRolePayload) => api.roles.createRole(payload),
    onSuccess: (newRole) => {
      addToast({
        type: 'success',
        title: 'Role Created',
        message: `Role "${newRole.name}" created successfully.`,
      });
      setFocusedColumnId(newRole.id);
      queryClient.invalidateQueries({ queryKey: ['rolesMatrix'] });
    },
    onError: (err: any) => {
      addToast({
        type: 'error',
        title: 'Create Role Failed',
        message: err?.message || 'Failed to create role.',
      });
    },
  });

  // Rename / update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateRolePayload }) =>
      api.roles.updateRole(id, payload),
    onSuccess: (updated) => {
      addToast({
        type: 'success',
        title: 'Role Updated',
        message: `Role details for "${updated.name}" updated.`,
      });
      queryClient.invalidateQueries({ queryKey: ['rolesMatrix'] });
    },
    onError: (err: any) => {
      addToast({
        type: 'error',
        title: 'Update Role Failed',
        message: err?.message || 'Failed to update role.',
      });
    },
  });

  // Duplicate role mutation
  const duplicateRoleMutation = useMutation({
    mutationFn: (id: string) => api.roles.duplicateRole(id),
    onSuccess: (newRole) => {
      addToast({
        type: 'success',
        title: 'Role Duplicated',
        message: `Created duplicate role "${newRole.name}".`,
      });
      setFocusedColumnId(newRole.id);
      queryClient.invalidateQueries({ queryKey: ['rolesMatrix'] });
    },
    onError: (err: any) => {
      addToast({
        type: 'error',
        title: 'Duplicate Failed',
        message: err?.message || 'Failed to duplicate role.',
      });
    },
  });

  // Delete role mutation
  const deleteRoleMutation = useMutation({
    mutationFn: (id: string) => api.roles.deleteRole(id),
    onSuccess: () => {
      addToast({
        type: 'success',
        title: 'Role Deleted',
        message: 'Custom role was deleted successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['rolesMatrix'] });
    },
    onError: (err: any) => {
      addToast({
        type: 'error',
        title: 'Delete Failed',
        message: err?.message || 'Failed to delete role.',
      });
    },
  });

  // Update user roles mutation
  const updateUserRolesMutation = useMutation({
    mutationFn: ({ userId, roleNames }: { userId: string; roleNames: string[] }) =>
      api.roles.updateUserRoles(userId, roleNames),
    onSuccess: () => {
      addToast({
        type: 'success',
        title: 'Role Reassigned',
        message: 'Staff user role updated successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['rolesUsers'] });
      queryClient.invalidateQueries({ queryKey: ['rolesMatrix'] });
    },
    onError: (err: any) => {
      addToast({
        type: 'error',
        title: 'Reassignment Failed',
        message: err?.message || 'Failed to reassign user role.',
      });
    },
  });

  return {
    roles,
    permissions,
    users,
    initialMatrix,
    currentMatrix,
    dirtyCount,
    isSaving: saveMutation.isPending,
    isLoading: isMatrixLoading || isUsersLoading,
    isError: isMatrixError || isUsersError,
    error: matrixError || usersError,
    focusedColumnId,
    refetch: () => {
      refetchMatrix();
      refetchUsers();
    },
    toggleCell,
    toggleGroup,
    rangeSelect,
    saveChanges,
    discardChanges,
    createRole: createRoleMutation.mutateAsync,
    updateRole: (id: string, payload: UpdateRolePayload) =>
      updateRoleMutation.mutateAsync({ id, payload }),
    duplicateRole: duplicateRoleMutation.mutateAsync,
    deleteRole: deleteRoleMutation.mutateAsync,
    updateUserRoles: (userId: string, roleNames: string[]) =>
      updateUserRolesMutation.mutateAsync({ userId, roleNames }),
  };
}
