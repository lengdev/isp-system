import React from 'react';
import {
  Menu,
  Search,
  Bell,
  Sun,
  Moon,
  Calendar,
  CheckCheck,
  AlertTriangle,
  Receipt,
  LifeBuoy,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Popover } from '../ui/Popover';
import { formatDate } from '../../lib/utils';

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
  const markAllNotificationsRead = useStore((s) => s.markAllNotificationsRead);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const todayStr = formatDate(new Date(), 'EEE, dd MMM yyyy');

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between h-16 px-4 sm:px-6 bg-[#FAF7F5]/90 dark:bg-[#141416]/90 backdrop-blur-md border-b border-gray-200/60 dark:border-gray-800/60 transition-colors">
      {/* Left: Mobile Toggle & Global Search */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <button
          onClick={onMobileMenuOpen}
          className="md:hidden p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global Search Bar (clicking or typing filters or opens command palette) */}
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) => setFilters({ searchQuery: e.target.value })}
            placeholder="Search customers, IP, MAC, phone, plan..."
            className="w-full pl-10 pr-12 py-2 text-xs sm:text-sm bg-white dark:bg-[#1C1C1F] border border-gray-200/80 dark:border-gray-800 rounded-xl text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F26B3A]/40 focus:border-[#F26B3A] transition-all shadow-2xs"
          />
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-semibold text-gray-400 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 hover:text-gray-600 dark:hover:text-gray-200"
          >
            ⌘K
          </button>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Notifications Popover */}
        <Popover
          align="right"
          trigger={
            <button className="relative p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 transition-colors">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#F26B3A] ring-2 ring-[#FAF7F5] dark:ring-[#141416]" />
              )}
            </button>
          }
          content={
            <div className="w-80 sm:w-88 select-none">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">Notifications</h4>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-orange-100 text-[#F26B3A] dark:bg-orange-950/60 text-[10px] font-bold">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllNotificationsRead}
                    className="flex items-center gap-1 text-[11px] font-medium text-[#F26B3A] hover:underline"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Mark all read</span>
                  </button>
                )}
              </div>

              <div className="divide-y divide-gray-100 dark:divide-gray-800/80 max-h-72 overflow-y-auto mt-1">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`py-2.5 px-1 flex items-start gap-2.5 transition-colors ${
                      notif.read ? 'opacity-70' : 'bg-orange-50/40 dark:bg-orange-950/20'
                    }`}
                  >
                    <div className="mt-0.5 p-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 shrink-0">
                      {notif.type === 'alert' && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                      {notif.type === 'invoice' && <Receipt className="w-3.5 h-3.5 text-emerald-500" />}
                      {notif.type === 'ticket' && <LifeBuoy className="w-3.5 h-3.5 text-blue-500" />}
                      {notif.type === 'system' && <Bell className="w-3.5 h-3.5 text-[#F26B3A]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                        {notif.title}
                      </div>
                      <div className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">
                        {notif.description}
                      </div>
                      <div className="text-[10px] text-gray-400 mt-1">{notif.timestamp}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          }
        />

        {/* Dark Mode Toggle */}
        <button
          onClick={toggleDarkMode}
          title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 transition-colors"
        >
          {darkMode ? (
            <Sun className="w-5 h-5 text-amber-400 hover:rotate-45 transition-transform" />
          ) : (
            <Moon className="w-5 h-5 hover:-rotate-12 transition-transform" />
          )}
        </button>

        {/* Date Chip matching screenshot */}
        <div className="hidden sm:flex items-center gap-2.5 pl-3 border-l border-gray-200 dark:border-gray-800">
          <div className="p-1.5 rounded-lg bg-white dark:bg-[#1E1E22] border border-gray-200/80 dark:border-gray-800 text-gray-500 dark:text-gray-400">
            <Calendar className="w-4 h-4" />
          </div>
          <div className="text-left">
            <div className="text-xs font-bold text-gray-800 dark:text-gray-200">{todayStr}</div>
            <div className="text-[10px] text-gray-400 dark:text-gray-500 leading-none">
              Have a productive day!
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
