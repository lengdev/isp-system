import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu,
  Search,
  Bell,
  Sun,
  Moon,
  Calendar,
  X,
  Loader2,
  Package,
  Wifi,
  Users,
  LogOut,
  Key,
  ChevronDown,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { BRAND_NAME, BRAND_LOCAL_DOMAIN } from '../../lib/brand';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../lib/api';
import { Avatar } from '../ui/Avatar';
import { formatDate, cn } from '../../lib/utils';
import { NotificationPanel } from './NotificationPanel';

interface TopBarProps {
  onMobileMenuOpen: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onMobileMenuOpen }) => {
  const darkMode = useStore((s) => s.darkMode);
  const toggleDarkMode = useStore((s) => s.toggleDarkMode);
  const filters = useStore((s) => s.filters);
  const setFilters = useStore((s) => s.setFilters);
  const setCommandPaletteOpen = useStore((s) => s.setCommandPaletteOpen);
  const notifications = useStore((s) => s.notifications);
  const addNotification = useStore((s) => s.addNotification);
  const addToast = useStore((s) => s.addToast);
  const customers = useStore((s) => s.customers);
  const products = useStore((s) => s.products);
  const plans = useStore((s) => s.plans);
  const openDrawer = useStore((s) => s.openDrawer);
  const navigate = useNavigate();

  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userMenuOpen]);

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

  const [searchQuery, setSearchQuery] = useState(filters.searchQuery || '');
  const [isFocused, setIsFocused] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isPulsing, setIsPulsing] = useState(false);
  const bellButtonRef = useRef<HTMLButtonElement>(null);
  const isNotificationsOpenRef = useRef(isNotificationsOpen);
  isNotificationsOpenRef.current = isNotificationsOpen;

  const unreadCount = notifications.filter((n) => !n.read).length;
  const todayStr = formatDate(new Date(), 'EEE, dd MMM yyyy');

  // Debounced search query update (250ms)
  useEffect(() => {
    if (searchQuery !== filters.searchQuery) {
      setIsSearching(true);
    }
    const timer = setTimeout(() => {
      setFilters({ searchQuery });
      setIsSearching(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, filters.searchQuery, setFilters]);

  // Sync external filter changes
  useEffect(() => {
    setSearchQuery(filters.searchQuery || '');
  }, [filters.searchQuery]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Shortcut ⌘K listener to focus global search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        setIsDropdownOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filtered groups
  const q = searchQuery.toLowerCase().trim();

  const matchedCustomers = useMemo(() => {
    if (!q) return [];
    return customers
      .filter(
        (c) =>
          c.fullName.toLowerCase().includes(q) ||
          c.code.toLowerCase().includes(q) ||
          c.ipAddress.includes(q) ||
          c.macAddress.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          (c.planName && c.planName.toLowerCase().includes(q))
      )
      .slice(0, 4);
  }, [customers, q]);

  const matchedDevices = useMemo(() => {
    if (!q) return [];
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.category && p.category.toLowerCase().includes(q)) ||
          (p.location && p.location.toLowerCase().includes(q))
      )
      .slice(0, 4);
  }, [products, q]);

  const matchedPlans = useMemo(() => {
    if (!q) return [];
    return plans
      .filter(
        (pl) =>
          pl.name.toLowerCase().includes(q) ||
          `${pl.speedMbps}`.includes(q) ||
          (pl.type && pl.type.toLowerCase().includes(q))
      )
      .slice(0, 3);
  }, [plans, q]);

  // Flattened list for keyboard navigation
  const flatResults = useMemo(() => {
    const list: {
      type: 'customer' | 'device' | 'plan';
      id: string;
      title: string;
      subtitle: string;
      badge?: string;
      onSelect: () => void;
    }[] = [];

    matchedCustomers.forEach((c) => {
      list.push({
        type: 'customer',
        id: `cust-${c.id}`,
        title: `${c.fullName} (${c.code})`,
        subtitle: `${c.ipAddress} • ${c.planName}`,
        badge: `$${c.monthlyPrice}/mo`,
        onSelect: () => {
          openDrawer(c.id);
          setIsDropdownOpen(false);
        },
      });
    });

    matchedDevices.forEach((d) => {
      list.push({
        type: 'device',
        id: `dev-${d.id}`,
        title: `${d.name} (${d.sku})`,
        subtitle: `${d.category} • ${d.location || 'Warehouse'} • ${d.quantity} in stock`,
        badge: `$${d.unitPrice}`,
        onSelect: () => {
          navigate('/inventory/products');
          setIsDropdownOpen(false);
        },
      });
    });

    matchedPlans.forEach((p) => {
      list.push({
        type: 'plan',
        id: `plan-${p.id}`,
        title: p.name,
        subtitle: `${p.speedMbps} Mbps • ${p.type || 'Fiber'}`,
        badge: `$${p.monthlyPrice}/mo`,
        onSelect: () => {
          navigate('/plans');
          setIsDropdownOpen(false);
        },
      });
    });

    return list;
  }, [matchedCustomers, matchedDevices, matchedPlans, openDrawer, navigate]);

  // Quick filters / recent shortcuts when query is empty
  const quickFilters = useMemo(
    () => [
      {
        id: 'qf-active-subscribers',
        title: 'Active Subscribers',
        subtitle: 'View active customer connections',
        badge: 'Filter',
        icon: <Users className="w-3.5 h-3.5" />,
        iconBg: 'bg-blue-100 dark:bg-blue-900/30 text-[#006FEE]',
        onSelect: () => {
          navigate('/customers');
          setFilters({ status: ['Active'] });
          setIsDropdownOpen(false);
        },
      },
      {
        id: 'qf-equipment',
        title: 'ONT / Modems & Routers',
        subtitle: 'Hardware inventory & stock',
        badge: 'Inventory',
        icon: <Package className="w-3.5 h-3.5" />,
        iconBg: 'bg-zinc-100 dark:bg-white/10 text-zinc-600 dark:text-zinc-400',
        onSelect: () => {
          navigate('/inventory/products');
          setIsDropdownOpen(false);
        },
      },
      {
        id: 'qf-fiber-plans',
        title: 'Fiber Internet Plans',
        subtitle: 'Speeds, bandwidth & pricing tiers',
        badge: 'Plans',
        icon: <Wifi className="w-3.5 h-3.5" />,
        iconBg: 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400',
        onSelect: () => {
          navigate('/plans');
          setIsDropdownOpen(false);
        },
      },
    ],
    [navigate, setFilters]
  );

  // Active list for keyboard navigation (quickFilters when !q, flatResults when q)
  const activeNavList = useMemo(() => {
    if (!q) {
      return quickFilters.map((qf) => ({
        id: qf.id,
        onSelect: qf.onSelect,
      }));
    }
    return flatResults.map((r) => ({
      id: r.id,
      onSelect: r.onSelect,
    }));
  }, [q, quickFilters, flatResults]);

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isDropdownOpen) {
        setIsDropdownOpen(true);
      } else if (activeNavList.length > 0) {
        setHighlightedIndex((prev) => (prev < activeNavList.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (activeNavList.length > 0) {
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : activeNavList.length - 1));
      }
    } else if (e.key === 'Enter') {
      if (isDropdownOpen && activeNavList[highlightedIndex]) {
        e.preventDefault();
        activeNavList[highlightedIndex].onSelect();
        setIsDropdownOpen(false);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (searchQuery) {
        setSearchQuery('');
        setFilters({ searchQuery: '' });
      } else {
        setIsDropdownOpen(false);
        searchInputRef.current?.blur();
      }
    }
  };

  // Simulated live notification every ~45 seconds
  useEffect(() => {
    const liveSamples = [
      {
        title: 'ONT Link Resynced',
        description: 'Substation North Node restored downstream connection at 1.2 Gbps.',
        type: 'system' as const,
      },
      {
        title: 'Payment Received',
        description: 'AutoPay processed $129.99 for GigaFiber Pro 1G tier.',
        type: 'invoice' as const,
      },
      {
        title: 'New High Priority Ticket #4930',
        description: 'Drop line signal attenuation reported in Sector 8.',
        type: 'ticket' as const,
      },
      {
        title: 'High Bandwidth Alert',
        description: 'Sector East 4 reached 89% throughput saturation.',
        type: 'alert' as const,
      },
    ];

    let sampleIdx = 0;
    const interval = setInterval(() => {
      const sample = liveSamples[sampleIdx % liveSamples.length];
      sampleIdx++;

      addNotification({
        ...sample,
        timestamp: 'Just now',
        read: false,
      });

      // Pulse bell icon
      setIsPulsing(true);
      setTimeout(() => setIsPulsing(false), 2400);

      // Only show toast if notifications panel is closed
      if (!isNotificationsOpenRef.current) {
        addToast({
          type: sample.type === 'alert' ? 'warning' : 'info',
          title: sample.title,
          message: sample.description,
        });
      }
    }, 45000);

    return () => clearInterval(interval);
  }, [addNotification, addToast]);

  return (
    <header className="sticky top-0 z-30 w-full bg-[var(--bg-app)]/90 dark:bg-[var(--bg-app)]/90 backdrop-blur-md border-b border-[var(--border)] transition-colors">
      <div className="max-w-[1480px] mx-auto px-4 sm:px-6 w-full flex items-center justify-between h-14 gap-4">
        {/* Left: Mobile Toggle & Global Search (aligned to content grid) */}
        <div className="flex items-center gap-3 flex-1 max-w-lg">
          <button
            type="button"
            onClick={onMobileMenuOpen}
            className="md:hidden p-2 rounded-xl text-[var(--text-secondary)] hover:bg-[var(--surface)] transition-colors shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div ref={searchContainerRef} className="relative w-full">
            <div className="search-control relative flex items-center h-[44px] w-full rounded-[10px] border border-zinc-200 dark:border-zinc-700/80 bg-white dark:bg-[#18181b] hover:border-zinc-300 dark:hover:border-zinc-600 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-none transition-all duration-150 ease-out focus-within:border-[#006FEE] focus-within:[box-shadow:inset_0_0_0_1px_#006FEE] focus-within:outline-none">
              {isSearching ? (
                <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-[#006FEE] pointer-events-none" />
              ) : (
                <Search
                  className={cn(
                    'absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 stroke-[2] transition-colors duration-150 pointer-events-none',
                    isFocused ? 'text-[#006FEE]' : 'text-zinc-400 dark:text-zinc-500'
                  )}
                />
              )}
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsDropdownOpen(true);
                  setHighlightedIndex(0);
                }}
                onFocus={() => {
                  setIsFocused(true);
                  setIsDropdownOpen(true);
                }}
                onBlur={() => setIsFocused(false)}
                onKeyDown={handleInputKeyDown}
                placeholder="Search customers, IP, MAC, phone, plan..."
                className="w-full h-full pl-[38px] pr-12 text-[14px] bg-transparent border-0 border-none outline-none focus:outline-none focus:ring-0 focus-visible:outline-none text-[var(--text)] placeholder:text-zinc-500 dark:placeholder:text-zinc-400 placeholder:text-[14px] font-normal select-text caret-[#006FEE]"
                style={{ outline: 'none', border: 'none', boxShadow: 'none' }}
              />
              {searchQuery ? (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => {
                    setSearchQuery('');
                    setFilters({ searchQuery: '' });
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-[var(--text)] rounded-full hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : !isFocused ? (
                <button
                  type="button"
                  onClick={() => {
                    searchInputRef.current?.focus();
                    setIsDropdownOpen(true);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[11px] font-mono font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-white/10 rounded-[6px] border border-zinc-200 dark:border-zinc-700/80 cursor-pointer select-none"
                >
                  ⌘K
                </button>
              ) : null}
            </div>

            {/* Dropdown Panel */}
            <AnimatePresence>
              {isDropdownOpen && isFocused && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.12, ease: [0.22, 1, 0.36, 1] }}
                  onMouseDown={(e) => e.preventDefault()}
                  className="absolute top-[calc(100%+6px)] left-0 w-full z-50 rounded-[12px] bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-700/80 shadow-[0_8px_24px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.4)] p-[6px] max-h-[380px] overflow-y-auto select-none flex flex-col gap-1"
                >
                  {!q ? (
                    /* Quick Filters & Shortcuts when query is empty */
                    <div className="flex flex-col gap-[2px]">
                      <div className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] select-none">
                        Recent Searches / Quick Filters
                      </div>
                      {quickFilters.map((qf, idx) => {
                        const isHighlighted = idx === highlightedIndex;
                        return (
                          <button
                            key={qf.id}
                            type="button"
                            onClick={qf.onSelect}
                            onMouseEnter={() => setHighlightedIndex(idx)}
                            className={cn(
                              'flex items-center justify-between w-full h-[40px] min-h-[40px] px-3 rounded-[8px] text-left transition-colors duration-150 cursor-pointer',
                              isHighlighted
                                ? 'bg-blue-50 dark:bg-blue-950/40 text-[#006FEE]'
                                : 'text-[var(--text)] hover:bg-zinc-100 dark:hover:bg-white/[0.08]'
                            )}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className={cn(
                                  'w-6 h-6 rounded-md flex items-center justify-center shrink-0',
                                  qf.iconBg
                                )}
                              >
                                {qf.icon}
                              </div>
                              <div className="min-w-0">
                                <div className="text-[13px] font-medium truncate">
                                  {qf.title}
                                </div>
                                <div className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate">
                                  {qf.subtitle}
                                </div>
                              </div>
                            </div>
                            <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-white/10 shrink-0">
                              {qf.badge}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : flatResults.length === 0 ? (
                    <div className="py-7 px-4 text-center select-none">
                      <p className="text-[13px] font-medium text-[var(--text)]">
                        No results for "{searchQuery}"
                      </p>
                      <p className="text-[12px] text-[var(--text-muted)] mt-1">
                        Try searching by customer name, IP, MAC address, device, or plan
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Customers Group */}
                      {matchedCustomers.length > 0 && (
                        <div className="flex flex-col gap-[2px]">
                          <div className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] select-none">
                            Customers ({matchedCustomers.length})
                          </div>
                          {matchedCustomers.map((c) => {
                            const idx = flatResults.findIndex((r) => r.id === `cust-${c.id}`);
                            const isHighlighted = idx === highlightedIndex;
                            return (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => {
                                  openDrawer(c.id);
                                  setIsDropdownOpen(false);
                                }}
                                onMouseEnter={() => setHighlightedIndex(idx)}
                                className={cn(
                                  'flex items-center justify-between w-full h-[40px] min-h-[40px] px-3 rounded-[8px] text-left transition-colors duration-150 cursor-pointer',
                                  isHighlighted
                                    ? 'bg-blue-50 dark:bg-blue-950/40 text-[#006FEE]'
                                    : 'text-[var(--text)] hover:bg-zinc-100 dark:hover:bg-white/[0.08]'
                                )}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="w-6 h-6 rounded-md bg-blue-100 dark:bg-blue-900/30 text-[#006FEE] flex items-center justify-center text-[11px] font-semibold shrink-0">
                                    {c.fullName.slice(0, 2).toUpperCase()}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-[13px] font-medium truncate">
                                      {c.fullName}{' '}
                                      <span className="text-[11px] font-normal text-zinc-400">
                                        ({c.code})
                                      </span>
                                    </div>
                                    <div className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate">
                                      {c.ipAddress} • {c.planName}
                                    </div>
                                  </div>
                                </div>
                                <span className="text-[12px] font-medium text-zinc-600 dark:text-zinc-400 ml-2 shrink-0">
                                  ${c.monthlyPrice}/mo
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Devices Group */}
                      {matchedDevices.length > 0 && (
                        <div className="flex flex-col gap-[2px] pt-1">
                          <div className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] select-none">
                            Devices & Equipment ({matchedDevices.length})
                          </div>
                          {matchedDevices.map((d) => {
                            const idx = flatResults.findIndex((r) => r.id === `dev-${d.id}`);
                            const isHighlighted = idx === highlightedIndex;
                            return (
                              <button
                                key={d.id}
                                type="button"
                                onClick={() => {
                                  navigate('/inventory/products');
                                  setIsDropdownOpen(false);
                                }}
                                onMouseEnter={() => setHighlightedIndex(idx)}
                                className={cn(
                                  'flex items-center justify-between w-full h-[40px] min-h-[40px] px-3 rounded-[8px] text-left transition-colors duration-150 cursor-pointer',
                                  isHighlighted
                                    ? 'bg-blue-50 dark:bg-blue-950/40 text-[#006FEE]'
                                    : 'text-[var(--text)] hover:bg-zinc-100 dark:hover:bg-white/[0.08]'
                                )}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="w-6 h-6 rounded-md bg-zinc-100 dark:bg-white/10 text-zinc-600 dark:text-zinc-400 flex items-center justify-center shrink-0">
                                    <Package className="w-3.5 h-3.5" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-[13px] font-medium truncate">
                                      {d.name}{' '}
                                      <span className="text-[11px] font-normal text-zinc-400">
                                        ({d.sku})
                                      </span>
                                    </div>
                                    <div className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate">
                                      {d.category} • {d.location || 'Warehouse'} • {d.quantity} in stock
                                    </div>
                                  </div>
                                </div>
                                <span className="text-[12px] font-medium text-zinc-600 dark:text-zinc-400 ml-2 shrink-0">
                                  ${d.unitPrice}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Plans Group */}
                      {matchedPlans.length > 0 && (
                        <div className="flex flex-col gap-[2px] pt-1">
                          <div className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] select-none">
                            Internet Plans ({matchedPlans.length})
                          </div>
                          {matchedPlans.map((p) => {
                            const idx = flatResults.findIndex((r) => r.id === `plan-${p.id}`);
                            const isHighlighted = idx === highlightedIndex;
                            return (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => {
                                  navigate('/plans');
                                  setIsDropdownOpen(false);
                                }}
                                onMouseEnter={() => setHighlightedIndex(idx)}
                                className={cn(
                                  'flex items-center justify-between w-full h-[40px] min-h-[40px] px-3 rounded-[8px] text-left transition-colors duration-150 cursor-pointer',
                                  isHighlighted
                                    ? 'bg-blue-50 dark:bg-blue-950/40 text-[#006FEE]'
                                    : 'text-[var(--text)] hover:bg-zinc-100 dark:hover:bg-white/[0.08]'
                                )}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="w-6 h-6 rounded-md bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                    <Wifi className="w-3.5 h-3.5" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-[13px] font-medium truncate">
                                      {p.name}
                                    </div>
                                    <div className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate">
                                      {p.speedMbps} Mbps • {p.type || 'Fiber'}
                                    </div>
                                  </div>
                                </div>
                                <span className="text-[12px] font-medium text-zinc-600 dark:text-zinc-400 ml-2 shrink-0">
                                  ${p.monthlyPrice}/mo
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          {/* Notifications Trigger & Panel */}
          <div className="relative">
            <button
              ref={bellButtonRef}
              data-testid="notifications-bell-btn"
              type="button"
              aria-haspopup="dialog"
              aria-expanded={isNotificationsOpen}
              aria-label="Open notifications"
              title="Notifications"
              onClick={() => setIsNotificationsOpen((prev) => !prev)}
              className={cn(
                'relative p-2 rounded-xl text-[var(--text-secondary)] hover:bg-[var(--surface)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--brand-ring)]',
                isPulsing && 'animate-bounce text-[var(--brand)]'
              )}
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span
                  className={cn(
                    'absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-[var(--brand)] ring-2 ring-[var(--bg-app)]',
                    isPulsing && 'animate-ping'
                  )}
                />
              )}
            </button>

            {/* Redesigned Portaled Notifications Panel */}
            <NotificationPanel
              isOpen={isNotificationsOpen}
              onClose={() => setIsNotificationsOpen(false)}
              triggerRef={bellButtonRef}
            />
          </div>

          {/* Dark Mode Toggle */}
          <button
            type="button"
            onClick={toggleDarkMode}
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="p-2 rounded-xl text-[var(--text-secondary)] hover:bg-[var(--surface)] transition-colors"
          >
            {darkMode ? (
              <Sun className="w-5 h-5 text-amber-400 hover:rotate-45 transition-transform" />
            ) : (
              <Moon className="w-5 h-5 hover:-rotate-12 transition-transform" />
            )}
          </button>

          {/* Date Chip */}
          <div className="hidden sm:flex items-center gap-2.5 pl-3 border-l border-[var(--border)]">
            <div className="p-1.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--text-muted)]">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="text-xs font-bold text-[var(--text)]">{todayStr}</div>
              <div className="text-[10px] text-[var(--text-muted)] leading-none">
                Have a productive day!
              </div>
            </div>
          </div>

          {/* User Profile Pill & Quick Menu */}
          <div className="relative pl-1 sm:pl-2" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setUserMenuOpen((prev) => !prev)}
              aria-label="User account menu"
              aria-expanded={userMenuOpen}
              className="flex items-center gap-2 p-1.5 pl-2 rounded-xl border border-[var(--border)] hover:bg-[var(--surface-subtle)] transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            >
              <Avatar name={user?.fullName || 'Admin'} size="sm" online={true} />
              <div className="hidden lg:block text-left pr-1 max-w-[130px]">
                <div className="text-xs font-semibold text-[var(--text)] leading-tight truncate">
                  {user?.fullName || `${BRAND_NAME} Admin`}
                </div>
                <div className="text-[10px] text-orange-600 dark:text-orange-400 font-medium leading-none truncate">
                  {user?.role?.replace('_', ' ') || 'Admin'}
                </div>
              </div>
              <ChevronDown className={cn("w-3.5 h-3.5 text-[var(--text-muted)] transition-transform", userMenuOpen && "rotate-180")} />
            </button>

            <AnimatePresence>
              {userMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-56 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-xl p-2 z-50 text-left"
                >
                  <div className="px-3 py-2 border-b border-[var(--border)] mb-1">
                    <div className="text-xs font-bold text-[var(--text)] truncate">
                      {user?.fullName || 'Administrator'}
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)] truncate">
                      {user?.email || user?.username || `admin@${BRAND_LOCAL_DOMAIN}`}
                    </div>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-100 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400">
                      {user?.role || 'SUPER_ADMIN'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      navigate('/change-password');
                    }}
                    className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-medium text-[var(--text)] hover:bg-[var(--surface-subtle)] transition-colors"
                  >
                    <Key className="w-4 h-4 text-zinc-400" />
                    <span>Change Password</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      handleLogout();
                    }}
                    className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
};
