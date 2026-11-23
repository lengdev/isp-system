import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

interface RequirePermissionProps {
  permission?: string;
  role?: string;
  roles?: string[];
  fallback?: React.ReactNode;
  redirectTo?: string;
  children: React.ReactNode;
}

export const RequirePermission: React.FC<RequirePermissionProps> = ({
  permission,
  role,
  roles,
  fallback,
  redirectTo = '/403',
  children,
}) => {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const hasRole = useAuthStore((s) => s.hasRole);
  const user = useAuthStore((s) => s.user);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Super Admin bypasses all checks
  if (user.role === 'SUPER_ADMIN') {
    return <>{children}</>;
  }

  // Check specific permission if provided
  if (permission && !hasPermission(permission)) {
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
};
