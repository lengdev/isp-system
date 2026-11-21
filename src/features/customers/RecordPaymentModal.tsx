import React, { useState, useEffect, useMemo } from 'react';
import { CreditCard, Check, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Modal, ModalFooter } from '../../components/ui/Modal';
import { Field, Input } from '../../components/ui/Field';
import { Combobox, ComboboxOption } from '../../components/ui/Combobox';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';

export const RecordPaymentModal: React.FC = () => {
  const modalState = useStore((s) => s.modalState.recordPayment);
  const closeModal = useStore((s) => s.closeModal);
  const customers = useStore((s) => s.customers);
  const recordPayment = useStore((s) => s.recordPayment);
  const currency = useStore((s) => s.currency);
  const addToast = useStore((s) => s.addToast);

  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [amount, setAmount] = useState<number | string>(54.99);
  const [initialAmount, setInitialAmount] = useState<number | string>(54.99);
  const [method, setMethod] = useState('Credit Card');
  const [reference, setReference] = useState('');
  const [initialReference, setInitialReference] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === selectedCustomerId),
    [customers, selectedCustomerId]
  );

  useEffect(() => {
    if (modalState.isOpen) {
      let initAmt = 54.99;
      if (modalState.customerId) {
        setSelectedCustomerId(modalState.customerId);
        const c = customers.find((cust) => cust.id === modalState.customerId);
        if (c) {
          initAmt = c.balanceDue > 0 ? c.balanceDue : c.monthlyPrice;
        }
      } else if (customers.length > 0) {
        setSelectedCustomerId(customers[0].id);
        initAmt = customers[0].balanceDue > 0 ? customers[0].balanceDue : customers[0].monthlyPrice;
      }
      const initRef = `TXN-${Math.floor(100000 + Math.random() * 900000)}`;
      setAmount(initAmt);
      setInitialAmount(initAmt);
      setReference(initRef);
      setInitialReference(initRef);
      setIsSubmitting(false);
      setIsSuccess(false);
      setIsDirty(false);
    }
  }, [modalState.isOpen, modalState.customerId, customers]);

  const customerOptions: ComboboxOption[] = useMemo(() => {
    return customers.map((c) => ({
      value: c.id,
      label: c.fullName,
      description: `${c.code} • Due: ${currency}${c.balanceDue.toFixed(2)} • ${c.planName}`,
    }));
  }, [customers, currency]);

  // Clean split of label vs description
  const methodOptions: ComboboxOption[] = [
    { value: 'Credit Card', label: 'Credit Card', description: 'Stripe payment gateway' },
    { value: 'ACH Transfer', label: 'Bank Transfer (ACH)', description: 'Direct clearing house transfer' },
    { value: 'Digital Wallet', label: 'Apple Pay / Google Pay', description: 'Instant wallet settlement' },
    { value: 'Cash', label: 'Cash in Person', description: 'Counter deposit / branch cashier' },
    { value: 'Check', label: 'Check / Money Order', description: 'Paper voucher deposited' },
  ];

  const handleCustomerChange = (id: string) => {
    setSelectedCustomerId(id);
    const c = customers.find((cust) => cust.id === id);
    if (c) {
      setAmount(c.balanceDue > 0 ? c.balanceDue : c.monthlyPrice);
    }
  };

  const handlePayFullAmount = () => {
    if (selectedCustomer) {
      setAmount(selectedCustomer.balanceDue > 0 ? selectedCustomer.balanceDue : selectedCustomer.monthlyPrice);
    }
  };

  const numAmount = typeof amount === 'string' ? parseFloat(amount) || 0 : amount;

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!selectedCustomerId || numAmount <= 0) return;

    setIsSubmitting(true);
    await recordPayment(selectedCustomerId, numAmount, method, reference);
    setIsSubmitting(false);
    setIsSuccess(true);

    setTimeout(() => {
      addToast({
        type: 'success',
        title: 'Payment Processed',
        message: `Posted ${currency}${numAmount.toFixed(2)} to ${selectedCustomer?.fullName}'s ledger.`,
      });
      closeModal('recordPayment');
    }, 600);
  };

  return (
    <Modal
      isOpen={modalState.isOpen}
      onClose={() => closeModal('recordPayment')}
      size="md"
      icon={<CreditCard className="w-5 h-5" />}
      iconColor="green"
      title="Record Customer Payment"
      subtitle="Post payment credit to subscriber ledger"
      isDirty={isDirty}
      footer={
        <ModalFooter
          onCancel={() => closeModal('recordPayment')}
          onSubmit={handleSubmit}
          submitText="Record Payment"
          isSubmitting={isSubmitting}
          isSuccess={isSuccess}
          submitDisabled={!selectedCustomerId || numAmount <= 0}
        />
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Outstanding Balance Summary Card */}
        {selectedCustomer && (
          <div className="p-4 rounded-xl bg-gray-50/80 dark:bg-[#18181B] border border-gray-200/80 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Avatar
                name={selectedCustomer.fullName}
                initials={selectedCustomer.initials}
                online={selectedCustomer.onlineStatus === 'online'}
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
                    {selectedCustomer.fullName}
                  </span>
                  <Badge status={selectedCustomer.status} />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {selectedCustomer.code} • {selectedCustomer.planName}
                </p>
              </div>
            </div>

            <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-2 sm:pt-0 border-gray-200/60 dark:border-gray-800 shrink-0">
              <div className="text-left sm:text-right">
                <span className="text-[11px] text-gray-400 block font-medium">Outstanding Balance</span>
                <span className="text-base font-bold text-gray-900 dark:text-gray-100 tabular-nums">
                  {currency}{selectedCustomer.balanceDue.toFixed(2)}
                </span>
              </div>
              {selectedCustomer.balanceDue > 0 ? (
                <button
                  type="button"
                  onClick={handlePayFullAmount}
                  className="mt-1 text-xs font-semibold text-[var(--brand)] hover:underline cursor-pointer flex items-center gap-1"
                >
                  <Zap className="w-3 h-3 fill-current" />
                  <span>Pay full amount</span>
                </button>
              ) : (
                <span className="text-[11px] text-[var(--text-muted)] mt-1 block">
                  No balance due - recording a credit
                </span>
              )}
            </div>
          </div>
        )}

        {/* Subscriber Account */}
        <Field label="Subscriber account" required helperText="Select account to receive payment credit">
          <Combobox
            options={customerOptions}
            value={selectedCustomerId}
            onChange={(val) => handleCustomerChange(val as string)}
            placeholder="Search subscriber name or code..."
            size="md"
          />
        </Field>

        {/* Two-Column Grid: Payment Amount & Method */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Payment amount" required helperText="Amount in customer currency">
            <Input
              type="number"
              step="0.01"
              min="0.01"
              required
              prefixAdornment={currency}
              value={amount}
              formatOnBlur={true}
              onChange={(e) => {
                setAmount(e.target.value);
                setIsDirty(e.target.value !== String(initialAmount));
              }}
              placeholder="0.00"
            />
          </Field>

          <Field label="Payment method" required>
            <Combobox
              options={methodOptions}
              value={method}
              onChange={(val) => setMethod(val as string)}
              searchable={false}
              clearable={false}
              size="md"
            />
          </Field>
        </div>

        {/* Reference / Monospace Transaction ID */}
        <Field label="Transaction reference" helperText="Monospace ledger or gateway authorization code">
          <Input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            className="font-mono uppercase"
            placeholder="TXN-123456"
          />
        </Field>
      </form>
    </Modal>
  );
};
