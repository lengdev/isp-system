import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
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
  Boxes,
  Package,
  Box,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Scale,
  Warehouse as WarehouseIcon,
  ShoppingBag,
  ShieldCheck,
  Globe,
  LogOut,
  Key,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../lib/api';
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
  const navigate = useNavigate();
  const setCommandPaletteOpen = useStore((s) => s.setCommandPaletteOpen);
  const tickets = useStore((s) => s.tickets);
  const addToast = useStore((s) => s.addToast);
  const sidebarCollapsed = useStore((s) => s.sidebarCollapsed);
  const toggleSidebarCollapsed = useStore((s) => s.toggleSidebarCollapsed);
  const sidebarUpgradeDismissed = useStore((s) => s.sidebarUpgradeDismissed);
  const setSidebarUpgradeDismissed = useStore((s) => s.setSidebarUpgradeDismissed);

  const user = useAuthStore((s) => s.user);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const hasRole = useAuthStore((s) => s.hasRole);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({});

  const toggleSubmenu = (menuName: string, defaultPath?: string) => {
    setOpenSubmenus((prev) => ({
      ...prev,
      [menuName]: !prev[menuName],
    }));
  };

  const handleLogout = async () => {
    try {
      await api.auth.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      clearAuth();
      navigate('/login', { replace: true });
    }
  };

  const formatRole = (role?: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'Super Admin';
      case 'NETWORK_ENGINEER':
        return 'Network Engineer';
      case 'BILLING_CASHIER':
        return 'Billing Cashier';
      case 'FIELD_TECHNICIAN':
        return 'Field Tech';
      case 'SUPPORT_AGENT':
        return 'Support Agent';
      default:
        return role || 'Administrator';
    }
  };

  const openTicketsCount = tickets.filter((t) => t.status === 'Open' || t.status === 'In Progress').length;

  interface NavSubItem {
    name: string;
    path: string;
    icon?: any;
    badge?: number | string;
    permission?: string;
    roles?: string[];
  }

  interface NavItemDef {
    name: string;
    path: string;
    icon: any;
    badge?: number | string;
    submenu?: NavSubItem[];
    permission?: string;
    roles?: string[];
  }

  const mainNav: NavItemDef[] = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Customers', path: '/customers', icon: Users, permission: 'customers:read' },
    {
      name: 'Inventory',
      path: '/inventory/products',
      icon: Boxes,
      permission: 'inventory:read',
      submenu: [
        { name: 'Product Catalog', path: '/inventory/products', icon: Box, permission: 'inventory:read' },
        { name: 'Warehouses & Stock', path: '/inventory/warehouses', icon: WarehouseIcon, permission: 'inventory:read' },
        { name: 'Procurement & POs', path: '/inventory/procurement', icon: ShoppingBag, permission: 'inventory:read' },
      ],
    },
    { name: 'Plans', path: '/plans', icon: Wifi, permission: 'packages:read' },
    {
      name: 'Billing',
      path: '/billing',
      icon: Receipt,
      roles: ['SUPER_ADMIN', 'BILLING_CASHIER'],
      submenu: [
        { name: 'Invoices', path: '/billing', icon: Receipt, roles: ['SUPER_ADMIN', 'BILLING_CASHIER'] },
        { name: 'Payments & Cashier', path: '/payments', icon: CreditCard, roles: ['SUPER_ADMIN', 'BILLING_CASHIER'] },
      ],
    },
    { name: 'Accounting & GL', path: '/accounting', icon: Scale, roles: ['SUPER_ADMIN', 'BILLING_CASHIER'] },
    { name: 'Installations', path: '/installations', icon: Wrench, roles: ['SUPER_ADMIN', 'FIELD_TECHNICIAN', 'NETWORK_ENGINEER'] },
    { name: 'Tickets', path: '/tickets', icon: LifeBuoy, badge: openTicketsCount || 21, roles: ['SUPER_ADMIN', 'SUPPORT_AGENT', 'FIELD_TECHNICIAN', 'NETWORK_ENGINEER'] },
    { name: 'Network', path: '/network', icon: Radio, roles: ['SUPER_ADMIN', 'NETWORK_ENGINEER'] },
    { name: 'Technicians', path: '/technicians', icon: Wrench, roles: ['SUPER_ADMIN', 'FIELD_TECHNICIAN', 'NETWORK_ENGINEER'] },
    { name: 'Reports', path: '/reports', icon: BarChart3, permission: 'reports:read' },
  ];

  const toolsNav: NavItemDef[] = [
    { name: 'Customer Portal', path: '/portal', icon: Globe },
    { name: 'Messages', path: '/messages', icon: Mail },
    { name: 'Automation', path: '/automation', icon: Zap, roles: ['SUPER_ADMIN'] },
    { name: 'Integrations', path: '/integrations', icon: Layers, roles: ['SUPER_ADMIN'] },
    {
      name: 'Settings',
      path: '/settings',
      icon: Settings,
      submenu: [
        { name: 'System Settings', path: '/settings', icon: Settings, roles: ['SUPER_ADMIN'] },
        { name: 'Roles & Permissions', path: '/settings/roles', icon: Key, permission: 'roles.manage' },
        { name: 'Staff & Roles (RBAC)', path: '/settings/users', icon: Users, roles: ['SUPER_ADMIN'] },
        { name: 'Audit Compliance Logs', path: '/settings/audit', icon: ShieldCheck, roles: ['SUPER_ADMIN'] },
      ],
    },
  ];

  const isItemVisible = (item: NavItemDef | NavSubItem): boolean => {
    if (!user) return true; // Default fallback
    if (user.role === 'SUPER_ADMIN') return true;
    if ('submenu' in item && item.submenu && item.submenu.length > 0) {
      const hasVisibleSub = item.submenu.some((sub) => isItemVisible(sub));
      if (!hasVisibleSub) return false;
    } else {
      if (item.roles && item.roles.length > 0 && !hasRole(...item.roles)) {
        return false;
      }
      if (item.permission && !hasPermission(item.permission)) {
        return false;
      }
    }
    return true;
  };

  const filteredMainNav = mainNav
    .filter(isItemVisible)
    .map((item) => {
      if (!item.submenu) return item;
      return {
        ...item,
        submenu: item.submenu.filter((sub) => {
          if (!user || user.role === 'SUPER_ADMIN') return true;
          if (sub.roles && sub.roles.length > 0 && !hasRole(...sub.roles)) return false;
          if (sub.permission && !hasPermission(sub.permission)) return false;
          return true;
        }),
      };
    });

  const filteredToolsNav = toolsNav
    .filter(isItemVisible)
    .map((item) => {
      if (!item.submenu) return item;
      return {
        ...item,
        submenu: item.submenu.filter((sub) => {
          if (!user || user.role === 'SUPER_ADMIN') return true;
          if (sub.roles && sub.roles.length > 0 && !hasRole(...sub.roles)) return false;
          if (sub.permission && !hasPermission(sub.permission)) return false;
          return true;
        }),
      };
    });

  const renderNavList = (items: NavItemDef[]) => (
    <div className="space-y-0.5">
      {items.map((item) => {
        const hasSubmenu = Boolean(item.submenu && item.submenu.length > 0);
        const isSubmenuActive = hasSubmenu && item.submenu?.some((sub) => location.pathname === sub.path || location.pathname === '/inventory/product');
        const isActive =
          location.pathname === item.path ||
          (item.path === '/customers' && location.pathname === '/') ||
          isSubmenuActive;
        const Icon = item.icon;
        const isSubmenuOpen = Boolean(openSubmenus[item.name] || isSubmenuActive);

        // If item has submenu and sidebar is collapsed
        if (sidebarCollapsed && hasSubmenu) {
          return (
            <div key={item.path} className="w-full flex justify-center py-0.5">
              <Tooltip
                content={`${item.name} • ${item.submenu?.[0]?.name || ''}`}
                side="right"
                className="flex justify-center"
              >
                <NavLink
                  to={item.path}
                  onClick={onMobileClose}
                  className={cn(
                    'relative flex items-center justify-center w-9 h-[34px] rounded-lg text-[13px] font-medium tracking-[-0.01em] select-none group transition-colors',
                    isActive
                      ? 'text-[var(--brand)] font-medium'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[rgba(16,24,40,0.04)] dark:hover:bg-[rgba(255,255,255,0.05)]'
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="nav-active"
                      className="absolute inset-0 bg-[rgba(234,106,60,0.10)] dark:bg-[rgba(240,123,79,0.14)] rounded-lg pointer-events-none"
                      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                    />
                  )}
                  <Icon
                    className={cn(
                      'w-4 h-4 shrink-0 transition-colors z-10',
                      isActive ? 'text-[var(--brand)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text)]'
                    )}
                  />
                </NavLink>
              </Tooltip>
            </div>
          );
        }

        // If item has submenu and sidebar is expanded
        if (hasSubmenu) {
          return (
            <div key={item.path} className="space-y-0.5">
              <button
                type="button"
                onClick={() => toggleSubmenu(item.name)}
                className={cn(
                  'relative flex items-center justify-between h-[34px] px-2.5 w-full rounded-lg text-[13px] font-medium tracking-[-0.01em] select-none group transition-colors',
                  isActive
                    ? 'text-[var(--brand)] font-medium bg-[rgba(234,106,60,0.06)] dark:bg-[rgba(240,123,79,0.08)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[rgba(16,24,40,0.04)] dark:hover:bg-[rgba(255,255,255,0.05)]'
                )}
              >
                <div className="relative z-10 flex items-center gap-2.5 min-w-0">
                  <Icon
                    className={cn(
                      'w-4 h-4 shrink-0 transition-colors',
                      isActive ? 'text-[var(--brand)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text)]'
                    )}
                  />
                  <span className="truncate">{item.name}</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 text-[var(--text-muted)]">
                  {isSubmenuOpen ? (
                    <ChevronDown className="w-3.5 h-3.5 transition-transform" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 transition-transform" />
                  )}
                </div>
              </button>

              {/* Submenu Children */}
              <AnimatePresence initial={false}>
                {isSubmenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.16 }}
                    className="pl-5 space-y-0.5 overflow-hidden"
                  >
                    {item.submenu?.map((sub) => {
                      const isSubActive =
                        location.pathname === sub.path ||
                        location.pathname === '/inventory/product';
                      const SubIcon = sub.icon || Box;

                      return (
                        <NavLink
                          key={sub.path}
                          to={sub.path}
                          onClick={onMobileClose}
                          className={cn(
                            'relative flex items-center justify-between h-[30px] px-2.5 rounded-lg text-[12px] font-medium transition-colors select-none group',
                            isSubActive
                              ? 'text-[var(--brand)] font-semibold bg-[rgba(234,106,60,0.10)] dark:bg-[rgba(240,123,79,0.14)]'
                              : 'text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[rgba(16,24,40,0.03)] dark:hover:bg-[rgba(255,255,255,0.04)]'
                          )}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <SubIcon
                              className={cn(
                                'w-3.5 h-3.5 shrink-0',
                                isSubActive ? 'text-[var(--brand)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text)]'
                              )}
                            />
                            <span className="truncate">{sub.name}</span>
                          </div>
                          {sub.badge !== undefined && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[var(--surface-subtle)] text-[var(--text-muted)]">
                              {sub.badge}
                            </span>
                          )}
                        </NavLink>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        }

        // Normal single nav item
        const content = (
          <NavLink
            key={item.path}
            to={item.path}
            title={item.name}
            onClick={onMobileClose}
            className={cn(
              'relative flex items-center h-[34px] rounded-lg text-[13px] font-medium tracking-[-0.01em] select-none group transition-colors',
              sidebarCollapsed ? 'justify-center w-9' : 'justify-between px-2.5 w-full',
              isActive
                ? 'text-[var(--brand)] font-medium'
                : 'text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[rgba(16,24,40,0.04)] dark:hover:bg-[rgba(255,255,255,0.05)]'
            )}
          >
            {/* Sliding Active Pill */}
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
          <div className="w-full flex justify-center">
            <Tooltip content="Search menu (Ctrl+K)" side="right" className="flex justify-center">
              <button
                type="button"
                onClick={() => setCommandPaletteOpen(true)}
                title="Search menu (Ctrl+K)"
                className="flex items-center justify-center w-9 h-[34px] rounded-lg text-[var(--text-muted)] bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--border-strong)] hover:text-[var(--text)] transition-colors mx-auto"
              >
                <Search className="w-4 h-4" />
              </button>
            </Tooltip>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setCommandPaletteOpen(true)}
            className="flex items-center justify-between w-full h-[34px] px-2.5 text-[12px] text-[var(--text-muted)] bg-[var(--surface)] dark:bg-[rgba(255,255,255,0.04)] border border-[var(--border)] hover:border-[var(--border-strong)] rounded-lg focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100 focus:ring-1 focus:ring-neutral-950/10 dark:focus:ring-white/10 transition-[border-color,box-shadow] duration-120 ease-out group"
          >
            <div className="flex items-center gap-2 truncate">
              <Search className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--text)] transition-colors shrink-0" />
              <span className="truncate font-normal">Search menu...</span>
            </div>
            <kbd className="px-1.5 py-0.5 text-[11px] font-medium text-[var(--text-muted)] bg-[rgba(16,24,40,0.06)] dark:bg-[rgba(255,255,255,0.08)] rounded-[4px] pointer-events-none select-none shrink-0">
              Ctrl K
            </kbd>
          </button>
        )}
      </div>

      {/* 3. Navigation List (flex-1 min-h-0 overflow-y-auto scrollbar-thin) */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-0.5 scrollbar-thin">
        {renderNavList(filteredMainNav)}

        {/* Tools Section */}
        {filteredToolsNav.length > 0 && (
          <div>
            {!sidebarCollapsed ? (
              <div className="px-2.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                Tools
              </div>
            ) : (
              <div className="my-2 border-t border-[var(--border-subtle)]" />
            )}
            {renderNavList(filteredToolsNav)}
          </div>
        )}
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
          <div className="w-full flex justify-center py-0.5">
            <Tooltip content="Help center" side="right" className="flex justify-center">
              <NavLink
                to="/settings"
                title="Help center"
                onClick={onMobileClose}
                className="flex items-center justify-center w-9 h-[34px] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--surface-subtle)] transition-colors mx-auto"
              >
                <HelpCircle className="w-4 h-4 text-[var(--text-muted)]" />
              </NavLink>
            </Tooltip>
          </div>
        ) : (
          <NavLink
            to="/settings"
            title="Help center"
            onClick={onMobileClose}
            className="flex items-center gap-2.5 px-2.5 h-[34px] text-[13px] font-medium text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--surface-subtle)] rounded-lg transition-colors"
          >
            <HelpCircle className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
            <span>Help center</span>
          </NavLink>
        )}

        {/* User Profile Block & Actions */}
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
              <Tooltip content={`${user?.fullName || 'Admin'} (${formatRole(user?.role)})`} side="right">
                <NavLink to="/change-password" className="hover:opacity-80 transition-opacity">
                  <Avatar name={user?.fullName || 'Admin'} size="sm" online={true} />
                </NavLink>
              </Tooltip>
              <Tooltip content="Sign Out" side="right">
                <button
                  type="button"
                  onClick={handleLogout}
                  data-testid="sidebar-logout-btn"
                  aria-label="Sign out"
                  title="Sign out"
                  className="flex items-center justify-center w-8 h-8 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
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
                <NavLink to="/change-password" title="Account settings & change password" className="shrink-0 hover:opacity-80 transition-opacity">
                  <Avatar name={user?.fullName || 'Admin'} size="sm" online={true} />
                </NavLink>
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-semibold text-[var(--text)] truncate">
                    {user?.fullName || 'NetPulse Admin'}
                  </div>
                  <div className="text-[11px] text-orange-600 dark:text-orange-400 font-medium truncate">
                    {formatRole(user?.role)}
                  </div>
                </div>
              </div>

              {/* Action buttons: Change Password, Logout & Collapse */}
              <div className="flex items-center gap-0.5 shrink-0">
                <Tooltip content="Change Password" side="top">
                  <NavLink
                    to="/change-password"
                    aria-label="Change Password"
                    className="flex items-center justify-center p-1.5 rounded-lg text-[var(--text-muted)] hover:text-orange-500 hover:bg-[var(--surface-subtle)] transition-colors"
                  >
                    <Key className="w-3.5 h-3.5" />
                  </NavLink>
                </Tooltip>
                <Tooltip content="Sign Out" side="top">
                  <button
                    type="button"
                    onClick={handleLogout}
                    data-testid="sidebar-logout-btn"
                    aria-label="Sign Out"
                    className="flex items-center justify-center p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </Tooltip>
                <button
                  type="button"
                  onClick={toggleSidebarCollapsed}
                  data-testid="sidebar-toggle-btn"
                  aria-label="Collapse sidebar"
                  title="Collapse sidebar"
                  className="hidden md:flex items-center justify-center p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-subtle)] transition-colors"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              </div>
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
