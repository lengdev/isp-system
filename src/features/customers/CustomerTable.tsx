import React from 'react';
import {
  MoreHorizontal,
  Star,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  Edit2,
  Power,
  CreditCard,
  Mail,
  Zap,
  Trash2,
  HardDrive,
} from 'lucide-react';
import { Customer } from '../../types';
import { useStore } from '../../store/useStore';
import { Avatar } from '../../components/ui/Avatar';
import { Dropdown } from '../../components/ui/Dropdown';
import { StatusChangePopover } from './StatusChangePopover';
import { Skeleton } from '../../components/ui/Skeleton';
import { Tooltip } from '../../components/ui/Tooltip';
import { formatCurrency, formatNumber, cn } from '../../lib/utils';

interface CustomerTableProps {
  customers: Customer[];
  allPageCustomerIds: string[];
}

export const CustomerTable: React.FC<CustomerTableProps> = ({
  customers,
  allPageCustomerIds,
}) => {
  const selectedIds = useStore((s) => s.selectedCustomerIds);
  const toggleSelectCustomer = useStore((s) => s.toggleSelectCustomer);
  const selectAllCustomers = useStore((s) => s.selectAllCustomers);
  const openDrawer = useStore((s) => s.openDrawer);
  const openModal = useStore((s) => s.openModal);
  const sort = useStore((s) => s.sort);
  const setSort = useStore((s) => s.setSort);
  const columns = useStore((s) => s.columns);
  const viewMode = useStore((s) => s.viewMode);
  const isLoading = useStore((s) => s.isLoading);
  const currency = useStore((s) => s.currency);

  const isAllSelected =
    allPageCustomerIds.length > 0 &&
    allPageCustomerIds.every((id) => selectedIds.includes(id));
  const isSomeSelected =
    allPageCustomerIds.some((id) => selectedIds.includes(id)) && !isAllSelected;

  const isColumnVisible = (id: string) => {
    const col = columns.find((c) => c.id === id);
    return col ? col.visible : true;
  };

  const renderSortIcon = (column: keyof Customer | 'planName') => {
    if (sort.column !== column) {
      return (
        <ArrowUpDown className="w-3.5 h-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      );
    }
    return sort.direction === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-[#F26B3A]" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-[#F26B3A]" />
    );
  };

  const isCompact = viewMode === 'compact';

  return (
    <div className="w-full overflow-hidden rounded-2xl bg-white dark:bg-[#1C1C1F] border border-gray-200/80 dark:border-gray-800 shadow-xs select-none">
      <div className="overflow-x-auto max-h-[640px] relative scrollbar-none">
        <table className="w-full text-left border-collapse">
          {/* Sticky Header (44px height, subtle #FAFAFA, uppercase-free 12px semibold muted labels) */}
          <thead className="sticky top-0 z-10 bg-[#FAFAFA] dark:bg-[#1A1A1D] border-b border-gray-200/80 dark:border-gray-800 shadow-[0_1px_0_0_rgba(0,0,0,0.03)]">
            <tr className="h-11 text-xs font-semibold text-gray-500 dark:text-gray-400">
              {/* Checkbox column (48px wide) */}
              {isColumnVisible('select') && (
                <th className="w-12 px-4 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={(input) => {
                      if (input) input.indeterminate = isSomeSelected;
                    }}
                    onChange={() => selectAllCustomers(allPageCustomerIds)}
                    className="rounded border-gray-300 dark:border-gray-700 text-[#F26B3A] focus:ring-[#F26B3A]/30 w-4 h-4 cursor-pointer accent-[#F26B3A]"
                  />
                </th>
              )}

              {/* Customer */}
              {isColumnVisible('customer') && (
                <th
                  onClick={() => setSort('fullName')}
                  className="px-4 cursor-pointer group hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Customer</span>
                    {renderSortIcon('fullName')}
                  </div>
                </th>
              )}

              {/* Plan */}
              {isColumnVisible('plan') && (
                <th
                  onClick={() => setSort('planName')}
                  className="px-4 cursor-pointer group hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Plan</span>
                    {renderSortIcon('planName')}
                  </div>
                </th>
              )}

              {/* Price */}
              {isColumnVisible('price') && (
                <th
                  onClick={() => setSort('monthlyPrice')}
                  className="px-4 cursor-pointer group hover:text-gray-900 dark:hover:text-gray-200 transition-colors text-right"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Monthly price</span>
                    {renderSortIcon('monthlyPrice')}
                  </div>
                </th>
              )}

              {/* Usage */}
              {isColumnVisible('usage') && (
                <th
                  onClick={() => setSort('dataUsageGB')}
                  className="px-4 cursor-pointer group hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Usage</span>
                    {renderSortIcon('dataUsageGB')}
                  </div>
                </th>
              )}

              {/* Due Amount */}
              {isColumnVisible('dueAmount') && (
                <th
                  onClick={() => setSort('balanceDue')}
                  className="px-4 cursor-pointer group hover:text-gray-900 dark:hover:text-gray-200 transition-colors text-right"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Due amount</span>
                    {renderSortIcon('balanceDue')}
                  </div>
                </th>
              )}

              {/* Status */}
              {isColumnVisible('status') && (
                <th
                  onClick={() => setSort('status')}
                  className="px-4 cursor-pointer group hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Status</span>
                    {renderSortIcon('status')}
                  </div>
                </th>
              )}

              {/* Rating */}
              {isColumnVisible('rating') && (
                <th
                  onClick={() => setSort('rating')}
                  className="px-4 cursor-pointer group hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Rating</span>
                    {renderSortIcon('rating')}
                  </div>
                </th>
              )}

              {/* Optional Columns */}
              {isColumnVisible('ipAddress') && <th className="px-4">IP address</th>}
              {isColumnVisible('city') && <th className="px-4">City</th>}
              {isColumnVisible('connectionType') && <th className="px-4">Connection</th>}
              {isColumnVisible('installationDate') && <th className="px-4">Install date</th>}

              {/* Action column */}
              {isColumnVisible('action') && <th className="px-4 text-center w-14">Action</th>}
            </tr>
          </thead>

          {/* Table Body (Row height 64px or 44px compact, cell padding px-4) */}
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800/80 text-xs">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={`skel-${i}`} className={isCompact ? 'h-11' : 'h-16'}>
                  {isColumnVisible('select') && (
                    <td className="w-12 px-4 text-center">
                      <Skeleton className="w-4 h-4 mx-auto rounded" />
                    </td>
                  )}
                  {isColumnVisible('customer') && (
                    <td className="px-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="w-9 h-9 rounded-full shrink-0" />
                        <div className="space-y-1.5">
                          <Skeleton className="w-32 h-3.5 rounded" />
                          <Skeleton className="w-40 h-2.5 rounded" />
                        </div>
                      </div>
                    </td>
                  )}
                  {isColumnVisible('plan') && (
                    <td className="px-4">
                      <Skeleton className="w-24 h-4 rounded" />
                    </td>
                  )}
                  {isColumnVisible('price') && (
                    <td className="px-4 text-right">
                      <Skeleton className="w-14 h-4 ml-auto rounded" />
                    </td>
                  )}
                  {isColumnVisible('usage') && (
                    <td className="px-4">
                      <Skeleton className="w-36 h-3 rounded" />
                    </td>
                  )}
                  {isColumnVisible('dueAmount') && (
                    <td className="px-4 text-right">
                      <Skeleton className="w-12 h-4 ml-auto rounded" />
                    </td>
                  )}
                  {isColumnVisible('status') && (
                    <td className="px-4">
                      <Skeleton className="w-16 h-6 rounded-full" />
                    </td>
                  )}
                  {isColumnVisible('rating') && (
                    <td className="px-4">
                      <Skeleton className="w-10 h-4 rounded" />
                    </td>
                  )}
                  {isColumnVisible('action') && (
                    <td className="px-4 text-center">
                      <Skeleton className="w-6 h-6 mx-auto rounded" />
                    </td>
                  )}
                </tr>
              ))
            ) : customers.length === 0 ? (
              <tr>
                <td
                  colSpan={12}
                  className="py-16 text-center text-gray-400 dark:text-gray-500"
                >
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center text-[#F26B3A] mb-3">
                      <HardDrive className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
                      No subscribers found
                    </h4>
                    <p className="text-xs text-gray-500 max-w-sm">
                      Try clearing filters or adjusting your search keyword.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              customers.map((c) => {
                const isSelected = selectedIds.includes(c.id);
                const usagePercent = c.dataCapGB
                  ? Math.min(100, Math.round((c.dataUsageGB / c.dataCapGB) * 100))
                  : Math.min(100, Math.round((c.dataUsageGB / 1000) * 100));

                return (
                  <tr
                    key={c.id}
                    onClick={() => openDrawer(c.id)}
                    className={cn(
                      'transition-colors cursor-pointer group align-middle',
                      isCompact ? 'h-11' : 'h-16',
                      isSelected
                        ? 'bg-[#FFF6F2] dark:bg-orange-950/25'
                        : 'hover:bg-gray-50/70 dark:hover:bg-gray-800/40'
                    )}
                  >
                    {/* Checkbox */}
                    {isColumnVisible('select') && (
                      <td
                        onClick={(e) => e.stopPropagation()}
                        className="w-12 px-4 text-center"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectCustomer(c.id)}
                          className="rounded border-gray-300 dark:border-gray-700 text-[#F26B3A] focus:ring-[#F26B3A]/30 w-4 h-4 cursor-pointer accent-[#F26B3A]"
                        />
                      </td>
                    )}

                    {/* Customer Info (Avatar 36px, name & email truncated with tooltip) */}
                    {isColumnVisible('customer') && (
                      <td className="px-4">
                        <div className="flex items-center gap-3 min-w-0 max-w-[240px]">
                          <Avatar
                            name={c.fullName}
                            size="md"
                            online={c.onlineStatus === 'online'}
                          />
                          <div className="min-w-0 flex-1">
                            <Tooltip content={c.fullName}>
                              <div className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-[#F26B3A] transition-colors truncate">
                                {c.fullName}
                              </div>
                            </Tooltip>
                            <Tooltip content={c.email}>
                              <div className="text-[11px] text-gray-400 dark:text-gray-500 truncate">
                                {c.email}
                              </div>
                            </Tooltip>
                          </div>
                        </div>
                      </td>
                    )}

                    {/* Plan */}
                    {isColumnVisible('plan') && (
                      <td className="px-4">
                        <div className="font-medium text-gray-800 dark:text-gray-200">
                          {c.planName}
                        </div>
                        <div className="text-[11px] text-gray-400">
                          {c.connectionType}
                        </div>
                      </td>
                    )}

                    {/* Price (Right-aligned, tabular-nums) */}
                    {isColumnVisible('price') && (
                      <td className="px-4 text-right font-medium text-gray-900 dark:text-gray-100 tabular-nums">
                        {currency}{c.monthlyPrice.toFixed(2)}
                      </td>
                    )}

                    {/* Usage Progress Bar (Fixed 96px width, 6px height, rounded-full) */}
                    {isColumnVisible('usage') && (
                      <td className="px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-24 bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden shrink-0">
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
                          <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums whitespace-nowrap">
                            {formatNumber(c.dataUsageGB)} GB
                            {c.dataCapGB ? ` / ${formatNumber(c.dataCapGB)}` : ''}
                          </span>
                        </div>
                      </td>
                    )}

                    {/* Due Amount (Right-aligned, tabular-nums) */}
                    {isColumnVisible('dueAmount') && (
                      <td className="px-4 text-right">
                        <span
                          className={cn(
                            'tabular-nums font-medium',
                            c.balanceDue > 0
                              ? 'text-red-600 dark:text-red-400 font-semibold'
                              : 'text-gray-500 dark:text-gray-400'
                          )}
                        >
                          {currency}{c.balanceDue.toFixed(2)}
                        </span>
                      </td>
                    )}

                    {/* Status Badge (Consistent 24px height, soft bg) */}
                    {isColumnVisible('status') && (
                      <td className="px-4">
                        <StatusChangePopover currentStatus={c.status} customerId={c.id} />
                      </td>
                    )}

                    {/* Rating */}
                    {isColumnVisible('rating') && (
                      <td className="px-4">
                        <div className="inline-flex items-center gap-1 font-medium text-amber-500">
                          <Star className="w-3.5 h-3.5 fill-amber-400 stroke-amber-400" />
                          <span className="text-gray-800 dark:text-gray-200 tabular-nums text-xs">
                            {c.rating.toFixed(1)}
                          </span>
                        </div>
                      </td>
                    )}

                    {/* Optional columns */}
                    {isColumnVisible('ipAddress') && (
                      <td className="px-4 font-mono text-[11px] text-gray-600 dark:text-gray-300">
                        {c.ipAddress}
                      </td>
                    )}
                    {isColumnVisible('city') && (
                      <td className="px-4 text-gray-600 dark:text-gray-300">{c.city}</td>
                    )}
                    {isColumnVisible('connectionType') && (
                      <td className="px-4 text-gray-600 dark:text-gray-300">{c.connectionType}</td>
                    )}
                    {isColumnVisible('installationDate') && (
                      <td className="px-4 text-gray-500 dark:text-gray-400 tabular-nums">
                        {c.installationDate}
                      </td>
                    )}

                    {/* Action Dropdown Menu (Only fully opaque on row hover/focus) */}
                    {isColumnVisible('action') && (
                      <td
                        onClick={(e) => e.stopPropagation()}
                        className="px-4 text-center w-14"
                      >
                        <div className="opacity-100 sm:opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                          <Dropdown
                            align="right"
                            trigger={
                              <button
                                type="button"
                                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                            }
                            items={[
                              {
                                label: 'View Full Details',
                                icon: <Eye className="w-3.5 h-3.5" />,
                                onClick: () => openDrawer(c.id),
                              },
                              {
                                label: 'Edit Profile',
                                icon: <Edit2 className="w-3.5 h-3.5" />,
                                onClick: () => openModal('addEditCustomer', { customerId: c.id }),
                              },
                              {
                                label:
                                  c.status === 'Suspended'
                                    ? 'Activate Connection'
                                    : 'Suspend Connection',
                                icon: <Power className="w-3.5 h-3.5" />,
                                onClick: () =>
                                  openModal('statusConfirmation', {
                                    customerIds: [c.id],
                                    targetStatus: c.status === 'Suspended' ? 'Active' : 'Suspended',
                                  }),
                              },
                              {
                                label: 'Record Payment',
                                icon: <CreditCard className="w-3.5 h-3.5" />,
                                onClick: () => openModal('recordPayment', { customerId: c.id }),
                              },
                              {
                                label: 'Send SMS / Email',
                                icon: <Mail className="w-3.5 h-3.5" />,
                                onClick: () =>
                                  openModal('sendMessage', { customerId: c.id, isBulk: false }),
                              },
                              {
                                label: 'Run Speed Test',
                                icon: <Zap className="w-3.5 h-3.5" />,
                                onClick: () => openModal('speedTest', { customerId: c.id }),
                              },
                              { divider: true, label: '' },
                              {
                                label: 'Delete Subscriber',
                                icon: <Trash2 className="w-3.5 h-3.5" />,
                                danger: true,
                                onClick: () =>
                                  openModal('deleteConfirmation', {
                                    customerIds: [c.id],
                                    isBulk: false,
                                  }),
                              },
                            ]}
                          />
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
