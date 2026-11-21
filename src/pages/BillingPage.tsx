import React, { useState } from 'react';
import { Receipt, Plus, Download, Check, Clock, AlertTriangle } from 'lucide-react';
import { useStore } from '../store/useStore';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { formatDate } from '../lib/utils';
import { RecordPaymentModal } from '../features/customers/RecordPaymentModal';

export const BillingPage: React.FC = () => {
  const invoices = useStore((s) => s.invoices);
  const markInvoicePaid = useStore((s) => s.markInvoicePaid);
  const openModal = useStore((s) => s.openModal);
  const openDrawer = useStore((s) => s.openDrawer);
  const addToast = useStore((s) => s.addToast);
  const currency = useStore((s) => s.currency);

  const [statusFilter, setStatusFilter] = useState<'All' | 'Paid' | 'Pending' | 'Overdue'>('All');

  const filteredInvoices = invoices.filter((inv) => {
    if (statusFilter !== 'All' && inv.status !== statusFilter) return false;
    return true;
  });

  const totalBilled = invoices.reduce((sum, inv) => sum + inv.amount, 0);
  const totalPaid = invoices.filter((inv) => inv.status === 'Paid').reduce((sum, inv) => sum + inv.amount, 0);
  const totalOverdue = invoices.filter((inv) => inv.status === 'Overdue').reduce((sum, inv) => sum + inv.amount, 0);

  const handleDownloadPDF = (invNum: string) => {
    addToast({
      type: 'success',
      title: 'Invoice PDF Downloaded',
      message: `Downloaded receipt document for ${invNum}`,
    });
  };

  return (
    <div className="space-y-6 pb-12 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tight">
            Billing & Invoices
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Automated subscriber billing, payment processing, and ledger history
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={() => openModal('recordPayment')}
          className="text-xs font-bold"
        >
          <Plus className="w-4 h-4" />
          <span>+ Record Payment</span>
        </Button>
      </div>

      {/* 3 Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4.5 rounded-2xl bg-white dark:bg-[#1C1C1F] border border-gray-200/80 dark:border-gray-800 shadow-soft">
          <span className="text-xs text-gray-400 block font-medium">Total Invoiced (MTD)</span>
          <div className="text-2xl font-black text-gray-900 dark:text-gray-100 mt-1">
            {currency}{totalBilled.toFixed(2)}
          </div>
        </div>
        <div className="p-4.5 rounded-2xl bg-white dark:bg-[#1C1C1F] border border-gray-200/80 dark:border-gray-800 shadow-soft">
          <span className="text-xs text-gray-400 block font-medium">Total Collected</span>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            {currency}{totalPaid.toFixed(2)}
          </div>
        </div>
        <div className="p-4.5 rounded-2xl bg-white dark:bg-[#1C1C1F] border border-gray-200/80 dark:border-gray-800 shadow-soft">
          <span className="text-xs text-gray-400 block font-medium">Overdue / Outstanding</span>
          <div className="text-2xl font-black text-red-600 mt-1">
            {currency}{totalOverdue.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {(['All', 'Paid', 'Pending', 'Overdue'] as const).map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              statusFilter === st
                ? 'bg-[#FFF1EA] dark:bg-[#F26B3A]/20 text-[#F26B3A] border border-[#F26B3A]'
                : 'bg-white dark:bg-[#1C1C1F] text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-800'
            }`}
          >
            {st} Invoices
          </button>
        ))}
      </div>

      {/* Invoices Table */}
      <div className="w-full overflow-x-auto rounded-2xl bg-white dark:bg-[#1C1C1F] border border-gray-200/80 dark:border-gray-800 shadow-soft">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20 text-gray-500 font-semibold">
              <th className="py-3.5 px-4">Invoice #</th>
              <th className="py-3.5 px-4">Subscriber</th>
              <th className="py-3.5 px-4">Issue Date</th>
              <th className="py-3.5 px-4">Due Date</th>
              <th className="py-3.5 px-4">Amount</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
            {filteredInvoices.map((inv) => (
              <tr key={inv.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40">
                <td className="py-3.5 px-4 font-mono font-bold text-gray-900 dark:text-gray-100">
                  {inv.invoiceNumber}
                </td>
                <td className="py-3.5 px-4">
                  <button
                    onClick={() => openDrawer(inv.customerId, 'billing')}
                    className="font-bold text-gray-800 dark:text-gray-200 hover:text-[#F26B3A] text-left"
                  >
                    {inv.customerName}
                  </button>
                  <div className="text-[11px] text-gray-400">{inv.customerEmail}</div>
                </td>
                <td className="py-3.5 px-4 text-gray-500">{formatDate(inv.date)}</td>
                <td className="py-3.5 px-4 text-gray-500">{formatDate(inv.dueDate)}</td>
                <td className="py-3.5 px-4 font-bold text-gray-900 dark:text-gray-100">
                  {currency}{inv.amount.toFixed(2)}
                </td>
                <td className="py-3.5 px-4">
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                      inv.status === 'Paid'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60'
                        : inv.status === 'Overdue'
                        ? 'bg-red-100 text-red-700 dark:bg-red-950/60'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60'
                    }`}
                  >
                    {inv.status}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {inv.status !== 'Paid' && (
                      <button
                        onClick={() => markInvoicePaid(inv.id)}
                        className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                        title="Mark as Paid"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDownloadPDF(inv.invoiceNumber)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-[#F26B3A] hover:bg-gray-100 dark:hover:bg-gray-800"
                      title="Download PDF"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <RecordPaymentModal />
    </div>
  );
};
