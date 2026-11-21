import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const darkMode = useStore((s) => s.darkMode);

  // Initialize theme on mount
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return (
    <div className="flex min-h-screen bg-[#FAF7F5] dark:bg-[#121214] text-gray-800 dark:text-gray-100 font-sans transition-colors duration-200">
      {/* Sidebar (Desktop sticky & Mobile drawer) */}
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar onMobileMenuOpen={() => setMobileMenuOpen(true)} />

        <main className="flex-1 max-w-[1440px] mx-auto px-4 sm:px-8 w-full py-6">
          <AnimatePresence mode="wait">
            <Routes>
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
              <Route path="*" element={<Navigate to="/customers" replace />} />
            </Routes>
          </AnimatePresence>
        </main>
      </div>

      {/* Global Interactive Command Palette (Ctrl+K) */}
      <CommandPalette />

      {/* Stacked Toast Notifications */}
      <ToastContainer />
    </div>
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
