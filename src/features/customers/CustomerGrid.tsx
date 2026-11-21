import React from 'react';
import { motion } from 'framer-motion';
import { Star, MoreHorizontal, Eye, Edit2, Power, CreditCard, Mail, Trash2, Zap } from 'lucide-react';
import { Customer } from '../../types';
import { useStore } from '../../store/useStore';
import { Avatar } from '../../components/ui/Avatar';
import { Dropdown } from '../../components/ui/Dropdown';
import { StatusChangePopover } from './StatusChangePopover';
import { Skeleton } from '../../components/ui/Skeleton';
import { Tooltip } from '../../components/ui/Tooltip';
import { formatNumber, cn } from '../../lib/utils';

interface CustomerGridProps {
  customers: Customer[];
}

export const CustomerGrid: React.FC<CustomerGridProps> = ({ customers }) => {
  const selectedIds = useStore((s) => s.selectedCustomerIds);
  const toggleSelectCustomer = useStore((s) => s.toggleSelectCustomer);
  const openDrawer = useStore((s) => s.openDrawer);
  const openModal = useStore((s) => s.openModal);
  const isLoading = useStore((s) => s.isLoading);
  const currency = useStore((s) => s.currency);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="p-5 rounded-2xl bg-white dark:bg-[#1C1C1F] border border-gray-200/80 dark:border-gray-800 space-y-3"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="w-9 h-9 rounded-full shrink-0" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="w-28 h-4 rounded" />
                <Skeleton className="w-40 h-3 rounded" />
              </div>
            </div>
            <Skeleton className="w-full h-8 rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {customers.map((c) => {
        const isSelected = selectedIds.includes(c.id);
        const usagePercent = c.dataCapGB
          ? Math.min(100, Math.round((c.dataUsageGB / c.dataCapGB) * 100))
          : Math.min(100, Math.round((c.dataUsageGB / 1000) * 100));

        return (
          <motion.div
            key={c.id}
            whileHover={{ y: -2 }}
            onClick={() => openDrawer(c.id)}
            className={cn(
              'relative p-5 rounded-2xl bg-white dark:bg-[#1C1C1F] border shadow-xs cursor-pointer transition-all flex flex-col justify-between select-none',
              isSelected
                ? 'border-[#F26B3A] bg-[#FFF6F2] dark:bg-orange-950/20 shadow-soft-hover'
                : 'border-gray-200/80 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
            )}
          >
            {/* Top row */}
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectCustomer(c.id)}
                      className="rounded border-gray-300 dark:border-gray-700 text-[#F26B3A] focus:ring-[#F26B3A]/30 w-4 h-4 cursor-pointer accent-[#F26B3A] mr-1"
                    />
                  </div>
                  <Avatar name={c.fullName} size="md" online={c.onlineStatus === 'online'} />
                  <div className="min-w-0">
                    <Tooltip content={c.fullName}>
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate hover:text-[#F26B3A] transition-colors">
                        {c.fullName}
                      </h4>
                    </Tooltip>
                    <Tooltip content={c.email}>
                      <p className="text-[11px] text-gray-400 truncate">{c.email}</p>
                    </Tooltip>
                  </div>
                </div>

                <div onClick={(e) => e.stopPropagation()}>
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
              </div>

              {/* Plan & Pricing */}
              <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800/80 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Plan:</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {c.planName}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Monthly Price:</span>
                  <span className="font-bold text-gray-900 dark:text-gray-100 tabular-nums">
                    {currency}{c.monthlyPrice.toFixed(2)}/mo
                  </span>
                </div>

                {/* Progress bar (Fixed 96px width or full width with threshold color) */}
                <div className="pt-1">
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-gray-400">Data usage</span>
                    <span className="font-medium text-gray-700 dark:text-gray-300 tabular-nums">
                      {formatNumber(c.dataUsageGB)} GB {c.dataCapGB ? `/ ${formatNumber(c.dataCapGB)} GB` : ''}
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
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
                </div>
              </div>
            </div>

            {/* Footer row: Status + Rating */}
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-between">
              <div onClick={(e) => e.stopPropagation()}>
                <StatusChangePopover currentStatus={c.status} customerId={c.id} />
              </div>

              <div className="flex items-center gap-1 font-medium text-amber-500 text-xs">
                <Star className="w-3.5 h-3.5 fill-amber-400 stroke-amber-400" />
                <span className="text-gray-800 dark:text-gray-200 tabular-nums font-semibold">
                  {c.rating.toFixed(1)}
                </span>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
