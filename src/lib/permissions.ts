import React from 'react';
import { useAuthStore } from '../store/authStore';

/**
 * Checks whether the current user has access to a given feature key or permission key.
 * Features come from /auth/me and DB feature-permission mapping.
 * SUPER_ADMIN or '*' bypasses all checks.
 */
export function can(key: string): boolean {
  if (!key) return true;
  const { user, permissions, features } = useAuthStore.getState();
  if (!user) return false;

  // Super Admin bypass
  if (user.role === 'SUPER_ADMIN' || permissions.includes('*') || (features && features.includes('*'))) {
    return true;
  }

  // Check if it's an allowed feature key
  if (features && features.includes(key)) {
    return true;
  }

  // Check direct permission match
  if (permissions.includes(key)) {
    return true;
  }

  // Module wildcard fallback (e.g. "billing.*")
  const parts = key.split('.');
  if (parts.length > 1 && permissions.includes(`${parts[0]}.*`)) {
    return true;
  }

  return false;
}

/**
 * React hook to check access to a feature key or permission key
 */
export function useCan(key: string): boolean {
  const user = useAuthStore((s) => s.user);
  const permissions = useAuthStore((s) => s.permissions);
  const features = useAuthStore((s) => s.features);

  if (!key) return true;
  if (!user) return false;
  if (user.role === 'SUPER_ADMIN' || permissions.includes('*') || (features && features.includes('*'))) {
    return true;
  }
  if (features && features.includes(key)) return true;
  if (permissions.includes(key)) return true;

  const parts = key.split('.');
  if (parts.length > 1 && permissions.includes(`${parts[0]}.*`)) {
    return true;
  }

  return false;
}

export interface CanProps {
  feature?: string;
  permission?: string;
  action?: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Declarative component for guarding UI elements by feature or permission key
 */
export const Can: React.FC<CanProps> = ({
  feature,
  permission,
  action,
  fallback = null,
  children,
}) => {
  const targetKey = feature || permission || action || '';
  const isAllowed = useCan(targetKey);

  if (!isAllowed) {
    return fallback ? React.createElement(React.Fragment, null, fallback) : null;
  }

  return React.createElement(React.Fragment, null, children);
};
