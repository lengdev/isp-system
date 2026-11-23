import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Check,
  CheckCheck,
  Bell,
  AlertTriangle,
  Receipt,
  LifeBuoy,
  Settings,
  MoreHorizontal,
  Trash2,
  VolumeX,
  CheckCircle2,
  X,
  CreditCard,
  ShieldAlert,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { NotificationItem } from '../../types';
import { cn } from '../../lib/utils';
import { Skeleton } from '../ui/Skeleton';

export interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement>;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({
  isOpen,
  onClose,
  triggerRef,
}) => {
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();

  const notifications = useStore((s) => s.notifications);
  const markAllNotificationsRead = useStore((s) => s.markAllNotificationsRead);
  const markNotificationRead = useStore((s) => s.markNotificationRead);
  const toggleNotificationRead = useStore((s) => s.toggleNotificationRead);
  const deleteNotification = useStore((s) => s.deleteNotification);
  const addToast = useStore((s) => s.addToast);

  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'alerts'>('all');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [mutedTypes, setMutedTypes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Position state for portal (360px wide)
  const [coords, setCoords] = useState<{ top: number; left: number; isMobile: boolean }>({
    top: 56,
    left: 0,
    isMobile: false,
  });

  const updatePosition = useCallback(() => {
    const isMobile = window.innerWidth < 640;
    if (isMobile) {
      setCoords({ top: 0, left: 0, isMobile: true });
      return;
    }

    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const panelWidth = Math.min(360, window.innerWidth - 24);
    const collisionPadding = 12;

    // Align right edge of panel to right edge of the bell button
    let left = rect.right - panelWidth;
    if (left + panelWidth > window.innerWidth - collisionPadding) {
      left = window.innerWidth - panelWidth - collisionPadding;
    }
    if (left < collisionPadding) {
      left = collisionPadding;
    }

    // 8px below top bar
    const top = rect.bottom + 8;

    setCoords({ top, left, isMobile: false });
  }, [triggerRef]);

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);
      return () => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition, true);
      };
    }
  }, [isOpen, updatePosition]);

  // Outside click & Escape to close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        triggerRef.current?.focus();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, triggerRef]);

  // Close item menu on click outside
  useEffect(() => {
    if (!activeMenuId) return;
    const handleMenuClickOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-item-menu]')) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleMenuClickOutside);
    return () => document.removeEventListener('mousedown', handleMenuClickOutside);
  }, [activeMenuId]);

  // Filter notifications
  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const alertCount = useMemo(
    () => notifications.filter((n) => n.type === 'alert' || n.type === 'critical').length,
    [notifications]
  );

  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      if (mutedTypes.includes(item.type)) return false;
      if (activeTab === 'unread') return !item.read;
      if (activeTab === 'alerts') return item.type === 'alert' || item.type === 'critical';
      return true;
    });
  }, [notifications, activeTab, mutedTypes]);

  // Group notifications into Today vs Earlier
  const groupedNotifications = useMemo(() => {
    const today: NotificationItem[] = [];
    const earlier: NotificationItem[] = [];

    filteredNotifications.forEach((n) => {
      const ts = n.timestamp.toLowerCase();
      if (
        ts.includes('min') ||
        ts.includes('hour') ||
        ts.includes('today') ||
        ts.includes('just now')
      ) {
        today.push(n);
      } else {
        earlier.push(n);
      }
    });

    return { today, earlier };
  }, [filteredNotifications]);

  const handleItemClick = (item: NotificationItem) => {
    markNotificationRead(item.id);
    onClose();

    if (item.link) {
      navigate(item.link);
      return;
    }

    if (item.type === 'ticket') {
      navigate('/tickets');
    } else if (item.type === 'invoice' || item.type === 'payment') {
      navigate('/billing');
    } else {
      navigate('/network');
    }
  };

  const handleMuteType = (type: string) => {
    setMutedTypes((prev) => [...prev, type]);
    setActiveMenuId(null);
    addToast({
      type: 'info',
      title: 'Notifications Muted',
      message: `Muted alerts for ${type} events.`,
    });
  };

  const getTypeTileStyle = (type: NotificationItem['type']) => {
    switch (type) {
      case 'alert':
        return {
          icon: <AlertTriangle className="w-3.5 h-3.5 stroke-[2]" />,
          bg: 'bg-amber-100/70 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400',
        };
      case 'critical':
        return {
          icon: <ShieldAlert className="w-3.5 h-3.5 stroke-[2]" />,
          bg: 'bg-red-100/70 dark:bg-red-950/40 text-red-600 dark:text-red-400',
        };
      case 'invoice':
      case 'payment':
        return {
          icon: <Receipt className="w-3.5 h-3.5 stroke-[2]" />,
          bg: 'bg-emerald-100/70 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400',
        };
      case 'ticket':
        return {
          icon: <LifeBuoy className="w-3.5 h-3.5 stroke-[2]" />,
          bg: 'bg-blue-100/70 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400',
        };
      case 'system':
      default:
        return {
          icon: <Bell className="w-3.5 h-3.5 stroke-[2]" />,
          bg: 'bg-[var(--surface-subtle)] text-[var(--text-muted)]',
        };
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop on mobile */}
          {coords.isMobile && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs select-none"
            />
          )}

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-label="Notifications"
            aria-modal="true"
            initial={
              coords.isMobile
                ? { y: '100%', opacity: 0 }
                : shouldReduceMotion
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.97, y: -6 }
            }
            animate={
              coords.isMobile
                ? { y: 0, opacity: 1 }
                : { opacity: 1, scale: 1, y: 0 }
            }
            exit={
              coords.isMobile
                ? { y: '100%', opacity: 0 }
                : shouldReduceMotion
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.97, y: -6 }
            }
            transition={{
              type: 'spring',
              damping: 28,
              stiffness: 380,
              duration: 0.15,
            }}
            style={
              coords.isMobile
                ? {}
                : {
                    position: 'fixed',
                    top: coords.top,
                    left: coords.left,
                    transformOrigin: 'top right',
                  }
            }
            className={cn(
              'z-50 flex flex-col bg-[var(--surface-raised)] border border-[var(--border)] shadow-[0_12px_32px_-8px_rgba(20,22,28,0.18)] select-none overflow-hidden',
              coords.isMobile
                ? 'fixed inset-x-0 bottom-0 w-full max-h-[88dvh] rounded-t-xl border-b-0'
                : 'rounded-xl w-[360px] max-w-[calc(100vw-24px)] max-h-[min(480px,calc(100dvh-80px))]'
            )}
          >
            {/* Mobile Drag Handle */}
            {coords.isMobile && (
              <div className="flex justify-center pt-2 pb-1 bg-[var(--surface-raised)] shrink-0">
                <div className="w-8 h-1 rounded-full bg-[var(--border-strong)]" />
              </div>
            )}

            {/* Header: 14px font-semibold title, count badge, Mark all as read */}
            <div className="sticky top-0 z-20 flex items-center justify-between px-3.5 py-2.5 bg-[var(--surface-raised)] border-b border-[var(--border)] shrink-0">
              <div className="flex items-center gap-2">
                <h3 className="text-[14px] font-semibold text-[var(--text)] tracking-tight">
                  Notifications
                </h3>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[11px] font-semibold text-[var(--selected-text)] bg-[var(--selected-bg)] border border-[var(--selected-border)]">
                    {unreadCount} new
                  </span>
                )}
              </div>

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllNotificationsRead}
                  className="flex items-center gap-1 text-[12px] font-medium text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Mark all read</span>
                </button>
              )}
            </div>

            {/* Pill Tabs: Neutral outline with subtle indigo active state with smooth sliding transition */}
            <div className="flex items-center gap-1.5 px-3.5 py-2 bg-[var(--surface-raised)] border-b border-[var(--border-subtle)] shrink-0">
              {[
                { id: 'all', label: 'All', count: notifications.length },
                { id: 'unread', label: 'Unread', count: unreadCount },
                { id: 'alerts', label: 'Alerts', count: alertCount },
              ].map((tab) => {
                const isCurrent = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    data-notif-tab={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={cn(
                      'relative h-7 px-3 rounded-full text-[12px] font-medium transition-colors flex items-center gap-1.5 cursor-pointer select-none',
                      isCurrent
                        ? 'text-[var(--text)] font-semibold border-[var(--selected-border)]'
                        : 'text-[var(--text-secondary)] border-[var(--border-subtle)] hover:text-[var(--text)] hover:bg-[var(--surface-subtle)] hover:border-[var(--border)]'
                    )}
                  >
                    {isCurrent && (
                      <motion.div
                        layoutId="notif-tab-indicator"
                        className="absolute inset-0 bg-[var(--selected-bg)] border border-[var(--selected-border)] rounded-full pointer-events-none"
                        transition={{ type: 'spring', stiffness: 500, damping: 35, mass: 0.5 }}
                      />
                    )}
                    <span className="relative z-10">{tab.label}</span>
                    <span
                      className={cn(
                        'relative z-10 min-w-[18px] h-[18px] inline-flex items-center justify-center leading-none text-[10px] tabular-nums font-semibold px-1.5 rounded-full transition-colors',
                        isCurrent
                          ? 'bg-[var(--selected-indicator)] text-white'
                          : 'bg-[var(--surface-subtle)] text-[var(--text-muted)] border border-[var(--border)]'
                      )}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Notification List with 12px text & subtle indigo unread state */}
            <div
              ref={listRef}
              role="list"
              aria-live="polite"
              className="flex-1 overflow-y-auto divide-y divide-[var(--border-subtle)] scrollbar-thin"
            >
              {isLoading ? (
                <div className="p-3.5 space-y-2.5">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <Skeleton className="w-7 h-7 rounded-lg shrink-0" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="w-3/4 h-3 rounded" />
                        <Skeleton className="w-full h-3 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="py-10 px-4 flex flex-col items-center justify-center text-center">
                  <div className="w-10 h-10 rounded-xl bg-[var(--surface-subtle)] text-[var(--success-text)] flex items-center justify-center mb-2">
                    <CheckCircle2 className="w-5 h-5 stroke-[2]" />
                  </div>
                  <h4 className="text-[13px] font-semibold text-[var(--text)]">
                    All caught up
                  </h4>
                  <p className="text-[12px] text-[var(--text-muted)] mt-0.5 max-w-xs">
                    No unread notifications or critical alerts at this time.
                  </p>
                </div>
              ) : (
                <>
                  {/* Today Section */}
                  {groupedNotifications.today.length > 0 && (
                    <div>
                      <div className="sticky top-0 z-10 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] bg-[var(--surface-subtle)] border-b border-[var(--border-subtle)]">
                        Today
                      </div>
                      <div>
                        {groupedNotifications.today.map((item, idx) =>
                          renderNotificationRow(item, idx)
                        )}
                      </div>
                    </div>
                  )}

                  {/* Earlier Section */}
                  {groupedNotifications.earlier.length > 0 && (
                    <div>
                      <div className="sticky top-0 z-10 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] bg-[var(--surface-subtle)] border-b border-[var(--border-subtle)]">
                        Earlier
                      </div>
                      <div>
                        {groupedNotifications.earlier.map((item, idx) =>
                          renderNotificationRow(item, idx + 10)
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer (40px with Mark all read + Settings link) */}
            <div className="h-10 px-3.5 flex items-center justify-between bg-[var(--surface-raised)] border-t border-[var(--border)] shrink-0 text-[12px]">
              <button
                type="button"
                onClick={markAllNotificationsRead}
                className="font-medium text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
              >
                Mark all as read
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate('/settings');
                }}
                className="flex items-center gap-1.5 font-medium text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                title="Notification Settings"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Notification settings</span>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );

  function renderNotificationRow(item: NotificationItem, index: number) {
    const tile = getTypeTileStyle(item.type);
    const isMenuOpen = activeMenuId === item.id;

    return (
      <motion.div
        key={item.id}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
        transition={{ delay: Math.min(index * 0.02, 0.12), duration: 0.12 }}
        onClick={() => handleItemClick(item)}
        className={cn(
          'relative flex items-start gap-2.5 px-3.5 py-2.5 group cursor-pointer transition-colors select-none',
          !item.read
            ? 'bg-[rgba(79,70,229,0.04)] dark:bg-[rgba(79,70,229,0.08)]'
            : 'hover:bg-[var(--surface-subtle)]'
        )}
      >
        {/* 28px Rounded Icon Tile */}
        <div
          className={cn(
            'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
            tile.bg
          )}
        >
          {tile.icon}
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center justify-between gap-1">
            <h5
              className={cn(
                'text-[12px] text-[var(--text)] truncate',
                !item.read ? 'font-semibold' : 'font-medium'
              )}
            >
              {item.title}
            </h5>
            <span className="text-[11px] text-[var(--text-muted)] whitespace-nowrap shrink-0">
              {item.timestamp}
            </span>
          </div>

          <p className="text-[11px] text-[var(--text-secondary)] line-clamp-2 mt-0.5 leading-snug">
            {item.description}
          </p>
        </div>

        {/* Right Area: 6px Indigo Dot + Actions Button */}
        <div className="flex items-center gap-1 shrink-0 mt-1">
          {!item.read && (
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0" />
          )}

          {/* Hover Menu Button */}
          <div
            data-item-menu="true"
            className="relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setActiveMenuId(isMenuOpen ? null : item.id)}
              className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-subtle)] opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
              title="More actions"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>

            {/* Menu Popover */}
            {isMenuOpen && (
              <div className="absolute right-0 top-6 z-30 w-40 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] shadow-[var(--shadow-popover)] py-1 text-[12px] font-medium text-[var(--text)] select-none">
                <button
                  type="button"
                  onClick={() => {
                    toggleNotificationRead(item.id);
                    setActiveMenuId(null);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--surface-subtle)] text-left transition-colors"
                >
                  <Check className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{item.read ? 'Mark as unread' : 'Mark as read'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleMuteType(item.type)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--surface-subtle)] text-left transition-colors"
                >
                  <VolumeX className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  <span>Mute {item.type}s</span>
                </button>

                <div className="my-1 border-t border-[var(--border-subtle)]" />

                <button
                  type="button"
                  onClick={() => {
                    deleteNotification(item.id);
                    setActiveMenuId(null);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 text-left transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete notification</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  }
};
