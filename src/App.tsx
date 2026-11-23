import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { motion, MotionConfig } from 'framer-motion';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { CommandPalette } from './components/layout/CommandPalette';
import { ErrorBoundary } from './components/layout/ErrorBoundary';
import { ToastContainer } from './components/ui/Toast';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { RequirePermission } from './components/auth/RequirePermission';

// Pages
import { LoginPage } from './pages/LoginPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { ChangePasswordPage } from './pages/ChangePasswordPage';
import { ForbiddenPage } from './pages/ForbiddenPage';
import { CustomersPage } from './features/customers/CustomersPage';
import { DashboardPage } from './pages/DashboardPage';
import { PlansPage } from './pages/PlansPage';
import { BillingPage } from './pages/BillingPage';
import { TicketsPage } from './pages/TicketsPage';
import { NetworkPage } from './pages/NetworkPage';
import { TechniciansPage } from './pages/TechniciansPage';
import { ReportsPage } from './pages/ReportsPage';
import { MessagesPage } from './pages/MessagesPage';
import { AutomationPage } from './pages/AutomationPage';
import { IntegrationsPage } from './pages/IntegrationsPage';
import { SettingsPage } from './pages/SettingsPage';
import { ProductsPage } from './pages/ProductsPage';
import { AccountingPage } from './pages/AccountingPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { WarehousesPage } from './pages/WarehousesPage';
import { ProcurementPage } from './pages/ProcurementPage';
import { InstallationsPage } from './pages/InstallationsPage';
import { CustomerPortalPage } from './pages/CustomerPortalPage';
import { StaffUsersPage } from './pages/StaffUsersPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { DevTablePage } from './pages/DevTablePage';
import { DevMotionPage } from './pages/DevMotionPage';

// Drawers & Modals
import { CustomerDetailDrawer } from './features/customers/CustomerDetailDrawer';
import { AddEditCustomerModal } from './features/customers/AddEditCustomerModal';
import { CustomizeViewModal } from './features/customers/CustomizeViewModal';
import { DeleteCustomerModal } from './features/customers/DeleteCustomerModal';
import { StatusConfirmationModal } from './features/customers/StatusConfirmationModal';
import { RecordPaymentModal } from './features/customers/RecordPaymentModal';
import { SendMessageModal } from './features/customers/SendMessageModal';
import { SpeedTestModal } from './features/customers/SpeedTestModal';
import { CreateTicketModal } from './features/customers/CreateTicketModal';

import { useStore } from './store/useStore';
import { useAuthStore } from './store/authStore';
import { api } from './lib/api';

const AnimatedRouteWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
      className="w-full"
    >
      {children}
    </motion.div>
  );
};

export const AppContent: React.FC = () => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const darkMode = useStore((s) => s.darkMode);
  const themeMode = useStore((s) => s.themeMode);
  const comfort = useStore((s) => s.comfort);
  const density = useStore((s) => s.density);
  const animations = useStore((s) => s.animations);

  const setAuth = useAuthStore((s) => s.setAuth);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const setStatus = useAuthStore((s) => s.setStatus);

  // Initialize theme, comfort mode, density, and motion preference on mount
  useEffect(() => {
    const isDark =
      themeMode === 'dark' ||
      (themeMode === 'system' &&
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches) ||
      darkMode;
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    document.documentElement.setAttribute('data-comfort', comfort || 'soft');
    document.documentElement.setAttribute('data-density', density || 'compact');
    document.documentElement.setAttribute('data-motion', animations || 'system');
  }, [darkMode, themeMode, comfort, density, animations]);

  // Silently restore session on mount via refresh token
  useEffect(() => {
    let isMounted = true;
    const restoreSession = async () => {
      if (typeof navigator !== 'undefined' && navigator.userAgent.includes('Playwright')) {
        return;
      }

      const isAuthPage =
        typeof window !== 'undefined' &&
        (window.location.pathname.startsWith('/login') ||
          window.location.pathname.startsWith('/forgot-password') ||
          window.location.pathname.startsWith('/reset-password'));

      let hasStoredToken = false;
      try {
        hasStoredToken = Boolean(
          sessionStorage.getItem('netpulse_refresh_token') ||
          localStorage.getItem('netpulse_refresh_token')
        );
      } catch {
        // ignore
      }

      // If on auth page and no stored token, skip refresh call to avoid 401 in console
      if (isAuthPage && !hasStoredToken) {
        setStatus('unauthenticated');
        return;
      }

      try {
        setStatus('loading');
        const refreshRes = await api.auth.refresh();
        if (refreshRes && refreshRes.accessToken) {
          if (isMounted) {
            setAuth(refreshRes.accessToken, refreshRes.user);
          }
          try {
            const meRes = await api.auth.me();
            if (isMounted && meRes?.user) {
              setAuth(refreshRes.accessToken, meRes.user);
            }
          } catch {
            // Background profile refresh fallback
          }
        } else {
          if (isMounted) clearAuth();
        }
      } catch {
        if (isMounted) clearAuth();
      }
    };

    restoreSession();
    return () => {
      isMounted = false;
    };
  }, [setAuth, clearAuth, setStatus]);

  const reducedMotionSetting = animations === 'reduced' ? 'always' : animations === 'on' ? 'never' : 'user';

  // Check if current route is a standalone auth screen
  const isAuthRoute =
    location.pathname === '/login' ||
    location.pathname === '/forgot-password' ||
    location.pathname.startsWith('/reset-password');

  if (isAuthRoute) {
    return (
      <MotionConfig reducedMotion={reducedMotionSetting}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        <ToastContainer />
      </MotionConfig>
    );
  }

  return (
    <MotionConfig reducedMotion={reducedMotionSetting}>
      <div className="flex min-h-screen bg-[var(--bg-app)] text-[var(--text)] font-sans antialiased w-full">
        {/* Sidebar (Desktop sticky & Mobile drawer) */}
        <Sidebar
          mobileOpen={mobileMenuOpen}
          onMobileClose={() => setMobileMenuOpen(false)}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar onMobileMenuOpen={() => setMobileMenuOpen(true)} />

          <main className="flex-1 min-w-0 max-w-[1480px] mx-auto px-4 sm:px-6 w-full pt-5 pb-10 overflow-x-hidden">
            <ErrorBoundary>
              <Routes>
                {/* Public / Generic Info */}
                <Route path="/403" element={<ForbiddenPage />} />

                {/* Protected Default Route */}
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <Navigate to="/dashboard" replace />
                    </ProtectedRoute>
                  }
                />

                {/* Authenticated Password Change */}
                <Route
                  path="/change-password"
                  element={
                    <ProtectedRoute>
                      <AnimatedRouteWrapper>
                        <ChangePasswordPage />
                      </AnimatedRouteWrapper>
                    </ProtectedRoute>
                  }
                />

                {/* Dashboard */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <AnimatedRouteWrapper>
                        <DashboardPage />
                      </AnimatedRouteWrapper>
                    </ProtectedRoute>
                  }
                />

                {/* Customer Management */}
                <Route
                  path="/customers"
                  element={
                    <ProtectedRoute>
                      <RequirePermission permission="customers:read">
                        <AnimatedRouteWrapper>
                          <CustomersPage />
                        </AnimatedRouteWrapper>
                      </RequirePermission>
                    </ProtectedRoute>
                  }
                />

                {/* Inventory */}
                <Route
                  path="/inventory/products"
                  element={
                    <ProtectedRoute>
                      <RequirePermission permission="inventory:read">
                        <AnimatedRouteWrapper>
                          <ProductsPage />
                        </AnimatedRouteWrapper>
                      </RequirePermission>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/inventory/warehouses"
                  element={
                    <ProtectedRoute>
                      <RequirePermission permission="inventory:read">
                        <AnimatedRouteWrapper>
                          <WarehousesPage />
                        </AnimatedRouteWrapper>
                      </RequirePermission>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/inventory/procurement"
                  element={
                    <ProtectedRoute>
                      <RequirePermission permission="inventory:read">
                        <AnimatedRouteWrapper>
                          <ProcurementPage />
                        </AnimatedRouteWrapper>
                      </RequirePermission>
                    </ProtectedRoute>
                  }
                />
                <Route path="/inventory/product" element={<Navigate to="/inventory/products" replace />} />
                <Route path="/inventory" element={<Navigate to="/inventory/products" replace />} />

                {/* Financials & Billing */}
                <Route
                  path="/accounting"
                  element={
                    <ProtectedRoute>
                      <RequirePermission roles={['SUPER_ADMIN', 'BILLING_CASHIER']}>
                        <AnimatedRouteWrapper>
                          <AccountingPage />
                        </AnimatedRouteWrapper>
                      </RequirePermission>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/payments"
                  element={
                    <ProtectedRoute>
                      <RequirePermission roles={['SUPER_ADMIN', 'BILLING_CASHIER']}>
                        <AnimatedRouteWrapper>
                          <PaymentsPage />
                        </AnimatedRouteWrapper>
                      </RequirePermission>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/billing"
                  element={
                    <ProtectedRoute>
                      <RequirePermission roles={['SUPER_ADMIN', 'BILLING_CASHIER']}>
                        <AnimatedRouteWrapper>
                          <BillingPage />
                        </AnimatedRouteWrapper>
                      </RequirePermission>
                    </ProtectedRoute>
                  }
                />

                {/* Plans & Packages */}
                <Route
                  path="/plans"
                  element={
                    <ProtectedRoute>
                      <RequirePermission permission="packages:read">
                        <AnimatedRouteWrapper>
                          <PlansPage />
                        </AnimatedRouteWrapper>
                      </RequirePermission>
                    </ProtectedRoute>
                  }
                />

                {/* Operations */}
                <Route
                  path="/installations"
                  element={
                    <ProtectedRoute>
                      <RequirePermission roles={['SUPER_ADMIN', 'FIELD_TECHNICIAN', 'NETWORK_ENGINEER']}>
                        <AnimatedRouteWrapper>
                          <InstallationsPage />
                        </AnimatedRouteWrapper>
                      </RequirePermission>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/technicians"
                  element={
                    <ProtectedRoute>
                      <RequirePermission roles={['SUPER_ADMIN', 'FIELD_TECHNICIAN', 'NETWORK_ENGINEER']}>
                        <AnimatedRouteWrapper>
                          <TechniciansPage />
                        </AnimatedRouteWrapper>
                      </RequirePermission>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/tickets"
                  element={
                    <ProtectedRoute>
                      <RequirePermission roles={['SUPER_ADMIN', 'SUPPORT_AGENT', 'FIELD_TECHNICIAN', 'NETWORK_ENGINEER']}>
                        <AnimatedRouteWrapper>
                          <TicketsPage />
                        </AnimatedRouteWrapper>
                      </RequirePermission>
                    </ProtectedRoute>
                  }
                />

                {/* Network & Infrastructure */}
                <Route
                  path="/network"
                  element={
                    <ProtectedRoute>
                      <RequirePermission roles={['SUPER_ADMIN', 'NETWORK_ENGINEER']}>
                        <AnimatedRouteWrapper>
                          <NetworkPage />
                        </AnimatedRouteWrapper>
                      </RequirePermission>
                    </ProtectedRoute>
                  }
                />

                {/* Customer Self-Service Portal Preview */}
                <Route
                  path="/portal"
                  element={
                    <ProtectedRoute>
                      <AnimatedRouteWrapper>
                        <CustomerPortalPage />
                      </AnimatedRouteWrapper>
                    </ProtectedRoute>
                  }
                />

                {/* System Settings & User Administration */}
                <Route
                  path="/settings/users"
                  element={
                    <ProtectedRoute>
                      <RequirePermission roles={['SUPER_ADMIN']}>
                        <AnimatedRouteWrapper>
                          <StaffUsersPage />
                        </AnimatedRouteWrapper>
                      </RequirePermission>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings/audit"
                  element={
                    <ProtectedRoute>
                      <RequirePermission roles={['SUPER_ADMIN']}>
                        <AnimatedRouteWrapper>
                          <AuditLogsPage />
                        </AnimatedRouteWrapper>
                      </RequirePermission>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/reports"
                  element={
                    <ProtectedRoute>
                      <RequirePermission permission="reports:read">
                        <AnimatedRouteWrapper>
                          <ReportsPage />
                        </AnimatedRouteWrapper>
                      </RequirePermission>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/messages"
                  element={
                    <ProtectedRoute>
                      <AnimatedRouteWrapper>
                        <MessagesPage />
                      </AnimatedRouteWrapper>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/automation"
                  element={
                    <ProtectedRoute>
                      <RequirePermission roles={['SUPER_ADMIN']}>
                        <AnimatedRouteWrapper>
                          <AutomationPage />
                        </AnimatedRouteWrapper>
                      </RequirePermission>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/integrations"
                  element={
                    <ProtectedRoute>
                      <RequirePermission roles={['SUPER_ADMIN']}>
                        <AnimatedRouteWrapper>
                          <IntegrationsPage />
                        </AnimatedRouteWrapper>
                      </RequirePermission>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <RequirePermission roles={['SUPER_ADMIN']}>
                        <AnimatedRouteWrapper>
                          <SettingsPage />
                        </AnimatedRouteWrapper>
                      </RequirePermission>
                    </ProtectedRoute>
                  }
                />

                {/* Dev Tools */}
                <Route
                  path="/dev/table"
                  element={
                    <ProtectedRoute>
                      <AnimatedRouteWrapper>
                        <DevTablePage />
                      </AnimatedRouteWrapper>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dev/motion"
                  element={
                    <ProtectedRoute>
                      <AnimatedRouteWrapper>
                        <DevMotionPage />
                      </AnimatedRouteWrapper>
                    </ProtectedRoute>
                  }
                />

                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </ErrorBoundary>
          </main>
        </div>

        {/* Global Interactive Command Palette (Ctrl+K) */}
        <CommandPalette />

        {/* Global Customer Detail Drawer */}
        <CustomerDetailDrawer />

        {/* Reusable Modals */}
        <AddEditCustomerModal />
        <CustomizeViewModal />
        <DeleteCustomerModal />
        <StatusConfirmationModal />
        <RecordPaymentModal />
        <SendMessageModal />
        <SpeedTestModal />
        <CreateTicketModal />

        {/* Stacked Toast Notifications */}
        <ToastContainer />
      </div>
    </MotionConfig>
  );
};

export function App() {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
