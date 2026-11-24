import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  ChevronDown,
  ChevronRight,
  Info,
  MoreVertical,
  Copy,
  Edit2,
  Trash2,
  Users,
  Lock,
} from 'lucide-react';
import { Tooltip } from '../../../components/ui/Tooltip';
import { MatrixCheckbox } from './MatrixCheckbox';
import { computeTriState } from '../utils/matrixUtils';
import type { RoleItem, PermissionItem, CellCoord } from '../types';
import { cn } from '../../../lib/utils';

export interface PermissionsMatrixProps {
  roles: RoleItem[];
  permissions: PermissionItem[];
  initialMatrix: Record<string, string[]>;
  currentMatrix: Record<string, string[]>;
  canManage: boolean;
  onToggleCell: (roleId: string, permissionKey: string, nextChecked: boolean) => void;
  onToggleGroup: (roleId: string, groupKeys: string[], nextChecked: boolean) => void;
  onRangeSelect?: (roleId: string, startKey: string, endKey: string, checked: boolean) => void;
  onRenameRole: (role: RoleItem) => void;
  onDuplicateRole: (role: RoleItem) => void;
  onDeleteRole: (role: RoleItem) => void;
  onViewUsers: (roleName: string) => void;
  focusedColumnId?: string;
}

export const PermissionsMatrix: React.FC<PermissionsMatrixProps> = ({
  roles,
  permissions,
  initialMatrix,
  currentMatrix,
  canManage,
  onToggleCell,
  onToggleGroup,
  onRangeSelect,
  onRenameRole,
  onDuplicateRole,
  onDeleteRole,
  onViewUsers,
  focusedColumnId,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [hoveredPermKey, setHoveredPermKey] = useState<string | null>(null);
  const [hoveredRoleId, setHoveredRoleId] = useState<string | null>(null);
  const [activeMenuRoleId, setActiveMenuRoleId] = useState<string | null>(null);

  // Keyboard navigation & range selection state
  const [focusedCoord, setFocusedCoord] = useState<{ roleIdx: number; permIdx: number } | null>(null);
  const [lastSelectedCell, setLastSelectedCell] = useState<{ roleId: string; permKey: string } | null>(null);

  const gridContainerRef = useRef<HTMLDivElement>(null);

  // Group permissions by module
  const groupedPermissions = useMemo(() => {
    const groups: { name: string; items: PermissionItem[] }[] = [];
    const groupMap = new Map<string, PermissionItem[]>();

    for (const p of permissions) {
      if (!groupMap.has(p.group)) {
        groupMap.set(p.group, []);
      }
      groupMap.get(p.group)!.push(p);
    }

    for (const [name, items] of groupMap.entries()) {
      groups.push({ name, items });
    }

    return groups;
  }, [permissions]);

  // Filtered groups based on search query
  const filteredGroups = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return groupedPermissions;

    return groupedPermissions
      .map((g) => ({
        ...g,
        items: g.items.filter(
          (p) =>
            p.label.toLowerCase().includes(q) ||
            p.key.toLowerCase().includes(q) ||
            (p.description && p.description.toLowerCase().includes(q)) ||
            g.name.toLowerCase().includes(q)
        ),
      }))
      .filter((g) => g.items.length > 0);
  }, [groupedPermissions, searchQuery]);

  // Auto-expand groups when searching
  const isGroupCollapsed = useCallback(
    (groupName: string) => {
      if (searchQuery.trim().length > 0) return false;
      return Boolean(collapsedGroups[groupName]);
    },
    [collapsedGroups, searchQuery]
  );

  const toggleGroupCollapse = (groupName: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  // Flat list of currently visible permissions for keyboard navigation
  const visiblePermissions = useMemo(() => {
    const list: PermissionItem[] = [];
    for (const group of filteredGroups) {
      if (!isGroupCollapsed(group.name)) {
        for (const p of group.items) {
          list.push(p);
        }
      }
    }
    return list;
  }, [filteredGroups, isGroupCollapsed]);

  // Auto-scroll to newly added role column if requested
  useEffect(() => {
    if (focusedColumnId && gridContainerRef.current) {
      const colEl = gridContainerRef.current.querySelector(`[data-role-col="${focusedColumnId}"]`);
      if (colEl) {
        colEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [focusedColumnId]);

  // Global click listener to dismiss role dropdown menus
  useEffect(() => {
    const handleGlobalClick = () => setActiveMenuRoleId(null);
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  // Keyboard navigation inside grid
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!focusedCoord || visiblePermissions.length === 0 || roles.length === 0) {
      return;
    }

    const { roleIdx, permIdx } = focusedCoord;

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedCoord({
        roleIdx,
        permIdx: Math.max(0, permIdx - 1),
      });
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedCoord({
        roleIdx,
        permIdx: Math.min(visiblePermissions.length - 1, permIdx + 1),
      });
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setFocusedCoord({
        roleIdx: Math.max(0, roleIdx - 1),
        permIdx,
      });
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setFocusedCoord({
        roleIdx: Math.min(roles.length - 1, roleIdx + 1),
        permIdx,
      });
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      const currentRole = roles[roleIdx];
      const currentPerm = visiblePermissions[permIdx];
      if (currentRole && currentPerm && currentRole.name !== 'SUPER_ADMIN' && canManage) {
        const rolePerms = new Set(currentMatrix[currentRole.id] || []);
        const nextChecked = !rolePerms.has(currentPerm.key);
        onToggleCell(currentRole.id, currentPerm.key, nextChecked);
        setLastSelectedCell({ roleId: currentRole.id, permKey: currentPerm.key });
      }
    } else if (e.key === 'Escape') {
      setActiveMenuRoleId(null);
    }
  };

  // Range selection on click with Shift
  const handleCellClick = (
    role: RoleItem,
    perm: PermissionItem,
    e: React.MouseEvent
  ) => {
    if (role.name === 'SUPER_ADMIN' || !canManage) return;

    const rolePerms = new Set(currentMatrix[role.id] || []);
    const isCurrentlyChecked = rolePerms.has(perm.key);
    const nextChecked = !isCurrentlyChecked;

    if (e.shiftKey && lastSelectedCell && lastSelectedCell.roleId === role.id && onRangeSelect) {
      onRangeSelect(role.id, lastSelectedCell.permKey, perm.key, nextChecked);
    } else {
      onToggleCell(role.id, perm.key, nextChecked);
    }

    setLastSelectedCell({ roleId: role.id, permKey: perm.key });
  };

  // Highlight search text helper
  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={i} className="bg-[var(--brand-soft)] text-[var(--brand)] font-semibold rounded px-0.5">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  return (
    <div
      ref={gridContainerRef}
      role="grid"
      aria-label="Roles and Permissions Matrix"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-[var(--shadow-card)] overflow-x-auto focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
    >
      <table className="w-full border-collapse text-left select-none min-w-[760px]">
        {/* Sticky Header Row */}
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--surface)] h-12 sticky top-0 z-30 shadow-[0_1px_0_0_var(--border)]">
            {/* Sticky Left Search Header */}
            <th className="sticky left-0 z-40 bg-[var(--surface)] w-[280px] min-w-[280px] max-w-[280px] px-3.5 py-2 border-r border-[var(--border)] shadow-[1px_0_0_0_var(--border)]">
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-2.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search permission..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-8 pl-8 pr-3 text-xs bg-[var(--surface-subtle)] border border-[var(--border)] rounded-lg text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--brand)] focus:border-[var(--brand)] transition-colors"
                />
              </div>
            </th>

            {/* Role Columns Headers */}
            {roles.map((role, colIdx) => {
              const isSuperAdmin = role.name === 'SUPER_ADMIN';
              const isColHovered = hoveredRoleId === role.id;
              const isMenuOpen = activeMenuRoleId === role.id;

              return (
                <th
                  key={role.id}
                  data-role-col={role.id}
                  onMouseEnter={() => setHoveredRoleId(role.id)}
                  onMouseLeave={() => setHoveredRoleId(null)}
                  className={cn(
                    'px-4 py-2 min-w-[145px] max-w-[200px] text-center border-r border-[var(--border)] transition-colors relative group',
                    isColHovered ? 'bg-[var(--surface-subtle)]' : 'bg-[var(--surface)]'
                  )}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex-1 text-center truncate">
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-xs font-semibold text-[var(--text)] truncate">
                          {role.name}
                        </span>
                        {isSuperAdmin && (
                          <Lock className="w-3 h-3 text-[var(--brand)] shrink-0" />
                        )}
                      </div>
                      <div className="text-[11px] font-normal text-[var(--text-muted)]">
                        {role.userCount} {role.userCount === 1 ? 'user' : 'users'}
                      </div>
                    </div>

                    {/* Role ⋮ Menu */}
                    <div className="relative">
                      <button
                        type="button"
                        aria-label={`Options for ${role.name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuRoleId(isMenuOpen ? null : role.id);
                        }}
                        className={cn(
                          'p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-subtle)] opacity-0 group-hover:opacity-100 transition-opacity',
                          isMenuOpen && 'opacity-100 bg-[var(--surface-subtle)]'
                        )}
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>

                      {/* Dropdown Menu */}
                      <AnimatePresence>
                        {isMenuOpen && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -4 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -4 }}
                            transition={{ duration: 0.12 }}
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-0 top-7 z-50 w-44 p-1 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-lg text-left"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuRoleId(null);
                                onViewUsers(role.name);
                              }}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-[var(--text)] hover:bg-[var(--surface-subtle)] rounded-lg transition-colors"
                            >
                              <Users className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                              <span>View Users ({role.userCount})</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuRoleId(null);
                                onDuplicateRole(role);
                              }}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-[var(--text)] hover:bg-[var(--surface-subtle)] rounded-lg transition-colors"
                            >
                              <Copy className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                              <span>Duplicate Role</span>
                            </button>

                            {!isSuperAdmin && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuRoleId(null);
                                  onRenameRole(role);
                                }}
                                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-[var(--text)] hover:bg-[var(--surface-subtle)] rounded-lg transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                                <span>Rename / Details</span>
                              </button>
                            )}

                            {!role.isSystem && role.userCount === 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuRoleId(null);
                                  onDeleteRole(role);
                                }}
                                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-[#B42318] hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete Role</span>
                              </button>
                            )}

                            {(role.isSystem || role.userCount > 0) && (
                              <div className="px-2.5 py-1 text-[10px] text-[var(--text-muted)] border-t border-[var(--border)] mt-1">
                                {role.isSystem
                                  ? 'System role cannot be deleted'
                                  : 'Cannot delete role with assigned users'}
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>

        {/* Matrix Body with Collapsible Groups and Rows */}
        <tbody>
          {filteredGroups.length === 0 ? (
            <tr>
              <td
                colSpan={roles.length + 1}
                className="py-12 text-center text-xs text-[var(--text-muted)]"
              >
                No permissions matching "{searchQuery}"
              </td>
            </tr>
          ) : (
            filteredGroups.map((group) => {
              const collapsed = isGroupCollapsed(group.name);
              const groupPermKeys = group.items.map((p) => p.key);

              return (
                <React.Fragment key={group.name}>
                  {/* Group Header Row (36px) */}
                  <tr
                    className="border-b border-[var(--border)] bg-[var(--surface-subtle)]/80 hover:bg-[var(--surface-subtle)] cursor-pointer h-9 transition-colors"
                    onClick={() => toggleGroupCollapse(group.name)}
                  >
                    {/* Left Sticky Group Column */}
                    <td className="sticky left-0 z-20 bg-[inherit] px-3.5 py-1.5 border-r border-[var(--border)] shadow-[1px_0_0_0_var(--border)]">
                      <div className="flex items-center gap-2">
                        {collapsed ? (
                          <ChevronRight className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                        )}
                        <span className="text-xs font-semibold text-[var(--text)] tracking-[-0.01em]">
                          {highlightMatch(group.name, searchQuery)}
                        </span>
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] font-medium bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)]">
                          {group.items.length}
                        </span>
                      </div>
                    </td>

                    {/* Group Tri-state Checkboxes per Role */}
                    {roles.map((role) => {
                      const isSuperAdmin = role.name === 'SUPER_ADMIN';
                      const rolePerms = new Set(currentMatrix[role.id] || []);
                      const triState = isSuperAdmin
                        ? 'checked'
                        : computeTriState(groupPermKeys, rolePerms);

                      return (
                        <td
                          key={role.id}
                          className="px-4 py-1.5 text-center border-r border-[var(--border)]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MatrixCheckbox
                            checked={triState === 'checked'}
                            indeterminate={triState === 'indeterminate'}
                            disabled={isSuperAdmin || !canManage}
                            lockedTooltip={
                              isSuperAdmin
                                ? 'SUPER_ADMIN always possesses all permissions'
                                : !canManage
                                ? 'Permission required: roles.manage'
                                : undefined
                            }
                            ariaLabel={`${role.name}: Toggle all in ${group.name}`}
                            onChange={(nextChecked) => {
                              onToggleGroup(role.id, groupPermKeys, nextChecked);
                            }}
                          />
                        </td>
                      );
                    })}
                  </tr>

                  {/* Permission Items Rows (40px) */}
                  {!collapsed &&
                    group.items.map((perm) => {
                      const isRowHovered = hoveredPermKey === perm.key;

                      return (
                        <tr
                          key={perm.key}
                          role="row"
                          onMouseEnter={() => setHoveredPermKey(perm.key)}
                          onMouseLeave={() => setHoveredPermKey(null)}
                          className={cn(
                            'border-b border-[var(--border)] h-10 transition-colors',
                            isRowHovered
                              ? 'bg-[var(--surface-subtle)]'
                              : 'hover:bg-[var(--surface-subtle)]/50'
                          )}
                        >
                          {/* Left Sticky Permission Label & Info */}
                          <td
                            className={cn(
                              'sticky left-0 z-10 px-3.5 py-2 border-r border-[var(--border)] shadow-[1px_0_0_0_var(--border)] transition-colors',
                              isRowHovered
                                ? 'bg-[var(--surface-subtle)]'
                                : 'bg-[var(--surface)]'
                            )}
                          >
                            <div className="flex items-center justify-between gap-2 pl-4">
                              <span className="text-xs font-normal text-[var(--text)] truncate">
                                {highlightMatch(perm.label, searchQuery)}
                              </span>

                              {perm.description && (
                                <Tooltip content={perm.description} position="right">
                                  <Info className="w-3.5 h-3.5 text-[var(--text-muted)] hover:text-[var(--text)] cursor-help shrink-0" />
                                </Tooltip>
                              )}
                            </div>
                          </td>

                          {/* Role Checkbox Cells with Crosshair Highlight */}
                          {roles.map((role, roleColIdx) => {
                            const isSuperAdmin = role.name === 'SUPER_ADMIN';
                            const isColHovered = hoveredRoleId === role.id;
                            const isCrosshair = isRowHovered || isColHovered;

                            const initialPerms = new Set(initialMatrix[role.id] || []);
                            const currentPerms = new Set(currentMatrix[role.id] || []);

                            const isChecked = isSuperAdmin ? true : currentPerms.has(perm.key);
                            const wasChecked = isSuperAdmin ? true : initialPerms.has(perm.key);
                            const isCellDirty = !isSuperAdmin && isChecked !== wasChecked;

                            // Check keyboard focus
                            const permVisibleIdx = visiblePermissions.findIndex(
                              (p) => p.key === perm.key
                            );
                            const isCellFocused =
                              focusedCoord?.roleIdx === roleColIdx &&
                              focusedCoord?.permIdx === permVisibleIdx;

                            return (
                              <td
                                key={role.id}
                                role="gridcell"
                                tabIndex={-1}
                                onMouseEnter={() => setHoveredRoleId(role.id)}
                                onMouseLeave={() => setHoveredRoleId(null)}
                                className={cn(
                                  'px-4 py-1.5 text-center border-r border-[var(--border)] transition-colors relative',
                                  isCrosshair && 'bg-[var(--surface-subtle)]',
                                  isRowHovered && isColHovered && 'bg-[var(--brand-soft)]/50 dark:bg-[var(--brand)]/10'
                                )}
                              >
                                <MatrixCheckbox
                                  checked={isChecked}
                                  isDirty={isCellDirty}
                                  disabled={isSuperAdmin || !canManage}
                                  isFocused={isCellFocused}
                                  lockedTooltip={
                                    isSuperAdmin
                                      ? 'SUPER_ADMIN permissions are immutable and always full'
                                      : !canManage
                                      ? 'Permission required: roles.manage'
                                      : undefined
                                  }
                                  ariaLabel={`${role.name}: ${perm.label}`}
                                  onChange={(nextChecked) => {
                                    onToggleCell(role.id, perm.key, nextChecked);
                                  }}
                                  onClick={(e) => handleCellClick(role, perm, e)}
                                  onFocus={() => {
                                    if (permVisibleIdx >= 0) {
                                      setFocusedCoord({
                                        roleIdx: roleColIdx,
                                        permIdx: permVisibleIdx,
                                      });
                                    }
                                  }}
                                />
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                </React.Fragment>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};
