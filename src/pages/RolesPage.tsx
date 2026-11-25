import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, RefreshCw, ShieldAlert } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useRolesMatrix } from '../features/roles/hooks/useRolesMatrix';
import { useFeaturesManager } from '../features/roles/hooks/useFeaturesManager';
import { MatrixHeader } from '../features/roles/components/MatrixHeader';
import { PermissionsMatrix } from '../features/roles/components/PermissionsMatrix';
import { MobileRoleView } from '../features/roles/components/MobileRoleView';
import { UsersTab } from '../features/roles/components/UsersTab';
import { FeaturesTab } from '../features/roles/components/FeaturesTab';
import { AddRoleModal } from '../features/roles/components/AddRoleModal';
import { RenameRoleModal } from '../features/roles/components/RenameRoleModal';
import { Skeleton } from '../components/ui/Skeleton';
import { Button } from '../components/ui/Button';
import type { RoleItem } from '../features/roles/types';

export const RolesPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const canManageRoles =
    user?.role === 'SUPER_ADMIN' ||
    user?.roles?.includes('SUPER_ADMIN') ||
    hasPermission('roles.manage');

  const [activeTab, setActiveTab] = useState<'permissions' | 'users' | 'features'>('permissions');
  const [userTabRoleFilter, setUserTabRoleFilter] = useState<string | null>(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [roleToRename, setRoleToRename] = useState<RoleItem | null>(null);

  const {
    roles,
    permissions,
    users,
    initialMatrix,
    currentMatrix,
    dirtyCount,
    isSaving,
    isLoading,
    isError,
    error,
    focusedColumnId,
    refetch,
    toggleCell,
    toggleGroup,
    rangeSelect,
    saveChanges,
    discardChanges,
    createRole,
    updateRole,
    duplicateRole,
    deleteRole,
    updateUserRoles,
  } = useRolesMatrix();

  const {
    features,
    permissions: adminPermissions,
    unassignedPermsMap,
    dirtyCount: featureDirtyCount,
    isSaving: isSavingFeatures,
    isLoading: isFeaturesLoading,
    updateFeaturePermissions,
    updateFeatureMode,
    toggleFeatureActive,
    reorderFeature,
    saveChanges: saveFeatureChanges,
    discardChanges: discardFeatureChanges,
  } = useFeaturesManager(permissions, currentMatrix);

  // 403 Forbidden State for unauthorized users
  if (!canManageRoles) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-[var(--text)] mb-2">Access Restricted</h2>
        <p className="text-sm text-[var(--text-secondary)] max-w-md mb-6">
          You need the <code className="px-1.5 py-0.5 rounded bg-[var(--surface-subtle)] border border-[var(--border)] font-mono text-xs">roles.manage</code> permission to view and edit system roles.
        </p>
        <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>
          Return to Dashboard
        </Button>
      </div>
    );
  }

  // Error State with Retry
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 text-[#B42318] flex items-center justify-center mb-4">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-[var(--text)] mb-1">Failed to Load Roles</h2>
        <p className="text-xs text-[var(--text-secondary)] max-w-sm mb-4">
          {error?.message || 'Unable to communicate with the authorization service.'}
        </p>
        <Button
          variant="primary"
          size="sm"
          onClick={() => refetch()}
          className="gap-2 bg-[var(--brand)] text-white"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Retry</span>
        </Button>
      </div>
    );
  }

  // Handle "View Users" from matrix dropdown
  const handleViewUsersForRole = (roleName: string) => {
    setUserTabRoleFilter(roleName);
    setActiveTab('users');
  };

  return (
    <div className="flex flex-col gap-5 pb-6 animate-fadeIn">
      {/* Page Header */}
      <MatrixHeader
        activeTab={activeTab}
        onTabChange={(tab) => {
          if (tab !== 'users') setUserTabRoleFilter(null);
          setActiveTab(tab);
        }}
        dirtyCount={activeTab === 'features' ? featureDirtyCount : dirtyCount}
        isSaving={activeTab === 'features' ? isSavingFeatures : isSaving}
        onSave={activeTab === 'features' ? saveFeatureChanges : saveChanges}
        onDiscard={activeTab === 'features' ? discardFeatureChanges : discardChanges}
        onAddRole={() => setIsAddModalOpen(true)}
        onBack={() => navigate('/settings')}
        canManage={canManageRoles}
      />

      {/* Main Content Area */}
      {isLoading ? (
        <div className="space-y-4">
          <div className="h-12 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2 flex gap-4">
            <Skeleton className="w-64 h-full rounded-lg" />
            <Skeleton className="w-32 h-full rounded-lg" />
            <Skeleton className="w-32 h-full rounded-lg" />
            <Skeleton className="w-32 h-full rounded-lg" />
          </div>
          <div className="h-96 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-3">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="w-full h-8 rounded-lg" />
            ))}
          </div>
        </div>
      ) : activeTab === 'permissions' ? (
        <>
          {/* Desktop/Tablet Matrix Table (>= 768px) */}
          <div className="hidden md:block">
            <PermissionsMatrix
              roles={roles}
              permissions={permissions}
              initialMatrix={initialMatrix}
              currentMatrix={currentMatrix}
              canManage={canManageRoles}
              onToggleCell={toggleCell}
              onToggleGroup={toggleGroup}
              onRangeSelect={rangeSelect}
              onRenameRole={(role) => setRoleToRename(role)}
              onDuplicateRole={(role) => duplicateRole(role.id)}
              onDeleteRole={(role) => deleteRole(role.id)}
              onViewUsers={handleViewUsersForRole}
              focusedColumnId={focusedColumnId}
            />
          </div>

          {/* Mobile Single-Column Toggle View (< 768px) */}
          <div className="block md:hidden">
            <MobileRoleView
              roles={roles}
              permissions={permissions}
              initialMatrix={initialMatrix}
              currentMatrix={currentMatrix}
              canManage={canManageRoles}
              onToggleCell={toggleCell}
            />
          </div>
        </>
      ) : activeTab === 'features' ? (
        <FeaturesTab
          features={features}
          permissions={adminPermissions}
          unassignedPermsMap={unassignedPermsMap}
          canManage={canManageRoles}
          isLoading={isFeaturesLoading}
          onUpdatePermissions={updateFeaturePermissions}
          onUpdateMode={updateFeatureMode}
          onToggleActive={toggleFeatureActive}
          onReorder={reorderFeature}
        />
      ) : (
        /* Users Tab */
        <UsersTab
          users={users}
          roles={roles}
          isLoading={isLoading}
          canManage={canManageRoles}
          initialRoleFilter={userTabRoleFilter}
          onUpdateUserRoles={async (userId, roleNames) => {
            await updateUserRoles(userId, roleNames);
          }}
        />
      )}

      {/* Modals */}
      <AddRoleModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        existingRoles={roles}
        onSubmit={async (data) => {
          await createRole(data);
        }}
      />

      <RenameRoleModal
        isOpen={Boolean(roleToRename)}
        onClose={() => setRoleToRename(null)}
        role={roleToRename}
        existingRoles={roles}
        onSubmit={async (id, data) => {
          await updateRole(id, data);
        }}
      />
    </div>
  );
};

export default RolesPage;
