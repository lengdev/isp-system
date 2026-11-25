export type FeatureType = 'MENU' | 'PAGE' | 'TAB' | 'ACTION';
export type PermissionMode = 'ANY' | 'ALL';

export interface RegistryPermission {
  key: string;
  group: string;
  label: string;
  description: string;
  sortOrder: number;
  dependsOnKey?: string | null;
}

export interface RegistryFeature {
  key: string;
  type: FeatureType;
  label: string;
  path?: string | null;
  icon?: string | null;
  parentKey?: string | null;
  sortOrder: number;
  locked?: boolean;
  permissionMode?: PermissionMode;
  defaultPermissions?: string[];
}
