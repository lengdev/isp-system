import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  RotateCcw,
  ShieldAlert,
  Lock,
  Check,
  X as XIcon,
  Minus,
} from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { api } from '../../lib/api';
import { useStore } from '../../store/useStore';
import { cn } from '../../lib/utils';
import {
  applyUserOverrideMode,
  computeUserEffectivePermissions,
  type UserOverrideState,
} from './rolesUtils';
import type {
  PermissionItem,
  UserPermissionsDetailResponse,
  UserWithRoles,
} from '../../types/roles';

interface UserPermissionsModalProps {
  user: UserWithRoles | null;
  canManage: boolean;
  onClose: () => void;
}

type FilterMode = 'all' | 'overrides' | 'role' | 'missing';

export const UserPermissionsModal: React.FC<UserPermissionsModalProps> = ({
  user,
  canManage,
  onClose,
}) => {
  const queryClient = useQueryClient();
  const addToast = useStore((s) => s.addToast);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [grantSet, setGrantSet] = useState<Set<string>>(new Set());
  const [denySet, setDenySet] = useState<Set<string>>(new Set());
  const [saveError, setSaveError] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useQuery<UserPermissionsDetailResponse, Error>({
    queryKey: ['userPermissions', user?.id],
    queryFn: () => api.roles.getUserPermissions(user!.id),
    enabled: Boolean(user?.id),
    staleTime: 0,
  });

  useEffect(() => {
    if (data) {
      setGrantSet(new Set(data.grants));
      setDenySet(new Set(data.denies));
      setSaveError(null);
    }
  }, [data]);

  useEffect(() => {
    if (!user) {
      setSearchQuery('');
      setFilterMode('all');
      setSaveError(null);
    }
  }, [user]);

  const rolePermSet = useMemo(
    () => new Set(data?.rolePermissions || []),
    [data?.rolePermissions]
  );

  const effectiveSet = useMemo(
    () => computeUserEffectivePermissions(rolePermSet, grantSet, denySet),
    [rolePermSet, grantSet, denySet]
  );

  const initialGrantsKey = useMemo(
    () => [...(data?.grants || [])].sort().join(','),
    [data?.grants]
  );
  const initialDeniesKey = useMemo(
    () => [...(data?.denies || [])].sort().join(','),
    [data?.denies]
  );
  const currentGrantsKey = useMemo(() => [...grantSet].sort().join(','), [grantSet]);
  const currentDeniesKey = useMemo(() => [...denySet].sort().join(','), [denySet]);
  const isDirty = Boolean(data) && (initialGrantsKey !== currentGrantsKey || initialDeniesKey !== currentDeniesKey);

  const isLockedSuperAdmin = Boolean(data?.user.isSuperAdmin);
  const readOnly = !canManage || isLockedSuperAdmin;

  const getOverrideState = (key: string): UserOverrideState => {
    if (denySet.has(key)) return 'DENY';
    if (grantSet.has(key)) return 'GRANT';
    return 'INHERIT';
  };

  const handleStateChange = (perm: PermissionItem, nextState: UserOverrideState) => {
    if (readOnly) return;
    const { grants, denies, addedDependencies, affectedDependents } = applyUserOverrideMode(
      rolePermSet,
      grantSet,
      denySet,
      perm.key,
      nextState
    );
    setGrantSet(grants);
    setDenySet(denies);
    setSaveError(null);

    if (addedDependencies.length > 0) {
      addToast({
        type: 'info',
        title: 'Prerequisite Auto-Granted',
        message: `Also granted prerequisite: ${addedDependencies.join(', ')}`,
      });
    } else if (affectedDependents.length > 0) {
      addToast({
        type: 'info',
        title: 'Dependent Permissions Updated',
        message: `Blocked dependent action(s): ${affectedDependents.join(', ')}`,
      });
    }
  };

  const handleResetAll = () => {
    if (readOnly) return;
    setGrantSet(new Set());
    setDenySet(new Set());
    setSaveError(null);
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      api.roles.updateUserPermissions(user!.id, {
        grants: Array.from(grantSet),
        denies: Array.from(denySet),
      }),
    onSuccess: async (updated) => {
      addToast({
        type: 'success',
        title: 'User Permissions Saved',
        message: `Updated custom permissions for @${updated.user.username}.`,
      });
      await queryClient.invalidateQueries({ queryKey: ['rolesUsers'] });
      await queryClient.invalidateQueries({ queryKey: ['userPermissions', user?.id] });
      onClose();
    },
    onError: (err: any) => {
      setSaveError(err?.message || 'Failed to save user permissions.');
    },
  });

  const groupedPermissions = useMemo(() => {
    const perms = data?.permissions || [];
    const q = searchQuery.toLowerCase().trim();
    const groups = new Map<string, PermissionItem[]>();

    for (const p of perms) {
      const override = getOverrideState(p.key);
      const fromRole = rolePermSet.has(p.key);

      if (filterMode === 'overrides' && override === 'INHERIT') continue;
      if (filterMode === 'role' && !fromRole) continue;
      if (filterMode === 'missing' && fromRole) continue;

      if (
        q &&
        !p.label.toLowerCase().includes(q) &&
        !p.key.toLowerCase().includes(q) &&
        !p.group.toLowerCase().includes(q)
      ) {
        continue;
      }

      if (!groups.has(p.group)) groups.set(p.group, []);
      groups.get(p.group)!.push(p);
    }

    return Array.from(groups.entries());
  }, [data?.permissions, searchQuery, filterMode, grantSet, denySet, rolePermSet]);

  return (
    <Modal
      isOpen={Boolean(user)}
      onClose={() => {
        if (!saveMutation.isPending) onClose();
      }}
      title={user ? `Custom Permissions — ${user.fullName}` : 'Custom Permissions'}
      subtitle={
        user
          ? `Override permissions for @${user.username} without modifying shared role settings.`
          : undefined
      }
      size="xl"
    >
      {isLoading ? (
        <div className="space-y-3 py-2">
          <Skeleton className="w-full h-14 rounded-xl" />
          <Skeleton className="w-full h-10 rounded-xl" />
          <Skeleton className="w-full h-64 rounded-xl" />
        </div>
      ) : isError ? (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-[#B42318] dark:text-red-400 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{error?.message || 'Failed to load user permissions.'}</span>
        </div>
      ) : (
        <div className="flex flex-col gap-3.5 text-xs">
          {/* Summary Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border)]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[var(--text-muted)]">Assigned role:</span>
              {(data?.user.roles || []).map((r) => (
                <span
                  key={r}
                  className="px-2 py-0.5 rounded-md font-semibold bg-[var(--surface)] border border-[var(--border)] text-[var(--text)]"
                >
                  {r}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2 font-medium">
              <span className="px-2 py-0.5 rounded-md bg-[var(--surface)] border border-[var(--border)] text-[var(--text)]">
                Effective: {isLockedSuperAdmin ? 'All (*)' : effectiveSet.size}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                +{grantSet.size} Granted
              </span>
              <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
                -{denySet.size} Denied
              </span>
            </div>
          </div>

          {isLockedSuperAdmin && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-800 dark:text-amber-300">
              <Lock className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                <strong>SUPER_ADMIN</strong> accounts always hold unrestricted permissions (`*`) and cannot be narrowed via per-user overrides.
              </span>
            </div>
          )}

          {saveError && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-[#B42318] dark:text-red-400">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{saveError}</span>
            </div>
          )}

          {/* Filter Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Filter permissions by label, key or module..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 pl-8 pr-3 text-xs bg-[var(--surface-subtle)] border border-[var(--border)] rounded-lg text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'overrides', label: `Overrides (${grantSet.size + denySet.size})` },
                  { id: 'role', label: 'In Role' },
                  { id: 'missing', label: 'Not in Role' },
                ] as const
              ).map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setFilterMode(chip.id)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors',
                    filterMode === chip.id
                      ? 'bg-[var(--brand-soft)] text-[var(--brand)] border-[#EA6A3C]/30'
                      : 'bg-[var(--surface-subtle)] text-[var(--text-secondary)] border-[var(--border)] hover:text-[var(--text)]'
                  )}
                >
                  {chip.label}
                </button>
              ))}

              {!readOnly && (grantSet.size > 0 || denySet.size > 0) && (
                <button
                  type="button"
                  onClick={handleResetAll}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text)]"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset All
                </button>
              )}
            </div>
          </div>

          {/* Scrollable Permission List */}
          <div className="max-h-[420px] overflow-y-auto rounded-xl border border-[var(--border)] divide-y divide-[var(--border)]">
            {groupedPermissions.length === 0 ? (
              <div className="py-10 text-center text-[var(--text-muted)]">
                No permissions match the current search or filter.
              </div>
            ) : (
              groupedPermissions.map(([groupName, groupPerms]) => (
                <div key={groupName}>
                  <div className="sticky top-0 z-10 px-3.5 py-2 bg-[var(--surface-subtle)] border-b border-[var(--border)] font-semibold text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
                    {groupName} ({groupPerms.length})
                  </div>
                  <div className="divide-y divide-[var(--border)]">
                    {groupPerms.map((perm) => {
                      const mode = getOverrideState(perm.key);
                      const fromRole = rolePermSet.has(perm.key);
                      const isEffective = isLockedSuperAdmin || effectiveSet.has(perm.key);

                      return (
                        <div
                          key={perm.key}
                          className={cn(
                            'flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 px-3.5 py-2.5 bg-[var(--surface)] hover:bg-[var(--surface-subtle)]/50 transition-colors',
                            mode !== 'INHERIT' && 'bg-[var(--brand-soft)]/25'
                          )}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-[var(--text)]">
                                {perm.label}
                              </span>
                              <span className="font-mono text-[10px] text-[var(--text-muted)] px-1.5 py-0.5 rounded bg-[var(--surface-subtle)] border border-[var(--border)]">
                                {perm.key}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px]">
                              <span className="text-[var(--text-muted)]">
                                Role baseline:{' '}
                                <span
                                  className={
                                    fromRole
                                      ? 'text-[var(--text-secondary)] font-medium'
                                      : 'text-[var(--text-muted)]'
                                  }
                                >
                                  {fromRole ? 'Included' : 'Not included'}
                                </span>
                              </span>
                              <span className="text-[var(--border-strong)]">•</span>
                              <span
                                className={cn(
                                  'inline-flex items-center gap-1 font-semibold',
                                  mode === 'DENY'
                                    ? 'text-rose-600 dark:text-rose-400'
                                    : isEffective
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-[var(--text-muted)]'
                                )}
                              >
                                {mode === 'DENY' ? (
                                  <>
                                    <XIcon className="w-3 h-3" /> Blocked for user
                                  </>
                                ) : isEffective ? (
                                  <>
                                    <Check className="w-3 h-3" /> Effective: Allowed
                                  </>
                                ) : (
                                  <>
                                    <Minus className="w-3 h-3" /> Effective: None
                                  </>
                                )}
                              </span>
                            </div>
                          </div>

                          {/* 3-State Override Segmented Control */}
                          <div className="inline-flex items-center bg-[var(--surface-subtle)] border border-[var(--border)] rounded-lg p-0.5 shrink-0">
                            <button
                              type="button"
                              disabled={readOnly}
                              onClick={() => handleStateChange(perm, 'INHERIT')}
                              className={cn(
                                'px-2 py-1 text-[11px] font-medium rounded-md transition-colors',
                                mode === 'INHERIT'
                                  ? 'bg-[var(--surface)] text-[var(--text)] shadow-xs font-semibold'
                                  : 'text-[var(--text-muted)] hover:text-[var(--text)]',
                                readOnly && 'opacity-50 cursor-not-allowed'
                              )}
                            >
                              Inherit
                            </button>
                            <button
                              type="button"
                              disabled={readOnly}
                              onClick={() => handleStateChange(perm, 'GRANT')}
                              className={cn(
                                'px-2 py-1 text-[11px] font-medium rounded-md transition-colors',
                                mode === 'GRANT'
                                  ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                                  : 'text-[var(--text-muted)] hover:text-emerald-600',
                                readOnly && 'opacity-50 cursor-not-allowed'
                              )}
                            >
                              Grant
                            </button>
                            <button
                              type="button"
                              disabled={readOnly}
                              onClick={() => handleStateChange(perm, 'DENY')}
                              className={cn(
                                'px-2 py-1 text-[11px] font-medium rounded-md transition-colors',
                                mode === 'DENY'
                                  ? 'bg-rose-600 text-white shadow-xs font-semibold'
                                  : 'text-[var(--text-muted)] hover:text-rose-600',
                                readOnly && 'opacity-50 cursor-not-allowed'
                              )}
                            >
                              Deny
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-[var(--border)]">
            <div className="text-[11px] text-[var(--text-muted)]">
              Changes affect only <strong>@{user?.username}</strong> — shared role permissions remain untouched.
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={saveMutation.isPending}
              >
                {readOnly ? 'Close' : 'Cancel'}
              </Button>
              {!readOnly && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => saveMutation.mutate()}
                  disabled={!isDirty || saveMutation.isPending}
                  isLoading={saveMutation.isPending}
                >
                  Save Permissions
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};
