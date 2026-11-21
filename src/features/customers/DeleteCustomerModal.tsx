import React, { useState } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';

export const DeleteCustomerModal: React.FC = () => {
  const modalState = useStore((s) => s.modalState.deleteConfirmation);
  const closeModal = useStore((s) => s.closeModal);
  const customers = useStore((s) => s.customers);
  const deleteCustomer = useStore((s) => s.deleteCustomer);
  const bulkDeleteCustomers = useStore((s) => s.bulkDeleteCustomers);

  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const { customerIds, isBulk } = modalState;

  const targetCustomer =
    !isBulk && customerIds.length > 0 ? customers.find((c) => c.id === customerIds[0]) : null;

  const handleDelete = async () => {
    setIsDeleting(true);
    if (isBulk) {
      await bulkDeleteCustomers(customerIds);
    } else if (customerIds[0]) {
      await deleteCustomer(customerIds[0]);
    }
    setIsDeleting(false);
    setConfirmText('');
    closeModal('deleteConfirmation');
  };

  const isBulkBlocked = isBulk && customerIds.length > 1 && confirmText.trim() !== 'DELETE';

  return (
    <Modal
      isOpen={modalState.isOpen}
      onClose={() => {
        setConfirmText('');
        closeModal('deleteConfirmation');
      }}
      title={
        <div className="flex items-center gap-2 text-red-600">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{isBulk ? 'Confirm Bulk Deletion' : 'Delete Subscriber'}</span>
        </div>
      }
      size="sm"
    >
      <div className="space-y-4 text-xs">
        <p className="text-gray-600 dark:text-gray-300">
          {isBulk ? (
            <>
              You are about to delete{' '}
              <strong className="text-gray-900 dark:text-gray-100">{customerIds.length}</strong>{' '}
              subscriber accounts. This will detach all ONT assignments and archive billing history.
            </>
          ) : (
            <>
              Are you sure you want to delete subscriber{' '}
              <strong className="text-gray-900 dark:text-gray-100">
                {targetCustomer?.fullName} ({targetCustomer?.code})
              </strong>
              ?
            </>
          )}
        </p>

        {isBulk && customerIds.length > 1 && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 space-y-1.5">
            <span className="font-bold text-red-600 block">Safety confirmation required:</span>
            <p className="text-[11px] text-gray-500">
              Please type <strong className="font-mono text-red-600">DELETE</strong> below to confirm.
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
              className="w-full p-2 text-xs rounded-lg border border-red-300 dark:border-red-900/60 bg-white dark:bg-[#18181B] font-mono text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-red-500 uppercase"
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100 dark:border-gray-800">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setConfirmText('');
              closeModal('deleteConfirmation');
            }}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            variant="danger"
            isLoading={isDeleting}
            disabled={isBulkBlocked}
            onClick={handleDelete}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Confirm Deletion</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
};
