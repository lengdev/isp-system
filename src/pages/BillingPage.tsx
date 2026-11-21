import React, { useState } from 'react';
import { Receipt, Plus, Download, Check } from 'lucide-react';
import { useStore } from '../store/useStore';
import { Button } from '../components/ui/Button';
import { formatDate } from '../lib/utils';
import { RecordPaymentModal } from '../features/customers/RecordPaymentModal';
import { Combobox, ComboboxOption } from '../components/ui/Combobox';

export const BillingPage: React.FC = () => {
  const invoices = useStore((s) => s.invoices);
  const markInvoicePaid = useStore((s) => s.markInvoicePaid);
  const openModal = useStore((s) => s.openModal);
  const openDrawer = useStore((s) => s.openDrawer);
  const addToast = useStore((s) => s.addToast);
  const currency = useStore((s) => s.currency);

  const [statusFilter, setStatusFilter] = useState<string>('All');

  const statusOptions: ComboboxOption[] = [
    { value: 'All', label: 'All Invoices' },
    { value: 'Paid', label: 'Paid Invoices' },
    { value: 'Pending', label: 'Pending Invoices' },
    { value: 'Overdue', label: 'Overdue Invoices' },
  ];

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
          <h2 className="text-[28px] leading-tight font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
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
          className="text-xs font-semibold h-9 px-4 gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Record Payment</span>
        </Button>
      </div>

      {/* 3 Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="p-5 rounded-2xl bg-white dark:bg-[#1C1C1F] border border-gray-200/80 dark:border-gray-800 shadow-xs">
          <span className="text-xs text-gray-400 block font-medium">Total Invoiced (MTD)</span>
          <div className="text-[28px] font-bold text-gray-900 dark:text-gray-100 mt-1 tabular-nums">
            {currency}{totalBilled.toFixed(2)}
          </div>
        </div>
        <div className="p-5 rounded-2xl bg-white dark:bg-[#1C1C1F] border border-gray-200/80 dark:border-gray-800 shadow-xs">
          <span className="text-xs text-gray-400 block font-medium">Total Collected</span>
          <div className="text-[28px] font-bold text-emerald-600 mt-1 tabular-nums">
            {currency}{totalPaid.toFixed(2)}
          </div>
        </div>
        <div className="p-5 rounded-2xl bg-white dark:bg-[#1C1C1F] border border-gray-200/80 dark:border-gray-800 shadow-xs">
          <span className="text-xs text-gray-400 block font-medium">Overdue / Outstanding</span>
          <div className="text-[28px] font-bold text-red-600 mt-1 tabular-nums">
            {currency}{totalOverdue.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Filter Combobox & Status Tabs */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {['All', 'Paid', 'Pending', 'Overdue'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`h-8 px-3 rounded-full text-xs font-semibold transition-colors ${
                statusFilter === st
                  ? 'bg-[#FFF1EA] dark:bg-orange-950/40 text-[#F26B3A] border border-[#F26B3A]'
                  : 'bg-white dark:bg-[#1C1C1F] text-gray-600 dark:text-gray-400 border border-gray-200/90 dark:border-gray-800'
              }`}
            >
              {st} Invoices
            </button>
          ))}
        </div>

        <div className="w-44">
          <Combobox
            options={statusOptions}
            value={statusFilter}
            onChange={(val) => setStatusFilter(val as string)}
            searchable={false}
            clearable={false}
            size="sm"
          />
        </div>
      </div>

      {/* Invoices Table */}
      <div className="w-full overflow-hidden rounded-2xl bg-white dark:bg-[#1C1C1F] border border-gray-200/80 dark:border-gray-800 shadow-xs">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-[#FAFAFA] dark:bg-[#1A1A1D] border-b border-gray-200/80 dark:border-gray-800">
            <tr className="h-11 text-gray-500 font-semibold">
              <th className="px-4">Invoice #</th>
              <th className="px-4">Subscriber</th>
              <th className="px-4">Issue date</th>
              <th className="px-4">Due date</th>
              <th className="px-4 text-right">Amount</th>
              <th className="px-4">Status</th>
              <th className="px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800/80">
            {filteredInvoices.map((inv) => (
              <tr key={inv.id} className="h-14 hover:bg-gray-50/70 dark:hover:bg-gray-800/40 transition-colors">
                <td className="px-4 font-mono font-bold text-gray-900 dark:text-gray-100">
                  {inv.invoiceNumber}
                </td>
                <td className="px-4">
                  <button
                    type="button"
                    onClick={() => openDrawer(inv.customerId, 'billing')}
                    className="font-semibold text-gray-800 dark:text-gray-200 hover:text-[#F26B3A] text-left"
                  >
                    {inv.customerName}
                  </button>
                  <div className="text-[11px] text-gray-400">{inv.customerEmail}</div>
                </td>
                <td className="px-4 text-gray-500 tabular-nums">{formatDate(inv.date)}</td>
                <td className="px-4 text-gray-500 tabular-nums">{formatDate(inv.dueDate)}</td>
                <td className="px-4 font-bold text-gray-900 dark:text-gray-100 text-right tabular-nums">
                  {currency}{inv.amount.toFixed(2)}
                </td>
                <td className="px-4">
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
                <td className="px-4 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {inv.status !== 'Paid' && (
                      <button
                        type="button"
                        onClick={() => markInvoicePaid(inv.id)}
                        className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                        title="Mark as Paid"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
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
