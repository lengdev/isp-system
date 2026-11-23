import React, { useState } from 'react';
import { Bookmark, Plus, Check, Trash2, Edit2, Share2, Star } from 'lucide-react';
import { Popover } from '../Popover';
import { Button } from '../Button';
import { SavedTableView } from './types';
import { cn } from '../../../lib/utils';

interface DataTableSavedViewsProps {
  views: SavedTableView[];
  activeViewId: string | null;
  onSelectView: (view: SavedTableView) => void;
  onSaveCurrentView: (name: string) => void;
  onDeleteView: (id: string) => void;
  onSetDefaultView: (id: string) => void;
  onShareViewUrl: () => void;
}

export const DataTableSavedViews: React.FC<DataTableSavedViewsProps> = ({
  views,
  activeViewId,
  onSelectView,
  onSaveCurrentView,
  onDeleteView,
  onSetDefaultView,
  onShareViewUrl,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [newViewName, setNewViewName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newViewName.trim()) return;
    onSaveCurrentView(newViewName.trim());
    setNewViewName('');
    setIsCreating(false);
  };

  const activeView = views.find((v) => v.id === activeViewId);

  return (
    <Popover
      align="right"
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      trigger={
        <button
          type="button"
          className={cn(
            'h-8 flex items-center gap-1.5 px-3 rounded-[8px] border text-[12px] font-medium transition-colors shadow-xs select-none whitespace-nowrap',
            activeView && !activeView.isDefault
              ? 'border-[var(--brand)]/40 text-[var(--brand)] bg-[var(--brand-soft)]'
              : 'border-gray-200/90 dark:border-gray-800 bg-white dark:bg-[#1C1C1F] text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
          )}
          title="Saved Table Views"
        >
          <Bookmark className="w-3.5 h-3.5 stroke-[1.75]" />
          <span className="truncate max-w-[100px]">{activeView ? activeView.name : 'Views'}</span>
        </button>
      }
      content={
        <div className="w-72 p-3.5 select-none space-y-3 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
            <span className="font-semibold text-gray-900 dark:text-gray-100 text-[12px]">
              Saved Views
            </span>
            <button
              type="button"
              onClick={onShareViewUrl}
              className="flex items-center gap-1 text-[11px] text-[#F26B3A] hover:underline"
              title="Copy link to current view"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share URL</span>
            </button>
          </div>

          {/* List of saved views */}
          <div className="flex flex-col gap-[2px] max-h-56 overflow-y-auto">
            {views.map((view) => {
              const isSelected = view.id === activeViewId;
              return (
                <div
                  key={view.id}
                  onClick={() => {
                    onSelectView(view);
                    setIsOpen(false);
                  }}
                  className={cn(
                    'group flex items-center justify-between px-2.5 py-2 rounded-[8px] cursor-pointer transition-colors duration-[120ms] text-xs font-medium border select-none',
                    isSelected
                      ? 'bg-[var(--option-selected-bg)] text-[var(--option-selected-text)] border-[var(--option-selected-border)] hover:bg-[var(--option-selected-hover-bg)]'
                      : 'border-transparent hover:bg-[var(--option-hover-bg)] text-[var(--text-secondary)] hover:text-[var(--text)]'
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {view.isDefault && (
                      <Star className="w-3 h-3 fill-amber-400 stroke-amber-400 shrink-0" />
                    )}
                    <span className="truncate">{view.name}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {isSelected && (
                      <Check className="w-4 h-4 text-[var(--option-selected-icon)] stroke-[2]" />
                    )}
                    <div
                      className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {!view.isDefault && (
                        <button
                          type="button"
                          onClick={() => onSetDefaultView(view.id)}
                          className="p-1 text-gray-400 hover:text-amber-500 rounded"
                          title="Set as default view"
                        >
                          <Star className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onDeleteView(view.id)}
                        className="p-1 text-gray-400 hover:text-red-600 rounded"
                        title="Delete view"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Create new view form */}
          {isCreating ? (
            <form onSubmit={handleSave} className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800">
              <input
                type="text"
                value={newViewName}
                onChange={(e) => setNewViewName(e.target.value)}
                placeholder="Name this view..."
                className="w-full h-8 px-3 rounded-full border border-transparent hover:border-zinc-300/80 dark:hover:border-white/20 text-xs bg-zinc-100/90 dark:bg-white/[0.06] text-gray-900 dark:text-gray-100 focus:outline-none focus:border-[#006FEE] focus:ring-1 focus:ring-[#006FEE]/20 transition-all caret-[#006FEE]"
                autoFocus
              />
              <div className="flex justify-end gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="h-7 px-2 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  type="submit"
                  disabled={!newViewName.trim()}
                  className="h-7 px-2.5 text-xs font-semibold"
                >
                  Save View
                </Button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setIsCreating(true)}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:text-[#F26B3A] hover:border-[#F26B3A]/40 text-xs font-medium transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Save Current View</span>
            </button>
          )}
        </div>
      }
    />
  );
};
