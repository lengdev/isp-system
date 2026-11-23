import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export const ForbiddenPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-md w-full p-8 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-xl relative overflow-hidden"
      >
        <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-orange-500/10 blur-2xl pointer-events-none" />

        <div className="w-16 h-16 rounded-2xl bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 flex items-center justify-center mx-auto mb-6 shadow-inner">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 mb-3">
          Error 403 • Forbidden
        </span>

        <h1 className="text-2xl font-bold text-[var(--text)] tracking-tight mb-2">
          Access Restricted
        </h1>

        <p className="text-sm text-[var(--text-muted)] mb-6 leading-relaxed">
          You don&apos;t have sufficient permissions with your current role{' '}
          <span className="font-semibold text-orange-600 dark:text-orange-400">
            ({user?.role || 'User'})
          </span>{' '}
          to view this module. Please contact a Super Admin if you need access.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 justify-center">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--text)] hover:bg-[var(--surface-subtle)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold shadow-md shadow-orange-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Home className="w-4 h-4" />
            Dashboard
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default ForbiddenPage;
