import React, { useState } from 'react';
import { Power, CheckCircle2 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';

export const StatusConfirmationModal: React.FC = () => {
  const modalState = useStore((s) => s.modalState.statusConfirmation);
  const closeModal = useStore((s) => s.closeModal);
  const bulkSetCustomerStatus = useStore((s) => s.bulkSetCustomerStatus);
  const setCustomerStatus = useStore((s) => s.setCustomerStatus);
  const customers = useStore((s) => s.customers);

  const { customerIds, targetStatus } = modalState;
  const [reason, setReason] = useState('Non-payment / Past Due');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSuspend = targetStatus === 'Suspended';
  const targetCustomer = customerIds.length === 1 ? customers.find((c) => c.id === customerIds[0]) : null;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    if (customerIds.length === 1) {
      await setCustomerStatus(customerIds[0], targetStatus, reason);
    } else {
      await bulkSetCustomerStatus(customerIds, targetStatus, reason);
    }
    setIsSubmitting(false);
    closeModal('statusConfirmation');
  };

  return (
    <Modal
      isOpen={modalState.isOpen}
      onClose={() => closeModal('statusConfirmation')}
      title={
        <div className="flex items-center gap-2">
          {isSuspend ? (
            <Power className="w-5 h-5 text-amber-500" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          )}
          <span>
            {isSuspend ? 'Suspend Connection' : 'Activate Connection'}
          </span>
        </div>
      }
      size="sm"
    >
      <div className="space-y-4 text-xs">
        <p className="text-gray-600 dark:text-gray-300">
          {customerIds.length === 1 ? (
            <>
              Change status to <strong className="font-bold">{targetStatus}</strong> for subscriber{' '}
              <strong>{targetCustomer?.fullName}</strong>.
            </>
          ) : (
            <>
              Update status to <strong className="font-bold">{targetStatus}</strong> for{' '}
              <strong>{customerIds.length}</strong> selected subscribers.
            </>
          )}
        </p>

        {isSuspend && (
          <div>
            <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">
              Suspension Reason
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#18181B] text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#F26B3A]"
            >
              <option value="Non-payment / Past Due">Non-payment / Past Due balance</option>
              <option value="Customer Seasonal Hold">Customer Seasonal Hold / Vacation</option>
              <option value="Violation of Acceptable Use Policy">Terms of Service / AUP Violation</option>
              <option value="Equipment Failure / Optical Line Cut">Hardware Failure / Optical Line Cut</option>
              <option value="Administrative Maintenance">Administrative Hold</option>
            </select>
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100 dark:border-gray-800">
          <Button size="sm" variant="outline" onClick={() => closeModal('statusConfirmation')}>
            Cancel
          </Button>
          <Button
            size="sm"
            variant={isSuspend ? 'primary' : 'primary'}
            isLoading={isSubmitting}
            onClick={handleConfirm}
          >
            <span>Confirm {targetStatus}</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
};
