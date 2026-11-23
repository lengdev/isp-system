import React, { useState, useEffect } from 'react';
import { Users, Shield, Plus, RefreshCw, Key, CheckCircle2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Chip } from '../components/ui/Chip';
import { Field, Input } from '../components/ui/Field';
import { Modal } from '../components/ui/Modal';
import { Combobox, ComboboxOption } from '../components/ui/Combobox';
import { useStore } from '../store/useStore';
import { api } from '../lib/api';

const ROLE_OPTIONS: ComboboxOption[] = [
  { value: 'SUPER_ADMIN', label: 'Super Admin (Full Access)' },
  { value: 'ADMINISTRATOR', label: 'Administrator' },
  { value: 'ACCOUNTANT', label: 'Accountant (General Ledger, Billing, P&L)' },
  { value: 'CASHIER', label: 'Cashier (Payment Collections)' },
  { value: 'NETWORK_ENGINEER', label: 'Network Engineer (MikroTik, PPPoE, VLAN, IPAM)' },
  { value: 'TECHNICIAN', label: 'Technician (Installations & Tickets)' },
  { value: 'SALES_STAFF', label: 'Sales Staff' },
  { value: 'WAREHOUSE_MANAGER', label: 'Warehouse Manager' },
];

export const StaffUsersPage: React.FC = () => {
  const addToast = useStore((s) => s.addToast);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // New User Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('TECHNICIAN');
  const [password, setPassword] = useState('Password123!');

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await api.auth.getUsers();
      setUsers(data);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed to load staff users', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreateUser = async () => {
    try {
      await api.auth.createUser({ username, email, fullName, phone, role, password });
      addToast({ type: 'success', title: 'User Account Created', message: `${fullName} (${role}) added.` });
      setIsModalOpen(false);
      loadUsers();
    } catch (err: any) {
      addToast({ type: 'error', title: 'User Creation Failed', message: err.message });
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
          <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)}>
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
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-[var(--surface-hover)]">
                  <td className="py-3 px-3 font-sans font-bold text-[var(--text)]">{u.fullName}</td>
                  <td className="py-3 px-3 font-bold text-[var(--brand)]">{u.username}</td>
                  <td className="py-3 px-3 text-[var(--text-secondary)]">{u.email}</td>
                  <td className="py-3 px-3">
                    <Chip size="sm" color={u.role === 'SUPER_ADMIN' ? 'danger' : u.role === 'ACCOUNTANT' ? 'secondary' : u.role === 'NETWORK_ENGINEER' ? 'warning' : 'default'}>
                      {u.role}
                    </Chip>
                  </td>
                  <td className="py-3 px-3">
                    <Chip size="sm" color={u.isActive ? 'success' : 'default'}>
                      {u.isActive ? 'Active' : 'Disabled'}
                    </Chip>
                  </td>
                </tr>
              ))}
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
              <Input placeholder="sokha@netpulse.net" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Field label="Phone Number">
              <Input placeholder="+855 12 333 444" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </Field>
          </div>

          <Field label="Role & Permissions">
            <Combobox
              options={ROLE_OPTIONS}
              value={role}
              onChange={(val) => setRole(val)}
              searchable={ROLE_OPTIONS.length > 6}
              clearable={false}
              size="sm"
            />
          </Field>

          <Field label="Initial Password">
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreateUser}>Create Account</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
