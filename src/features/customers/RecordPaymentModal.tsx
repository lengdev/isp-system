import React, { useState, useEffect, useMemo } from 'react';
import { CreditCard, Check } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Combobox, ComboboxOption } from '../../components/ui/Combobox';

export const RecordPaymentModal: React.FC = () => {
  const modalState = useStore((s) => s.modalState.recordPayment);
  const closeModal = useStore((s) => s.closeModal);
  const customers = useStore((s) => s.customers);
  const recordPayment = useStore((s) => s.recordPayment);
  const currency = useStore((s) => s.currency);

  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [amount, setAmount] = useState<number>(54.99);
  const [method, setMethod] = useState('Credit Card');
  const [reference, setReference] = useState(`TXN-${Math.floor(100000 + Math.random() * 900000)}`);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (modalState.isOpen) {
      if (modalState.customerId) {
        setSelectedCustomerId(modalState.customerId);
        const c = customers.find((cust) => cust.id === modalState.customerId);
        if (c) {
          setAmount(c.balanceDue > 0 ? c.balanceDue : c.monthlyPrice);
        }
      } else if (customers.length > 0) {
        setSelectedCustomerId(customers[0].id);
        setAmount(customers[0].monthlyPrice);
      }
      setReference(`TXN-${Math.floor(100000 + Math.random() * 900000)}`);
    }
  }, [modalState.isOpen, modalState.customerId, customers]);

  const customerOptions: ComboboxOption[] = useMemo(() => {
    return customers.map((c) => ({
      value: c.id,
      label: `${c.fullName} (${c.code})`,
      description: `Balance: ${currency}${c.balanceDue.toFixed(2)} • ${c.planName}`,
    }));
  }, [customers, currency]);

  const methodOptions: ComboboxOption[] = [
    { value: 'Credit Card', label: 'Credit Card (Stripe Gateway)' },
    { value: 'Bank Transfer (ACH)', label: 'Bank Transfer (ACH / Wire)' },
    { value: 'Cash / In-Person', label: 'Cash at Counter' },
    { value: 'Check', label: 'Check / Money Order' },
    { value: 'Digital Wallet', label: 'Apple Pay / Google Pay' },
  ];

  const handleCustomerChange = (id: string) => {
    setSelectedCustomerId(id);
    const c = customers.find((cust) => cust.id === id);
    if (c) {
      setAmount(c.balanceDue > 0 ? c.balanceDue : c.monthlyPrice);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || amount <= 0) return;
    setIsSubmitting(true);
    await recordPayment(selectedCustomerId, amount, method, reference);
    setIsSubmitting(false);
    closeModal('recordPayment');
  };

  return (
    <Modal
      isOpen={modalState.isOpen}
      onClose={() => closeModal('recordPayment')}
      title={
        <div className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-[#F26B3A]" />
          <span>Record Customer Payment</span>
        </div>
      }
      subtitle="Post payment credit to subscriber ledger"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div>
          <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">
            Subscriber Account (Searchable) *
          </label>
          <Combobox
            options={customerOptions}
            value={selectedCustomerId}
            onChange={handleCustomerChange}
            placeholder="Search customer name or code..."
            size="lg"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">
              Payment Amount ({currency}) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
                {currency}
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="w-full h-10 pl-8 pr-3 rounded-[10px] border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#18181B] font-bold text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#F26B3A]/30 focus:border-[#F26B3A]"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">
              Payment Method
            </label>
            <Combobox
              options={methodOptions}
              value={method}
              onChange={(val) => setMethod(val as string)}
              searchable={false}
              clearable={false}
              size="lg"
            />
          </div>
        </div>

        <div>
          <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">
            Transaction Reference / Receipt #
          </label>
          <input
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            className="w-full h-10 px-3 rounded-[10px] border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#18181B] font-mono text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#F26B3A]/30 focus:border-[#F26B3A]"
          />
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-100 dark:border-gray-800">
          <Button
            size="sm"
            variant="outline"
            type="button"
            onClick={() => closeModal('recordPayment')}
            className="h-9 px-3.5"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            variant="primary"
            type="submit"
            isLoading={isSubmitting}
            className="h-9 px-4 font-semibold"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Process Payment</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
};
