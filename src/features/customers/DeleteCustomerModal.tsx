import React, { useState } from 'react';
import { AlertTriangle, Trash2, Check } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Modal, ModalFooter } from '../../components/ui/Modal';
import { Field, Input } from '../../components/ui/Field';

export const DeleteCustomerModal: React.FC = () => {
  const modalState = useStore((s) => s.modalState.deleteConfirmation);
  const closeModal = useStore((s) => s.closeModal);
  const customers = useStore((s) => s.customers);
  const deleteCustomer = useStore((s) => s.deleteCustomer);
  const bulkDeleteCustomers = useStore((s) => s.bulkDeleteCustomers);
  const addToast = useStore((s) => s.addToast);

  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const { customerIds, isBulk } = modalState;

  const targetCustomer =
    !isBulk && customerIds.length > 0 ? customers.find((c) => c.id === customerIds[0]) : null;

  const isBulkBlocked = isBulk && customerIds.length > 1 && confirmText.trim() !== 'DELETE';

  const handleDelete = async () => {
    setIsDeleting(true);
    if (isBulk) {
      await bulkDeleteCustomers(customerIds);
    } else if (customerIds[0]) {
      await deleteCustomer(customerIds[0]);
    }
    setIsDeleting(false);
    setIsSuccess(true);

    setTimeout(() => {
      addToast({
        type: 'info',
        title: 'Subscriber Deleted',
        message: `${customerIds.length} subscriber account(s) permanently removed.`,
      });
      setConfirmText('');
      closeModal('deleteConfirmation');
    }, 600);
  };

  return (
    <Modal
      isOpen={modalState.isOpen}
      onClose={() => {
        setConfirmText('');
        closeModal('deleteConfirmation');
      }}
      size="sm"
      icon={<AlertTriangle className="w-5 h-5" />}
      iconColor="red"
      title={isBulk ? 'Confirm Bulk Deletion' : 'Delete Subscriber'}
      subtitle="This action is permanent and cannot be undone"
      footer={
        <ModalFooter
          onCancel={() => {
            setConfirmText('');
            closeModal('deleteConfirmation');
          }}
          onSubmit={handleDelete}
          submitText="Delete Permanently"
          submitVariant="danger"
          submitIcon={<Trash2 className="w-4 h-4" />}
          isSubmitting={isDeleting}
          isSuccess={isSuccess}
          submitDisabled={isBulkBlocked}
        />
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {isBulk ? (
            <>
              You are about to permanently remove{' '}
              <strong className="font-semibold text-gray-900 dark:text-gray-100">
                {customerIds.length}
              </strong>{' '}
              subscriber accounts. This will detach all ONT assignments and archive billing history.
            </>
          ) : (
            <>
              Are you sure you want to delete subscriber{' '}
              <strong className="font-semibold text-gray-900 dark:text-gray-100">
                {targetCustomer?.fullName} ({targetCustomer?.code})
              </strong>
              ?
            </>
          )}
        </p>

        {isBulk && customerIds.length > 1 && (
          <div className="p-3.5 rounded-xl bg-red-50/70 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 space-y-2">
            <span className="text-xs font-semibold text-red-600 dark:text-red-400 block">
              Safety confirmation required
            </span>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Please type <strong className="font-mono text-red-600 font-bold">DELETE</strong> below to unlock:
            </p>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
              className="font-mono text-xs uppercase"
            />
          </div>
        )}
      </div>
    </Modal>
  );
};
