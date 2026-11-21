import React, { useState } from 'react';
import { Power, CheckCircle2 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Combobox, ComboboxOption } from '../../components/ui/Combobox';

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
  const targetCustomer =
    customerIds.length === 1 ? customers.find((c) => c.id === customerIds[0]) : null;

  const reasonOptions: ComboboxOption[] = [
    { value: 'Non-payment / Past Due', label: 'Non-payment / Past Due balance' },
    { value: 'Customer Seasonal Hold', label: 'Customer Seasonal Hold / Vacation' },
    { value: 'Violation of Acceptable Use Policy', label: 'Terms of Service / AUP Violation' },
    { value: 'Equipment Failure / Optical Line Cut', label: 'Hardware Failure / Optical Line Cut' },
    { value: 'Administrative Maintenance', label: 'Administrative Maintenance Hold' },
  ];

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
          <span>{isSuspend ? 'Suspend Connection' : 'Activate Connection'}</span>
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
              Suspension Reason (Creatable)
            </label>
            <Combobox
              options={reasonOptions}
              value={reason}
              onChange={(val) => setReason(val as string)}
              creatable={true}
              size="lg"
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100 dark:border-gray-800">
          <Button
            size="sm"
            variant="outline"
            onClick={() => closeModal('statusConfirmation')}
            className="h-9 px-3.5"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            variant="primary"
            isLoading={isSubmitting}
            onClick={handleConfirm}
            className="h-9 px-4 font-semibold"
          >
            <span>Confirm {targetStatus}</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
};
