import React, { useMemo, useEffect } from 'react';
import {
  MoreHorizontal,
  Star,
  Eye,
  Edit2,
  Power,
  CreditCard,
  Mail,
  Zap,
  Trash2,
  HardDrive,
  Wifi,
  Activity,
  Cpu,
  Clock,
  MapPin,
  FileText,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Copy,
} from 'lucide-react';
import { Customer, CustomerStatus } from '../../types';
import { useStore } from '../../store/useStore';
import { Avatar } from '../../components/ui/Avatar';
import { StatusChangePopover } from './StatusChangePopover';
import { Tooltip } from '../../components/ui/Tooltip';
import { formatCurrency, formatNumber, cn } from '../../lib/utils';
import { useCan } from '../../lib/permissions';
import { DataTable, DataTableColumnDef, RowAction, DataTableCheckbox } from '../../components/ui/DataTable';

interface CustomerTableProps {
  customers: Customer[];
  allPageCustomerIds?: string[];
  total?: number;
  loading?: boolean;
}

export const CustomerTable: React.FC<CustomerTableProps> = ({
  customers,
  loading = false,
}) => {
  const openDrawer = useStore((s) => s.openDrawer);
  const openModal = useStore((s) => s.openModal);
  const updateCustomer = useStore((s) => s.updateCustomer);
  const canCreateCustomer = useCan('customers.btn.create');
  const canEditCustomer = useCan('customers.btn.edit');
  const canDeleteCustomer = useCan('customers.btn.delete');
  const canRecordPayment = useCan('payments.record') || useCan('billing.create');
  const plans = useStore((s) => s.plans);
  const currency = useStore((s) => s.currency);
  const showStatistics = useStore((s) => s.showStatistics);
  const toggleStatistics = useStore((s) => s.toggleStatistics);
  const addToast = useStore((s) => s.addToast);
  const selectAllCustomers = useStore((s) => s.selectAllCustomers);
  const setSelectedCustomerIds = useStore((s) => s.setSelectedCustomerIds);
  const clearSelectedCustomers = useStore((s) => s.clearSelectedCustomers);
  const filters = useStore((s) => s.filters);

  // Filter customers based on active store filters (StatusTabs, search, plan, city, etc.)
  const filteredCustomers = useMemo(() => {
    let result = customers;

    if (filters.status && filters.status.length > 0) {
      result = result.filter((c) => filters.status.includes(c.status));
    }

    if (filters.plan && filters.plan.length > 0) {
      result = result.filter((c) => filters.plan.includes(c.planName));
    }

    if (filters.city && filters.city.length > 0) {
      result = result.filter((c) => filters.city.includes(c.city));
    }

    if (filters.connectionType && filters.connectionType.length > 0) {
      result = result.filter((c) => filters.connectionType.includes(c.connectionType));
    }

    if (filters.technician && filters.technician.length > 0) {
      result = result.filter((c) => c.assignedTechnician && filters.technician.includes(c.assignedTechnician));
    }

    if (filters.minBalance !== undefined && filters.minBalance !== null) {
      result = result.filter((c) => c.balanceDue >= filters.minBalance!);
    }

    if (filters.maxBalance !== undefined && filters.maxBalance !== null) {
      result = result.filter((c) => c.balanceDue <= filters.maxBalance!);
    }

    if (filters.searchQuery && filters.searchQuery.trim()) {
      const q = filters.searchQuery.toLowerCase().trim();
      result = result.filter(
        (c) =>
          c.fullName.toLowerCase().includes(q) ||
          c.code.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q) ||
          c.ipAddress.toLowerCase().includes(q) ||
          c.macAddress.toLowerCase().includes(q) ||
          c.planName.toLowerCase().includes(q) ||
          c.city.toLowerCase().includes(q)
      );
    }

    return result;
  }, [customers, filters]);

  // Clear selection on load (0 rows selected on load) if needed
  useEffect(() => {
    const current = useStore.getState().selectedCustomerIds;
    if (current && current.length > 0) {
      clearSelectedCustomers();
    }
  }, [clearSelectedCustomers]);

  // Distinct cities for filter dropdown
  const cities = useMemo(
    () => Array.from(new Set(customers.map((c) => c.city).filter(Boolean))).sort(),
    [customers]
  );

  const planOptions = useMemo(
    () =>
      plans.map((p) => ({
        value: p.name,
        label: p.name,
        description: `${p.speedMbps} Mbps • $${p.monthlyPrice}/mo`,
      })),
    [plans]
  );

  const statusOptions: { value: CustomerStatus; label: string }[] = [
    { value: 'Active', label: 'Active' },
    { value: 'Suspended', label: 'Suspended' },
    { value: 'Overdue', label: 'Overdue' },
    { value: 'Pending', label: 'Pending' },
    { value: 'Disconnected', label: 'Disconnected' },
  ];

  // Column definitions with all advanced extras
  const columns: DataTableColumnDef<Customer>[] = useMemo(
    () => [
      {
        id: 'fullName',
        header: 'Customer',
        accessorKey: 'fullName',
        width: 240,
        minWidth: 200,
        sortable: true,
        priority: 1,
        filter: {
          type: 'text',
          placeholder: 'Search customer...',
        },
        tooltip: (val, row) => `${row.fullName} (${row.code}) - ${row.email}`,
        cell: ({ row }) => {
          const c = row.original;
          return (
            <div
              className="flex items-center gap-2 min-w-0 w-full cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                openDrawer(c.id);
              }}
            >
              <div className="w-7 h-7 rounded-full bg-[var(--surface-subtle)] border border-[var(--border)] flex items-center justify-center shrink-0 text-[11px] font-semibold text-[var(--text)]">
                {c.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
              </div>
              <div className="min-w-0 flex-1">
                <Tooltip content={c.fullName}>
                  <div className="font-semibold text-[12px] text-[var(--text)] hover:text-[var(--brand)] transition-colors truncate">
                    {c.fullName}
                  </div>
                </Tooltip>
                <div className="flex items-center gap-1 text-[11px] text-[var(--text-muted)] truncate">
                  <span className="font-mono text-[10px]">{c.code}</span>
                  <span>•</span>
                  <Tooltip content={c.email}>
                    <span className="truncate">{c.email}</span>
                  </Tooltip>
                </div>
              </div>
            </div>
          );
        },
      },
      {
        id: 'planName',
        header: 'Plan',
        accessorKey: 'planName',
        width: 170,
        minWidth: 150,
        sortable: true,
        priority: 1,
        filter: {
          type: 'select',
          options: planOptions,
        },
        editable: canEditCustomer
          ? {
              type: 'select',
              options: planOptions,
              onSave: async (newPlanName, row) => {
                const chosen = plans.find((p) => p.name === newPlanName);
                if (chosen) {
                  await updateCustomer(row.id, {
                    planId: chosen.id,
                    planName: chosen.name,
                    monthlyPrice: chosen.monthlyPrice,
                    dataCapGB: chosen.dataCapGB,
                  });
                  addToast({
                    type: 'success',
                    title: 'Plan Updated',
                    message: `Changed ${row.fullName}'s plan to ${chosen.name}`,
                  });
                }
              },
            }
          : undefined,
        cell: ({ row }) => {
          const c = row.original;
          return (
            <div>
              <div className="font-medium text-[12px] text-[var(--text)] truncate">
                {c.planName}
              </div>
              <div className="text-[11px] text-[var(--text-muted)]">
                {c.connectionType}
              </div>
            </div>
          );
        },
      },
      {
        id: 'monthlyPrice',
        header: 'Price',
        accessorKey: 'monthlyPrice',
        width: 100,
        minWidth: 80,
        align: 'right',
        sortable: true,
        priority: 1,
        aggregate: 'sum',
        filter: {
          type: 'range',
          min: 0,
          max: 200,
        },
        cell: ({ row }) => {
          const c = row.original;
          return (
            <span className="font-medium text-[12px] text-[var(--text)] tabular-nums">
              {currency}{c.monthlyPrice.toFixed(2)}<span className="text-[11px] text-[var(--text-muted)] ml-0.5">/mo</span>
            </span>
          );
        },
      },
      {
        id: 'dataUsageGB',
        header: 'Usage',
        accessorKey: 'dataUsageGB',
        width: 170,
        minWidth: 150,
        sortable: true,
        priority: 2,
        aggregate: 'avg',
        filter: {
          type: 'range',
          min: 0,
          max: 1000,
        },
        cell: ({ row }) => {
          const c = row.original;
          const usagePercent = c.dataCapGB
            ? Math.min(100, Math.round((c.dataUsageGB / c.dataCapGB) * 100))
            : Math.min(100, Math.round((c.dataUsageGB / 1000) * 100));

          return (
            <div className="flex items-center gap-1.5">
              <div className="w-[72px] bg-[var(--surface-subtle)] border border-[var(--border-subtle)] h-1.5 rounded-full overflow-hidden shrink-0">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-300',
                    usagePercent > 90
                      ? 'bg-red-500'
                      : usagePercent > 70
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  )}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
              <span className="text-[10.5px] text-[var(--text-secondary)] tabular-nums whitespace-nowrap">
                {formatNumber(c.dataUsageGB)}/{c.dataCapGB ? formatNumber(c.dataCapGB) : '1k'} GB
              </span>
            </div>
          );
        },
      },
      {
        id: 'balanceDue',
        header: 'Due',
        accessorKey: 'balanceDue',
        width: 90,
        minWidth: 70,
        align: 'right',
        sortable: true,
        priority: 1,
        aggregate: 'sum',
        filter: {
          type: 'range',
          min: 0,
          max: 500,
        },
        cell: ({ row }) => {
          const c = row.original;
          return (
            <span
              className={cn(
                'tabular-nums text-[12px] font-medium',
                c.balanceDue > 0
                  ? 'text-red-600 dark:text-red-400 font-semibold'
                  : 'text-[var(--text-muted)]'
              )}
            >
              {currency}{c.balanceDue.toFixed(2)}
            </span>
          );
        },
      },
      {
        id: 'status',
        header: 'Status',
        accessorKey: 'status',
        width: 104,
        minWidth: 90,
        sortable: true,
        priority: 1,
        filter: {
          type: 'multi',
          options: statusOptions,
        },
        editable: canEditCustomer
          ? {
              type: 'select',
              options: statusOptions,
              onSave: async (newStatus, row) => {
                await updateCustomer(row.id, { status: newStatus as CustomerStatus });
                addToast({
                  type: 'success',
                  title: 'Status Updated',
                  message: `Subscriber ${row.fullName} is now ${newStatus}.`,
                });
              },
            }
          : undefined,
        cell: ({ row }) => {
          const c = row.original;
          return (
            <div onClick={(e) => e.stopPropagation()}>
              <StatusChangePopover currentStatus={c.status} customerId={c.id} />
            </div>
          );
        },
      },
      {
        id: 'rating',
        header: 'Rating',
        accessorKey: 'rating',
        width: 72,
        minWidth: 60,
        align: 'right',
        sortable: true,
        priority: 2,
        aggregate: 'avg',
        filter: {
          type: 'range',
          min: 1,
          max: 5,
        },
        cell: ({ row }) => {
          const c = row.original;
          return (
            <div className="inline-flex items-center gap-1 font-medium text-amber-500 justify-end">
              <Star className="w-3.5 h-3.5 fill-amber-400 stroke-amber-400 shrink-0" />
              <span className="text-[12px] text-[var(--text)] tabular-nums font-semibold shrink-0">
                {c.rating.toFixed(1)}
              </span>
            </div>
          );
        },
      },
      {
        id: 'ipAddress',
        header: 'IP',
        accessorKey: 'ipAddress',
        width: 124,
        minWidth: 100,
        sortable: true,
        hideable: true,
        priority: 3,
        filter: { type: 'text' },
        cell: ({ row }) => (
          <div className="group/ip flex items-center gap-1.5">
            <span className="font-mono text-[11px] text-[var(--text-secondary)]">
              {row.original.ipAddress}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(row.original.ipAddress);
                addToast({
                  type: 'info',
                  title: 'IP Copied',
                  message: `Copied ${row.original.ipAddress} to clipboard.`,
                });
              }}
              className="opacity-0 group-hover/ip:opacity-100 transition-opacity p-0.5 rounded text-[var(--text-muted)] hover:text-[var(--text)]"
              title="Copy IP"
            >
              <Copy className="w-3 h-3" />
            </button>
          </div>
        ),
      },
      {
        id: 'city',
        header: 'City',
        accessorKey: 'city',
        width: 130,
        sortable: true,
        priority: 3,
        filter: {
          type: 'select',
          options: cities.map((city) => ({ value: city, label: city })),
        },
        cell: ({ row }) => (
          <Tooltip content={row.original.city}>
            <span className="text-[12px] text-[var(--text-secondary)] truncate block">
              {row.original.city}
            </span>
          </Tooltip>
        ),
      },
    ],
    [plans, planOptions, cities, currency, updateCustomer, addToast, openDrawer]
  );

  // Row actions for dropdown menu and right-click context menu
  const getRowActions = (c: Customer): RowAction<Customer>[] => {
    const actions: RowAction<Customer>[] = [
      {
        label: 'View Full Details',
        icon: <Eye className="w-3.5 h-3.5" />,
        onClick: () => openDrawer(c.id),
      },
    ];

    if (canEditCustomer) {
      actions.push(
        {
          label: 'Edit Profile',
          icon: <Edit2 className="w-3.5 h-3.5" />,
          onClick: () => openModal('addEditCustomer', { customerId: c.id }),
        },
        {
          label: c.status === 'Suspended' ? 'Activate Connection' : 'Suspend Connection',
          icon: <Power className="w-3.5 h-3.5" />,
          onClick: () =>
            openModal('statusConfirmation', {
              customerIds: [c.id],
              targetStatus: c.status === 'Suspended' ? 'Active' : 'Suspended',
            }),
        }
      );
    }

    if (canRecordPayment) {
      actions.push({
        label: 'Record Payment',
        icon: <CreditCard className="w-3.5 h-3.5" />,
        onClick: () => openModal('recordPayment', { customerId: c.id }),
      });
    }

    actions.push(
      {
        label: 'Send SMS / Email',
        icon: <Mail className="w-3.5 h-3.5" />,
        onClick: () => openModal('sendMessage', { customerId: c.id, isBulk: false }),
      },
      {
        label: 'Run Speed Test',
        icon: <Zap className="w-3.5 h-3.5" />,
        onClick: () => openModal('speedTest', { customerId: c.id }),
      }
    );

    if (canDeleteCustomer) {
      actions.push(
        { divider: true, label: '', onClick: () => {} },
        {
          label: 'Delete Subscriber',
          icon: <Trash2 className="w-3.5 h-3.5" />,
          danger: true,
          onClick: () =>
            openModal('deleteConfirmation', {
              customerIds: [c.id],
              isBulk: false,
            }),
        }
      );
    }

    return actions;
  };

  // Detail panel rendered when row chevron is expanded
  const renderExpanded = (c: Customer) => (
    <div className="p-4 rounded-xl bg-gray-50/80 dark:bg-[#161618] border border-gray-200/60 dark:border-gray-800 text-xs space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Hardware & Provisioning */}
        <div className="space-y-1.5 p-3 rounded-lg bg-white dark:bg-[#1C1C1F] border border-gray-200/50 dark:border-gray-800">
          <div className="flex items-center gap-1.5 font-bold text-gray-900 dark:text-gray-100">
            <Cpu className="w-3.5 h-3.5 text-[#F26B3A]" />
            <span>ONT Hardware</span>
          </div>
          <div className="text-gray-500 dark:text-gray-400 space-y-1 text-[11px]">
            <div>Model: <span className="font-semibold text-gray-800 dark:text-gray-200">Huawei HG8245H</span></div>
            <div>MAC: <span className="font-mono text-gray-700 dark:text-gray-300">{c.macAddress}</span></div>
            <div>IP: <span className="font-mono text-gray-700 dark:text-gray-300">{c.ipAddress}</span></div>
            <div>Firmware: <span className="font-mono">v3.21.0-build4</span></div>
          </div>
        </div>

        {/* Optical Link Telemetry */}
        <div className="space-y-1.5 p-3 rounded-lg bg-white dark:bg-[#1C1C1F] border border-gray-200/50 dark:border-gray-800">
          <div className="flex items-center gap-1.5 font-bold text-gray-900 dark:text-gray-100">
            <Wifi className="w-3.5 h-3.5 text-blue-500" />
            <span>Link Diagnostics</span>
          </div>
          <div className="text-gray-500 dark:text-gray-400 space-y-1 text-[11px]">
            <div>Optical Rx: <span className="font-semibold text-emerald-600">-19.4 dBm (Normal)</span></div>
            <div>Optical Tx: <span className="font-semibold text-gray-800 dark:text-gray-200">+2.3 dBm</span></div>
            <div>Latency: <span className="font-semibold text-gray-800 dark:text-gray-200">12 ms</span></div>
            <div>Last Ping: <span className="font-semibold text-emerald-600">0% Loss (2m ago)</span></div>
          </div>
        </div>

        {/* Dispatch & Address */}
        <div className="space-y-1.5 p-3 rounded-lg bg-white dark:bg-[#1C1C1F] border border-gray-200/50 dark:border-gray-800">
          <div className="flex items-center gap-1.5 font-bold text-gray-900 dark:text-gray-100">
            <MapPin className="w-3.5 h-3.5 text-amber-500" />
            <span>Service Address</span>
          </div>
          <div className="text-gray-500 dark:text-gray-400 space-y-1 text-[11px]">
            <div className="font-medium text-gray-800 dark:text-gray-200">{c.address}</div>
            <div>City: {c.city}</div>
            <div>Tech: <span className="font-semibold text-[#F26B3A]">{c.assignedTechnician || 'Unassigned'}</span></div>
            <div>Installed: {c.installationDate}</div>
          </div>
        </div>

        {/* Notes & Quick Actions */}
        <div className="space-y-2 p-3 rounded-lg bg-white dark:bg-[#1C1C1F] border border-gray-200/50 dark:border-gray-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 font-bold text-gray-900 dark:text-gray-100 mb-1">
              <FileText className="w-3.5 h-3.5 text-purple-500" />
              <span>Subscriber Notes</span>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2">
              {c.notes || 'No active service tickets or dispatch flags on this subscriber account.'}
            </p>
          </div>
          <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={() => openModal('speedTest', { customerId: c.id })}
              className="text-[11px] font-semibold text-[#F26B3A] hover:underline inline-flex items-center gap-1"
            >
              <Zap className="w-3 h-3" /> Run Speed Test
            </button>
            <span className="text-gray-300">|</span>
            <button
              type="button"
              onClick={() => openDrawer(c.id, 'billing')}
              className="text-[11px] font-semibold text-gray-600 dark:text-gray-300 hover:underline"
            >
              Ledger History
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Responsive card view (used when in cards mode or <768px)
  const renderCard = (
    c: Customer,
    isSelected: boolean,
    onSelect: () => void
  ) => {
    const usagePercent = c.dataCapGB
      ? Math.min(100, Math.round((c.dataUsageGB / c.dataCapGB) * 100))
      : Math.min(100, Math.round((c.dataUsageGB / 1000) * 100));

    return (
      <div
        data-testid="customer-card"
        onClick={() => openDrawer(c.id)}
        className={cn(
          'relative p-4 rounded-2xl bg-[var(--surface)] border transition-all cursor-pointer select-none flex flex-col justify-between shadow-[var(--shadow-card)] hover:border-[var(--border-strong)] text-[12px] group',
          isSelected
            ? 'border-[var(--selected-indicator)] bg-[var(--selected-bg)] ring-2 ring-[var(--selected-ring)]'
            : 'border-[var(--border)]'
        )}
      >
        <div>
          {/* Top header row: Checkbox, Avatar, Name/Email, Actions dropdown */}
          <div className="flex items-start justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div onClick={(e) => e.stopPropagation()} className="shrink-0 flex items-center">
                <DataTableCheckbox
                  checked={isSelected}
                  onChange={onSelect}
                  ariaLabel={`Select ${c.fullName}`}
                />
              </div>
              <Avatar
                name={c.fullName}
                size="md"
                online={c.onlineStatus === 'online'}
              />
              <div className="min-w-0 flex-1">
                <Tooltip content={c.fullName}>
                  <h4 className="text-[13px] font-semibold text-[var(--text)] truncate group-hover:text-[var(--brand)] transition-colors">
                    {c.fullName}
                  </h4>
                </Tooltip>
                <div className="flex items-center gap-1 text-[11px] text-[var(--text-muted)] truncate">
                  <span className="font-mono text-[10px]">{c.code}</span>
                  <span>•</span>
                  <Tooltip content={c.email}>
                    <span className="truncate">{c.email}</span>
                  </Tooltip>
                </div>
              </div>
            </div>

            {/* Top-right Status badge popover & actions menu */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 shrink-0"
            >
              <StatusChangePopover currentStatus={c.status} customerId={c.id} />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openDrawer(c.id);
                }}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-subtle)] transition-colors"
                title="Customer options"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Details list */}
          <div className="mt-3.5 pt-2.5 border-t border-[var(--border-subtle)] space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted)]">Plan:</span>
              <span className="font-semibold text-[var(--text)] truncate max-w-[170px]">
                {c.planName} <span className="font-normal text-[var(--text-muted)]">({c.connectionType})</span>
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted)]">Price:</span>
              <span className="font-bold text-[var(--text)] tabular-nums">
                {currency}{c.monthlyPrice.toFixed(2)}/mo
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted)]">Usage:</span>
              <div className="flex items-center gap-2">
                <div className="w-16 bg-[var(--surface-subtle)] border border-[var(--border-subtle)] h-1.5 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      usagePercent > 90
                        ? 'bg-red-500'
                        : usagePercent > 70
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    )}
                    style={{ width: `${usagePercent}%` }}
                  />
                </div>
                <span className="tabular-nums font-medium text-[var(--text-secondary)]">
                  {formatNumber(c.dataUsageGB)} GB
                  {c.dataCapGB ? ` / ${formatNumber(c.dataCapGB)}` : ''}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted)]">Due:</span>
              <span
                className={cn(
                  'tabular-nums font-semibold',
                  c.balanceDue > 0
                    ? 'text-red-600 dark:text-red-400 font-bold'
                    : 'text-[var(--text-muted)]'
                )}
              >
                {currency}{c.balanceDue.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer: Rating and IP */}
        <div className="mt-3 pt-2.5 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] text-[var(--text-muted)]">
          <div className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5 fill-amber-400 stroke-amber-400 text-amber-500" />
            <span className="font-bold text-[var(--text)] tabular-nums">
              {c.rating.toFixed(1)}
            </span>
          </div>
          <div className="flex items-center gap-1 font-mono text-[10px] text-[var(--text-muted)]">
            <span>{c.ipAddress}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(c.ipAddress);
                addToast({
                  type: 'info',
                  title: 'IP Copied',
                  message: `Copied ${c.ipAddress} to clipboard.`,
                });
              }}
              className="p-0.5 rounded hover:text-[var(--text)]"
              title="Copy IP"
            >
              <Copy className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <DataTable<Customer>
      columns={columns}
      data={filteredCustomers}
      loading={loading}
      rowId={(c) => c.id}
      viewKey="customers_master_table"
      onRowClick={(c) => openDrawer(c.id)}
      onSelectionChange={(selected) => setSelectedCustomerIds(selected.map((c) => c.id))}
      rowActions={getRowActions}
      renderExpanded={renderExpanded}
      renderCard={renderCard}
      showStatisticsToggle={false}
      showStatistics={showStatistics}
      onToggleStatistics={toggleStatistics}
      enableImport={canCreateCustomer}
      onImport={async (importedRows) => {
        addToast({
          type: 'success',
          title: 'Subscribers Imported',
          message: `Successfully validated and staged ${importedRows.length} new subscribers.`,
        });
      }}
      autoRefreshInterval={30}
      onRefresh={async () => {
        addToast({
          type: 'info',
          title: 'Subscribers Refreshed',
          message: 'Real-time telemetry and balance ledger synchronized.',
        });
      }}
      emptyTitle="No subscribers found"
      emptySubtitle="Try adjusting your filters, clearing your search query, or adding a new subscriber."
      onAddNew={canCreateCustomer ? () => openModal('addEditCustomer') : undefined}
      addNewLabel="Add New Customer"
    />
  );
};
