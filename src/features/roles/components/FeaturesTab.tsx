import React, { useState, useMemo } from 'react';
import {
  Search,
  ChevronDown,
  ChevronRight,
  Lock,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  Globe,
  FileCode,
  Tag,
  Zap,
  LayoutDashboard,
  Users,
  Boxes,
  Box,
  Warehouse as WarehouseIcon,
  ShoppingBag,
  Wifi,
  Radio,
  Receipt,
  CreditCard,
  Scale,
  Wrench,
  LifeBuoy,
  BarChart3,
  Settings,
  ShieldCheck,
  Key,
  Package,
  Layers,
  Mail,
} from 'lucide-react';
import { Combobox, ComboboxOption } from '../../../components/ui/Combobox';
import { Tooltip } from '../../../components/ui/Tooltip';
import { Skeleton } from '../../../components/ui/Skeleton';
import { cn } from '../../../lib/utils';
import type { FeatureItem } from '../types';
import type { AdminPermissionItem } from '../../../lib/api';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Users,
  Boxes,
  Box,
  Warehouse: WarehouseIcon,
  WarehouseIcon,
  ShoppingBag,
  Wifi,
  Radio,
  Receipt,
  CreditCard,
  Scale,
  Wrench,
  LifeBuoy,
  BarChart3,
  Zap,
  Settings,
  ShieldCheck,
  Key,
  Package,
  Globe,
  Mail,
  Layers,
};

const getFeatureIcon = (iconName: string | null) => {
  if (!iconName) return Box;
  return ICON_MAP[iconName] || Box;
};

interface FeaturesTabProps {
  features: FeatureItem[];
  permissions: AdminPermissionItem[];
  unassignedPermsMap: Set<string>;
  canManage: boolean;
  isLoading: boolean;
  onUpdatePermissions: (featureId: string, permissionKeys: string[]) => void;
  onUpdateMode: (featureId: string, mode: 'ANY' | 'ALL') => void;
  onToggleActive: (featureId: string, isActive: boolean) => void;
  onReorder: (featureId: string, direction: 'up' | 'down') => void;
}

export const FeaturesTab: React.FC<FeaturesTabProps> = ({
  features,
  permissions,
  unassignedPermsMap,
  canManage,
  isLoading,
  onUpdatePermissions,
  onUpdateMode,
  onToggleActive,
  onReorder,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({});

  // Build permission options for Combobox
  const permissionOptions: ComboboxOption[] = useMemo(() => {
    return permissions.map((p) => {
      const isUnassigned = unassignedPermsMap.has(p.key);
      return {
        value: p.key,
        label: p.label,
        shortLabel: p.key,
        description: isUnassigned
          ? `${p.description || p.key} (⚠️ Not assigned to any role)`
          : p.description || p.key,
        group: p.group,
        badge: isUnassigned ? 'Unassigned' : undefined,
      };
    });
  }, [permissions, unassignedPermsMap]);

  // Group features by parentId
  const { rootFeatures, childrenByParent } = useMemo(() => {
    const roots: FeatureItem[] = [];
    const childrenMap = new Map<string, FeatureItem[]>();

    for (const f of features) {
      if (!f.parentId) {
        roots.push(f);
      } else {
        if (!childrenMap.has(f.parentId)) {
          childrenMap.set(f.parentId, []);
        }
        childrenMap.get(f.parentId)!.push(f);
      }
    }

    roots.sort((a, b) => a.sortOrder - b.sortOrder);
    for (const [, list] of childrenMap.entries()) {
      list.sort((a, b) => a.sortOrder - b.sortOrder);
    }

    return { rootFeatures: roots, childrenByParent: childrenMap };
  }, [features]);

  // Count unassigned warnings across features
  const orphanWarnings = useMemo(() => {
    const warnings: { feature: FeatureItem; orphanKeys: string[] }[] = [];
    for (const f of features) {
      const orphans = f.permissionKeys.filter((k) => unassignedPermsMap.has(k));
      if (orphans.length > 0) {
        warnings.push({ feature: f, orphanKeys: orphans });
      }
    }
    return warnings;
  }, [features, unassignedPermsMap]);

  const toggleExpand = (id: string) => {
    setExpandedParents((prev) => ({
      ...prev,
      [id]: prev[id] === undefined ? false : !prev[id],
    }));
  };

  const isExpanded = (id: string) => {
    // Default expanded
    return expandedParents[id] !== false;
  };

  // Filter features if search is active
  const filteredRootFeatures = useMemo(() => {
    if (!searchQuery.trim()) return rootFeatures;
    const q = searchQuery.toLowerCase();

    return rootFeatures.filter((root) => {
      const matchRoot =
        root.label.toLowerCase().includes(q) ||
        root.key.toLowerCase().includes(q) ||
        (root.path && root.path.toLowerCase().includes(q)) ||
        root.permissionKeys.some((k) => k.toLowerCase().includes(q));

      const children = childrenByParent.get(root.id) || [];
      const matchChild = children.some(
        (c) =>
          c.label.toLowerCase().includes(q) ||
          c.key.toLowerCase().includes(q) ||
          (c.path && c.path.toLowerCase().includes(q)) ||
          c.permissionKeys.some((k) => k.toLowerCase().includes(q))
      );

      return matchRoot || matchChild;
    });
  }, [rootFeatures, childrenByParent, searchQuery]);

  const renderTypeBadge = (type: FeatureItem['type']) => {
    switch (type) {
      case 'MENU':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <Globe className="w-3 h-3" />
            <span>MENU</span>
          </span>
        );
      case 'PAGE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <FileCode className="w-3 h-3" />
            <span>PAGE</span>
          </span>
        );
      case 'TAB':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            <Tag className="w-3 h-3" />
            <span>TAB</span>
          </span>
        );
      case 'ACTION':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Zap className="w-3 h-3" />
            <span>ACTION</span>
          </span>
        );
      default:
        return null;
    }
  };

  const renderFeatureRow = (item: FeatureItem, isChild = false) => {
    const Icon = getFeatureIcon(item.icon);
    const children = childrenByParent.get(item.id) || [];
    const hasChildren = !isChild && children.length > 0;
    const expanded = isExpanded(item.id);

    const hasOrphanPerms = item.permissionKeys.some((k) => unassignedPermsMap.has(k));

    return (
      <React.Fragment key={item.id}>
        <tr
          className={cn(
            'group border-b border-[var(--border)] transition-colors text-[13px]',
            isChild
              ? 'bg-[var(--surface-subtle)] hover:bg-[#F1F0EC] dark:hover:bg-[#22252B]'
              : 'bg-[var(--surface)] hover:bg-[var(--surface-subtle)]',
            !item.isActive && 'opacity-60 bg-gray-50/50 dark:bg-gray-900/20'
          )}
        >
          {/* 1. Feature Name & Icon */}
          <td className={cn('py-2.5 px-3', isChild ? 'pl-9' : 'pl-4')}>
            <div className="flex items-center gap-2 min-w-[200px]">
              {hasChildren && (
                <button
                  type="button"
                  onClick={() => toggleExpand(item.id)}
                  aria-label={expanded ? 'Collapse group' : 'Expand group'}
                  className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-subtle)] transition-colors"
                >
                  {expanded ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
              {isChild && (
                <div className="w-3.5 flex justify-center text-[var(--text-muted)]">
                  <span className="text-[12px] leading-none">└</span>
                </div>
              )}
              <div className="p-1.5 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border)] text-[var(--text-secondary)] shrink-0">
                <Icon className="w-3.5 h-3.5 text-[var(--brand)]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-[var(--text)] truncate">{item.label}</span>
                  {item.locked && (
                    <Tooltip content="System locked feature (permission mapping locked to prevent lockout)">
                      <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    </Tooltip>
                  )}
                  {hasOrphanPerms && (
                    <Tooltip content="One or more mapped permissions are not assigned to any role in the system.">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    </Tooltip>
                  )}
                </div>
                <div className="text-[11px] font-mono text-[var(--text-muted)] truncate">{item.key}</div>
              </div>
            </div>
          </td>

          {/* 2. Type Badge */}
          <td className="py-2.5 px-3 whitespace-nowrap">{renderTypeBadge(item.type)}</td>

          {/* 3. Route Path */}
          <td className="py-2.5 px-3">
            {item.path ? (
              <span className="inline-block whitespace-nowrap font-mono text-[11px] text-[var(--text-secondary)] bg-[var(--surface-subtle)] px-2 py-0.5 rounded border border-[var(--border)]">
                {item.path}
              </span>
            ) : (
              <span className="text-[var(--text-muted)]">—</span>
            )}
          </td>

          {/* 4. Permissions Multi-Select & Mode */}
          <td className="py-2.5 px-3 min-w-[280px]">
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <Combobox
                  multiple={true}
                  options={permissionOptions}
                  value={item.permissionKeys}
                  onChange={(newKeys) => onUpdatePermissions(item.id, newKeys)}
                  disabled={!canManage || item.locked}
                  placeholder="Public (all authenticated)"
                  size="sm"
                  clearable={true}
                />
              </div>

              {/* Mode Toggle (ANY / ALL) */}
              <div className="flex items-center bg-[var(--surface-subtle)] border border-[var(--border)] rounded-lg p-0.5 shrink-0">
                <button
                  type="button"
                  disabled={!canManage || item.locked || item.permissionKeys.length <= 1}
                  onClick={() => onUpdateMode(item.id, 'ANY')}
                  className={cn(
                    'px-1.5 py-0.5 text-[10px] font-bold rounded transition-colors',
                    item.permissionMode === 'ANY'
                      ? 'bg-[var(--surface)] text-[var(--brand)] shadow-xs'
                      : 'text-[var(--text-muted)] hover:text-[var(--text)]',
                    (item.locked || item.permissionKeys.length <= 1) && 'opacity-50 cursor-not-allowed'
                  )}
                  title="Accessible if user has ANY of the permissions"
                >
                  ANY
                </button>
                <button
                  type="button"
                  disabled={!canManage || item.locked || item.permissionKeys.length <= 1}
                  onClick={() => onUpdateMode(item.id, 'ALL')}
                  className={cn(
                    'px-1.5 py-0.5 text-[10px] font-bold rounded transition-colors',
                    item.permissionMode === 'ALL'
                      ? 'bg-[var(--surface)] text-[var(--brand)] shadow-xs'
                      : 'text-[var(--text-muted)] hover:text-[var(--text)]',
                    (item.locked || item.permissionKeys.length <= 1) && 'opacity-50 cursor-not-allowed'
                  )}
                  title="Requires user to hold ALL permissions"
                >
                  ALL
                </button>
              </div>
            </div>
          </td>

          {/* 5. Active Switch */}
          <td className="py-2.5 px-3 text-center whitespace-nowrap">
            <button
              type="button"
              disabled={!canManage || item.locked}
              onClick={() => onToggleActive(item.id, !item.isActive)}
              role="switch"
              aria-checked={item.isActive}
              className={cn(
                'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
                item.isActive ? 'bg-[var(--brand)]' : 'bg-gray-300 dark:bg-gray-700',
                item.locked && 'opacity-50 cursor-not-allowed'
              )}
              title={item.locked ? 'System locked' : item.isActive ? 'Active' : 'Inactive'}
            >
              <span
                className={cn(
                  'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                  item.isActive ? 'translate-x-4' : 'translate-x-0'
                )}
              />
            </button>
          </td>

          {/* 6. Order / Reorder */}
          <td className="py-2.5 px-3 text-right whitespace-nowrap">
            <div className="flex items-center justify-end gap-1">
              <span className="text-[11px] font-mono text-[var(--text-muted)] mr-1">
                {item.sortOrder}
              </span>
              <button
                type="button"
                disabled={!canManage}
                onClick={() => onReorder(item.id, 'up')}
                className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-subtle)] disabled:opacity-40"
                title="Move up"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                disabled={!canManage}
                onClick={() => onReorder(item.id, 'down')}
                className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-subtle)] disabled:opacity-40"
                title="Move down"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </td>
        </tr>

        {/* Render Children when expanded */}
        {hasChildren && expanded && children.map((c) => renderFeatureRow(c, true))}
      </React.Fragment>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Warning Banner if orphan permissions exist */}
      {orphanWarnings.length > 0 && (
        <div className="flex items-start gap-3 p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-[var(--text)]">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-semibold text-amber-700 dark:text-amber-400">
              Unassigned Permission Warning:
            </span>{' '}
            {orphanWarnings.length} feature(s) are mapped to permissions that are not assigned to any role in the system. Users without Super Admin access will not be able to view these features until the permissions are assigned to a role in the Permissions tab.
          </div>
        </div>
      )}

      {/* Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[var(--surface)] p-3 rounded-2xl border border-[var(--border)] shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search features, paths, or keys..."
            className="w-full h-9 pl-9 pr-3 text-xs bg-[var(--surface-subtle)] border border-[var(--border)] rounded-xl text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--brand)] transition-colors"
          />
        </div>

        <div className="text-xs text-[var(--text-muted)] px-1">
          Showing <span className="font-semibold text-[var(--text)]">{features.length}</span> system features
        </div>
      </div>

      {/* Features Tree Table Card */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left [&_tbody_tr:last-child]:border-b-0">
            <thead>
              <tr className="h-9 border-b border-[var(--border)] bg-[var(--surface-subtle)] text-[12px] font-semibold text-[var(--text-secondary)] select-none">
                <th className="py-2 px-4 w-[280px]">Feature &amp; ID</th>
                <th className="py-2 px-3 w-[100px]">Type</th>
                <th className="py-2 px-3 w-[160px]">Path</th>
                <th className="py-2 px-3 min-w-[320px]">Required Permissions &amp; Mode</th>
                <th className="py-2 px-3 text-center w-[90px]">Active</th>
                <th className="py-2 px-3 text-right w-[110px]">Sort Order</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-6">
                    <div className="space-y-3">
                      {[...Array(6)].map((_, i) => (
                        <Skeleton key={i} className="h-10 w-full rounded-lg" />
                      ))}
                    </div>
                  </td>
                </tr>
              ) : filteredRootFeatures.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-[var(--text-muted)]">
                    No features match your search.
                  </td>
                </tr>
              ) : (
                filteredRootFeatures.map((root) => renderFeatureRow(root, false))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
