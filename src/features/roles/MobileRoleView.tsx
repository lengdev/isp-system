import React, { useState, useMemo } from 'react';
import { Search, ChevronDown, ChevronRight, Info, Lock } from 'lucide-react';
import { Combobox } from '../../components/ui/Combobox';
import { Tooltip } from '../../components/ui/Tooltip';
import { Toggle } from '../../components/ui/Toggle';
import type { RoleItem, PermissionItem } from '../../types/roles';
import { cn } from '../../lib/utils';

export interface MobileRoleViewProps {
  roles: RoleItem[];
  permissions: PermissionItem[];
  initialMatrix: Record<string, string[]>;
  currentMatrix: Record<string, string[]>;
  canManage: boolean;
  onToggleCell: (roleId: string, permissionKey: string, nextChecked: boolean) => void;
}

export const MobileRoleView: React.FC<MobileRoleViewProps> = ({
  roles,
  permissions,
  initialMatrix,
  currentMatrix,
  canManage,
  onToggleCell,
}) => {
  const [selectedRoleId, setSelectedRoleId] = useState<string>(roles[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const selectedRole = roles.find((r) => r.id === selectedRoleId) || roles[0];
  const isSuperAdmin = selectedRole?.name === 'SUPER_ADMIN';

  const roleOptions = roles.map((r) => ({
    value: r.id,
    label: r.name,
    description: `${r.userCount} users • ${r.isSystem ? 'System' : 'Custom'}`,
  }));

  // Group permissions
  const grouped = useMemo(() => {
    const map = new Map<string, PermissionItem[]>();
    for (const p of permissions) {
      if (!map.has(p.group)) map.set(p.group, []);
      map.get(p.group)!.push(p);
    }
    const result: { name: string; items: PermissionItem[] }[] = [];
    for (const [name, items] of map.entries()) {
      result.push({ name, items });
    }
    return result;
  }, [permissions]);

  const filteredGroups = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return grouped;
    return grouped
      .map((g) => ({
        ...g,
        items: g.items.filter(
          (p) =>
            p.label.toLowerCase().includes(q) ||
            p.key.toLowerCase().includes(q) ||
            (p.description && p.description.toLowerCase().includes(q))
        ),
      }))
      .filter((g) => g.items.length > 0);
  }, [grouped, searchQuery]);

  const toggleGroup = (name: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const currentRolePerms = new Set(selectedRole ? currentMatrix[selectedRole.id] || [] : []);
  const initialRolePerms = new Set(selectedRole ? initialMatrix[selectedRole.id] || [] : []);

  return (
    <div className="flex flex-col gap-4">
      {/* Role Picker Card */}
      <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-xs">
        <label className="block text-xs font-semibold text-[var(--text)] mb-1.5">
          Select Role to Configure
        </label>
        <Combobox
          options={roleOptions}
          value={selectedRoleId}
          onChange={(val) => setSelectedRoleId(val || '')}
          clearable={false}
        />
        {selectedRole && (
          <div className="mt-2 text-xs text-[var(--text-secondary)]">
            <span className="font-medium text-[var(--text)]">{selectedRole.name}</span>
            {selectedRole.description && ` — ${selectedRole.description}`}
          </div>
        )}
      </div>

      {/* Permission Search */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          placeholder="Filter permissions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-9 pl-9 pr-3 text-xs bg-[var(--surface)] border border-[var(--border)] rounded-xl text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
        />
      </div>

      {/* Single-Column Toggle List */}
      <div className="space-y-3">
        {filteredGroups.map((group) => {
          const isCollapsed = Boolean(collapsedGroups[group.name]) && !searchQuery.trim();

          return (
            <div
              key={group.name}
              className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] overflow-hidden shadow-xs"
            >
              <button
                type="button"
                onClick={() => toggleGroup(group.name)}
                className="w-full flex items-center justify-between p-3.5 bg-[var(--surface-subtle)] text-left hover:bg-[#F1F0EC] dark:hover:bg-[#22252B] transition-colors"
              >
                <div className="flex items-center gap-2">
                  {isCollapsed ? (
                    <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
                  )}
                  <span className="text-xs font-bold text-[var(--text)]">
                    {group.name}
                  </span>
                </div>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)]">
                  {group.items.length}
                </span>
              </button>

              {!isCollapsed && (
                <div className="divide-y divide-[var(--border-subtle)]">
                  {group.items.map((perm) => {
                    const isChecked = isSuperAdmin ? true : currentRolePerms.has(perm.key);
                    const wasChecked = isSuperAdmin ? true : initialRolePerms.has(perm.key);
                    const isDirty = !isSuperAdmin && isChecked !== wasChecked;

                    return (
                      <div
                        key={perm.key}
                        className="flex items-center justify-between p-3 hover:bg-[var(--surface-subtle)] transition-colors gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-medium text-[var(--text)] truncate">
                              {perm.label}
                            </span>
                            {perm.description && (
                              <Tooltip content={perm.description} position="top">
                                <Info className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
                              </Tooltip>
                            )}
                            {isDirty && (
                              <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand)] shrink-0" />
                            )}
                          </div>
                          <div className="text-[10px] text-[var(--text-muted)] truncate">
                            {perm.key}
                          </div>
                        </div>

                        {isSuperAdmin ? (
                          <div className="flex items-center gap-1 text-[11px] text-[var(--brand)] font-medium">
                            <Lock className="w-3 h-3" />
                            <span>Full Access</span>
                          </div>
                        ) : (
                          <Toggle
                            checked={isChecked}
                            disabled={!canManage}
                            onChange={(nextChecked) => {
                              if (selectedRole) {
                                onToggleCell(selectedRole.id, perm.key, nextChecked);
                              }
                            }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
