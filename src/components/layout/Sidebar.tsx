import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Wifi,
  Receipt,
  LifeBuoy,
  Radio,
  Wrench,
  BarChart3,
  Mail,
  Zap,
  Layers,
  Settings,
  HelpCircle,
  Search,
  ArrowRight,
  Activity,
  X,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Avatar } from '../ui/Avatar';
import { cn } from '../../lib/utils';

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onMobileClose }) => {
  const location = useLocation();
  const setCommandPaletteOpen = useStore((s) => s.setCommandPaletteOpen);
  const tickets = useStore((s) => s.tickets);
  const addToast = useStore((s) => s.addToast);

  const openTicketsCount = tickets.filter((t) => t.status === 'Open' || t.status === 'In Progress').length;

  const mainNav = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Customers', path: '/customers', icon: Users },
    { name: 'Plans', path: '/plans', icon: Wifi },
    { name: 'Billing', path: '/billing', icon: Receipt },
    { name: 'Tickets', path: '/tickets', icon: LifeBuoy, badge: openTicketsCount || 21 },
    { name: 'Network', path: '/network', icon: Radio },
    { name: 'Technicians', path: '/technicians', icon: Wrench },
    { name: 'Reports', path: '/reports', icon: BarChart3 },
  ];

  const toolsNav = [
    { name: 'Messages', path: '/messages', icon: Mail },
    { name: 'Automation', path: '/automation', icon: Zap },
    { name: 'Integrations', path: '/integrations', icon: Layers },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#FAF7F5] dark:bg-[#141416] border-r border-gray-200/80 dark:border-gray-800/80 px-4 py-5 select-none w-60">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-2 mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#F26B3A] text-white shadow-xs">
            <Activity className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight text-gray-900 dark:text-gray-100">
              NetPulse
            </h1>
            <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500">
              Smart ISP Management
            </p>
          </div>
        </div>

        {onMobileClose && (
          <button
            type="button"
            onClick={onMobileClose}
            className="md:hidden p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Search Menu Trigger Button */}
      <button
        type="button"
        onClick={() => setCommandPaletteOpen(true)}
        className="flex items-center justify-between w-full px-3 py-2 mb-3 text-xs text-gray-400 bg-white dark:bg-[#1E1E22] border border-gray-200/80 dark:border-gray-800 rounded-xl shadow-xs hover:border-[#F26B3A]/40 transition-colors group shrink-0"
      >
        <div className="flex items-center gap-2">
          <Search className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#F26B3A] transition-colors" />
          <span>Search menu...</span>
        </div>
        <kbd className="px-1.5 py-0.5 text-[10px] font-semibold text-gray-400 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
          Ctrl K
        </kbd>
      </button>

      {/* Navigation List (thin auto-hiding scrollbar) */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 -mr-1 scrollbar-none">
        {/* Main Section */}
        <div className="space-y-1">
          {mainNav.map((item) => {
            const isActive =
              location.pathname === item.path ||
              (item.path === '/customers' && location.pathname === '/');
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onMobileClose}
                className={cn(
                  'relative flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 group',
                  isActive
                    ? 'text-[#F26B3A] font-bold bg-[#FFF1EA] dark:bg-[#F26B3A]/15'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-white/60 dark:hover:bg-gray-800/40'
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebarActivePill"
                    className="absolute inset-0 bg-[#FFF1EA] dark:bg-[#F26B3A]/15 rounded-xl border border-[#F26B3A]/20"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <div className="relative z-10 flex items-center gap-3">
                  <Icon
                    className={cn(
                      'w-[18px] h-[18px] transition-colors',
                      isActive ? 'text-[#F26B3A]' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'
                    )}
                  />
                  <span>{item.name}</span>
                </div>

                {item.badge !== undefined && (
                  <span
                    className={cn(
                      'relative z-10 flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[10px] font-bold',
                      isActive
                        ? 'bg-[#F26B3A] text-white'
                        : 'bg-orange-100 dark:bg-orange-950/60 text-[#F26B3A]'
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Tools Section */}
        <div className="pt-2">
          <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 block mb-1">
            Tools
          </span>
          <div className="space-y-1">
            {toolsNav.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onMobileClose}
                  className={cn(
                    'relative flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 group',
                    isActive
                      ? 'text-[#F26B3A] font-bold bg-[#FFF1EA] dark:bg-[#F26B3A]/15'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-white/60 dark:hover:bg-gray-800/40'
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="sidebarActivePill"
                      className="absolute inset-0 bg-[#FFF1EA] dark:bg-[#F26B3A]/15 rounded-xl border border-[#F26B3A]/20"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <div className="relative z-10 flex items-center gap-3">
                    <Icon
                      className={cn(
                        'w-[18px] h-[18px] transition-colors',
                        isActive ? 'text-[#F26B3A]' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'
                      )}
                    />
                    <span>{item.name}</span>
                  </div>
                </NavLink>
              );
            })}
          </div>
        </div>
      </div>

      {/* Pinned Bottom Area */}
      <div className="mt-auto shrink-0 space-y-3 pt-3">
        {/* Upgrade to Pro Card */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#FFF5F0] via-[#FFEADB] to-[#FEDBC9] dark:from-[#2A1810] dark:via-[#25140D] dark:to-[#1E110A] border border-[#F26B3A]/25 shadow-xs relative overflow-hidden">
          <div className="relative z-10">
            <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100">Upgrade to Pro</h4>
            <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-0.5 leading-snug">
              Multi-gigabit capacity & automated traffic shaping.
            </p>
            <button
              type="button"
              onClick={() => {
                addToast({
                  type: 'success',
                  title: 'Pro Upgrade Requested',
                  message: 'An enterprise sales specialist has been notified.',
                });
              }}
              className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F26B3A] text-white text-[11px] font-bold hover:bg-[#E05220] transition-colors shadow-xs"
            >
              <span>Upgrade Now</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Help Center */}
        <NavLink
          to="/settings"
          onClick={onMobileClose}
          className="flex items-center gap-3 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-white/60 dark:hover:bg-gray-800/40 rounded-xl transition-colors"
        >
          <HelpCircle className="w-4 h-4 text-gray-400" />
          <span>Help center</span>
        </NavLink>

        {/* User Profile Block */}
        <div className="pt-2.5 border-t border-gray-200/80 dark:border-gray-800/80 flex items-center gap-3 px-1">
          <Avatar name="Hariharan B" size="md" online={true} />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">
              Hariharan B
            </div>
            <div className="text-[11px] text-gray-400 dark:text-gray-500 truncate">
              Network Admin
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Sticky, full height, no outer scroll) */}
      <aside className="hidden md:flex shrink-0 h-screen sticky top-0 z-30 overflow-hidden">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onMobileClose}
              className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative z-10 h-full shadow-2xl"
            >
              {sidebarContent}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
