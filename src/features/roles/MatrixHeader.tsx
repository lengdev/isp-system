import React from 'react';
import { ArrowLeft, Plus, Save, Undo2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { cn } from '../../lib/utils';

export interface MatrixHeaderProps {
  activeTab: 'permissions' | 'users' | 'features';
  onTabChange: (tab: 'permissions' | 'users' | 'features') => void;
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
    <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4 pb-5 border-b border-[var(--border)]">
      {/* Left side: Back button & Title & Tabs */}
      <div className="flex flex-wrap items-center gap-3 sm:gap-4 min-w-0">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to settings"
          className="flex items-center justify-center w-8 h-8 shrink-0 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--surface-subtle)] transition-colors shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text)] whitespace-nowrap">
          Roles &amp; Permissions
        </h1>

        {/* Segmented Tabs [Permissions | Users | Menus & Features] */}
        <div
          role="tablist"
          aria-label="Roles Navigation"
          className="inline-flex items-center p-1 bg-[var(--surface-subtle)] border border-[var(--border)] rounded-xl shrink-0 max-w-full overflow-x-auto scrollbar-none"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'permissions'}
            onClick={() => onTabChange('permissions')}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-[-0.01em] transition-all select-none whitespace-nowrap shrink-0',
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
              'px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-[-0.01em] transition-all select-none whitespace-nowrap shrink-0',
              activeTab === 'users'
                ? 'bg-[var(--surface)] text-[var(--text)] shadow-xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text)]'
            )}
          >
            Users
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'features'}
            onClick={() => onTabChange('features')}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-[-0.01em] transition-all select-none whitespace-nowrap shrink-0',
              activeTab === 'features'
                ? 'bg-[var(--surface)] text-[var(--text)] shadow-xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text)]'
            )}
          >
            Menus &amp; Features
          </button>
        </div>
      </div>

      {/* Right side: Action Buttons */}
      <div className="flex items-center gap-2.5 ml-auto shrink-0 flex-wrap sm:flex-nowrap justify-end">
        {dirtyCount > 0 && (
          <button
            type="button"
            onClick={onDiscard}
            disabled={isSaving}
            className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[#B42318] transition-colors px-2 py-1 select-none whitespace-nowrap shrink-0 disabled:opacity-50"
          >
            <Undo2 className="w-3.5 h-3.5 shrink-0" />
            Discard
          </button>
        )}

        {activeTab === 'permissions' && (
          <Button
            variant="outline"
            size="sm"
            onClick={onAddRole}
            disabled={!canManage || isSaving}
            className="gap-1.5 border-[var(--border)] text-[var(--text)] bg-[var(--surface)] hover:bg-[var(--surface-subtle)] whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4 text-[var(--brand)] shrink-0" />
            <span>Add New Role</span>
          </Button>
        )}

        <Button
          variant="primary"
          size="sm"
          onClick={onSave}
          isLoading={isSaving}
          disabled={dirtyCount === 0 || !canManage || isSaving}
          className="gap-1.5 bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white shadow-xs font-semibold min-w-[130px] whitespace-nowrap shrink-0"
        >
          <Save className="w-4 h-4 shrink-0" />
          <span>
            {dirtyCount > 0 ? `Save Changes (${dirtyCount})` : 'Save Changes'}
          </span>
        </Button>
      </div>
    </div>
  );
};
