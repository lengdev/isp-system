export interface RoleItem {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  userCount: number;
  updatedAt: string;
}

export interface PermissionItem {
  id: string;
  key: string;
  group: string;
  label: string;
  description: string | null;
  sortOrder: number;
}

export interface RolesMatrixResponse {
  roles: RoleItem[];
  permissions: PermissionItem[];
  matrix: Record<string, string[]>; // roleId -> permissionKey[]
}

export interface UserWithRoles {
  id: string;
  username: string;
  email: string;
  fullName: string;
  phone?: string | null;
  avatarUrl?: string | null;
  role: string;
  roles: string[];
  roleIds: string[];
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRolePayload {
  name: string;
  description?: string;
  copyFromRoleId?: string;
}

export interface UpdateRolePayload {
  name?: string;
  description?: string;
}

export interface UpdateRolePermissionsPayload {
  add?: string[];
  remove?: string[];
  expectedUpdatedAt?: string;
}

export interface UpdateRolePermissionsResponse {
  id: string;
  name: string;
  updatedAt: string;
  permissionKeys: string[];
}

export interface RolePermissionDiff {
  roleId: string;
  add: string[];
  remove: string[];
  expectedUpdatedAt: string;
}

export interface CellCoord {
  roleId: string;
  permissionKey: string;
}

export interface FeatureItem {
  id: string;
  key: string;
  type: 'MENU' | 'PAGE' | 'TAB' | 'ACTION';
  label: string;
  path: string | null;
  icon: string | null;
  parentId: string | null;
  parentKey: string | null;
  parentLabel: string | null;
  sortOrder: number;
  isActive: boolean;
  locked: boolean;
  permissionMode: 'ANY' | 'ALL';
  permissionKeys: string[];
  updatedAt: string;
}

export interface FeatureDiff {
  id: string;
  label?: string;
  sortOrder?: number;
  isActive?: boolean;
  permissionMode?: 'ANY' | 'ALL';
  permissionKeys?: string[];
}
