import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import type { RoleItem } from '../types';

export interface RenameRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: RoleItem | null;
  existingRoles: RoleItem[];
  onSubmit: (id: string, data: { name: string; description?: string }) => Promise<void>;
}

export const RenameRoleModal: React.FC<RenameRoleModalProps> = ({
  isOpen,
  onClose,
  role,
  existingRoles,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (role) {
      setName(role.name);
      setDescription(role.description || '');
      setError(null);
    }
  }, [role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) return;

    const trimmed = name.trim();
    if (!trimmed) {
      setError('Role name is required');
      return;
    }

    const duplicate = existingRoles.some(
      (r) => r.id !== role.id && r.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) {
      setError(`A role named "${trimmed}" already exists`);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      await onSubmit(role.id, {
        name: trimmed,
        description: description.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to update role');
    } finally {
      setIsLoading(false);
    }
  };

  if (!role) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Role: ${role.name}`}
      subtitle="Update role title and description details."
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {error && (
          <div className="p-3 text-xs rounded-xl bg-red-500/10 border border-red-500/20 text-[#B42318] dark:text-red-400">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-[var(--text)] mb-1.5">
            Role Name <span className="text-[var(--brand)]">*</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError(null);
            }}
            className="w-full h-10 px-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-ring)] focus:border-[var(--brand)]"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--text)] mb-1.5">
            Description
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-ring)] focus:border-[var(--brand)] resize-none"
          />
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[var(--border)]">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isLoading}
            className="bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)]"
          >
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
};
