import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = React.memo(({ children }) => {
  const status = useAuthStore((s) => s.status);
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const location = useLocation();

  if (!isInitialized || status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-orange-500">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="text-xs font-medium text-[var(--text-muted)]">Verifying session...</span>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  return <>{children}</>;
});
ProtectedRoute.displayName = 'ProtectedRoute';
