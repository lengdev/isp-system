import React, { useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Combobox } from '../../../components/ui/Combobox';
import type { RoleItem } from '../types';

export interface AddRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingRoles: RoleItem[];
  onSubmit: (data: { name: string; description?: string; copyFromRoleId?: string }) => Promise<void>;
}

export const AddRoleModal: React.FC<AddRoleModalProps> = ({
  isOpen,
  onClose,
  existingRoles,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [copyFromRoleId, setCopyFromRoleId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const resetForm = () => {
    setName('');
    setDescription('');
    setCopyFromRoleId('');
    setError(null);
    setIsLoading(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Role name is required');
      return;
    }

    const duplicate = existingRoles.some(
      (r) => r.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) {
      setError(`A role named "${trimmed}" already exists`);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      await onSubmit({
        name: trimmed,
        description: description.trim() || undefined,
        copyFromRoleId: copyFromRoleId || undefined,
      });
      handleClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to create role');
    } finally {
      setIsLoading(false);
    }
  };

  const roleOptions = existingRoles.map((r) => ({
    value: r.id,
    label: r.name,
    description: r.description || undefined,
  }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add New Role"
      subtitle="Define a custom role with tailored module permissions."
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
            placeholder="e.g. NOC_SUPERVISOR or REGIONAL_MANAGER"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError(null);
            }}
            className="w-full h-10 px-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-ring)] focus:border-[var(--brand)] transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--text)] mb-1.5">
            Description
          </label>
          <textarea
            rows={2}
            placeholder="Describe the responsibilities and scope of this role..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-ring)] focus:border-[var(--brand)] transition-colors resize-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--text)] mb-1.5">
            Copy permissions from (Optional)
          </label>
          <Combobox
            options={roleOptions}
            value={copyFromRoleId}
            onChange={(val) => setCopyFromRoleId(val || '')}
            placeholder="Select a template role (Optional)"
            clearable
          />
          <p className="mt-1 text-[11px] text-[var(--text-muted)]">
            Initializes the new role with the exact permissions matrix of the selected role.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[var(--border)]">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClose}
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
            Create Role
          </Button>
        </div>
      </form>
    </Modal>
  );
};
