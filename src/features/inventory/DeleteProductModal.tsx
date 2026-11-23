import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';

export const DeleteProductModal: React.FC = () => {
  const modalState = useStore((s) => s.modalState.deleteProduct);
  const closeModal = useStore((s) => s.closeModal);
  const products = useStore((s) => s.products);
  const deleteProduct = useStore((s) => s.deleteProduct);

  const product = products.find((p) => p.id === modalState?.productId);

  const handleDelete = () => {
    if (product) {
      deleteProduct(product.id);
    }
    closeModal('deleteProduct');
  };

  return (
    <Modal
      isOpen={Boolean(modalState?.isOpen)}
      onClose={() => closeModal('deleteProduct')}
      title="Delete Product"
      subtitle="This item will be permanently removed from the catalog"
      icon={<AlertTriangle className="w-5 h-5" />}
      iconColor="red"
      size="sm"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => closeModal('deleteProduct')}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={handleDelete}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Delete Product
          </Button>
        </div>
      }
    >
      <div className="space-y-3 text-[13px] text-[var(--text-secondary)]">
        <p>
          Are you sure you want to delete{' '}
          <strong className="text-[var(--text)]">{product?.name}</strong> (
          <span className="font-mono text-[12px]">{product?.sku}</span>)?
        </p>

        {product && product.quantity > 0 && (
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-[12px] flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="font-semibold">Stock Warning</p>
              <p className="mt-0.5">
                This item currently has{' '}
                <strong className="font-bold">{product.quantity} units</strong> recorded in warehouse stock. Deleting it will clear its catalog record.
              </p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
