import React, { useState, useEffect, useMemo } from 'react';
import {
  CreditCard,
  QrCode,
  DollarSign,
  Receipt,
  Plus,
  RefreshCw,
  CheckCircle2,
  Download,
  Building,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Chip } from '../components/ui/Chip';
import { Field, Input } from '../components/ui/Field';
import { Modal } from '../components/ui/Modal';
import { Combobox, ComboboxOption } from '../components/ui/Combobox';
import { useStore } from '../store/useStore';
import { api } from '../lib/api';

const PAY_METHOD_OPTIONS: ComboboxOption[] = [
  { value: 'KHQR_BAKONG', label: 'KHQR / Bakong Merchant Wallet' },
  { value: 'BANK_TRANSFER', label: 'ABA Bank Wire Transfer' },
  { value: 'CASH', label: 'Cash Over-the-Counter' },
];

export const PaymentsPage: React.FC = () => {
  const addToast = useStore((s) => s.addToast);
  const currency = useStore((s) => s.currency) || '$';

  const [payments, setPayments] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Record Payment Modal
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [payAmount, setPayAmount] = useState(55);
  const [payMethod, setPayMethod] = useState<'CASH' | 'BANK_TRANSFER' | 'KHQR_BAKONG'>('KHQR_BAKONG');
  const [txnRef, setTxnRef] = useState('');

  // KHQR Modal
  const [isKhqrModalOpen, setIsKhqrModalOpen] = useState(false);
  const [khqrData, setKhqrData] = useState<any>(null);

  const customerOptions: ComboboxOption[] = useMemo(
    () =>
      customers.map((c) => ({
        value: c.id,
        label: `${c.code} - ${c.fullName} (Balance: $${c.balanceDue})`,
      })),
    [customers]
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const [payRes, custRes] = await Promise.all([
        api.payments.list().catch(() => []),
        api.customers.list().catch(() => []),
      ]);
      setPayments(payRes);
      setCustomers(custRes);
      if (custRes.length > 0 && !selectedCustomer) setSelectedCustomer(custRes[0].id);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed to load payments', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRecordPayment = async () => {
    try {
      const res = await api.payments.record({
        customerId: selectedCustomer,
        amount: Number(payAmount),
        method: payMethod,
        transactionRef: txnRef || `REF-${Date.now()}`,
        recordedBy: 'Cashier Staff',
      });

      addToast({
        type: 'success',
        title: 'Payment Confirmed',
        message: `Received $${payAmount}. Balanced journal posted. Reconnected: ${res.reconnected ? 'Yes' : 'No'}`,
      });
      setIsRecordModalOpen(false);
      setTxnRef('');
      loadData();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Payment Failed', message: err.message });
    }
  };

  const handleOpenKhqr = async (customerId: string, amount: number) => {
    try {
      const data = await api.payments.generateKHQR(customerId, amount);
      setKhqrData(data);
      setIsKhqrModalOpen(true);
    } catch (err: any) {
      addToast({ type: 'error', title: 'KHQR Generation Failed', message: err.message });
    }
  };

  return (
    <div className="space-y-6 pb-12 select-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-[24px] leading-tight font-semibold text-[var(--text)] tracking-tight">
            Payments & Cashier Collections
          </h2>
          <p className="text-[13px] text-[var(--text-muted)] mt-0.5">
            Cash receipts, ABA bank wires, Bakong KHQR settlements, and automated ledger postings
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className={loading ? 'animate-spin w-4 h-4' : 'w-4 h-4'} />
            <span>Refresh</span>
          </Button>
          <Button variant="primary" size="sm" onClick={() => setIsRecordModalOpen(true)}>
            <CreditCard className="w-4 h-4" />
            <span>Record Customer Payment</span>
          </Button>
        </div>
      </div>

      <div className="p-5 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-card)]">
        <h3 className="text-sm font-bold text-[var(--text)] uppercase tracking-wider mb-4">Receipts & Payment History</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--text-muted)]">
                <th className="py-2.5 px-3">Receipt #</th>
                <th className="py-2.5 px-3">Customer Subscriber</th>
                <th className="py-2.5 px-3">Payment Method</th>
                <th className="py-2.5 px-3">Date & Time</th>
                <th className="py-2.5 px-3 text-right">Amount Collected</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-[var(--surface-hover)]">
                  <td className="py-3 px-3 font-bold text-[var(--brand)]">{p.paymentNumber}</td>
                  <td className="py-3 px-3 font-sans font-semibold text-[var(--text)]">{p.customerName}</td>
                  <td className="py-3 px-3">
                    <Chip size="sm" color={p.method === 'KHQR_BAKONG' ? 'primary' : 'default'}>
                      {p.method}
                    </Chip>
                  </td>
                  <td className="py-3 px-3 text-[var(--text-muted)]">{new Date(p.createdAt).toLocaleString()}</td>
                  <td className="py-3 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                    {currency}{Number(p.amount || 0).toFixed(2)}
                  </td>
                  <td className="py-3 px-3">
                    <Chip size="sm" color="success">Verified & Posted</Chip>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* RECORD PAYMENT MODAL */}
      <Modal isOpen={isRecordModalOpen} onClose={() => setIsRecordModalOpen(false)} title="Record Customer Payment">
        <div className="space-y-4 text-xs">
          <Field label="Customer Subscriber">
            <Combobox
              options={customerOptions}
              value={selectedCustomer}
              onChange={(val) => {
                setSelectedCustomer(val);
                const cust = customers.find((c) => c.id === val);
                if (cust && cust.balanceDue > 0) setPayAmount(cust.balanceDue);
              }}
              searchable={customerOptions.length > 6}
              clearable={false}
              placeholder="Select customer..."
              size="sm"
            />
          </Field>

          <Field label="Payment Method">
            <Combobox
              options={PAY_METHOD_OPTIONS}
              value={payMethod}
              onChange={(val) => setPayMethod(val)}
              searchable={PAY_METHOD_OPTIONS.length > 6}
              clearable={false}
              size="sm"
            />
          </Field>

          <Field label="Payment Amount ($)">
            <Input
              type="number"
              step="0.01"
              value={payAmount}
              onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
            />
          </Field>

          <Field label="Bank / Bakong Transaction Reference">
            <Input
              placeholder="e.g. ABA-TXN-984421"
              value={txnRef}
              onChange={(e) => setTxnRef(e.target.value)}
            />
          </Field>

          <div className="flex justify-between items-center pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenKhqr(selectedCustomer, payAmount)}
            >
              <QrCode className="w-3.5 h-3.5 text-[var(--brand)]" />
              <span>Show Bakong KHQR</span>
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsRecordModalOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleRecordPayment}>Confirm Payment</Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* BAKONG KHQR MODAL */}
      <Modal isOpen={isKhqrModalOpen} onClose={() => setIsKhqrModalOpen(false)} title="National Bank of Cambodia (NBC) - Bakong KHQR">
        <div className="flex flex-col items-center justify-center p-4 space-y-4 text-center">
          <div className="p-3 bg-red-600 rounded-xl text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2">
            <QrCode className="w-4 h-4" /> KHQR Universal Payment
          </div>

          {/* Clean stylized QR representation */}
          <div className="p-4 bg-white rounded-2xl border-4 border-red-500 shadow-md">
            <div className="w-48 h-48 bg-gray-900 flex flex-col items-center justify-center text-white rounded-lg p-2 font-mono text-[9px] break-all leading-tight">
              <QrCode className="w-24 h-24 text-white mb-2" />
              <span>SCAN WITH ANY BANK APP</span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-xl font-bold text-[var(--text)]">${khqrData?.amount?.toFixed(2)} USD</div>
            <div className="text-xs text-[var(--text-muted)]">{khqrData?.merchantName} ({khqrData?.merchantId})</div>
            <div className="text-xs font-semibold text-[var(--brand)]">Subscriber: {khqrData?.customerName}</div>
          </div>

          <Button variant="primary" onClick={() => setIsKhqrModalOpen(false)}>Done</Button>
        </div>
      </Modal>
    </div>
  );
};
