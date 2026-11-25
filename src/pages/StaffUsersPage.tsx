import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCw, Plus } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Chip } from '../components/ui/Chip';
import { Field, Input } from '../components/ui/Field';
import { Modal } from '../components/ui/Modal';
import { Combobox, ComboboxOption } from '../components/ui/Combobox';
import { useStore } from '../store/useStore';
import { api } from '../lib/api';
import type { RoleItem } from '../types/roles';
import { BRAND_DOMAIN } from '../lib/brand';

function formatRoleLabel(role: RoleItem): string {
  const normalized = role.name
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
  const displayName = role.name.includes('_') ? `${normalized} (${role.name})` : role.name;
  return role.description ? `${displayName} — ${role.description}` : displayName;
}

export const StaffUsersPage: React.FC = () => {
  const addToast = useStore((s) => s.addToast);
  const [users, setUsers] = useState<any[]>([]);
  const [dbRoles, setDbRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // New User Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('');
  const [password, setPassword] = useState('Password123!');

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

  const loadUsers = async () => {
    setLoading(true);
    try {
      const [usersResult, matrixResult] = await Promise.allSettled([
        api.auth.getUsers(),
        api.roles.getMatrix(),
      ]);

      if (usersResult.status === 'fulfilled') {
        setUsers(usersResult.value);
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
      addToast({ type: 'error', title: 'Failed to load staff users', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const openCreateModal = () => {
    setUsername('');
    setEmail('');
    setFullName('');
    setPhone('');
    setPassword('Password123!');
    const preferred = dbRoles.find((r) => r.name === 'FIELD_TECHNICIAN' || r.name === 'TECHNICIAN');
    setRole((prev) => (prev && dbRoles.some((r) => r.name === prev) ? prev : preferred?.name || dbRoles[0]?.name || ''));
    setIsModalOpen(true);
  };

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
      addToast({ type: 'success', title: 'User Account Created', message: `${fullName.trim()} (${role}) added.` });
      setIsModalOpen(false);
      await loadUsers();
    } catch (err: any) {
      addToast({ type: 'error', title: 'User Creation Failed', message: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 select-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-[24px] leading-tight font-semibold text-[var(--text)] tracking-tight">
            Staff & Role-Based Access Control (RBAC)
          </h2>
          <p className="text-[13px] text-[var(--text-muted)] mt-0.5">
            Manage administrative operators, field engineers, finance accountants, and cashiers
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="outline" size="sm" onClick={loadUsers} disabled={loading}>
            <RefreshCw className={loading ? 'animate-spin w-4 h-4' : 'w-4 h-4'} />
            <span>Refresh</span>
          </Button>
          <Button variant="primary" size="sm" onClick={openCreateModal}>
            <Plus className="w-4 h-4" />
            <span>Add Staff Member</span>
          </Button>
        </div>
      </div>

      <div className="p-5 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-card)]">
        <h3 className="text-sm font-bold text-[var(--text)] uppercase tracking-wider mb-4">Active Staff Accounts</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--text-muted)]">
                <th className="py-2.5 px-3">Full Name</th>
                <th className="py-2.5 px-3">Username</th>
                <th className="py-2.5 px-3">Email Address</th>
                <th className="py-2.5 px-3">Assigned Role</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {users.map((u) => {
                const displayRole = Array.isArray(u.roles) && u.roles.length > 0 ? u.roles[0] : u.role;
                return (
                  <tr key={u.id} className="hover:bg-[var(--surface-hover)]">
                    <td className="py-3 px-3 font-sans font-bold text-[var(--text)]">{u.fullName}</td>
                    <td className="py-3 px-3 font-bold text-[var(--brand)]">{u.username}</td>
                    <td className="py-3 px-3 text-[var(--text-secondary)]">{u.email}</td>
                    <td className="py-3 px-3">
                      <Chip size="sm" color={displayRole === 'SUPER_ADMIN' ? 'danger' : displayRole === 'ACCOUNTANT' ? 'secondary' : displayRole === 'NETWORK_ENGINEER' ? 'warning' : 'default'}>
                        {displayRole}
                      </Chip>
                    </td>
                    <td className="py-3 px-3">
                      <Chip size="sm" color={u.isActive ? 'success' : 'default'}>
                        {u.isActive ? 'Active' : 'Disabled'}
                      </Chip>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD USER MODAL */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Staff Account">
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
              {submitting ? 'Creating...' : 'Create Account'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
