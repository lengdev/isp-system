import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useCan } from '../../lib/permissions';

interface RequirePermissionProps {
  feature?: string;
  permission?: string;
  role?: string;
  roles?: string[];
  fallback?: React.ReactNode;
  redirectTo?: string;
  children: React.ReactNode;
}

export const RequirePermission: React.FC<RequirePermissionProps> = React.memo(({
  feature,
  permission,
  role,
  roles,
  fallback,
  redirectTo = '/403',
  children,
}) => {
  const hasRole = useAuthStore((s) => s.hasRole);
  const user = useAuthStore((s) => s.user);
  const status = useAuthStore((s) => s.status);
  const isInitialized = useAuthStore((s) => s.isInitialized);

  const targetKey = feature || permission || '';
  const isAllowed = useCan(targetKey);

  // Hold rendering if auth state has not yet finished initializing
  if (!isInitialized || status === 'loading' || status === 'idle') {
    return null;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Super Admin bypasses all checks
  if (user.role === 'SUPER_ADMIN') {
    return <>{children}</>;
  }

  // Check specific feature or permission if provided
  if (targetKey && !isAllowed) {
    if (fallback) return <>{fallback}</>;
    return <Navigate to={redirectTo} replace />;
  }

  // Check single role if provided
  if (role && !hasRole(role)) {
    if (fallback) return <>{fallback}</>;
    return <Navigate to={redirectTo} replace />;
  }

  // Check multiple roles if provided
  if (roles && roles.length > 0 && !hasRole(...roles)) {
    if (fallback) return <>{fallback}</>;
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
});

RequirePermission.displayName = 'RequirePermission';
RequirePermission.displayName = 'RequirePermission';
