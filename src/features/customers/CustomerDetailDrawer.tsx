import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  X,
  CreditCard,
  Power,
  Edit2,
  Mail,
  Zap,
  Activity,
  Calendar,
  MapPin,
  Wifi,
  HardDrive,
  Clock,
  Shield,
  LifeBuoy,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Save,
  Copy,
  Check,
  Download,
  Trash2,
  FileText,
  AlertTriangle,
  RotateCw,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useStore } from '../../store/useStore';
import { Drawer } from '../../components/ui/Drawer';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Chip } from '../../components/ui/Chip';
import { Tooltip as UiTooltip } from '../../components/ui/Tooltip';
import { StatusChangePopover } from './StatusChangePopover';
import { formatCurrency, formatDate, cn } from '../../lib/utils';
import { Customer } from '../../types';

// Helper component for copyable definition item
const CopyDefinitionItem: React.FC<{
  label: string;
  value: string;
  mono?: boolean;
}> = ({ label, value, mono = false }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-2.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border)] flex items-center justify-between group hover:border-[var(--border-strong)] transition-colors">
      <div className="min-w-0 flex-1 mr-2">
        <span className="text-[11px] font-medium text-[var(--text-muted)] block truncate">
          {label}
        </span>
        <span
          className={cn(
            'text-[12px] font-semibold text-[var(--text)] truncate block',
            mono && 'font-mono'
          )}
        >
          {value || '—'}
        </span>
      </div>
      <UiTooltip content={copied ? 'Copied!' : 'Copy to clipboard'}>
        <button
          type="button"
          onClick={handleCopy}
          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface)] border border-transparent hover:border-[var(--border)] transition-all shrink-0"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-emerald-500 stroke-[2.5]" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>
      </UiTooltip>
    </div>
  );
};

export const CustomerDetailDrawer: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const isDrawerOpen = useStore((s) => s.isDrawerOpen);
  const openDrawer = useStore((s) => s.openDrawer);
  const closeDrawer = useStore((s) => s.closeDrawer);
  const activeCustomerId = useStore((s) => s.activeCustomerId);
  const activeDrawerTab = useStore((s) => s.activeDrawerTab);
  const setDrawerTab = useStore((s) => s.setDrawerTab);
  const customers = useStore((s) => s.customers);
  const invoices = useStore((s) => s.invoices);
  const tickets = useStore((s) => s.tickets);
  const activities = useStore((s) => s.activities);
  const updateCustomer = useStore((s) => s.updateCustomer);
  const openModal = useStore((s) => s.openModal);
  const currency = useStore((s) => s.currency);
  const addToast = useStore((s) => s.addToast);

  // Sync from URL params on load / change
  useEffect(() => {
    const customerParam = searchParams.get('customer');
    const tabParam = searchParams.get('tab') as typeof activeDrawerTab | null;

    if (customerParam && customerParam !== activeCustomerId) {
      const match = customers.find((c) => c.id === customerParam);
      if (match) {
        openDrawer(match.id, tabParam || 'overview');
      }
    }
  }, [searchParams, customers, activeCustomerId, openDrawer]);

  const customer = useMemo(
    () => customers.find((c) => c.id === activeCustomerId),
    [customers, activeCustomerId]
  );

  // Two-way sync: When drawer is opened via store (e.g. table click), sync URL params
  useEffect(() => {
    if (isDrawerOpen && customer) {
      const currentCustParam = searchParams.get('customer');
      const currentTabParam = searchParams.get('tab');
      if (currentCustParam !== customer.id || currentTabParam !== activeDrawerTab) {
        setSearchParams(
          (prev) => {
            prev.set('customer', customer.id);
            prev.set('tab', activeDrawerTab);
            return prev;
          },
          { replace: true }
        );
      }
    }
  }, [isDrawerOpen, customer, activeDrawerTab, searchParams, setSearchParams]);

  // Notes state & debounce autosave
  const [notesText, setNotesText] = useState(customer?.notes || '');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [isSavedSuccess, setIsSavedSuccess] = useState(false);
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (customer) {
      setNotesText(customer.notes || '');
    }
  }, [customer?.id]);

  const handleNotesChange = (val: string) => {
    setNotesText(val);
    if (!customer) return;

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(async () => {
      setIsSavingNotes(true);
      await updateCustomer(customer.id, { notes: val });
      setIsSavingNotes(false);
      setIsSavedSuccess(true);
      setTimeout(() => setIsSavedSuccess(false), 2000);
    }, 600);
  };

  const handleManualSaveNotes = async () => {
    if (!customer) return;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    setIsSavingNotes(true);
    await updateCustomer(customer.id, { notes: notesText });
    setIsSavingNotes(false);
    setIsSavedSuccess(true);
    setTimeout(() => setIsSavedSuccess(false), 2000);
    addToast({
      type: 'success',
      title: 'Notes Saved',
      message: 'Customer operational notes updated.',
    });
  };

  // Prev / Next Customer navigation
  const currentIndex = useMemo(
    () => customers.findIndex((c) => c.id === activeCustomerId),
    [customers, activeCustomerId]
  );
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < customers.length - 1;

  const navigateCustomer = useCallback(
    (target: Customer) => {
      openDrawer(target.id, activeDrawerTab);
      setSearchParams(
        (prev) => {
          prev.set('customer', target.id);
          prev.set('tab', activeDrawerTab);
          return prev;
        },
        { replace: true }
      );
    },
    [openDrawer, activeDrawerTab, setSearchParams]
  );

  const handlePrev = useCallback(() => {
    if (hasPrev) navigateCustomer(customers[currentIndex - 1]);
  }, [hasPrev, currentIndex, customers, navigateCustomer]);

  const handleNext = useCallback(() => {
    if (hasNext) navigateCustomer(customers[currentIndex + 1]);
  }, [hasNext, currentIndex, customers, navigateCustomer]);

  const handleClose = useCallback(() => {
    closeDrawer();
    setSearchParams(
      (prev) => {
        prev.delete('customer');
        prev.delete('tab');
        return prev;
      },
      { replace: true }
    );
  }, [closeDrawer, setSearchParams]);

  const handleSelectTab = (tabId: typeof activeDrawerTab) => {
    setDrawerTab(tabId);
    setSearchParams(
      (prev) => {
        prev.set('tab', tabId);
        return prev;
      },
      { replace: true }
    );
  };

  if (!customer) return null;

  const customerInvoices = invoices.filter((inv) => inv.customerId === customer.id);
  const customerTickets = tickets.filter((t) => t.customerId === customer.id);
  const customerActivities = activities.filter((act) => act.customerId === customer.id);

  // Generate 30-day realistic usage data for Recharts area chart
  const usageChartData = [
    { day: 'Day 1', download: 18.2, upload: 4.1 },
    { day: 'Day 3', download: 24.5, upload: 5.6 },
    { day: 'Day 5', download: 31.0, upload: 8.2 },
    { day: 'Day 7', download: 28.4, upload: 6.9 },
    { day: 'Day 9', download: 19.8, upload: 4.5 },
    { day: 'Day 11', download: 22.1, upload: 5.1 },
    { day: 'Day 13', download: 35.6, upload: 9.4 },
    { day: 'Day 15', download: 41.2, upload: 11.0 },
    { day: 'Day 17', download: 38.0, upload: 9.8 },
    { day: 'Day 19', download: 29.5, upload: 7.2 },
    { day: 'Day 21', download: 33.2, upload: 8.5 },
    { day: 'Day 23', download: 44.1, upload: 12.3 },
    { day: 'Day 25', download: 36.8, upload: 9.1 },
    { day: 'Day 27', download: 27.5, upload: 6.8 },
    { day: 'Day 29', download: 39.4, upload: 10.2 },
    { day: 'Day 30', download: 42.1, upload: 11.8 },
  ];

  const tabs: { id: typeof activeDrawerTab; label: string; count?: number }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'billing', label: 'Billing', count: customerInvoices.length },
    { id: 'usage', label: 'Usage' },
    { id: 'tickets', label: 'Tickets', count: customerTickets.length },
    { id: 'activity', label: 'Activity' },
    { id: 'notes', label: 'Notes' },
  ];

  const customHeader = (
    <div className="px-6 pt-5 pb-3 border-b border-[var(--border)] space-y-3 bg-[var(--surface)] select-none">
      {/* Row 1: 48px avatar with online dot, name 18px/600, status badge popover, 32px ghost buttons (Prev, Next, Close) */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Avatar
            name={customer.fullName}
            size="lg"
            online={customer.onlineStatus === 'online'}
            className="text-[16px] font-bold shrink-0"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-[18px] font-semibold text-[var(--text)] tracking-tight truncate">
                {customer.fullName}
              </h2>
              <StatusChangePopover
                currentStatus={customer.status}
                customerId={customer.id}
              />
            </div>
          </div>
        </div>

        {/* 32px ghost buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[12px] font-medium text-[var(--text-muted)] px-1.5 tabular-nums">
            {currentIndex + 1} of {customers.length}
          </span>
          <UiTooltip content="Previous subscriber (K)">
            <button
              type="button"
              onClick={handlePrev}
              disabled={!hasPrev}
              aria-label="Previous subscriber"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-subtle)] disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ChevronUp className="w-4 h-4 stroke-[2]" />
            </button>
          </UiTooltip>
          <UiTooltip content="Next subscriber (J)">
            <button
              type="button"
              onClick={handleNext}
              disabled={!hasNext}
              aria-label="Next subscriber"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-subtle)] disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ChevronDown className="w-4 h-4 stroke-[2]" />
            </button>
          </UiTooltip>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close drawer"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-subtle)] transition-colors"
          >
            <X className="w-4 h-4 stroke-[2]" />
          </button>
        </div>
      </div>

      {/* Row 2: Customer code with copy button, plan name, "Customer since {date}" (12px muted) */}
      <div className="flex items-center gap-2 text-[12px] text-[var(--text-muted)] flex-wrap">
        <div className="flex items-center gap-1 font-mono font-medium text-[var(--text)] bg-[var(--surface-subtle)] px-1.5 py-0.5 rounded border border-[var(--border-subtle)]">
          <span>{customer.code}</span>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(customer.code);
              addToast({ type: 'info', title: 'Copied', message: 'Customer ID copied to clipboard' });
            }}
            className="text-[var(--text-muted)] hover:text-[var(--text)] ml-0.5"
            title="Copy customer code"
          >
            <Copy className="w-3 h-3" />
          </button>
        </div>
        <span>•</span>
        <span className="font-medium text-[var(--text)]">{customer.planName}</span>
        <span>•</span>
        <span>Customer since {formatDate(customer.installationDate || '2024-01-01')}</span>
      </div>

      {/* Row 3: Single non-wrapping action row */}
      <div className="flex items-center gap-2 flex-nowrap overflow-x-auto pt-0.5 scrollbar-none">
        <Button
          size="sm"
          variant="primary"
          onClick={() => openModal('addEditCustomer', { customerId: customer.id })}
          className="h-8 text-[12px] px-3 gap-1.5 shrink-0"
        >
          <Edit2 className="w-3.5 h-3.5" />
          <span>Edit profile</span>
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={() => openModal('recordPayment', { customerId: customer.id })}
          className="h-8 text-[12px] px-2.5 gap-1.5 shrink-0"
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Record payment</span>
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={() => openModal('sendMessage', { customerId: customer.id, isBulk: false })}
          className="h-8 text-[12px] px-2.5 gap-1.5 shrink-0"
        >
          <Mail className="w-3.5 h-3.5" />
          <span>Send message</span>
        </Button>

        <UiTooltip content={customer.status === 'Suspended' ? 'Activate subscriber' : 'Suspend subscriber'}>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              openModal('statusConfirmation', {
                customerIds: [customer.id],
                targetStatus: customer.status === 'Suspended' ? 'Active' : 'Suspended',
              })
            }
            className="h-8 w-8 p-0 flex items-center justify-center shrink-0"
          >
            <Power className="w-3.5 h-3.5" />
          </Button>
        </UiTooltip>

        <Button
          size="sm"
          variant="ghost"
          onClick={() => openModal('deleteConfirmation', { customerIds: [customer.id] })}
          className="h-8 w-8 p-0 flex items-center justify-center text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 shrink-0 ml-auto"
          title="Delete subscriber"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );

  return (
    <Drawer
      isOpen={isDrawerOpen}
      onClose={handleClose}
      width="customer"
      customHeader={customHeader}
      footer={
        <div className="w-full flex items-center justify-between px-6 py-3 text-[12px] text-[var(--text-muted)] bg-[var(--surface)] border-t border-[var(--border)]">
          <span>Last updated 2 min ago</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              handleClose();
              navigate(`/customers?search=${encodeURIComponent(customer.code)}`);
            }}
            className="h-7 text-[12px] text-[var(--brand)] hover:underline px-2"
          >
            Open full page
          </Button>
        </div>
      }
    >
      <div className="px-6 py-5 space-y-5 text-[12px] max-sm:px-4">
        {/* Navigation Tabs using indigo tokens for selected with smooth sliding layout indicator */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border)] overflow-x-auto scrollbar-none shrink-0">
          {tabs.map((tab) => {
            const isActive = activeDrawerTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                data-drawer-tab={tab.id}
                onClick={() => handleSelectTab(tab.id)}
                className={cn(
                  'relative px-3 py-1.5 rounded-lg text-[12px] font-medium whitespace-nowrap transition-colors duration-150 flex items-center gap-1.5 cursor-pointer',
                  isActive
                    ? 'text-[var(--selected-indicator)] font-semibold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--surface)]'
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="drawer-tab-indicator"
                    className="absolute inset-0 bg-[var(--selected-bg)] border border-[var(--selected-border)] rounded-lg shadow-xs pointer-events-none"
                    transition={{ type: 'spring', stiffness: 500, damping: 35, mass: 0.5 }}
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={cn(
                      'relative z-10 min-w-[18px] h-[18px] inline-flex items-center justify-center text-[10px] tabular-nums font-semibold px-1 rounded-full leading-none transition-colors',
                      isActive
                        ? 'bg-[var(--selected-indicator)] text-white'
                        : 'bg-[var(--surface)] text-[var(--text-muted)] border border-[var(--border)]'
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeDrawerTab === 'overview' && (
          <div className="space-y-4">
            {/* Top Summary Card */}
            <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-card)] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-medium text-[var(--text-muted)] block">
                    Monthly Plan Subscription
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[16px] font-bold text-[var(--text)]">
                      {customer.planName}
                    </span>
                    <span className="text-[13px] font-semibold text-[var(--text-muted)]">
                      {currency}{customer.monthlyPrice}/mo
                    </span>
                  </div>
                </div>

                {/* Online indicator with latency dot */}
                <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-[var(--surface-subtle)] border border-[var(--border)]">
                  <span
                    className={cn(
                      'w-2 h-2 rounded-full shrink-0',
                      customer.onlineStatus === 'online'
                        ? 'bg-emerald-500 animate-pulse'
                        : 'bg-red-500'
                    )}
                  />
                  <span className="text-[11px] font-medium text-[var(--text)]">
                    {customer.onlineStatus === 'online'
                      ? `${customer.lastPingMs || 14} ms (Healthy)`
                      : 'Offline'}
                  </span>
                </div>
              </div>

              {/* Balance Banner Row */}
              <div
                className={cn(
                  'p-3 rounded-xl flex items-center justify-between border',
                  customer.balanceDue > 0
                    ? 'bg-red-50/60 dark:bg-red-950/20 border-red-200/80 dark:border-red-900/40 text-red-700 dark:text-red-400'
                    : 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-400'
                )}
              >
                <div>
                  <span className="text-[11px] font-medium opacity-80 block">
                    Outstanding Balance
                  </span>
                  <span className="text-[18px] font-black tabular-nums">
                    {currency}{customer.balanceDue.toFixed(2)}
                  </span>
                </div>
                {customer.balanceDue > 0 ? (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() =>
                      openModal('recordPayment', { customerId: customer.id })
                    }
                    className="h-8 text-[12px] px-3 shadow-xs"
                  >
                    Pay Full Balance
                  </Button>
                ) : (
                  <div className="flex items-center gap-1.5 font-bold text-[12px]">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Account Current</span>
                  </div>
                )}
              </div>
            </div>

            {/* 2-Col Definition Grid with Copy Buttons */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-[13px] font-semibold text-[var(--text)]">
                  Connection and hardware details
                </h4>
                <button
                  type="button"
                  onClick={() => openModal('speedTest', { customerId: customer.id })}
                  className="text-[11px] font-semibold text-[var(--brand)] hover:underline flex items-center gap-1"
                >
                  <Zap className="w-3 h-3" />
                  <span>Run Speed Test</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <CopyDefinitionItem
                  label="IP Address"
                  value={customer.ipAddress}
                  mono
                />
                <CopyDefinitionItem
                  label="MAC Address"
                  value={customer.macAddress}
                  mono
                />
                <CopyDefinitionItem
                  label="PPPoE Username"
                  value={customer.pppoeUsername || customer.code.toLowerCase()}
                  mono
                />
                <CopyDefinitionItem
                  label="Router Model"
                  value={customer.routerModel || 'Huawei HG8245H'}
                />
                <CopyDefinitionItem
                  label="Coordinates"
                  value={customer.coordinates || '11.5564° N, 104.9282° E'}
                  mono
                />
                <CopyDefinitionItem
                  label="Phone Number"
                  value={customer.phone}
                />
                <CopyDefinitionItem
                  label="Email Address"
                  value={customer.email}
                />
                <CopyDefinitionItem
                  label="Installation Date"
                  value={formatDate(customer.installationDate)}
                />
              </div>
            </div>

            {/* Inline Notes Preview */}
            <div className="p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-card)] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-[var(--text)]">
                  Subscriber notes
                </span>
                <button
                  type="button"
                  onClick={() => handleSelectTab('notes')}
                  className="text-[11px] font-semibold text-[var(--brand)] hover:underline"
                >
                  Edit in Notes tab →
                </button>
              </div>
              <p className="text-[12px] text-[var(--text-secondary)] italic line-clamp-3">
                {customer.notes || 'No operational notes attached to this subscriber.'}
              </p>
            </div>
          </div>
        )}

        {/* TAB 2: BILLING */}
        {activeDrawerTab === 'billing' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-[13px] font-semibold text-[var(--text)]">
                Invoices & Charges
              </h4>
              <Button
                size="sm"
                variant="primary"
                onClick={() =>
                  openModal('recordPayment', { customerId: customer.id })
                }
                className="h-8 text-[12px] px-3 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Record Payment</span>
              </Button>
            </div>

            {customerInvoices.length === 0 ? (
              <div className="py-12 text-center text-[var(--text-muted)] bg-[var(--surface)] rounded-2xl border border-[var(--border)]">
                No past invoices on file for this account.
              </div>
            ) : (
              <div className="space-y-2">
                {customerInvoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] flex items-center justify-between shadow-xs hover:border-[var(--border-strong)] transition-colors"
                  >
                    <div>
                      <div className="font-semibold text-[13px] text-[var(--text)] font-mono">
                        {inv.invoiceNumber}
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                        Date: {formatDate(inv.date)} • Due: {formatDate(inv.dueDate)}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="font-bold text-[13px] text-[var(--text)] tabular-nums">
                          {currency}{inv.amount.toFixed(2)}
                        </div>
                        <Chip
                          size="sm"
                          color={inv.status === 'Paid' ? 'success' : 'danger'}
                          className="mt-0.5"
                        >
                          {inv.status}
                        </Chip>
                      </div>
                      <UiTooltip content="Download PDF">
                        <button
                          type="button"
                          onClick={() => {
                            addToast({
                              type: 'info',
                              title: 'Download Started',
                              message: `Exporting invoice ${inv.invoiceNumber}.pdf`,
                            });
                          }}
                          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-subtle)] border border-[var(--border)] transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </UiTooltip>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: USAGE */}
        {activeDrawerTab === 'usage' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-[13px] font-semibold text-[var(--text)]">
                  30-Day Traffic Consumption
                </h4>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Daily aggregate Download vs Upload in GB
                </p>
              </div>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="flex items-center gap-1 text-[var(--brand)] font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-[var(--brand)]" />
                  Download
                </span>
                <span className="flex items-center gap-1 text-indigo-500 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                  Upload
                </span>
              </div>
            </div>

            {/* Recharts Area Chart */}
            <div className="h-64 w-full bg-[var(--surface)] p-2 rounded-2xl border border-[var(--border)] shadow-[var(--shadow-card)]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={usageChartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="downloadGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EA6A3C" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#EA6A3C" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="uploadGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--surface-raised)',
                      borderColor: 'var(--border)',
                      borderRadius: '10px',
                      color: 'var(--text)',
                      fontSize: '11px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="download"
                    stroke="#EA6A3C"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#downloadGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="upload"
                    stroke="#4F46E5"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#uploadGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Data Cap & Cycle Reset Cards */}
            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-xs">
                <span className="text-[10px] text-[var(--text-muted)] block">
                  Current Cycle
                </span>
                <span className="text-[14px] font-bold text-[var(--text)] tabular-nums">
                  {customer.dataUsageGB} GB
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-xs">
                <span className="text-[10px] text-[var(--text-muted)] block">
                  Bandwidth Cap
                </span>
                <span className="text-[14px] font-bold text-[var(--text)] tabular-nums">
                  {customer.dataCapGB ? `${customer.dataCapGB} GB` : 'Unlimited'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-xs">
                <span className="text-[10px] text-[var(--text-muted)] block">
                  Billing Cycle
                </span>
                <span className="text-[14px] font-bold text-[var(--text)]">
                  Resets in 9 days
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: TICKETS */}
        {activeDrawerTab === 'tickets' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-[13px] font-semibold text-[var(--text)]">
                Support Requests
              </h4>
              <Button
                size="sm"
                variant="primary"
                onClick={() =>
                  openModal('createTicket', { customerId: customer.id })
                }
                className="h-8 text-[12px] px-3 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Ticket</span>
              </Button>
            </div>

            {customerTickets.length === 0 ? (
              <div className="py-12 text-center text-[var(--text-muted)] bg-[var(--surface)] rounded-2xl border border-[var(--border)]">
                No active or historical support tickets for this subscriber.
              </div>
            ) : (
              <div className="space-y-2">
                {customerTickets.map((t) => (
                  <div
                    key={t.id}
                    className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] space-y-1.5 shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[13px] text-[var(--text)] font-mono">
                        {t.ticketNumber}
                      </span>
                      <Chip
                        size="sm"
                        color={t.status === 'Resolved' || t.status === 'Closed' ? 'success' : 'warning'}
                      >
                        {t.status}
                      </Chip>
                    </div>
                    <div className="font-medium text-[12px] text-[var(--text)]">
                      {t.title}
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] line-clamp-2">
                      {t.description}
                    </p>
                    <div className="text-[10px] text-[var(--text-subtle)] pt-1">
                      Assigned: {t.assignedTechnician || 'Unassigned'} • Priority:{' '}
                      {t.priority}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: ACTIVITY LOG */}
        {activeDrawerTab === 'activity' && (
          <div className="space-y-3">
            <h4 className="text-[13px] font-semibold text-[var(--text)] mb-2">
              Audit History & Telemetry Events
            </h4>
            {customerActivities.length === 0 ? (
              <div className="py-12 text-center text-[var(--text-muted)] bg-[var(--surface)] rounded-2xl border border-[var(--border)]">
                No telemetry or audit logs recorded for this subscriber.
              </div>
            ) : (
              <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[var(--border)]">
                {customerActivities.map((act) => (
                  <div key={act.id} className="relative">
                    <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-[var(--brand)] ring-4 ring-[var(--surface)]" />
                    <div className="font-semibold text-[12px] text-[var(--text)]">
                      {act.action}
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      {act.details}
                    </p>
                    <div className="text-[10px] text-[var(--text-subtle)] mt-0.5">
                      {act.actor} • {act.timestamp}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 6: NOTES */}
        {activeDrawerTab === 'notes' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-[13px] font-semibold text-[var(--text)]">
                  Operational & Field Notes
                </h4>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Auto-saved notes visible to NOC and field technicians.
                </p>
              </div>
              {isSavedSuccess && (
                <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Saved
                </span>
              )}
            </div>

            <textarea
              rows={8}
              value={notesText}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Add technician handover notes, fiber optic color code, lockbox combination, special access codes..."
              className="w-full p-3.5 text-[13px] rounded-xl border border-transparent bg-zinc-100/70 hover:bg-zinc-100/90 dark:bg-white/[0.05] dark:hover:bg-white/[0.08] text-[var(--text)] placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-[#006FEE] focus:ring-2 focus:ring-[#006FEE]/20 focus:bg-[var(--surface)] dark:focus:bg-[#18181b] transition-all duration-150 ease-out resize-none caret-[#006FEE]"
            />

            <div className="flex justify-end">
              <Button
                size="sm"
                variant="primary"
                isLoading={isSavingNotes}
                onClick={handleManualSaveNotes}
                className="h-8 text-[12px] px-4 shadow-xs"
              >
                {isSavedSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Saved!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Notes</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
};
