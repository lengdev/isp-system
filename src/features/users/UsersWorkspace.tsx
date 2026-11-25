import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { RefreshCw, Plus, KeyRound, Search } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '../../components/ui/Button';
import { Chip } from '../../components/ui/Chip';
import { Field, Input } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { Combobox, ComboboxOption } from '../../components/ui/Combobox';
import { useStore } from '../../store/useStore';
import { useCan } from '../../lib/permissions';
import { api } from '../../lib/api';
import type { RoleItem, UserWithRoles } from '../../types/roles';
import { BRAND_DOMAIN } from '../../lib/brand';

function formatRoleLabel(role: RoleItem): string {
  const normalized = role.name
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
  const displayName = role.name.includes('_') ? `${normalized} (${role.name})` : role.name;
  return role.description ? `${displayName} — ${role.description}` : displayName;
}

export interface UsersWorkspaceProps {
  embedded?: boolean;
  initialRoleFilter?: string | null;
  onManagePermissions?: (user: UserWithRoles) => void;
  showPermissionsButton?: boolean;
  externalAddSignal?: number;
  externalRefreshSignal?: number;
  onLoadingChange?: (loading: boolean) => void;
}

export const UsersWorkspace: React.FC<UsersWorkspaceProps> = ({
  embedded = false,
  initialRoleFilter = null,
  onManagePermissions,
  showPermissionsButton = false,
  externalAddSignal = 0,
  externalRefreshSignal = 0,
  onLoadingChange,
}) => {
  const queryClient = useQueryClient();
  const addToast = useStore((s) => s.addToast);
  const canManageUsers = useCan('users.manage');

  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [dbRoles, setDbRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>(initialRoleFilter || '');

  // Add User Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('');
  const [password, setPassword] = useState('Password123!');

  useEffect(() => {
    setRoleFilter(initialRoleFilter || '');
  }, [initialRoleFilter]);

  const roleOptions: ComboboxOption[] = useMemo(
    () =>
      dbRoles.map((r) => ({
        value: r.name,
        label: formatRoleLabel(r),
        shortLabel: r.name,
        badge: r.isSystem ? undefined : 'Custom',
      })),
    [dbRoles]
  );

  const filterRoleOptions: ComboboxOption[] = useMemo(
    () => [{ value: '', label: 'All Roles' }, ...dbRoles.map((r) => ({ value: r.name, label: r.name }))],
    [dbRoles]
  );

  const loadUsers = useCallback(async () => {
    setLoading(true);
    onLoadingChange?.(true);
    try {
      const [usersResult, matrixResult] = await Promise.allSettled([
        api.auth.getUsers(),
        api.roles.getMatrix(),
      ]);

      if (usersResult.status === 'fulfilled') {
        const val: any = usersResult.value;
        setUsers(Array.isArray(val) ? val : val?.items || []);
      } else {
        throw usersResult.reason;
      }

      if (matrixResult.status === 'fulfilled') {
        const fetchedRoles = matrixResult.value.roles || [];
        setDbRoles(fetchedRoles);
        setRole((prev) => {
          if (prev && fetchedRoles.some((r) => r.name === prev)) return prev;
          const preferred = fetchedRoles.find((r) => r.name === 'FIELD_TECHNICIAN' || r.name === 'TECHNICIAN');
          return preferred?.name || fetchedRoles[0]?.name || '';
        });
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed to load users', message: err.message });
    } finally {
      setLoading(false);
      onLoadingChange?.(false);
    }
  }, [addToast, onLoadingChange]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const openCreateModal = useCallback(() => {
    setUsername('');
    setEmail('');
    setFullName('');
    setPhone('');
    setPassword('Password123!');
    const preferred = dbRoles.find((r) => r.name === 'FIELD_TECHNICIAN' || r.name === 'TECHNICIAN');
    setRole((prev) => (prev && dbRoles.some((r) => r.name === prev) ? prev : preferred?.name || dbRoles[0]?.name || ''));
    setIsModalOpen(true);
  }, [dbRoles]);

  useEffect(() => {
    if (externalAddSignal > 0) {
      openCreateModal();
    }
  }, [externalAddSignal, openCreateModal]);

  useEffect(() => {
    if (externalRefreshSignal > 0) {
      loadUsers();
    }
  }, [externalRefreshSignal, loadUsers]);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return users.filter((u) => {
      const matchesSearch =
        !q ||
        u.fullName.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q);

      const userRoles = Array.isArray(u.roles) && u.roles.length > 0 ? u.roles : [u.role];
      const matchesRole = !roleFilter || userRoles.includes(roleFilter);

      return matchesSearch && matchesRole;
    });
  }, [users, searchQuery, roleFilter]);

  const handleCreateUser = async () => {
    if (!fullName.trim() || !username.trim() || !email.trim() || !role || !password) {
      addToast({
        type: 'error',
        title: 'Missing Required Fields',
        message: 'Please enter full name, username, email, role, and initial password.',
      });
      return;
    }

    setSubmitting(true);
    try {
      await api.auth.createUser({
        username: username.trim(),
        email: email.trim(),
        fullName: fullName.trim(),
        phone: phone.trim() || undefined,
        role,
        password,
      });
      addToast({ type: 'success', title: 'User Created', message: `${fullName.trim()} (${role}) added.` });
      setIsModalOpen(false);
      await loadUsers();
      queryClient.invalidateQueries({ queryKey: ['rolesUsers'] });
      queryClient.invalidateQueries({ queryKey: ['rolesMatrix'] });
    } catch (err: any) {
      addToast({ type: 'error', title: 'User Creation Failed', message: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {embedded && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[260px]">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search user by name, username or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-3 text-xs bg-[var(--surface)] border border-[var(--border)] rounded-xl text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
              />
            </div>
            <div className="w-48">
              <Combobox
                options={filterRoleOptions}
                value={roleFilter}
                onChange={(val) => setRoleFilter(val || '')}
                placeholder="Filter by role..."
                size="sm"
                clearable={Boolean(roleFilter)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadUsers} disabled={loading}>
              <RefreshCw className={loading ? 'animate-spin w-3.5 h-3.5' : 'w-3.5 h-3.5'} />
              <span>Refresh</span>
            </Button>
            {canManageUsers && (
              <Button variant="primary" size="sm" onClick={openCreateModal}>
                <Plus className="w-3.5 h-3.5" />
                <span>Add User</span>
              </Button>
            )}
          </div>
        </div>
      )}

      {!embedded && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search user by name, username or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 text-xs bg-[var(--surface)] border border-[var(--border)] rounded-xl text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
            />
          </div>
        </div>
      )}

      <div className="p-5 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[var(--text)]">Users</h3>
          <span className="text-xs text-[var(--text-muted)]">
            Showing {filteredUsers.length} of {users.length} users
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--text-muted)]">
                <th className="py-2.5 px-3">Full Name</th>
                <th className="py-2.5 px-3">Username</th>
                <th className="py-2.5 px-3">Email Address</th>
                <th className="py-2.5 px-3">Assigned Roles</th>
                <th className="py-2.5 px-3">Status</th>
                {showPermissionsButton && onManagePermissions && (
                  <th className="py-2.5 px-3 text-right">Permissions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={showPermissionsButton && onManagePermissions ? 6 : 5}
                    className="py-10 text-center text-xs text-[var(--text-muted)]"
                  >
                    {users.length === 0 ? 'No users yet' : 'No matching users'}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const displayRoles = Array.isArray(u.roles) && u.roles.length > 0 ? u.roles : [u.role];
                  return (
                    <tr key={u.id} className="hover:bg-[var(--surface-hover)]">
                      <td className="py-3 px-3 font-semibold text-[var(--text)]">{u.fullName}</td>
                      <td className="py-3 px-3 text-[var(--text-secondary)]">@{u.username}</td>
                      <td className="py-3 px-3 text-[var(--text-secondary)]">{u.email}</td>
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1">
                          {displayRoles.map((r) => (
                            <Chip
                              key={r}
                              size="sm"
                              color={
                                r === 'SUPER_ADMIN'
                                  ? 'danger'
                                  : r === 'ACCOUNTANT'
                                  ? 'secondary'
                                  : r === 'NETWORK_ENGINEER'
                                  ? 'warning'
                                  : 'default'
                              }
                            >
                              {r}
                            </Chip>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <Chip size="sm" color={u.isActive ? 'success' : 'default'}>
                          {u.isActive ? 'Active' : 'Disabled'}
                        </Chip>
                      </td>
                      {showPermissionsButton && onManagePermissions && (
                        <td className="py-3 px-3 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onManagePermissions(u)}
                            className="gap-1.5 text-xs"
                          >
                            <KeyRound className="w-3.5 h-3.5 text-[var(--brand)]" />
                            <span>Permissions</span>
                          </Button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD USER MODAL */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add User">
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Full Name">
              <Input placeholder="e.g. Sokha Meng" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </Field>
            <Field label="Username">
              <Input placeholder="e.g. sokha_tech" value={username} onChange={(e) => setUsername(e.target.value)} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Email Address">
              <Input placeholder={`sokha@${BRAND_DOMAIN}`} value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Field label="Phone Number">
              <Input placeholder="+855 12 333 444" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </Field>
          </div>

          <Field label="Role & Permissions">
            <Combobox
              options={roleOptions}
              value={role}
              onChange={(val) => setRole(val)}
              placeholder={loading ? 'Loading roles...' : 'Select a role...'}
              searchable={roleOptions.length > 6}
              clearable={false}
              loading={loading && roleOptions.length === 0}
              size="md"
            />
          </Field>

          <Field label="Initial Password">
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={submitting}>Cancel</Button>
            <Button variant="primary" onClick={handleCreateUser} disabled={submitting}>
              {submitting ? 'Creating...' : 'Create User'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
