import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CustomerStatus } from '../../types';
import { Badge } from '../../components/ui/Badge';
import { Popover } from '../../components/ui/Popover';
import { Check } from 'lucide-react';
import { useStore } from '../../store/useStore';
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
          <Badge status={currentStatus} dot />
        </button>
      }
      content={
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-52 p-1.5 flex flex-col gap-[2px] select-none rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] shadow-[var(--shadow-popover)]"
        >
          <div className="text-[11px] font-bold text-gray-400 dark:text-gray-500 px-2 py-1 uppercase tracking-wider">
            Change Status
          </div>
          {statuses.map(({ status }) => {
            const isSelected = status === currentStatus;
            return (
              <button
                key={status}
                onClick={() => setCustomerStatus(customerId, status)}
                className={cn(
                  'flex items-center justify-between w-full px-2.5 py-1.5 rounded-[8px] text-xs font-medium transition-colors duration-[120ms] text-left border select-none',
                  isSelected
                    ? 'bg-[var(--option-selected-bg)] text-[var(--option-selected-text)] border-[var(--option-selected-border)] hover:bg-[var(--option-selected-hover-bg)]'
                    : 'border-transparent text-[var(--text-secondary)] hover:bg-[var(--option-hover-bg)] hover:text-[var(--text)]'
                )}
              >
                <Badge status={status} size="sm" />
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
