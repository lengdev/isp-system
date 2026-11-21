import React, { useState } from 'react';
import { Power, CheckCircle2, AlertTriangle, Check } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Modal, ModalFooter } from '../../components/ui/Modal';
import { Field } from '../../components/ui/Field';
import { Combobox, ComboboxOption } from '../../components/ui/Combobox';

export const StatusConfirmationModal: React.FC = () => {
  const modalState = useStore((s) => s.modalState.statusConfirmation);
  const closeModal = useStore((s) => s.closeModal);
  const bulkSetCustomerStatus = useStore((s) => s.bulkSetCustomerStatus);
  const setCustomerStatus = useStore((s) => s.setCustomerStatus);
  const customers = useStore((s) => s.customers);
  const addToast = useStore((s) => s.addToast);

  const { customerIds, targetStatus } = modalState;
  const [reason, setReason] = useState('Non-payment / Past Due');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const isSuspend = targetStatus === 'Suspended';
  const targetCustomer =
    customerIds.length === 1 ? customers.find((c) => c.id === customerIds[0]) : null;

  // Split label vs description
  const reasonOptions: ComboboxOption[] = [
    { value: 'Non-payment / Past Due', label: 'Non-payment', description: 'Overdue balance past grace period' },
    { value: 'Seasonal Hold', label: 'Seasonal Vacation Hold', description: 'Customer requested pause' },
    { value: 'Violation of AUP', label: 'ToS / AUP Violation', description: 'Security abuse or terms breach' },
    { value: 'Hardware Failure', label: 'Equipment Failure', description: 'ONT line cut or faulty optics' },
    { value: 'Maintenance Hold', label: 'Maintenance Hold', description: 'Temporary operational freeze' },
  ];

  const handleConfirm = async () => {
    setIsSubmitting(true);
    if (customerIds.length === 1) {
      await setCustomerStatus(customerIds[0], targetStatus, reason);
    } else {
      await bulkSetCustomerStatus(customerIds, targetStatus, reason);
    }
    setIsSubmitting(false);
    setIsSuccess(true);

    setTimeout(() => {
      addToast({
        type: isSuspend ? 'warning' : 'success',
        title: isSuspend ? 'Service Suspended' : 'Service Activated',
        message: `${customerIds.length} account${customerIds.length === 1 ? '' : 's'} set to ${targetStatus}.`,
      });
      closeModal('statusConfirmation');
    }, 600);
  };

  return (
    <Modal
      isOpen={modalState.isOpen}
      onClose={() => closeModal('statusConfirmation')}
      size="sm"
      icon={
        isSuspend ? (
          <Power className="w-5 h-5" />
        ) : (
          <CheckCircle2 className="w-5 h-5" />
        )
      }
      iconColor={isSuspend ? 'amber' : 'green'}
      title={isSuspend ? 'Suspend Connection' : 'Activate Connection'}
      subtitle={`Update status to ${targetStatus} for subscriber account${customerIds.length === 1 ? '' : 's'}`}
      footer={
        <ModalFooter
          onCancel={() => closeModal('statusConfirmation')}
          onSubmit={handleConfirm}
          submitText={isSuspend ? 'Suspend Connection' : 'Activate Connection'}
          submitVariant={isSuspend ? 'danger' : 'primary'}
          isSubmitting={isSubmitting}
          isSuccess={isSuccess}
        />
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {customerIds.length === 1 ? (
            <>
              Change connection status to <strong className="font-semibold text-gray-900 dark:text-gray-100">{targetStatus}</strong> for{' '}
              <strong className="font-semibold text-gray-900 dark:text-gray-100">{targetCustomer?.fullName}</strong> ({targetCustomer?.code}).
            </>
          ) : (
            <>
              Update connection status to <strong className="font-semibold text-gray-900 dark:text-gray-100">{targetStatus}</strong> for{' '}
              <strong className="font-semibold text-gray-900 dark:text-gray-100">{customerIds.length}</strong> selected subscriber accounts.
            </>
          )}
        </p>

        {isSuspend && (
          <Field label="Suspension reason" helperText="Recorded in subscriber audit trail">
            <Combobox
              options={reasonOptions}
              value={reason}
              onChange={(val) => setReason(val as string)}
              creatable={true}
              size="md"
            />
          </Field>
        )}
      </div>
    </Modal>
  );
};
