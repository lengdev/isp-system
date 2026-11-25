import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CustomerStatus } from '../../types';
import { Chip } from '../../components/ui/Chip';
import { Popover } from '../../components/ui/Popover';
import { Check } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useCan } from '../../lib/permissions';
import { cn } from '../../lib/utils';

interface StatusChangePopoverProps {
  currentStatus: CustomerStatus;
  customerId: string;
}

export const StatusChangePopover: React.FC<StatusChangePopoverProps> = ({
  currentStatus,
  customerId,
}) => {
  const setCustomerStatus = useStore((s) => s.setCustomerStatus);
  const canEditCustomer = useCan('customers.btn.edit');

  if (!canEditCustomer) {
    return <Chip status={currentStatus} variant="dot" size="sm" />;
  }

  const statuses: { status: CustomerStatus; label: string }[] = [
    { status: 'Active', label: 'Active (Connected)' },
    { status: 'Suspended', label: 'Suspended (Blocked)' },
    { status: 'Overdue', label: 'Overdue (Payment Pending)' },
    { status: 'Pending', label: 'Pending (Provisioning)' },
    { status: 'Disconnected', label: 'Disconnected (Cancelled)' },
  ];

  return (
    <Popover
      align="center"
      trigger={
        <button
          onClick={(e) => e.stopPropagation()}
          className="cursor-pointer transition-transform hover:scale-105 active:scale-95"
          title="Click to change status"
        >
          <Chip status={currentStatus} variant="dot" size="sm" />
        </button>
      }
      content={
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-52 p-1.5 flex flex-col gap-[2px] select-none"
        >
          <div className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 px-2 py-1 uppercase tracking-wider">
            Change Status
          </div>
          {statuses.map(({ status }) => {
            const isSelected = status === currentStatus;
            return (
              <button
                key={status}
                onClick={() => setCustomerStatus(customerId, status)}
                className={cn(
                  'flex items-center justify-between w-full px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors duration-150 text-left border select-none cursor-pointer',
                  isSelected
                    ? 'bg-[var(--option-selected-bg)] text-[var(--option-selected-text)] border-[var(--option-selected-border)] hover:bg-[var(--option-selected-hover-bg)]'
                    : 'border-transparent text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/[0.08] hover:text-zinc-900 dark:hover:text-white'
                )}
              >
                <Chip status={status} size="sm" />
                <div className="w-4 h-4 ml-2 shrink-0 flex items-center justify-center">
                  <AnimatePresence>
                    {isSelected && (
                      <motion.div
                        key="status-check"
                        initial={{ scale: 0.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.6, opacity: 0 }}
                        transition={{ duration: 0.12 }}
                        className="flex items-center justify-center"
                      >
                        <Check className="w-4 h-4 text-[var(--option-selected-icon)] stroke-[2]" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </button>
            );
          })}
        </div>
      }
    />
  );
};
