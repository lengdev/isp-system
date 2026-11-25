import React, { useState } from 'react';
import { UsersWorkspace } from '../users/UsersWorkspace';
import { UserPermissionsModal } from './UserPermissionsModal';
import type { UserWithRoles, RoleItem } from '../../types/roles';

export interface UsersTabProps {
  users?: UserWithRoles[];
  roles?: RoleItem[];
  isLoading?: boolean;
  canManage: boolean;
  initialRoleFilter?: string | null;
  onUpdateUserRoles?: (userId: string, newRoleNames: string[]) => Promise<void>;
}

export const UsersTab: React.FC<UsersTabProps> = ({
  canManage,
  initialRoleFilter = null,
}) => {
  const [editingPermissionsUser, setEditingPermissionsUser] = useState<UserWithRoles | null>(null);

  return (
    <>
      <UsersWorkspace
        key={initialRoleFilter || 'all'}
        embedded
        initialRoleFilter={initialRoleFilter}
        showPermissionsButton
        onManagePermissions={(u) => setEditingPermissionsUser(u)}
      />

      <UserPermissionsModal
        user={editingPermissionsUser}
        canManage={canManage}
        onClose={() => setEditingPermissionsUser(null)}
      />
    </>
  );
};
