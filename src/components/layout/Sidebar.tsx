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
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Avatar } from '../ui/Avatar';
import { Tooltip } from '../ui/Tooltip';
import { SPRING_SNAPPY } from '../../lib/motion';
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
  const sidebarCollapsed = useStore((s) => s.sidebarCollapsed);
  const toggleSidebarCollapsed = useStore((s) => s.toggleSidebarCollapsed);
  const sidebarUpgradeDismissed = useStore((s) => s.sidebarUpgradeDismissed);
  const setSidebarUpgradeDismissed = useStore((s) => s.setSidebarUpgradeDismissed);

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

  const renderNavList = (items: typeof mainNav) => (
    <div className="space-y-0.5">
      {items.map((item) => {
        const isActive =
          location.pathname === item.path ||
          (item.path === '/customers' && location.pathname === '/');
        const Icon = item.icon;

        const content = (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onMobileClose}
            className={cn(
              'relative flex items-center h-[34px] rounded-lg text-[13px] font-semibold tracking-[-0.01em] select-none group transition-colors',
              sidebarCollapsed ? 'justify-center w-9' : 'justify-between px-2.5 w-full',
              isActive
                ? 'text-[var(--brand)] font-semibold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[rgba(16,24,40,0.04)] dark:hover:bg-[rgba(255,255,255,0.05)]'
            )}
          >
            {/* Sliding Active Pill (Spec 3.4: no border, no outline, animate background only) */}
            {isActive && (
              <motion.div
                layoutId="nav-active"
                className="absolute inset-0 bg-[rgba(234,106,60,0.10)] dark:bg-[rgba(240,123,79,0.14)] rounded-lg pointer-events-none"
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              />
            )}

            <div className={cn('relative z-10 flex items-center gap-2.5 min-w-0', sidebarCollapsed && 'justify-center')}>
              <Icon
                className={cn(
                  'w-4 h-4 shrink-0 transition-colors',
                  isActive
                    ? 'text-[var(--brand)]'
                    : 'text-[var(--text-muted)] group-hover:text-[var(--text)]'
                )}
              />
              {!sidebarCollapsed && <span className="truncate">{item.name}</span>}
            </div>

            {!sidebarCollapsed && item.badge !== undefined && (
              <span className="relative z-10 flex items-center justify-center min-w-4 h-4 px-1.5 rounded-full text-[11px] font-semibold bg-[var(--surface-subtle)] text-[var(--text-muted)]">
                {item.badge}
              </span>
            )}
          </NavLink>
        );

        return sidebarCollapsed ? (
          <div key={item.path} className="w-full flex justify-center py-0.5">
            <Tooltip
              content={`${item.name}${item.badge ? ` (${item.badge})` : ''}`}
              side="right"
              className="flex justify-center"
            >
              {content}
            </Tooltip>
          </div>
        ) : (
          content
        );
      })}
    </div>
  );

  const sidebarContent = (
    <motion.div
      data-testid="sidebar-container"
      animate={{ width: sidebarCollapsed ? 64 : 232 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'flex flex-col h-full bg-[var(--bg-sidebar)] border-r border-[var(--border)] select-none overflow-hidden shrink-0',
        sidebarCollapsed ? 'px-2 py-3' : 'px-3.5 py-3'
      )}
    >
      {/* 1. Brand Header (56px) */}
      <div className={cn('h-14 flex items-center justify-between shrink-0 mb-1', sidebarCollapsed && 'justify-center')}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--brand)] text-white shadow-2xs shrink-0">
            <Activity className="w-4 h-4 stroke-[2.2]" />
          </div>
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.15 }}
                className="min-w-0 overflow-hidden"
              >
                <h1 className="text-[14px] font-bold tracking-tight text-[var(--text)] truncate leading-tight">
                  NetPulse
                </h1>
                <p className="text-[11px] text-[var(--text-muted)] truncate leading-tight">
                  ISP Operations
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Mobile close */}
        {onMobileClose && (
          <button
            type="button"
            onClick={onMobileClose}
            className="md:hidden p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 2. Search Menu Trigger Button */}
      <div className="shrink-0 mb-3">
        {sidebarCollapsed ? (
          <Tooltip content="Search menu (Ctrl+K)" side="right">
            <button
              type="button"
              onClick={() => setCommandPaletteOpen(true)}
              className="flex items-center justify-center w-full h-[34px] rounded-lg text-[var(--text-muted)] bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--brand)]/40 hover:text-[var(--brand)] transition-colors"
            >
              <Search className="w-4 h-4" />
            </button>
          </Tooltip>
        ) : (
          <button
            type="button"
            onClick={() => setCommandPaletteOpen(true)}
            className="flex items-center justify-between w-full h-[34px] px-2.5 text-[12px] text-[var(--text-muted)] bg-[var(--surface)] dark:bg-[rgba(255,255,255,0.04)] border border-[var(--border)] hover:border-[var(--border-strong)] rounded-lg focus:outline-none focus:border-[var(--brand)] focus:shadow-[0_0_0_3px_rgba(234,106,60,0.14)] transition-[border-color,box-shadow] duration-120 ease-out group"
          >
            <div className="flex items-center gap-2 truncate">
              <Search className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--brand)] transition-colors shrink-0" />
              <span className="truncate">Search menu...</span>
            </div>
            <kbd className="px-1.5 py-0.5 text-[11px] font-medium text-[var(--text-muted)] bg-[rgba(16,24,40,0.06)] dark:bg-[rgba(255,255,255,0.08)] rounded-[4px] pointer-events-none select-none shrink-0">
              Ctrl K
            </kbd>
          </button>
        )}
      </div>

      {/* 3. Navigation List (flex-1 min-h-0 overflow-y-auto scrollbar-thin) */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-0.5 scrollbar-thin">
        {renderNavList(mainNav)}

        {/* Tools Section */}
        <div>
          {!sidebarCollapsed ? (
            <div className="px-2.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
              Tools
            </div>
          ) : (
            <div className="my-2 border-t border-[var(--border-subtle)]" />
          )}
          {renderNavList(toolsNav)}
        </div>
      </div>

      {/* 4. Footer (Upgrade card, Help center, profile 52px, plus collapse toggle) */}
      <div className="mt-auto shrink-0 space-y-2 pt-2 border-t border-[var(--border)]">
        {/* Compact Upgrade card: dismissible & hidden on height < 760px */}
        <AnimatePresence>
          {!sidebarCollapsed && !sidebarUpgradeDismissed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15 }}
              className="hidden [@media(min-height:760px)]:block p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border)] relative overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setSidebarUpgradeDismissed(true)}
                className="absolute top-2 right-2 p-1 text-[var(--text-muted)] hover:text-[var(--text)] rounded-md transition-colors"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <h4 className="text-[12px] font-semibold text-[var(--text)] pr-4">Upgrade to Pro</h4>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-snug">
                Multi-gigabit capacity & traffic shaping.
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
                className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--brand)] text-white text-[11px] font-semibold hover:bg-[var(--brand-hover)] transition-colors shadow-2xs"
              >
                <span>Upgrade Now</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Help Center */}
        {sidebarCollapsed ? (
          <Tooltip content="Help center" side="right">
            <NavLink
              to="/settings"
              onClick={onMobileClose}
              className="flex items-center justify-center w-full h-[34px] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--surface-subtle)] transition-colors"
            >
              <HelpCircle className="w-4 h-4 text-[var(--text-muted)]" />
            </NavLink>
          </Tooltip>
        ) : (
          <NavLink
            to="/settings"
            onClick={onMobileClose}
            className="flex items-center gap-2.5 px-2.5 h-[34px] text-[13px] font-medium text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--surface-subtle)] rounded-lg transition-colors"
          >
            <HelpCircle className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
            <span>Help center</span>
          </NavLink>
        )}

        {/* User Profile Block & Collapse Toggle (52px tall) */}
        <div
          className={cn(
            'flex items-center',
            sidebarCollapsed
              ? 'flex-col justify-center gap-2 py-1'
              : 'h-[52px] justify-between px-1'
          )}
        >
          {sidebarCollapsed ? (
            <>
              <Tooltip content="Hariharan B (Network Admin)" side="right">
                <Avatar name="Hariharan B" size="sm" online={true} />
              </Tooltip>
              <Tooltip content="Expand sidebar" side="right">
                <button
                  type="button"
                  onClick={toggleSidebarCollapsed}
                  data-testid="sidebar-toggle-btn"
                  aria-label="Expand sidebar"
                  title="Expand sidebar"
                  className="flex items-center justify-center w-8 h-8 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-subtle)] transition-colors"
                >
                  <PanelLeftOpen className="w-4 h-4" />
                </button>
              </Tooltip>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <Avatar name="Hariharan B" size="sm" online={true} />
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-semibold text-[var(--text)] truncate">
                    Hariharan B
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)] truncate">
                    Network Admin
                  </div>
                </div>
              </div>

              {/* Desktop Collapse/Expand Toggle Button */}
              <button
                type="button"
                onClick={toggleSidebarCollapsed}
                data-testid="sidebar-toggle-btn"
                aria-label="Collapse sidebar"
                title="Collapse sidebar"
                className="hidden md:flex items-center justify-center p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-subtle)] transition-colors shrink-0"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar */}
      <aside className="hidden md:flex shrink-0 h-dvh sticky top-0 z-30">
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
