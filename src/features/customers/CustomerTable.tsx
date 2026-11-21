import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
import { formatCurrency, cn } from '../../lib/utils';

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
      return <ArrowUpDown className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />;
    }
    return sort.direction === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-[#F26B3A]" />
    ) : (
      <ArrowDown className="w-3 h-3 text-[#F26B3A]" />
    );
  };

  const isCompact = viewMode === 'compact';

  return (
    <div className="w-full overflow-x-auto rounded-2xl bg-white dark:bg-[#1C1C1F] border border-gray-200/80 dark:border-gray-800 shadow-soft select-none">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20 text-xs font-semibold text-gray-500 dark:text-gray-400">
            {/* Checkbox */}
            {isColumnVisible('select') && (
              <th className="py-3.5 px-4 w-12 text-center">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  ref={(input) => {
                    if (input) input.indeterminate = isSomeSelected;
                  }}
                  onChange={() => selectAllCustomers(allPageCustomerIds)}
                  className="rounded border-gray-300 dark:border-gray-700 text-[#F26B3A] focus:ring-[#F26B3A]/40 w-4 h-4 cursor-pointer accent-[#F26B3A]"
                />
              </th>
            )}

            {/* Customer */}
            {isColumnVisible('customer') && (
              <th
                onClick={() => setSort('fullName')}
                className="py-3.5 px-4 cursor-pointer group hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
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
                className="py-3.5 px-4 cursor-pointer group hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
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
                className="py-3.5 px-4 cursor-pointer group hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Price</span>
                  {renderSortIcon('monthlyPrice')}
                </div>
              </th>
            )}

            {/* Usage */}
            {isColumnVisible('usage') && (
              <th
                onClick={() => setSort('dataUsageGB')}
                className="py-3.5 px-4 cursor-pointer group hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
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
                className="py-3.5 px-4 cursor-pointer group hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Due Amount</span>
                  {renderSortIcon('balanceDue')}
                </div>
              </th>
            )}

            {/* Status */}
            {isColumnVisible('status') && (
              <th
                onClick={() => setSort('status')}
                className="py-3.5 px-4 cursor-pointer group hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
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
                className="py-3.5 px-4 cursor-pointer group hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Rating</span>
                  {renderSortIcon('rating')}
                </div>
              </th>
            )}

            {/* Optional Columns */}
            {isColumnVisible('ipAddress') && <th className="py-3.5 px-4">IP Address</th>}
            {isColumnVisible('city') && <th className="py-3.5 px-4">City</th>}
            {isColumnVisible('connectionType') && <th className="py-3.5 px-4">Type</th>}
            {isColumnVisible('installationDate') && <th className="py-3.5 px-4">Install Date</th>}

            {/* Action */}
            {isColumnVisible('action') && <th className="py-3.5 px-4 text-center w-16">Action</th>}
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60 text-xs">
          {isLoading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <tr key={`skel-${i}`} className="animate-pulse">
                {isColumnVisible('select') && (
                  <td className="py-4 px-4 text-center">
                    <Skeleton className="w-4 h-4 mx-auto rounded" />
                  </td>
                )}
                {isColumnVisible('customer') && (
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-8 h-8 rounded-full" />
                      <div className="space-y-1.5">
                        <Skeleton className="w-28 h-3.5 rounded" />
                        <Skeleton className="w-36 h-2.5 rounded" />
                      </div>
                    </div>
                  </td>
                )}
                {isColumnVisible('plan') && (
                  <td className="py-4 px-4">
                    <Skeleton className="w-24 h-4 rounded" />
                  </td>
                )}
                {isColumnVisible('price') && (
                  <td className="py-4 px-4">
                    <Skeleton className="w-14 h-4 rounded" />
                  </td>
                )}
                {isColumnVisible('usage') && (
                  <td className="py-4 px-4">
                    <Skeleton className="w-20 h-4 rounded" />
                  </td>
                )}
                {isColumnVisible('dueAmount') && (
                  <td className="py-4 px-4">
                    <Skeleton className="w-12 h-4 rounded" />
                  </td>
                )}
                {isColumnVisible('status') && (
                  <td className="py-4 px-4">
                    <Skeleton className="w-16 h-5 rounded-full" />
                  </td>
                )}
                {isColumnVisible('rating') && (
                  <td className="py-4 px-4">
                    <Skeleton className="w-10 h-4 rounded" />
                  </td>
                )}
                {isColumnVisible('action') && (
                  <td className="py-4 px-4 text-center">
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
                  <div className="w-14 h-14 rounded-2xl bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center text-[#F26B3A] mb-3">
                    <HardDrive className="w-7 h-7" />
                  </div>
                  <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-1">
                    No subscribers found
                  </h4>
                  <p className="text-xs text-gray-500 max-w-sm">
                    No customer records matched your query or active filters.
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
                    'transition-colors cursor-pointer group',
                    // Selected row is tinted soft orange matching screenshot!
                    isSelected
                      ? 'bg-[#FFF6F2] dark:bg-orange-950/25 border-l-4 border-l-[#F26B3A]'
                      : 'hover:bg-gray-50/70 dark:hover:bg-gray-800/40'
                  )}
                >
                  {/* Row Checkbox */}
                  {isColumnVisible('select') && (
                    <td
                      onClick={(e) => e.stopPropagation()}
                      className={cn('px-4 text-center', isCompact ? 'py-2.5' : 'py-3.5')}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectCustomer(c.id)}
                        className="rounded border-gray-300 dark:border-gray-700 text-[#F26B3A] focus:ring-[#F26B3A]/40 w-4 h-4 cursor-pointer accent-[#F26B3A]"
                      />
                    </td>
                  )}

                  {/* Customer Avatar & Info */}
                  {isColumnVisible('customer') && (
                    <td className={cn('px-4', isCompact ? 'py-2.5' : 'py-3.5')}>
                      <div className="flex items-center gap-3">
                        <Avatar
                          name={c.fullName}
                          size="md"
                          online={c.onlineStatus === 'online'}
                        />
                        <div className="min-w-0">
                          <div className="font-bold text-gray-900 dark:text-gray-100 group-hover:text-[#F26B3A] transition-colors truncate">
                            {c.fullName}
                          </div>
                          <div className="text-[11px] text-gray-400 dark:text-gray-500 truncate">
                            {c.email}
                          </div>
                        </div>
                      </div>
                    </td>
                  )}

                  {/* Plan */}
                  {isColumnVisible('plan') && (
                    <td className={cn('px-4', isCompact ? 'py-2.5' : 'py-3.5')}>
                      <span className="font-medium text-gray-800 dark:text-gray-200">
                        {c.planName}
                      </span>
                      <span className="text-[10px] text-gray-400 block">
                        {c.connectionType}
                      </span>
                    </td>
                  )}

                  {/* Monthly Price */}
                  {isColumnVisible('price') && (
                    <td className={cn('px-4 font-semibold text-gray-900 dark:text-gray-100', isCompact ? 'py-2.5' : 'py-3.5')}>
                      {currency}{c.monthlyPrice.toFixed(2)}
                    </td>
                  )}

                  {/* Usage */}
                  {isColumnVisible('usage') && (
                    <td className={cn('px-4', isCompact ? 'py-2.5' : 'py-3.5')}>
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all duration-300',
                              usagePercent > 90
                                ? 'bg-red-500'
                                : usagePercent > 70
                                ? 'bg-amber-500'
                                : 'bg-[#F26B3A]'
                            )}
                            style={{ width: `${usagePercent}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap">
                          {c.dataUsageGB} GB
                          {c.dataCapGB ? ` / ${c.dataCapGB}` : ''}
                        </span>
                      </div>
                    </td>
                  )}

                  {/* Due Amount */}
                  {isColumnVisible('dueAmount') && (
                    <td className={cn('px-4', isCompact ? 'py-2.5' : 'py-3.5')}>
                      <span
                        className={cn(
                          'font-semibold',
                          c.balanceDue > 0
                            ? 'text-red-600 dark:text-red-400 font-bold'
                            : 'text-gray-500 dark:text-gray-400'
                        )}
                      >
                        {currency}{c.balanceDue.toFixed(2)}
                      </span>
                    </td>
                  )}

                  {/* Status Badge with inline popover */}
                  {isColumnVisible('status') && (
                    <td className={cn('px-4', isCompact ? 'py-2.5' : 'py-3.5')}>
                      <StatusChangePopover currentStatus={c.status} customerId={c.id} />
                    </td>
                  )}

                  {/* Rating */}
                  {isColumnVisible('rating') && (
                    <td className={cn('px-4', isCompact ? 'py-2.5' : 'py-3.5')}>
                      <div className="inline-flex items-center gap-1 font-semibold text-amber-500">
                        <Star className="w-3.5 h-3.5 fill-amber-400 stroke-amber-400" />
                        <span className="text-gray-800 dark:text-gray-200 text-xs">
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
                    <td className="px-4 text-gray-500 dark:text-gray-400">{c.installationDate}</td>
                  )}

                  {/* Action Dropdown Menu */}
                  {isColumnVisible('action') && (
                    <td
                      onClick={(e) => e.stopPropagation()}
                      className={cn('px-4 text-center', isCompact ? 'py-2.5' : 'py-3.5')}
                    >
                      <Dropdown
                        align="right"
                        trigger={
                          <button className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
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
                            label: c.status === 'Suspended' ? 'Activate Connection' : 'Suspend Connection',
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
                            onClick: () => openModal('sendMessage', { customerId: c.id, isBulk: false }),
                          },
                          {
                            label: 'Run Speed Test (Mock)',
                            icon: <Zap className="w-3.5 h-3.5" />,
                            onClick: () => openModal('speedTest', { customerId: c.id }),
                          },
                          {
                            divider: true,
                            label: '',
                          },
                          {
                            label: 'Delete Subscriber',
                            icon: <Trash2 className="w-3.5 h-3.5" />,
                            danger: true,
                            onClick: () =>
                              openModal('deleteConfirmation', { customerIds: [c.id], isBulk: false }),
                          },
                        ]}
                      />
                    </td>
                  )}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};
