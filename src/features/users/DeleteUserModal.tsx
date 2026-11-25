import React, { useState, useEffect } from 'react';
import { AlertCircle, AlertTriangle, Trash2 } from 'lucide-react';
import { Modal, ModalFooter } from '../../components/ui/Modal';
import { Field, Input } from '../../components/ui/Field';
import { useStore } from '../../store/useStore';
import { api } from '../../lib/api';
import type { UserWithRoles } from '../../types/roles';

export interface DeleteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserWithRoles | null;
  onSuccess: () => Promise<void> | void;
}

const PRIVILEGED_ROLES = new Set(['SUPER_ADMIN', 'ADMINISTRATOR', 'MANAGER']);

export const DeleteUserModal: React.FC<DeleteUserModalProps> = ({
  isOpen,
  onClose,
  user,
  onSuccess,
}) => {
  const addToast = useStore((s) => s.addToast);
  const [confirmUsername, setConfirmUsername] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setConfirmUsername('');
      setServerError(null);
      setSubmitting(false);
    }
  }, [isOpen, user?.id]);

  if (!user) return null;

  const userRoles = Array.isArray(user.roles) && user.roles.length > 0 ? user.roles : [user.role];
  const isPrivileged = userRoles.some((r) => PRIVILEGED_ROLES.has(r));
  const requiresTypingUsername = isPrivileged;
  const isConfirmValid = !requiresTypingUsername || confirmUsername.trim() === user.username;
  const hasHistory = Boolean(user.hasAuditHistory);

  const handleDelete = async () => {
    if (!isConfirmValid) return;
    setServerError(null);
    setSubmitting(true);
    try {
      const res = await api.auth.deleteUser(user.id);
      addToast({
        type: 'success',
        title: res.softDeleted ? 'User Deactivated' : 'User Deleted',
        message: res.message,
      });
      await onSuccess();
      onClose();
    } catch (err: any) {
      setServerError(err?.message || 'Failed to delete user.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!submitting) onClose();
      }}
      size="sm"
      icon={<AlertTriangle className="w-5 h-5" />}
      iconColor="red"
      title="Delete User"
      subtitle={
        hasHistory
          ? 'Soft-delete applies because this user has audit history'
          : 'This user account will be permanently removed'
      }
      footer={
        <ModalFooter
          onCancel={() => {
            if (!submitting) onClose();
          }}
          onSubmit={handleDelete}
          submitText={hasHistory ? 'Deactivate User' : 'Delete User'}
          submitVariant="danger"
          submitIcon={<Trash2 className="w-4 h-4" />}
          isSubmitting={submitting}
          submitDisabled={!isConfirmValid}
        />
      }
    >
      <div className="space-y-3.5 text-xs">
        {serverError && (
          <div
            role="alert"
            className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-700 dark:text-rose-300 flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{serverError}</span>
          </div>
        )}

        <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
          Are you sure you want to delete{' '}
          <strong className="font-semibold text-[var(--text)]">{user.fullName}</strong>{' '}
          <span className="text-[var(--text-muted)]">(@{user.username})</span>?
        </p>

        {hasHistory ? (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-800 dark:text-amber-300 leading-relaxed">
            <strong>Audit history preserved:</strong> Because this user has existing audit records, deleting will deactivate the account (<code>isActive = false</code>) and revoke all active sessions instead of hard-deleting.
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border)] text-[var(--text-muted)] leading-relaxed">
            This user has no recorded audit history and will be permanently deleted.
          </div>
        )}

        {requiresTypingUsername && (
          <div className="p-3.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 space-y-2">
            <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 block">
              Privileged Account Confirmation
            </span>
            <p className="text-[11px] text-[var(--text-secondary)]">
              Type <strong className="font-semibold text-[var(--text)]">{user.username}</strong> to confirm deletion:
            </p>
            <Field>
              <Input
                value={confirmUsername}
                onChange={(e) => setConfirmUsername(e.target.value)}
                placeholder={user.username}
                aria-label="Confirm username"
              />
            </Field>
          </div>
        )}
      </div>
    </Modal>
  );
};
