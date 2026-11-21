import React from 'react';
import { motion } from 'framer-motion';
import { Star, MoreHorizontal, Eye, Edit2, Power, CreditCard, Mail, Trash2, Zap } from 'lucide-react';
import { Customer } from '../../types';
import { useStore } from '../../store/useStore';
import { Avatar } from '../../components/ui/Avatar';
import { Dropdown } from '../../components/ui/Dropdown';
import { StatusChangePopover } from './StatusChangePopover';
import { Skeleton } from '../../components/ui/Skeleton';
import { cn } from '../../lib/utils';

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="p-4 rounded-2xl bg-white dark:bg-[#1C1C1F] border border-gray-200/80 dark:border-gray-800 space-y-3"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-full" />
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
              'relative p-4 rounded-2xl bg-white dark:bg-[#1C1C1F] border shadow-soft cursor-pointer transition-all',
              isSelected
                ? 'border-[#F26B3A] bg-[#FFF6F2] dark:bg-orange-950/20 shadow-soft-hover'
                : 'border-gray-200/80 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
            )}
          >
            {/* Top row */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelectCustomer(c.id)}
                    className="rounded border-gray-300 dark:border-gray-700 text-[#F26B3A] focus:ring-[#F26B3A]/40 w-4 h-4 cursor-pointer accent-[#F26B3A] mr-1"
                  />
                </div>
                <Avatar name={c.fullName} size="md" online={c.onlineStatus === 'online'} />
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate hover:text-[#F26B3A]">
                    {c.fullName}
                  </h4>
                  <p className="text-[11px] text-gray-400 truncate">{c.email}</p>
                </div>
              </div>

              <div onClick={(e) => e.stopPropagation()}>
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
              </div>
            </div>

            {/* Details */}
            <div className="mt-3.5 pt-3 border-t border-gray-100 dark:border-gray-800/80 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-gray-400">Plan:</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">
                  {c.planName}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-gray-400">Monthly Price:</span>
                <span className="font-bold text-gray-900 dark:text-gray-100">
                  {currency}{c.monthlyPrice.toFixed(2)}/mo
                </span>
              </div>

              {/* Bandwidth Usage Progress */}
              <div className="pt-1">
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-gray-400">Data Usage</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {c.dataUsageGB} GB {c.dataCapGB ? `/ ${c.dataCapGB} GB` : ''}
                  </span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full',
                      usagePercent > 90 ? 'bg-red-500' : 'bg-[#F26B3A]'
                    )}
                    style={{ width: `${usagePercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Footer row: Status + Rating + IP */}
            <div className="mt-3.5 pt-3 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-between">
              <div onClick={(e) => e.stopPropagation()}>
                <StatusChangePopover currentStatus={c.status} customerId={c.id} />
              </div>

              <div className="flex items-center gap-1 font-semibold text-amber-500 text-xs">
                <Star className="w-3.5 h-3.5 fill-amber-400 stroke-amber-400" />
                <span className="text-gray-800 dark:text-gray-200">{c.rating.toFixed(1)}</span>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
