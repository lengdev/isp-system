import React from 'react';
import { CustomerStatus } from '../../types';
import { Badge } from '../../components/ui/Badge';
import { Popover } from '../../components/ui/Popover';
import { Check } from 'lucide-react';
import { useStore } from '../../store/useStore';

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
          className="w-52 p-1 space-y-1 select-none"
        >
          <div className="text-[11px] font-bold text-gray-400 dark:text-gray-500 px-2 py-1 uppercase tracking-wider">
            Change Status
          </div>
          {statuses.map(({ status, label }) => {
            const isSelected = status === currentStatus;
            return (
              <button
                key={status}
                onClick={() => setCustomerStatus(customerId, status)}
                className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors text-left ${
                  isSelected
                    ? 'bg-[#FFF1EA] dark:bg-[#F26B3A]/20 text-[#F26B3A] font-bold'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Badge status={status} size="sm" />
                {isSelected && <Check className="w-3.5 h-3.5 text-[#F26B3A]" />}
              </button>
            );
          })}
        </div>
      }
    />
  );
};
