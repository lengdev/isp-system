import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, AdminPermissionItem } from '../../../lib/api';
import { useStore } from '../../../store/useStore';
import { useAuthStore } from '../../../store/authStore';
import type { FeatureItem, FeatureDiff } from '../types';

export function useFeaturesManager(matrixPermissions?: { key: string }[], roleMatrix?: Record<string, string[]>) {
  const queryClient = useQueryClient();
  const addToast = useStore((s) => s.addToast);
  const user = useAuthStore((s) => s.user);
  const status = useAuthStore((s) => s.status);
  const accessToken = useAuthStore((s) => s.accessToken);
  const isAuthenticated = Boolean(user && accessToken && status === 'authenticated');

  // 1. Fetch Features List
  const {
    data: featuresData,
    isLoading: isFeaturesLoading,
    isError: isFeaturesError,
    error: featuresError,
    refetch: refetchFeatures,
  } = useQuery<{ features: FeatureItem[] }, Error>({
    queryKey: ['featuresList'],
    queryFn: api.auth.getFeatures,
    staleTime: 15 * 1000,
    enabled: isAuthenticated,
  });

  // 2. Fetch Admin Permissions (for options and roleCount)
  const {
    data: permsData,
    isLoading: isPermsLoading,
  } = useQuery<{ permissions: AdminPermissionItem[] }, Error>({
    queryKey: ['adminPermissionsList'],
    queryFn: api.auth.getPermissions,
    staleTime: 30 * 1000,
    enabled: isAuthenticated,
  });

  const [features, setFeatures] = useState<FeatureItem[]>([]);
  const [initialFeatures, setInitialFeatures] = useState<FeatureItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Sync server features to working state
  useEffect(() => {
    if (featuresData?.features) {
      setInitialFeatures(featuresData.features);
      setFeatures(featuresData.features);
    }
  }, [featuresData]);

  // Compute dirty features
  const dirtyDiff = useMemo<FeatureDiff[]>(() => {
    if (initialFeatures.length === 0 || features.length === 0) return [];
    const diffs: FeatureDiff[] = [];
    const initialMap = new Map(initialFeatures.map((f) => [f.id, f]));

    for (const cur of features) {
      const orig = initialMap.get(cur.id);
      if (!orig) continue;

      const permChanged =
        JSON.stringify([...cur.permissionKeys].sort()) !==
        JSON.stringify([...orig.permissionKeys].sort());
      const modeChanged = cur.permissionMode !== orig.permissionMode;
      const activeChanged = cur.isActive !== orig.isActive;
      const orderChanged = cur.sortOrder !== orig.sortOrder;
      const labelChanged = cur.label !== orig.label;

      if (permChanged || modeChanged || activeChanged || orderChanged || labelChanged) {
        diffs.push({
          id: cur.id,
          label: cur.label,
          sortOrder: cur.sortOrder,
          isActive: cur.isActive,
          permissionMode: cur.permissionMode,
          permissionKeys: cur.permissionKeys,
        });
      }
    }
    return diffs;
  }, [initialFeatures, features]);

  const dirtyCount = dirtyDiff.length;

  // Track orphan permissions: permissions assigned to features that NO role holds
  const unassignedPermsMap = useMemo(() => {
    const unassigned = new Set<string>();
    if (permsData?.permissions) {
      for (const p of permsData.permissions) {
        if (p.roleCount === 0) {
          unassigned.add(p.key);
        }
      }
    } else if (roleMatrix) {
      const allAssigned = new Set(Object.values(roleMatrix).flat());
      if (matrixPermissions) {
        for (const p of matrixPermissions) {
          if (!allAssigned.has(p.key)) {
            unassigned.add(p.key);
          }
        }
      }
    }
    return unassigned;
  }, [permsData, roleMatrix, matrixPermissions]);

  // Update feature permissions
  const updateFeaturePermissions = useCallback((featureId: string, permissionKeys: string[]) => {
    setFeatures((prev) =>
      prev.map((f) => {
        if (f.id !== featureId) return f;
        if (f.locked) return f;
        return { ...f, permissionKeys };
      })
    );
  }, []);

  // Update feature permission mode
  const updateFeatureMode = useCallback((featureId: string, permissionMode: 'ANY' | 'ALL') => {
    setFeatures((prev) =>
      prev.map((f) => {
        if (f.id !== featureId) return f;
        if (f.locked) return f;
        return { ...f, permissionMode };
      })
    );
  }, []);

  // Toggle active state
  const toggleFeatureActive = useCallback((featureId: string, isActive: boolean) => {
    setFeatures((prev) =>
      prev.map((f) => {
        if (f.id !== featureId) return f;
        if (f.locked) return f;
        return { ...f, isActive };
      })
    );
  }, []);

  // Update sort order (reorder up/down)
  const reorderFeature = useCallback((featureId: string, direction: 'up' | 'down') => {
    setFeatures((prev) => {
      const item = prev.find((f) => f.id === featureId);
      if (!item) return prev;

      // Group siblings by same parentId
      const siblings = prev
        .filter((f) => f.parentId === item.parentId)
        .sort((a, b) => a.sortOrder - b.sortOrder);
      const currentIndex = siblings.findIndex((f) => f.id === featureId);
      if (currentIndex < 0) return prev;

      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= siblings.length) return prev;

      const otherItem = siblings[targetIndex];
      const itemSortOrder = item.sortOrder;
      const otherSortOrder = otherItem.sortOrder;

      // Swap sortOrders or increment
      const newSortOrder = itemSortOrder === otherSortOrder
        ? (direction === 'up' ? itemSortOrder - 1 : itemSortOrder + 1)
        : otherSortOrder;

      return prev.map((f) => {
        if (f.id === item.id) return { ...f, sortOrder: newSortOrder };
        if (f.id === otherItem.id) return { ...f, sortOrder: itemSortOrder };
        return f;
      });
    });
  }, []);

  // Discard changes
  const discardChanges = useCallback(() => {
    setFeatures(initialFeatures);
    addToast({
      type: 'info',
      title: 'Changes Discarded',
      message: 'Feature mapping changes were restored.',
    });
  }, [initialFeatures, addToast]);

  // Save changes
  const saveChanges = useCallback(async () => {
    if (dirtyDiff.length === 0) return;
    setIsSaving(true);
    try {
      for (const diff of dirtyDiff) {
        await api.auth.updateFeature(diff.id, {
          permissionKeys: diff.permissionKeys,
          permissionMode: diff.permissionMode,
          isActive: diff.isActive,
          sortOrder: diff.sortOrder,
          label: diff.label,
        });
      }

      await queryClient.invalidateQueries({ queryKey: ['featuresList'] });
      await queryClient.invalidateQueries({ queryKey: ['navigation'] });

      // Refresh /auth/me to reflect any updated features
      try {
        const meRes = await api.auth.me();
        if (meRes?.user) {
          useStore.getState();
        }
      } catch {
        // ignore
      }

      addToast({
        type: 'success',
        title: 'Features Updated',
        message: `Successfully saved ${dirtyDiff.length} feature configuration${dirtyDiff.length > 1 ? 's' : ''}.`,
      });
    } catch (err: any) {
      console.error('Failed to save features:', err);
      addToast({
        type: 'error',
        title: 'Save Failed',
        message: err?.message || 'Failed to update feature permissions.',
      });
    } finally {
      setIsSaving(false);
    }
  }, [dirtyDiff, queryClient, addToast]);

  return {
    features,
    initialFeatures,
    permissions: permsData?.permissions || [],
    unassignedPermsMap,
    dirtyCount,
    dirtyDiff,
    isSaving,
    isLoading: isFeaturesLoading || isPermsLoading,
    isError: isFeaturesError,
    error: featuresError,
    refetch: refetchFeatures,
    updateFeaturePermissions,
    updateFeatureMode,
    toggleFeatureActive,
    reorderFeature,
    saveChanges,
    discardChanges,
  };
}
