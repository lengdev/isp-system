import React from 'react';
import { ArrowLeft, Plus, Save, Undo2 } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { cn } from '../../../lib/utils';

export interface MatrixHeaderProps {
  activeTab: 'permissions' | 'users';
  onTabChange: (tab: 'permissions' | 'users') => void;
  dirtyCount: number;
  isSaving: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onAddRole: () => void;
  onBack: () => void;
  canManage: boolean;
}

export const MatrixHeader: React.FC<MatrixHeaderProps> = ({
  activeTab,
  onTabChange,
  dirtyCount,
  isSaving,
  onSave,
  onDiscard,
  onAddRole,
  onBack,
  canManage,
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-[var(--border)]">
      {/* Left side: Back button & Title & Tabs */}
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to settings"
          className="flex items-center justify-center w-8 h-8 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--surface-subtle)] transition-colors shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text)]">
          Roles &amp; Permissions
        </h1>

        {/* Segmented Tabs [Permissions | Users] */}
        <div
          role="tablist"
          aria-label="Roles Navigation"
          className="flex items-center p-1 bg-[var(--surface-subtle)] border border-[var(--border)] rounded-xl"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'permissions'}
            onClick={() => onTabChange('permissions')}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-[-0.01em] transition-all select-none',
              activeTab === 'permissions'
                ? 'bg-[var(--surface)] text-[var(--text)] shadow-xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text)]'
            )}
          >
            Permissions
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'users'}
            onClick={() => onTabChange('users')}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-[-0.01em] transition-all select-none',
              activeTab === 'users'
                ? 'bg-[var(--surface)] text-[var(--text)] shadow-xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text)]'
            )}
          >
            Users
          </button>
        </div>
      </div>

      {/* Right side: Action Buttons */}
      <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
        {dirtyCount > 0 && (
          <button
            type="button"
            onClick={onDiscard}
            disabled={isSaving}
            className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[#B42318] transition-colors px-2 py-1 select-none disabled:opacity-50"
          >
            <Undo2 className="w-3.5 h-3.5" />
            Discard
          </button>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={onAddRole}
          disabled={!canManage || isSaving}
          className="gap-1.5 border-[var(--border)] text-[var(--text)] bg-[var(--surface)] hover:bg-[var(--surface-subtle)]"
        >
          <Plus className="w-4 h-4 text-[var(--brand)]" />
          <span>Add New Role</span>
        </Button>

        <Button
          variant="primary"
          size="sm"
          onClick={onSave}
          isLoading={isSaving}
          disabled={dirtyCount === 0 || !canManage || isSaving}
          className="gap-1.5 bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white shadow-xs font-semibold min-w-[130px]"
        >
          <Save className="w-4 h-4" />
          <span>
            {dirtyCount > 0 ? `Save Changes (${dirtyCount})` : 'Save Changes'}
          </span>
        </Button>
      </div>
    </div>
  );
};
