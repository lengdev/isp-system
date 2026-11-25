import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  X,
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
  const [hoveredGroupName, setHoveredGroupName] = useState<string | null>(null);
  const [hoveredRoleId, setHoveredRoleId] = useState<string | null>(null);
  const [isScrolledHorizontally, setIsScrolledHorizontally] = useState(false);
  const [activeMenu, setActiveMenu] = useState<{
    roleId: string;
    top: number;
    left: number;
  } | null>(null);

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

  // Global click, scroll, and resize listener to dismiss role dropdown menus
  useEffect(() => {
    if (!activeMenu) return;
    const handleDismiss = () => setActiveMenu(null);
    window.addEventListener('click', handleDismiss);
    window.addEventListener('resize', handleDismiss);
    window.addEventListener('scroll', handleDismiss, true);
    return () => {
      window.removeEventListener('click', handleDismiss);
      window.removeEventListener('resize', handleDismiss);
      window.removeEventListener('scroll', handleDismiss, true);
    };
  }, [activeMenu]);

  // Keyboard navigation inside grid
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setActiveMenu(null);
      return;
    }

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

  const activeRoleForMenu = activeMenu
    ? roles.find((r) => r.id === activeMenu.roleId) || null
    : null;

  const stickyColumnShadow = isScrolledHorizontally
    ? 'shadow-[4px_0_12px_-4px_rgba(16,24,40,0.10)] dark:shadow-[4px_0_12px_-4px_rgba(0,0,0,0.45)]'
    : '';

  return (
    <div
      ref={gridContainerRef}
      role="grid"
      aria-label="Roles and Permissions Matrix"
      onKeyDown={handleKeyDown}
      onScroll={(e) => {
        const scrolled = e.currentTarget.scrollLeft > 0;
        if (scrolled !== isScrolledHorizontally) {
          setIsScrolledHorizontally(scrolled);
        }
        if (activeMenu) {
          setActiveMenu(null);
        }
      }}
      tabIndex={0}
      className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-[var(--shadow-card)] overflow-x-auto focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
    >
      <table className="w-full border-separate border-spacing-0 text-left select-none [&_tbody_tr:last-child_td]:border-b-0">
        {/* Header Row */}
        <thead>
          <tr className="h-14">
            {/* Sticky Left Search Header */}
            <th
              className={cn(
                'sticky left-0 z-30 bg-[var(--surface)] w-[280px] min-w-[280px] max-w-[280px] px-3.5 py-2.5 border-b border-r border-[var(--border)] align-middle transition-shadow',
                stickyColumnShadow
              )}
            >
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-2.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search permission..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-8 pl-8 pr-7 text-xs bg-[var(--surface-subtle)] border border-[var(--border)] rounded-lg text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--brand)] focus:border-[var(--brand)] transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 p-0.5 rounded text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </th>

            {/* Role Columns Headers */}
            {roles.map((role) => {
              const isSuperAdmin = role.name === 'SUPER_ADMIN';
              const isColHovered = hoveredRoleId === role.id;
              const isMenuOpen = activeMenu?.roleId === role.id;

              return (
                <th
                  key={role.id}
                  data-role-col={role.id}
                  onMouseEnter={() => setHoveredRoleId(role.id)}
                  onMouseLeave={() => setHoveredRoleId(null)}
                  className={cn(
                    'px-7 py-2.5 min-w-[168px] text-center border-b border-r border-[var(--border)] last:border-r-0 transition-colors relative group align-middle',
                    isColHovered ? 'bg-[var(--surface-subtle)]' : 'bg-[var(--surface)]'
                  )}
                >
                  <div className="flex flex-col items-center justify-center min-w-0">
                    <div className="flex items-center justify-center gap-1 max-w-full">
                      <span className="text-xs font-semibold text-[var(--text)] truncate">
                        {role.name}
                      </span>
                      {isSuperAdmin && (
                        <Lock className="w-3 h-3 text-[var(--brand)] shrink-0" />
                      )}
                    </div>
                    <div className="text-[11px] font-normal text-[var(--text-muted)] whitespace-nowrap">
                      {role.userCount} {role.userCount === 1 ? 'user' : 'users'}
                    </div>
                  </div>

                  {/* Role ⋮ Menu Trigger */}
                  <button
                    type="button"
                    aria-label={`Options for ${role.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isMenuOpen) {
                        setActiveMenu(null);
                      } else {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const menuWidth = 176;
                        const left = Math.max(
                          12,
                          Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 12)
                        );
                        setActiveMenu({
                          roleId: role.id,
                          top: rect.bottom + 6,
                          left,
                        });
                      }
                    }}
                    className={cn(
                      'absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface)] opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity',
                      isMenuOpen && 'opacity-100 bg-[var(--surface)] text-[var(--text)]'
                    )}
                  >
                    <MoreVertical className="w-3.5 h-3.5" />
                  </button>
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
                className="py-12 text-center text-xs text-[var(--text-muted)] bg-[var(--surface)]"
              >
                No permissions matching "{searchQuery}"
              </td>
            </tr>
          ) : (
            filteredGroups.map((group) => {
              const collapsed = isGroupCollapsed(group.name);
              const groupPermKeys = group.items.map((p) => p.key);
              const isGroupHovered = hoveredGroupName === group.name;
              const groupBgClass = isGroupHovered
                ? 'bg-[#F1F0EC] dark:bg-[#22252B]'
                : 'bg-[var(--surface-subtle)]';

              return (
                <React.Fragment key={group.name}>
                  {/* Group Header Row */}
                  <tr
                    className="cursor-pointer h-9"
                    onMouseEnter={() => setHoveredGroupName(group.name)}
                    onMouseLeave={() => setHoveredGroupName(null)}
                    onClick={() => toggleGroupCollapse(group.name)}
                  >
                    {/* Left Sticky Group Column (Opaque) */}
                    <td
                      className={cn(
                        'sticky left-0 z-20 w-[280px] min-w-[280px] max-w-[280px] px-3.5 py-2 border-b border-r border-[var(--border)] transition-colors',
                        groupBgClass,
                        stickyColumnShadow
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {collapsed ? (
                          <ChevronRight className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                        )}
                        <span className="text-xs font-semibold text-[var(--text)] tracking-[-0.01em] truncate">
                          {highlightMatch(group.name, searchQuery)}
                        </span>
                        <span className="px-1.5 py-0.5 leading-none rounded-full text-[10px] font-medium bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)] shrink-0">
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
                          className={cn(
                            'px-4 py-1.5 text-center border-b border-r border-[var(--border)] last:border-r-0 transition-colors',
                            groupBgClass
                          )}
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

                  {/* Permission Items Rows */}
                  {!collapsed &&
                    group.items.map((perm) => {
                      const isRowHovered = hoveredPermKey === perm.key;

                      return (
                        <tr
                          key={perm.key}
                          role="row"
                          onMouseEnter={() => setHoveredPermKey(perm.key)}
                          onMouseLeave={() => setHoveredPermKey(null)}
                          className="h-10"
                        >
                          {/* Left Sticky Permission Label & Info (Opaque) */}
                          <td
                            className={cn(
                              'sticky left-0 z-20 w-[280px] min-w-[280px] max-w-[280px] px-3.5 py-2 border-b border-r border-[var(--border)] transition-colors',
                              isRowHovered
                                ? 'bg-[var(--surface-subtle)]'
                                : 'bg-[var(--surface)]',
                              stickyColumnShadow
                            )}
                          >
                            <div className="flex items-center justify-between gap-2 pl-4 min-w-0">
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
                                  'px-4 py-1.5 text-center border-b border-r border-[var(--border)] last:border-r-0 transition-colors',
                                  isRowHovered && isColHovered
                                    ? 'bg-[var(--brand-soft)]'
                                    : isCrosshair
                                    ? 'bg-[var(--surface-subtle)]'
                                    : 'bg-[var(--surface)]'
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

      {/* Portal Role Options Dropdown Menu */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {activeMenu && activeRoleForMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ duration: 0.12 }}
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: 'fixed',
                  top: `${activeMenu.top}px`,
                  left: `${activeMenu.left}px`,
                  zIndex: 9999,
                }}
                className="w-44 p-1 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-lg text-left"
              >
                <button
                  type="button"
                  onClick={() => {
                    const target = activeRoleForMenu;
                    setActiveMenu(null);
                    onViewUsers(target.name);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-[var(--text)] hover:bg-[var(--surface-subtle)] rounded-lg transition-colors"
                >
                  <Users className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  <span>View Users ({activeRoleForMenu.userCount})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const target = activeRoleForMenu;
                    setActiveMenu(null);
                    onDuplicateRole(target);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-[var(--text)] hover:bg-[var(--surface-subtle)] rounded-lg transition-colors"
                >
                  <Copy className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  <span>Duplicate Role</span>
                </button>

                {activeRoleForMenu.name !== 'SUPER_ADMIN' && (
                  <button
                    type="button"
                    onClick={() => {
                      const target = activeRoleForMenu;
                      setActiveMenu(null);
                      onRenameRole(target);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-[var(--text)] hover:bg-[var(--surface-subtle)] rounded-lg transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                    <span>Rename / Details</span>
                  </button>
                )}

                {!activeRoleForMenu.isSystem && activeRoleForMenu.userCount === 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const target = activeRoleForMenu;
                      setActiveMenu(null);
                      onDeleteRole(target);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-[#B42318] hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Role</span>
                  </button>
                )}

                {(activeRoleForMenu.isSystem || activeRoleForMenu.userCount > 0) && (
                  <div className="px-2.5 py-1 text-[10px] text-[var(--text-muted)] border-t border-[var(--border)] mt-1">
                    {activeRoleForMenu.isSystem
                      ? 'System role cannot be deleted'
                      : 'Cannot delete role with assigned users'}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
};
