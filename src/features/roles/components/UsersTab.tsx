import React, { useState, useMemo } from 'react';
import { Search, UserCheck, ShieldAlert, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Combobox } from '../../../components/ui/Combobox';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Skeleton } from '../../../components/ui/Skeleton';
import type { UserWithRoles, RoleItem } from '../types';
import { cn } from '../../../lib/utils';

export interface UsersTabProps {
  users: UserWithRoles[];
  roles: RoleItem[];
  isLoading: boolean;
  canManage: boolean;
  initialRoleFilter?: string | null;
  onUpdateUserRoles: (userId: string, newRoleNames: string[]) => Promise<void>;
}

export const UsersTab: React.FC<UsersTabProps> = ({
  users,
  roles,
  isLoading,
  canManage,
  initialRoleFilter = null,
  onUpdateUserRoles,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>(initialRoleFilter || '');

  // Confirm role change modal state
  const [pendingChange, setPendingChange] = useState<{
    user: UserWithRoles;
    newRoleId: string;
    newRoleName: string;
  } | null>(null);
  const [changeError, setChangeError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Role options for comboboxes
  const roleOptions = useMemo(
    () =>
      roles.map((r) => ({
        value: r.id,
        label: r.name,
        description: r.description || undefined,
      })),
    [roles]
  );

  const filterRoleOptions = useMemo(
    () => [{ value: '', label: 'All Roles' }, ...roleOptions],
    [roleOptions]
  );

  // Filtered users
  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return users.filter((u) => {
      const matchesSearch =
        !q ||
        u.fullName.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q);

      const matchesRole =
        !selectedRoleFilter ||
        u.roles.includes(selectedRoleFilter) ||
        u.role === selectedRoleFilter ||
        roles.find((r) => r.id === selectedRoleFilter)?.name === u.role;

      return matchesSearch && matchesRole;
    });
  }, [users, searchQuery, selectedRoleFilter, roles]);

  const handleRoleSelect = (user: UserWithRoles, roleId: string) => {
    const targetRole = roles.find((r) => r.id === roleId);
    if (!targetRole || targetRole.name === user.role) return;

    setPendingChange({
      user,
      newRoleId: targetRole.id,
      newRoleName: targetRole.name,
    });
    setChangeError(null);
  };

  const handleConfirmChange = async () => {
    if (!pendingChange) return;

    try {
      setIsUpdating(true);
      setChangeError(null);
      await onUpdateUserRoles(pendingChange.user.id, [pendingChange.newRoleName]);
      setPendingChange(null);
    } catch (err: any) {
      setChangeError(err?.message || 'Failed to update user role');
    } finally {
      setIsUpdating(false);
    }
  };

  const formatLastLogin = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-4">
          <Skeleton className="w-64 h-10 rounded-xl" />
          <Skeleton className="w-48 h-10 rounded-xl" />
        </div>
        <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] space-y-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="w-full h-12 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Search and Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-xs">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search user by name, username or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 text-xs bg-[var(--surface-subtle)] border border-[var(--border)] rounded-xl text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
            />
          </div>

          <div className="w-48">
            <Combobox
              options={filterRoleOptions}
              value={selectedRoleFilter}
              onChange={(val) => setSelectedRoleFilter(val || '')}
              placeholder="Filter by role..."
              size="sm"
              clearable={Boolean(selectedRoleFilter)}
            />
          </div>
        </div>

        <div className="text-xs text-[var(--text-muted)] font-medium">
          Showing {filteredUsers.length} of {users.length} staff users
        </div>
      </div>

      {/* Users DataTable Card */}
      <div className="overflow-x-auto rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-card)]">
        <table className="w-full border-collapse text-left min-w-[720px]">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface-subtle)] h-10 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              <th className="px-4 py-2">User</th>
              <th className="px-4 py-2">Username</th>
              <th className="px-4 py-2">Role</th>
              <th className="px-4 py-2 text-center">Status</th>
              <th className="px-4 py-2">Last Login</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)] text-xs">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-xs text-[var(--text-muted)]">
                  No staff users found matching your criteria.
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => {
                const currentRoleObj = roles.find((r) => r.name === user.role);

                return (
                  <tr
                    key={user.id}
                    className="hover:bg-[var(--surface-subtle)] transition-colors h-14"
                  >
                    {/* User Name & Email */}
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[var(--brand-soft)] text-[var(--brand)] font-bold text-xs flex items-center justify-center shrink-0">
                          {user.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-[var(--text)]">
                            {user.fullName}
                          </div>
                          <div className="text-[11px] text-[var(--text-muted)]">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Username */}
                    <td className="px-4 py-2.5 font-mono text-[11px] text-[var(--text-secondary)]">
                      @{user.username}
                    </td>

                    {/* Role Combobox Picker */}
                    <td className="px-4 py-2.5 w-56">
                      {canManage ? (
                        <Combobox
                          options={roleOptions}
                          value={currentRoleObj?.id || ''}
                          onChange={(newRoleId) => handleRoleSelect(user, newRoleId)}
                          clearable={false}
                          size="sm"
                        />
                      ) : (
                        <span className="font-medium text-[var(--text)] px-2.5 py-1 rounded-md bg-[var(--surface-subtle)] border border-[var(--border)]">
                          {user.role}
                        </span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="px-4 py-2.5 text-center">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border',
                          user.isActive
                            ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700'
                        )}
                      >
                        <span
                          className={cn(
                            'w-1.5 h-1.5 rounded-full',
                            user.isActive ? 'bg-emerald-500' : 'bg-zinc-400'
                          )}
                        />
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    {/* Last Login */}
                    <td className="px-4 py-2.5 text-[11px] text-[var(--text-muted)]">
                      {formatLastLogin(user.lastLoginAt)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Confirmation Modal for Role Reassignment */}
      <Modal
        isOpen={Boolean(pendingChange)}
        onClose={() => {
          if (!isUpdating) setPendingChange(null);
        }}
        title="Confirm Role Change"
        subtitle="Staff user role updates take effect across all sessions immediately."
        size="sm"
      >
        {pendingChange && (
          <div className="space-y-4 pt-2">
            {changeError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-[#B42318] dark:text-red-400 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{changeError}</span>
              </div>
            )}

            <div className="p-3.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border)] text-xs text-[var(--text)] space-y-1.5">
              <div>
                <span className="text-[var(--text-muted)]">Target User: </span>
                <span className="font-semibold">{pendingChange.user.fullName}</span> (@{pendingChange.user.username})
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[var(--text-muted)]">Current: </span>
                <span className="px-2 py-0.5 rounded bg-[var(--surface)] border border-[var(--border)] font-medium">
                  {pendingChange.user.role}
                </span>
                <span className="text-[var(--text-muted)]">→</span>
                <span className="px-2 py-0.5 rounded bg-[var(--brand-soft)] text-[var(--brand)] font-bold border border-[#EA6A3C]/25">
                  {pendingChange.newRoleName}
                </span>
              </div>
            </div>

            <p className="text-xs text-[var(--text-secondary)]">
              Are you sure you want to reassign this staff user to <strong>{pendingChange.newRoleName}</strong>?
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--border)]">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPendingChange(null)}
                disabled={isUpdating}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmChange}
                isLoading={isUpdating}
                className="bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white"
              >
                Confirm Reassignment
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
