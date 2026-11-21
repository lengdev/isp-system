import React, { useState, useEffect, useRef } from 'react';
import {
  Menu,
  Search,
  Bell,
  Sun,
  Moon,
  Calendar,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
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

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isPulsing, setIsPulsing] = useState(false);
  const bellButtonRef = useRef<HTMLButtonElement>(null);
  const isNotificationsOpenRef = useRef(isNotificationsOpen);
  isNotificationsOpenRef.current = isNotificationsOpen;

  const unreadCount = notifications.filter((n) => !n.read).length;
  const todayStr = formatDate(new Date(), 'EEE, dd MMM yyyy');

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
    <header className="sticky top-0 z-20 w-full bg-[var(--bg-app)]/90 backdrop-blur-md border-b border-[var(--border)] transition-colors">
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

          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
            <input
              type="text"
              value={filters.searchQuery}
              onChange={(e) => setFilters({ searchQuery: e.target.value })}
              placeholder="Search customers, IP, MAC, phone, plan..."
              className="w-full h-9 pl-9 pr-12 text-[13px] bg-[var(--surface)] dark:bg-[rgba(255,255,255,0.04)] border border-[var(--border)] hover:border-[var(--border-strong)] rounded-[10px] text-[var(--text)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:border-[var(--brand)] focus:shadow-[0_0_0_3px_rgba(234,106,60,0.14)] transition-[border-color,box-shadow] duration-120 ease-out shadow-xs"
            />
            <button
              type="button"
              onClick={() => setCommandPaletteOpen(true)}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[11px] font-medium text-[var(--text-muted)] bg-[rgba(16,24,40,0.06)] dark:bg-[rgba(255,255,255,0.08)] rounded-[4px] pointer-events-none select-none hover:text-[var(--text)]"
            >
              ⌘K
            </button>
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
        </div>
      </div>
    </header>
  );
};
