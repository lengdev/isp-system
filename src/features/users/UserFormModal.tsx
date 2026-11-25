import React, { useState, useEffect, useMemo } from 'react';
import { AlertCircle, CheckCircle2, KeyRound, Mail, UserPlus, UserCog } from 'lucide-react';
import { Modal, ModalFooter } from '../../components/ui/Modal';
import { Field, Input } from '../../components/ui/Field';
import { Combobox, ComboboxOption } from '../../components/ui/Combobox';
import { Toggle } from '../../components/ui/Toggle';
import { Button } from '../../components/ui/Button';
import { useStore } from '../../store/useStore';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../lib/api';
import { BRAND_DOMAIN } from '../../lib/brand';
import { cn } from '../../lib/utils';
import type { RoleItem, UserWithRoles } from '../../types/roles';
import { formatRoleDisplayName } from './roleBadge';

export interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserWithRoles | null;
  roles: RoleItem[];
  rolesLoading?: boolean;
  onSuccess: () => Promise<void> | void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const UserFormModal: React.FC<UserFormModalProps> = ({
  isOpen,
  onClose,
  user,
  roles,
  rolesLoading = false,
  onSuccess,
}) => {
  const isEdit = Boolean(user);
  const addToast = useStore((s) => s.addToast);
  const currentUser = useAuthStore((s) => s.user);
  const actorIsSuperAdmin =
    currentUser?.role === 'SUPER_ADMIN' || Boolean(currentUser?.roles?.includes('SUPER_ADMIN'));

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);

  // Add mode password vs invite link
  const [onboardingMode, setOnboardingMode] = useState<'password' | 'invite'>('password');
  const [password, setPassword] = useState('');

  // Validation & server state
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Edit mode password reset
  const [sendingReset, setSendingReset] = useState(false);
  const [resetSentMessage, setResetSentMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setFieldErrors({});
    setServerError(null);
    setResetSentMessage(null);
    setSendingReset(false);

    if (user) {
      setFullName(user.fullName || '');
      setUsername(user.username || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      const userRoles =
        Array.isArray(user.roles) && user.roles.length > 0
          ? user.roles
          : user.role
            ? [user.role]
            : [];
      setSelectedRoles(userRoles);
      setIsActive(Boolean(user.isActive));
      setPassword('');
    } else {
      setFullName('');
      setUsername('');
      setEmail('');
      setPhone('');
      const preferred = roles.find(
        (r) => r.name === 'FIELD_TECHNICIAN' || r.name === 'TECHNICIAN'
      );
      setSelectedRoles(preferred ? [preferred.name] : roles[0] ? [roles[0].name] : []);
      setIsActive(true);
      setOnboardingMode('password');
      setPassword('');
    }
  }, [isOpen, user, roles]);

  const roleOptions: ComboboxOption[] = useMemo(
    () =>
      roles.map((r) => {
        const normalized = formatRoleDisplayName(r.name);
        const displayName = r.name.includes('_') ? `${normalized} (${r.name})` : r.name;
        const isSuperOption = r.name === 'SUPER_ADMIN';
        const isDisabled = isSuperOption && !actorIsSuperAdmin;
        return {
          value: r.name,
          label: r.description ? `${displayName} — ${r.description}` : displayName,
          shortLabel: r.name,
          badge: isDisabled ? 'Super Admin only' : r.isSystem ? undefined : 'Custom',
          disabled: isDisabled,
        };
      }),
    [roles, actorIsSuperAdmin]
  );

  const isSelf = Boolean(user && currentUser?.id === user.id);
  const isLastActiveSuper = Boolean(user?.isLastActiveSuperAdmin);
  const toggleDisabled = Boolean(isEdit && (isSelf || isLastActiveSuper));
  const toggleDisabledHint = isSelf
    ? 'You cannot deactivate your own account.'
    : isLastActiveSuper
      ? 'Cannot deactivate the last active SUPER_ADMIN account.'
      : undefined;

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!fullName.trim()) {
      errors.fullName = 'Full name is required.';
    }
    if (!isEdit) {
      if (!username.trim() || username.trim().length < 2) {
        errors.username = 'Username must be at least 2 characters.';
      }
    }
    if (!email.trim() || !EMAIL_REGEX.test(email.trim())) {
      errors.email = 'Enter a valid email address.';
    }
    if (selectedRoles.length === 0) {
      errors.roles = 'Select at least one role.';
    }
    if (!isEdit && onboardingMode === 'password') {
      if (!password || password.length < 8) {
        errors.password = 'Initial password must be at least 8 characters.';
      }
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    setServerError(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      if (isEdit && user) {
        await api.auth.updateUser(user.id, {
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          roles: selectedRoles,
          isActive,
        });
        addToast({
          type: 'success',
          title: 'User Updated',
          message: `Saved changes for ${fullName.trim()}.`,
        });
      } else {
        await api.auth.createUser({
          fullName: fullName.trim(),
          username: username.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          roles: selectedRoles,
          isActive,
          ...(onboardingMode === 'invite'
            ? { inviteByResetLink: true }
            : { password }),
        });
        addToast({
          type: 'success',
          title: 'User Created',
          message:
            onboardingMode === 'invite'
              ? `${fullName.trim()} added with a password reset invite link.`
              : `${fullName.trim()} added.`,
        });
      }

      await onSuccess();
      onClose();
    } catch (err: any) {
      setServerError(err?.message || `Failed to ${isEdit ? 'update' : 'create'} user.`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendPasswordReset = async () => {
    if (!user) return;
    setServerError(null);
    setResetSentMessage(null);
    setSendingReset(true);
    try {
      const res = await api.auth.resetUserPassword(user.id);
      const msg = res?.message || `Password reset link sent to ${user.email}.`;
      setResetSentMessage(msg);
      addToast({
        type: 'success',
        title: 'Password Reset Sent',
        message: msg,
      });
    } catch (err: any) {
      setServerError(err?.message || 'Failed to send password reset link.');
    } finally {
      setSendingReset(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!submitting && !sendingReset) onClose();
      }}
      title={isEdit ? 'Edit User' : 'Add User'}
      subtitle={
        isEdit && user
          ? `Update profile, role assignments, and access status for @${user.username}`
          : 'Create a new user account and assign roles'
      }
      icon={isEdit ? <UserCog className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
      iconColor="orange"
      size="md"
      footer={
        <ModalFooter
          onCancel={() => {
            if (!submitting && !sendingReset) onClose();
          }}
          onSubmit={handleSubmit}
          submitText={isEdit ? 'Save Changes' : 'Create User'}
          isSubmitting={submitting}
        />
      }
    >
      <div className="space-y-4 text-xs">
        {serverError && (
          <div
            role="alert"
            className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-700 dark:text-rose-300 flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{serverError}</span>
          </div>
        )}

        {resetSentMessage && (
          <div
            role="status"
            className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-300 flex items-start gap-2"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{resetSentMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Full Name" required error={fieldErrors.fullName}>
            <Input
              placeholder="e.g. Sokha Meng"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                if (fieldErrors.fullName) setFieldErrors((p) => ({ ...p, fullName: '' }));
              }}
              hasError={Boolean(fieldErrors.fullName)}
            />
          </Field>

          <Field
            label="Username"
            required={!isEdit}
            error={fieldErrors.username}
            helperText={isEdit ? 'Username is read-only' : undefined}
          >
            <Input
              placeholder="e.g. sokha_tech"
              value={username}
              disabled={isEdit}
              readOnly={isEdit}
              onChange={(e) => {
                setUsername(e.target.value);
                if (fieldErrors.username) setFieldErrors((p) => ({ ...p, username: '' }));
              }}
              hasError={Boolean(fieldErrors.username)}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Email Address" required error={fieldErrors.email}>
            <Input
              type="email"
              placeholder={`sokha@${BRAND_DOMAIN}`}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: '' }));
              }}
              hasError={Boolean(fieldErrors.email)}
            />
          </Field>

          <Field label="Phone Number">
            <Input
              placeholder="+855 12 333 444"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </Field>
        </div>

        <Field
          label="Roles"
          required
          error={fieldErrors.roles}
          helperText={
            !actorIsSuperAdmin
              ? 'SUPER_ADMIN role can only be assigned by a SUPER_ADMIN.'
              : undefined
          }
        >
          <Combobox
            options={roleOptions}
            value={selectedRoles}
            onChange={(val) => {
              const next = Array.isArray(val) ? val : val ? [val] : [];
              setSelectedRoles(next);
              if (fieldErrors.roles && next.length > 0) {
                setFieldErrors((p) => ({ ...p, roles: '' }));
              }
            }}
            multiple
            searchable={roleOptions.length > 5}
            clearable={false}
            placeholder={rolesLoading ? 'Loading roles...' : 'Select one or more roles...'}
            loading={rolesLoading && roleOptions.length === 0}
            error={fieldErrors.roles}
            size="md"
          />
        </Field>

        {/* Active Status Toggle */}
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border)]">
          <div className="min-w-0">
            <div className="text-[12px] font-semibold text-[var(--text)]">Account Active</div>
            <p className="text-[11px] text-[var(--text-muted)]">
              {toggleDisabledHint || 'Inactive accounts cannot sign in or refresh sessions.'}
            </p>
          </div>
          <Toggle
            checked={isActive}
            disabled={toggleDisabled}
            ariaLabel="Account Active"
            onChange={(checked) => setIsActive(checked)}
          />
        </div>

        {/* Add mode: Initial Password or Invite by Reset Link */}
        {!isEdit ? (
          <div className="space-y-3 p-3.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border)]">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-[12px] font-semibold text-[var(--text)]">
                Initial Access Setup
              </span>
              <div className="inline-flex items-center p-0.5 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => {
                    setOnboardingMode('password');
                    setFieldErrors((p) => ({ ...p, password: '' }));
                  }}
                  className={cn(
                    'px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors',
                    onboardingMode === 'password'
                      ? 'bg-[var(--brand)] text-white'
                      : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                  )}
                >
                  Set initial password
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOnboardingMode('invite');
                    setPassword('');
                    setFieldErrors((p) => ({ ...p, password: '' }));
                  }}
                  className={cn(
                    'px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors',
                    onboardingMode === 'invite'
                      ? 'bg-[var(--brand)] text-white'
                      : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                  )}
                >
                  Invite by reset link
                </button>
              </div>
            </div>

            {onboardingMode === 'password' ? (
              <Field label="Initial Password" required error={fieldErrors.password}>
                <Input
                  type="password"
                  placeholder="Minimum 8 characters"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: '' }));
                  }}
                  hasError={Boolean(fieldErrors.password)}
                />
              </Field>
            ) : (
              <div className="flex items-start gap-2 text-[11px] text-[var(--text-secondary)]">
                <Mail className="w-4 h-4 text-[var(--brand)] shrink-0 mt-0.5" />
                <span>
                  Generates a one-time password reset link so the user can set their own password on first sign-in.
                </span>
              </div>
            )}
          </div>
        ) : (
          /* Edit mode: Send Password Reset button */
          <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border)]">
            <div className="min-w-0">
              <div className="text-[12px] font-semibold text-[var(--text)]">Password Recovery</div>
              <p className="text-[11px] text-[var(--text-muted)]">
                Issue a one-time reset link for {user?.email}.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSendPasswordReset}
              isLoading={sendingReset}
              disabled={submitting || sendingReset}
              className="gap-1.5 shrink-0"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Send password reset</span>
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
};
