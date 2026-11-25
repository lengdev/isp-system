import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Plus,
  RefreshCw,
  Edit2,
  Trash2,
  History,
  KeyRound,
  UserCheck,
  UserX,
  X,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { DataTable, DataTableColumnDef, RowAction, TableQuery } from '../../components/ui/DataTable';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Chip } from '../../components/ui/Chip';
import { Tooltip } from '../../components/ui/Tooltip';
import { Button } from '../../components/ui/Button';
import { useStore } from '../../store/useStore';
import { useAuthStore } from '../../store/authStore';
import { useCan } from '../../lib/permissions';
import { api } from '../../lib/api';
import { cn, formatDate } from '../../lib/utils';
import type { RoleItem, UserWithRoles } from '../../types/roles';
import { getRoleBadgeColor } from './roleBadge';
import { UserFormModal } from './UserFormModal';
import { DeleteUserModal } from './DeleteUserModal';
import { UserActivityDrawer } from './UserActivityDrawer';

export interface UsersWorkspaceProps {
  embedded?: boolean;
  initialRoleFilter?: string | null;
  onManagePermissions?: (user: UserWithRoles) => void;
  showPermissionsButton?: boolean;
  externalAddSignal?: number;
  externalRefreshSignal?: number;
  onLoadingChange?: (loading: boolean) => void;
}

export const UsersWorkspace: React.FC<UsersWorkspaceProps> = ({
  embedded = false,
  initialRoleFilter = null,
  onManagePermissions,
  showPermissionsButton = false,
  externalAddSignal = 0,
  externalRefreshSignal = 0,
  onLoadingChange,
}) => {
  const queryClient = useQueryClient();
  const addToast = useStore((s) => s.addToast);
  const currentUser = useAuthStore((s) => s.user);
  const canManageUsers = useCan('users.manage');
  const canViewAudit = useCan('audit.view');

  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [dbRoles, setDbRoles] = useState<RoleItem[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState<'activate' | 'deactivate' | null>(null);

  const [tableQuery, setTableQuery] = useState<TableQuery>(() => ({
    page: 1,
    pageSize: 10,
    search: '',
    sort: [],
    filters: initialRoleFilter ? { roles: [initialRoleFilter] } : {},
  }));
  const lastQueryStrRef = useRef<string>('');

  // Modal & Drawer state
  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithRoles | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserWithRoles | null>(null);
  const [viewingLogUser, setViewingLogUser] = useState<UserWithRoles | null>(null);

  const loadRoles = useCallback(async () => {
    setRolesLoading(true);
    try {
      const matrixResult = await api.roles.getMatrix();
      setDbRoles(matrixResult.roles || []);
    } catch {
      // Roles matrix failure should not block user table error reporting
    } finally {
      setRolesLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(
    async (queryToRun?: TableQuery) => {
      const q = queryToRun || tableQuery;
      setIsFetching(true);
      setLoadError(null);
      onLoadingChange?.(true);

      try {
        const primarySort = q.sort?.[0];
        const roleFilter = Array.isArray(q.filters?.roles)
          ? q.filters.roles
          : q.filters?.roles
            ? [String(q.filters.roles)]
            : [];
        const statusFilter = Array.isArray(q.filters?.status)
          ? q.filters.status
          : q.filters?.status
            ? [String(q.filters.status)]
            : [];

        const res = await api.auth.getUsers({
          page: q.page,
          pageSize: q.pageSize,
          search: q.search.trim(),
          roles: roleFilter,
          status: statusFilter,
          sortBy: primarySort?.id,
          sortDir: primarySort ? (primarySort.desc ? 'desc' : 'asc') : undefined,
        });

        setUsers(res.items || []);
        setTotal(typeof res.total === 'number' ? res.total : (res.items || []).length);
        setHasLoadedOnce(true);
      } catch (err: any) {
        const msg = err?.message || 'Failed to load users';
        setLoadError(msg);
      } finally {
        setIsFetching(false);
        onLoadingChange?.(false);
      }
    },
    [tableQuery, onLoadingChange]
  );

  const handleMutationSuccess = useCallback(async () => {
    await fetchUsers();
    queryClient.invalidateQueries({ queryKey: ['rolesUsers'] });
    queryClient.invalidateQueries({ queryKey: ['rolesMatrix'] });
  }, [fetchUsers, queryClient]);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  useEffect(() => {
    const serialized = JSON.stringify(tableQuery);
    if (lastQueryStrRef.current === serialized) return;
    lastQueryStrRef.current = serialized;
    fetchUsers(tableQuery);
  }, [tableQuery, fetchUsers]);

  const handleQueryChange = useCallback((nextQuery: TableQuery) => {
    setTableQuery((prev) => {
      if (JSON.stringify(prev) === JSON.stringify(nextQuery)) return prev;
      return nextQuery;
    });
  }, []);

  const openCreateModal = useCallback(() => {
    setEditingUser(null);
    setFormOpen(true);
  }, []);

  const openEditModal = useCallback((u: UserWithRoles) => {
    setEditingUser(u);
    setFormOpen(true);
  }, []);

  useEffect(() => {
    if (externalAddSignal > 0) {
      openCreateModal();
    }
  }, [externalAddSignal, openCreateModal]);

  useEffect(() => {
    if (externalRefreshSignal > 0) {
      fetchUsers();
    }
  }, [externalRefreshSignal, fetchUsers]);

  const roleFilterOptions = useMemo(
    () =>
      dbRoles.map((r) => ({
        value: r.name,
        label: r.name,
      })),
    [dbRoles]
  );

  const statusFilterOptions = useMemo(
    () => [
      { value: 'active', label: 'Active' },
      { value: 'disabled', label: 'Disabled' },
    ],
    []
  );

  const handleBulkStatusChange = async (
    selectedRows: UserWithRoles[],
    nextActive: boolean,
    clearSelection: () => void
  ) => {
    if (!canManageUsers || selectedRows.length === 0) return;

    const targetRows = selectedRows.filter((u) => u.isActive !== nextActive);
    if (targetRows.length === 0) {
      addToast({
        type: 'info',
        title: 'No Changes Needed',
        message: `All selected users are already ${nextActive ? 'active' : 'disabled'}.`,
      });
      return;
    }

    setBulkLoading(nextActive ? 'activate' : 'deactivate');
    let updatedCount = 0;
    const errors: string[] = [];

    for (const u of targetRows) {
      try {
        await api.auth.updateUser(u.id, { isActive: nextActive });
        updatedCount++;
      } catch (err: any) {
        errors.push(`${u.username}: ${err?.message || 'Update failed'}`);
      }
    }

    setBulkLoading(null);

    if (updatedCount > 0) {
      addToast({
        type: 'success',
        title: nextActive ? 'Users Activated' : 'Users Deactivated',
        message: `Updated ${updatedCount} user account${updatedCount === 1 ? '' : 's'}.`,
      });
      clearSelection();
      await handleMutationSuccess();
    }

    if (errors.length > 0) {
      addToast({
        type: 'error',
        title: 'Some Users Could Not Be Updated',
        message: errors.join('; '),
      });
    }
  };

  const columns: DataTableColumnDef<UserWithRoles>[] = useMemo(
    () => [
      {
        id: 'fullName',
        header: 'User',
        accessorKey: 'fullName',
        width: 250,
        minWidth: 200,
        sortable: true,
        priority: 1,
        skeleton: 'avatar-text',
        exportValue: (u) => u.fullName,
        cell: ({ row }) => {
          const u = row.original;
          const isKhmer = /[\u1780-\u17FF]/.test(u.fullName);
          return (
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar name={u.fullName} avatarUrl={u.avatarUrl || undefined} size="sm" />
              <div className="min-w-0 flex-1">
                <Tooltip content={u.fullName}>
                  <span
                    lang={isKhmer ? 'km' : undefined}
                    className={cn(
                      'font-semibold text-[12px] text-[var(--text)] truncate block py-0.5',
                      isKhmer ? 'leading-[1.65]' : 'leading-snug'
                    )}
                  >
                    {u.fullName}
                  </span>
                </Tooltip>
              </div>
            </div>
          );
        },
      },
      {
        id: 'username',
        header: 'Username',
        accessorKey: 'username',
        width: 150,
        minWidth: 120,
        sortable: true,
        priority: 1,
        exportValue: (u) => u.username,
        cell: ({ row }) => (
          <span className="text-[12px] font-medium text-[var(--text-secondary)] truncate block">
            {row.original.username}
          </span>
        ),
      },
      {
        id: 'email',
        header: 'Email',
        accessorKey: 'email',
        width: 215,
        minWidth: 170,
        sortable: true,
        priority: 1,
        exportValue: (u) => u.email,
        cell: ({ row }) => (
          <Tooltip content={row.original.email}>
            <span className="text-[12px] text-[var(--text-secondary)] truncate block">
              {row.original.email}
            </span>
          </Tooltip>
        ),
      },
      {
        id: 'roles',
        header: 'Roles',
        accessorFn: (u) =>
          (Array.isArray(u.roles) && u.roles.length > 0 ? u.roles : [u.role]).join(', '),
        width: 245,
        minWidth: 180,
        sortable: true,
        priority: 1,
        skeleton: 'badge',
        filter: {
          type: 'multi',
          options: roleFilterOptions,
        },
        exportValue: (u) =>
          (Array.isArray(u.roles) && u.roles.length > 0 ? u.roles : [u.role]).join(', '),
        cell: ({ row }) => {
          const u = row.original;
          const userRoles =
            Array.isArray(u.roles) && u.roles.length > 0 ? u.roles : [u.role];
          const visibleRoles = userRoles.slice(0, 2);
          const extraCount = userRoles.length - visibleRoles.length;

          return (
            <div className="flex items-center gap-1 min-w-0 flex-wrap">
              {visibleRoles.map((r) => (
                <Chip
                  key={r}
                  size="sm"
                  variant="flat"
                  color={getRoleBadgeColor(r)}
                  className="text-[11px] font-medium"
                >
                  {r}
                </Chip>
              ))}
              {extraCount > 0 && (
                <Tooltip content={userRoles.join(', ')}>
                  <Chip size="sm" variant="flat" color="default" className="text-[11px] font-semibold">
                    +{extraCount}
                  </Chip>
                </Tooltip>
              )}
            </div>
          );
        },
      },
      {
        id: 'status',
        header: 'Status',
        accessorKey: 'isActive',
        width: 115,
        minWidth: 100,
        sortable: true,
        priority: 1,
        skeleton: 'badge',
        filter: {
          type: 'multi',
          options: statusFilterOptions,
        },
        exportValue: (u) => (u.isActive ? 'Active' : 'Disabled'),
        cell: ({ row }) => {
          const u = row.original;
          return (
            <Badge variant={u.isActive ? 'active' : 'disconnected'} size="sm">
              {u.isActive ? 'Active' : 'Disabled'}
            </Badge>
          );
        },
      },
      {
        id: 'lastLoginAt',
        header: 'Last login',
        accessorKey: 'lastLoginAt',
        width: 155,
        minWidth: 130,
        sortable: true,
        priority: 2,
        exportValue: (u) =>
          u.lastLoginAt ? new Date(u.lastLoginAt).toISOString() : 'Never',
        cell: ({ row }) => {
          const ts = row.original.lastLoginAt;
          if (!ts) {
            return <span className="text-[12px] text-[var(--text-muted)]">Never</span>;
          }
          const d = new Date(ts);
          return (
            <Tooltip content={d.toLocaleString()}>
              <span className="text-[12px] text-[var(--text-secondary)] truncate block">
                {formatDistanceToNow(d, { addSuffix: true })}
              </span>
            </Tooltip>
          );
        },
      },
      {
        id: 'createdAt',
        header: 'Created',
        accessorKey: 'createdAt',
        width: 135,
        minWidth: 115,
        sortable: true,
        priority: 3,
        exportValue: (u) => formatDate(u.createdAt, 'yyyy-MM-dd'),
        cell: ({ row }) => {
          const d = new Date(row.original.createdAt);
          return (
            <Tooltip content={d.toLocaleString()}>
              <span className="text-[12px] text-[var(--text-secondary)] tabular-nums truncate block">
                {formatDate(row.original.createdAt, 'MMM dd, yyyy')}
              </span>
            </Tooltip>
          );
        },
      },
    ],
    [roleFilterOptions, statusFilterOptions]
  );

  const getRowActions = useCallback(
    (u: UserWithRoles): RowAction<UserWithRoles>[] => {
      const isSelf = Boolean(currentUser?.id && currentUser.id === u.id);
      const isLastSuper = Boolean(u.isLastSuperAdmin);
      const deleteDisabled = !canManageUsers || isSelf || isLastSuper;
      const deleteTooltip = !canManageUsers
        ? 'Requires users.manage permission'
        : isSelf
          ? 'You cannot delete your own account'
          : isLastSuper
            ? 'Cannot delete the last SUPER_ADMIN account'
            : undefined;

      const actions: RowAction<UserWithRoles>[] = [
        {
          label: 'Edit',
          icon: <Edit2 className="w-3.5 h-3.5" />,
          disabled: !canManageUsers,
          tooltip: !canManageUsers ? 'Requires users.manage permission' : undefined,
          onClick: (row) => openEditModal(row),
        },
        {
          label: 'View Log',
          icon: <History className="w-3.5 h-3.5" />,
          disabled: !canViewAudit,
          tooltip: !canViewAudit ? 'Requires audit.view permission' : undefined,
          onClick: (row) => setViewingLogUser(row),
        },
      ];

      if (showPermissionsButton && onManagePermissions) {
        actions.push({
          label: 'Permissions',
          icon: <KeyRound className="w-3.5 h-3.5" />,
          onClick: (row) => onManagePermissions(row),
        });
      }

      actions.push(
        { divider: true, label: '', onClick: () => {} },
        {
          label: 'Delete',
          icon: <Trash2 className="w-3.5 h-3.5" />,
          danger: true,
          disabled: deleteDisabled,
          tooltip: deleteTooltip,
          onClick: (row) => setDeletingUser(row),
        }
      );

      return actions;
    },
    [
      canManageUsers,
      canViewAudit,
      currentUser?.id,
      showPermissionsButton,
      onManagePermissions,
      openEditModal,
    ]
  );

  const renderBulkActions = useCallback(
    (selectedRows: UserWithRoles[], clearSelection: () => void) => {
      if (!canManageUsers) return null;

      const includesSelf = selectedRows.some((u) => currentUser?.id && u.id === currentUser.id);
      const includesLastSuper = selectedRows.some((u) => u.isLastActiveSuperAdmin);
      const deactivateDisabled =
        bulkLoading !== null ||
        includesSelf ||
        includesLastSuper ||
        selectedRows.every((u) => !u.isActive);
      const activateDisabled =
        bulkLoading !== null || selectedRows.every((u) => u.isActive);

      const deactivateTooltip = includesSelf
        ? 'You cannot deactivate your own account'
        : includesLastSuper
          ? 'Cannot deactivate the last active SUPER_ADMIN account'
          : undefined;

      return (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[var(--surface-raised)] border border-[var(--border-strong)] shadow-xl text-xs">
          <span className="font-semibold text-[var(--text)] pr-2 border-r border-[var(--border)] tabular-nums">
            {selectedRows.length} selected
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={activateDisabled}
            isLoading={bulkLoading === 'activate'}
            onClick={() => handleBulkStatusChange(selectedRows, true, clearSelection)}
            className="h-8 gap-1.5"
          >
            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Activate</span>
          </Button>
          <Tooltip content={deactivateTooltip}>
            <Button
              size="sm"
              variant="outline"
              disabled={deactivateDisabled}
              isLoading={bulkLoading === 'deactivate'}
              onClick={() => handleBulkStatusChange(selectedRows, false, clearSelection)}
              className="h-8 gap-1.5"
            >
              <UserX className="w-3.5 h-3.5 text-rose-600" />
              <span>Deactivate</span>
            </Button>
          </Tooltip>
          <button
            type="button"
            onClick={clearSelection}
            aria-label="Clear selection"
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-subtle)] transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      );
    },
    [canManageUsers, currentUser?.id, bulkLoading]
  );

  const isFilterActive = Boolean(
    tableQuery.search.trim() ||
      (Array.isArray(tableQuery.filters?.roles) && tableQuery.filters.roles.length > 0) ||
      (Array.isArray(tableQuery.filters?.status) && tableQuery.filters.status.length > 0)
  );

  return (
    <div className="space-y-4">
      {embedded && (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchUsers()}
            disabled={isFetching}
          >
            <RefreshCw className={isFetching ? 'animate-spin w-3.5 h-3.5' : 'w-3.5 h-3.5'} />
            <span>Refresh</span>
          </Button>
          {canManageUsers && (
            <Button variant="primary" size="sm" onClick={openCreateModal}>
              <Plus className="w-3.5 h-3.5" />
              <span>Add User</span>
            </Button>
          )}
        </div>
      )}

      <DataTable<UserWithRoles>
        columns={columns}
        data={users}
        serverMode
        total={total}
        onQueryChange={handleQueryChange}
        loading={!hasLoadedOnce && isFetching}
        fetching={hasLoadedOnce && isFetching}
        skeletonDelayMs={0}
        error={loadError}
        onRetry={() => fetchUsers()}
        rowId={(u) => u.id}
        viewKey={embedded ? 'roles_users_tab_table' : 'users_master_table'}
        initialFilters={initialRoleFilter ? { roles: [initialRoleFilter] } : undefined}
        rowActions={getRowActions}
        bulkActions={canManageUsers ? renderBulkActions : undefined}
        onRefresh={() => fetchUsers()}
        searchPlaceholder="Search name, username, or email..."
        isFilterActive={isFilterActive}
        noDataTitle="No users yet"
        noDataDescription="Create your first user account to assign roles and manage access."
        emptyTitle="No matching users"
        emptySubtitle="Try adjusting your search or clearing active filters."
        emptyActionPermission="users.manage"
        onAddNew={canManageUsers ? openCreateModal : undefined}
        addNewLabel="Add User"
      />

      <UserFormModal
        isOpen={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingUser(null);
        }}
        user={editingUser}
        roles={dbRoles}
        rolesLoading={rolesLoading}
        onSuccess={handleMutationSuccess}
      />

      <DeleteUserModal
        isOpen={Boolean(deletingUser)}
        onClose={() => setDeletingUser(null)}
        user={deletingUser}
        onSuccess={handleMutationSuccess}
      />

      <UserActivityDrawer
        user={viewingLogUser}
        onClose={() => setViewingLogUser(null)}
      />
    </div>
  );
};
