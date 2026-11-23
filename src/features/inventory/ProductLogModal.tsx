import React, { useState } from 'react';
import { History, Plus, Minus, ArrowUpRight, ArrowDownRight, RefreshCw, User, Calendar, Tag, AlertCircle } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Chip, ChipColor } from '../../components/ui/Chip';
import { Field, Input } from '../../components/ui/Field';
import { cn } from '../../lib/utils';

export const ProductLogModal: React.FC = () => {
  const modalState = useStore((s) => s.modalState.productLog);
  const closeModal = useStore((s) => s.closeModal);
  const products = useStore((s) => s.products);
  const productLogs = useStore((s) => s.productLogs);
  const updateProduct = useStore((s) => s.updateProduct);
  const addProductLog = useStore((s) => s.addProductLog);

  const product = products.find((p) => p.id === modalState?.productId);

  // Quick stock adjustment state
  const [showAdjust, setShowAdjust] = useState(false);
  const [adjustType, setAdjustType] = useState<'in' | 'out'>('in');
  const [adjustQty, setAdjustQty] = useState(5);
  const [adjustReason, setAdjustReason] = useState('');

  // Filter logs for this product (or all if general)
  const logs = product
    ? productLogs.filter((l) => l.productId === product.id)
    : [];

  const handleAdjustStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || adjustQty <= 0) return;

    const diff = adjustType === 'in' ? adjustQty : -adjustQty;
    const newQty = Math.max(0, product.quantity + diff);

    updateProduct(product.id, { quantity: newQty });

    addProductLog({
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      action: adjustType === 'in' ? 'Stock In' : 'Stock Out',
      change: `${diff > 0 ? '+' : ''}${diff} units (${product.quantity} -> ${newQty})`,
      previousQuantity: product.quantity,
      newQuantity: newQty,
      actor: 'Admin (Hariharan B)',
      reason: adjustReason.trim() || (adjustType === 'in' ? 'Stock replenished' : 'Field deployment / RMA replacement'),
    });

    setShowAdjust(false);
    setAdjustQty(5);
    setAdjustReason('');
  };

  const getActionChipColor = (action: string): ChipColor => {
    switch (action) {
      case 'Created':
        return 'primary';
      case 'Stock In':
        return 'success';
      case 'Stock Out':
        return 'warning';
      case 'Price Changed':
        return 'secondary';
      case 'Deleted':
        return 'danger';
      default:
        return 'default';
    }
  };

  return (
    <Modal
      isOpen={Boolean(modalState?.isOpen)}
      onClose={() => {
        setShowAdjust(false);
        closeModal('productLog');
      }}
      title="Product Activity & Stock Log"
      subtitle={
        product
          ? `${product.name} (${product.sku}) • Current Stock: ${product.quantity} units`
          : 'Audit trail of inventory movements and updates'
      }
      icon={<History className="w-5 h-5" />}
      iconColor="orange"
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowAdjust(!showAdjust)}
          >
            {showAdjust ? 'Cancel Adjustment' : '+ Adjust Stock'}
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => {
              setShowAdjust(false);
              closeModal('productLog');
            }}
          >
            Close
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Quick Stock Adjustment Expandable Section */}
        {showAdjust && product && (
          <form
            onSubmit={handleAdjustStock}
            className="p-3.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border)] space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold text-[var(--text)]">
                Record Stock Movement
              </span>
              <div className="inline-flex rounded-lg border border-[var(--border)] p-0.5 bg-[var(--surface)] text-[12px]">
                <button
                  type="button"
                  onClick={() => setAdjustType('in')}
                  className={cn(
                    'px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1',
                    adjustType === 'in'
                      ? 'bg-emerald-600 text-white'
                      : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                  )}
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  Stock In
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustType('out')}
                  className={cn(
                    'px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1',
                    adjustType === 'out'
                      ? 'bg-amber-600 text-white'
                      : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                  )}
                >
                  <ArrowDownRight className="w-3.5 h-3.5" />
                  Stock Out
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Quantity Units" required>
                <Input
                  type="number"
                  min="1"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(parseInt(e.target.value, 10) || 1)}
                />
              </Field>

              <Field label="Reason / Reference">
                <Input
                  placeholder="e.g. Shipment PO-8849, Field RMA return..."
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                />
              </Field>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                className="h-8 px-3 text-[12px]"
              >
                Save Adjustment
              </Button>
            </div>
          </form>
        )}

        {/* Timeline Log List */}
        <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
          {logs.length === 0 ? (
            <div className="text-center py-8 text-[var(--text-muted)]">
              <History className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-[13px] font-medium">No activity logged for this item yet.</p>
              <p className="text-[12px] opacity-75 mt-0.5">
                Stock movements, price adjustments, and updates will appear here.
              </p>
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)] transition-colors flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Chip size="sm" variant="flat" color={getActionChipColor(log.action)} className="text-[11px] font-semibold">
                      {log.action}
                    </Chip>
                    {log.change && (
                      <span className="text-[12px] font-semibold text-[var(--text)] tabular-nums">
                        {log.change}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {log.timestamp}
                  </span>
                </div>

                {log.reason && (
                  <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed">
                    {log.reason}
                  </p>
                )}

                <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] pt-0.5">
                  <User className="w-3 h-3" />
                  <span>Logged by:</span>
                  <span className="font-medium text-[var(--text)]">{log.actor}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
};
