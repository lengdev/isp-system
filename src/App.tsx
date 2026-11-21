import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { CommandPalette } from './components/layout/CommandPalette';
import { ToastContainer } from './components/ui/Toast';
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
import { DevTablePage } from './pages/DevTablePage';
import { DevMotionPage } from './pages/DevMotionPage';
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

const AnimatedRouteWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();

  return (
    <motion.div
      key={location.pathname}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
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

  const reducedMotionSetting = animations === 'reduced' ? 'always' : animations === 'on' ? 'never' : 'user';

  return (
    <MotionConfig reducedMotion={reducedMotionSetting}>
      <div className="flex min-h-screen bg-[var(--bg-app)] text-[var(--text)] font-sans antialiased overflow-x-hidden w-full">
      {/* Sidebar (Desktop sticky & Mobile drawer) */}
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar onMobileMenuOpen={() => setMobileMenuOpen(true)} />

        <main className="flex-1 min-w-0 max-w-[1480px] mx-auto px-4 sm:px-6 w-full pt-5 pb-10">
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<Navigate to="/customers" replace />} />
              <Route
                path="/customers"
                element={
                  <AnimatedRouteWrapper>
                    <CustomersPage />
                  </AnimatedRouteWrapper>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <AnimatedRouteWrapper>
                    <DashboardPage />
                  </AnimatedRouteWrapper>
                }
              />
              <Route
                path="/plans"
                element={
                  <AnimatedRouteWrapper>
                    <PlansPage />
                  </AnimatedRouteWrapper>
                }
              />
              <Route
                path="/billing"
                element={
                  <AnimatedRouteWrapper>
                    <BillingPage />
                  </AnimatedRouteWrapper>
                }
              />
              <Route
                path="/tickets"
                element={
                  <AnimatedRouteWrapper>
                    <TicketsPage />
                  </AnimatedRouteWrapper>
                }
              />
              <Route
                path="/network"
                element={
                  <AnimatedRouteWrapper>
                    <NetworkPage />
                  </AnimatedRouteWrapper>
                }
              />
              <Route
                path="/technicians"
                element={
                  <AnimatedRouteWrapper>
                    <TechniciansPage />
                  </AnimatedRouteWrapper>
                }
              />
              <Route
                path="/reports"
                element={
                  <AnimatedRouteWrapper>
                    <ReportsPage />
                  </AnimatedRouteWrapper>
                }
              />
              <Route
                path="/messages"
                element={
                  <AnimatedRouteWrapper>
                    <MessagesPage />
                  </AnimatedRouteWrapper>
                }
              />
              <Route
                path="/automation"
                element={
                  <AnimatedRouteWrapper>
                    <AutomationPage />
                  </AnimatedRouteWrapper>
                }
              />
              <Route
                path="/integrations"
                element={
                  <AnimatedRouteWrapper>
                    <IntegrationsPage />
                  </AnimatedRouteWrapper>
                }
              />
              <Route
                path="/settings"
                element={
                  <AnimatedRouteWrapper>
                    <SettingsPage />
                  </AnimatedRouteWrapper>
                }
              />
              <Route
                path="/dev/table"
                element={
                  <AnimatedRouteWrapper>
                    <DevTablePage />
                  </AnimatedRouteWrapper>
                }
              />
              <Route
                path="/dev/motion"
                element={
                  <AnimatedRouteWrapper>
                    <DevMotionPage />
                  </AnimatedRouteWrapper>
                }
              />
              <Route path="*" element={<Navigate to="/customers" replace />} />
            </Routes>
          </AnimatePresence>
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
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
