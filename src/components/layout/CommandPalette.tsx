import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Users,
  LayoutDashboard,
  Wifi,
  Receipt,
  LifeBuoy,
  Radio,
  Settings,
  Plus,
  Moon,
  Sun,
  RotateCcw,
  CreditCard,
  X,
  ArrowRight,
} from 'lucide-react';
import { useStore } from '../../store/useStore';

export const CommandPalette: React.FC = () => {
  const isOpen = useStore((s) => s.isCommandPaletteOpen);
  const setIsOpen = useStore((s) => s.setCommandPaletteOpen);
  const customers = useStore((s) => s.customers);
  const openDrawer = useStore((s) => s.openDrawer);
  const openModal = useStore((s) => s.openModal);
  const darkMode = useStore((s) => s.darkMode);
  const toggleDarkMode = useStore((s) => s.toggleDarkMode);
  const resetDemoData = useStore((s) => s.resetDemoData);

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();

  // Keyboard shortcut listener for Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(!isOpen);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, setIsOpen]);

  // Reset query on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const navItems = [
    { title: 'Customers', subtitle: 'Browse subscribers and active lines', icon: Users, path: '/customers' },
    { title: 'Dashboard', subtitle: 'Network analytics, revenue & churn', icon: LayoutDashboard, path: '/dashboard' },
    { title: 'Internet Plans', subtitle: 'Configure bandwidth tiers and pricing', icon: Wifi, path: '/plans' },
    { title: 'Billing & Invoices', subtitle: 'Subscriber invoicing and payments', icon: Receipt, path: '/billing' },
    { title: 'Support Tickets', subtitle: 'Customer issues & field dispatch', icon: LifeBuoy, path: '/tickets' },
    { title: 'Network Infrastructure', subtitle: 'OLT, ONT and router monitoring', icon: Radio, path: '/network' },
    { title: 'Settings', subtitle: 'System preferences & configurations', icon: Settings, path: '/settings' },
  ];

  const quickActions = [
    {
      title: 'Add New Customer',
      subtitle: 'Create a new subscriber account',
      icon: Plus,
      action: () => openModal('addEditCustomer'),
    },
    {
      title: 'Record Payment',
      subtitle: 'Apply customer balance payment',
      icon: CreditCard,
      action: () => openModal('recordPayment'),
    },
    {
      title: 'Create Support Ticket',
      subtitle: 'Log customer issue or inquiry',
      icon: LifeBuoy,
      action: () => openModal('createTicket'),
    },
    {
      title: darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode',
      subtitle: 'Toggle theme preference',
      icon: darkMode ? Sun : Moon,
      action: () => toggleDarkMode(),
    },
    {
      title: 'Reset Demo Data',
      subtitle: 'Restore 200+ customer records',
      icon: RotateCcw,
      action: () => resetDemoData(),
    },
  ];

  // Filter items
  const filteredNav = navItems.filter((item) =>
    item.title.toLowerCase().includes(query.toLowerCase()) ||
    item.subtitle.toLowerCase().includes(query.toLowerCase())
  );

  const filteredActions = quickActions.filter((item) =>
    item.title.toLowerCase().includes(query.toLowerCase()) ||
    item.subtitle.toLowerCase().includes(query.toLowerCase())
  );

  const filteredCustomers = query.trim()
    ? customers
        .filter(
          (c) =>
            c.fullName.toLowerCase().includes(query.toLowerCase()) ||
            c.email.toLowerCase().includes(query.toLowerCase()) ||
            c.ipAddress.includes(query) ||
            c.macAddress.toLowerCase().includes(query.toLowerCase()) ||
            c.phone.includes(query) ||
            c.code.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, 6)
    : [];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 sm:p-6 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
          />

          {/* Palette Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15 }}
            className="relative w-full max-w-xl rounded-2xl bg-white dark:bg-[#1C1C1F] border border-gray-200/80 dark:border-gray-800 shadow-2xl overflow-hidden z-10 flex flex-col"
          >
            {/* Search Input Box */}
            <div className="flex items-center px-4 py-3.5 border-b border-gray-100 dark:border-gray-800">
              <Search className="w-5 h-5 text-[#F26B3A] shrink-0 mr-3" />
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type a command, page, customer name, IP or MAC..."
                className="w-full bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Content List */}
            <div className="max-h-96 overflow-y-auto p-2 divide-y divide-gray-100 dark:divide-gray-800/60">
              {/* Matching Customers */}
              {filteredCustomers.length > 0 && (
                <div className="py-2">
                  <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#F26B3A] mb-1.5">
                    Customers Found ({filteredCustomers.length})
                  </div>
                  <div className="space-y-1">
                    {filteredCustomers.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          openDrawer(c.id);
                          setIsOpen(false);
                        }}
                        className="flex items-center justify-between w-full px-3 py-2 rounded-xl text-left hover:bg-[#FFF1EA] dark:hover:bg-[#F26B3A]/15 group transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-orange-100 dark:bg-orange-950/60 text-[#F26B3A] text-xs font-bold">
                            {c.initials}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-gray-900 dark:text-gray-100 group-hover:text-[#F26B3A]">
                              {c.fullName}{' '}
                              <span className="text-[11px] font-normal text-gray-400">({c.code})</span>
                            </div>
                            <div className="text-[11px] text-gray-400">
                              {c.ipAddress} • {c.planName}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                            ${c.monthlyPrice}/mo
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#F26B3A]" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Navigation */}
              {filteredNav.length > 0 && (
                <div className="py-2">
                  <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">
                    Navigation
                  </div>
                  <div className="space-y-1">
                    {filteredNav.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.path}
                          onClick={() => {
                            navigate(item.path);
                            setIsOpen(false);
                          }}
                          className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-left hover:bg-gray-100/80 dark:hover:bg-gray-800/60 group transition-colors"
                        >
                          <div className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 group-hover:text-[#F26B3A] group-hover:bg-[#FFF1EA] dark:group-hover:bg-[#F26B3A]/20 transition-colors">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-gray-800 dark:text-gray-200 group-hover:text-[#F26B3A]">
                              {item.title}
                            </div>
                            <div className="text-[10px] text-gray-400">{item.subtitle}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              {filteredActions.length > 0 && (
                <div className="py-2">
                  <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">
                    Quick Actions
                  </div>
                  <div className="space-y-1">
                    {filteredActions.map((action, i) => {
                      const Icon = action.icon;
                      return (
                        <button
                          key={i}
                          onClick={() => {
                            action.action();
                            setIsOpen(false);
                          }}
                          className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-left hover:bg-gray-100/80 dark:hover:bg-gray-800/60 group transition-colors"
                        >
                          <div className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 group-hover:text-[#F26B3A] group-hover:bg-[#FFF1EA] dark:group-hover:bg-[#F26B3A]/20 transition-colors">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-gray-800 dark:text-gray-200 group-hover:text-[#F26B3A]">
                              {action.title}
                            </div>
                            <div className="text-[10px] text-gray-400">{action.subtitle}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Empty results */}
              {filteredNav.length === 0 &&
                filteredActions.length === 0 &&
                filteredCustomers.length === 0 && (
                  <div className="py-8 text-center text-gray-400 text-xs">
                    No matching actions or subscribers found for "{query}".
                  </div>
                )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 bg-gray-50 dark:bg-[#18181A] border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-[11px] text-gray-400">
              <div className="flex items-center gap-3">
                <span>
                  <kbd className="px-1 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-mono text-[9px]">
                    ESC
                  </kbd>{' '}
                  to close
                </span>
                <span>
                  <kbd className="px-1 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-mono text-[9px]">
                    ↵
                  </kbd>{' '}
                  to select
                </span>
              </div>
              <span className="text-[#F26B3A] font-semibold">NetPulse Assistant</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
