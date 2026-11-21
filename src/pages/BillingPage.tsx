import React, { useState, useMemo } from 'react';
import {
  Receipt,
  Plus,
  Download,
  Check,
  Eye,
  FileSpreadsheet,
  FileText,
  CreditCard,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { Invoice } from '../types';
import { Button } from '../components/ui/Button';
import { formatDate } from '../lib/utils';
import { RecordPaymentModal } from '../features/customers/RecordPaymentModal';
import { DataTable, DataTableColumnDef, RowAction } from '../components/ui/DataTable';

export const BillingPage: React.FC = () => {
  const invoices = useStore((s) => s.invoices);
  const markInvoicePaid = useStore((s) => s.markInvoicePaid);
  const openModal = useStore((s) => s.openModal);
  const openDrawer = useStore((s) => s.openDrawer);
  const addToast = useStore((s) => s.addToast);
  const currency = useStore((s) => s.currency);

  const totalBilled = invoices.reduce((sum, inv) => sum + inv.amount, 0);
  const totalPaid = invoices
    .filter((inv) => inv.status === 'Paid')
    .reduce((sum, inv) => sum + inv.amount, 0);
  const totalOverdue = invoices
    .filter((inv) => inv.status === 'Overdue')
    .reduce((sum, inv) => sum + inv.amount, 0);

  const handleDownloadPDF = (invNum: string) => {
    addToast({
      type: 'success',
      title: 'Invoice PDF Downloaded',
      message: `Downloaded receipt document for ${invNum}`,
    });
  };

  const columns: DataTableColumnDef<Invoice>[] = useMemo(
    () => [
      {
        id: 'invoiceNumber',
        header: 'Invoice #',
        accessorKey: 'invoiceNumber',
        width: 140,
        sortable: true,
        pinned: 'left',
        priority: 1,
        filter: { type: 'text', placeholder: 'Search invoice...' },
        cell: ({ row }) => (
          <span className="font-mono font-bold text-gray-900 dark:text-gray-100">
            {row.original.invoiceNumber}
          </span>
        ),
      },
      {
        id: 'customerName',
        header: 'Subscriber',
        accessorKey: 'customerName',
        width: 240,
        sortable: true,
        priority: 1,
        filter: { type: 'text', placeholder: 'Filter subscriber...' },
        cell: ({ row }) => {
          const inv = row.original;
          return (
            <div
              className="cursor-pointer group"
              onClick={() => openDrawer(inv.customerId, 'billing')}
            >
              <div className="font-semibold text-[var(--text)] group-hover:text-[var(--brand)] transition-colors truncate">
                {inv.customerName}
              </div>
              <div className="text-[11px] text-gray-400 truncate">{inv.customerEmail}</div>
            </div>
          );
        },
      },
      {
        id: 'date',
        header: 'Issue date',
        accessorKey: 'date',
        width: 130,
        sortable: true,
        priority: 2,
        cell: ({ row }) => (
          <span className="text-gray-500 tabular-nums">
            {formatDate(row.original.date)}
          </span>
        ),
      },
      {
        id: 'dueDate',
        header: 'Due date',
        accessorKey: 'dueDate',
        width: 130,
        sortable: true,
        priority: 2,
        cell: ({ row }) => (
          <span className="text-gray-500 tabular-nums">
            {formatDate(row.original.dueDate)}
          </span>
        ),
      },
      {
        id: 'amount',
        header: 'Amount',
        accessorKey: 'amount',
        width: 140,
        align: 'right',
        sortable: true,
        priority: 1,
        aggregate: 'sum',
        filter: { type: 'range', min: 0, max: 500 },
        cell: ({ row }) => (
          <span className="font-bold text-gray-900 dark:text-gray-100 tabular-nums">
            {currency}{row.original.amount.toFixed(2)}
          </span>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        accessorKey: 'status',
        width: 130,
        sortable: true,
        priority: 1,
        filter: {
          type: 'select',
          options: [
            { value: 'Paid', label: 'Paid' },
            { value: 'Pending', label: 'Pending' },
            { value: 'Overdue', label: 'Overdue' },
          ],
        },
        cell: ({ row }) => {
          const st = row.original.status;
          return (
            <span
              className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[10px] ${st === 'Paid'
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60'
                : st === 'Overdue'
                  ? 'bg-red-100 text-red-700 dark:bg-red-950/60'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60'
                }`}
            >
              {st}
            </span>
          );
        },
      },
    ],
    [currency, openDrawer]
  );

  const getRowActions = (inv: Invoice): RowAction<Invoice>[] => [
    ...(inv.status !== 'Paid'
      ? [
        {
          label: 'Mark as Paid',
          icon: <Check className="w-3.5 h-3.5 text-emerald-600" />,
          onClick: () => {
            markInvoicePaid(inv.id);
            addToast({
              type: 'success',
              title: 'Invoice Settled',
              message: `Marked invoice ${inv.invoiceNumber} as paid in full.`,
            });
          },
        },
      ]
      : []),
    {
      label: 'Download PDF Receipt',
      icon: <Download className="w-3.5 h-3.5" />,
      onClick: () => handleDownloadPDF(inv.invoiceNumber),
    },
    {
      label: 'View Subscriber Ledger',
      icon: <Eye className="w-3.5 h-3.5" />,
      onClick: () => openDrawer(inv.customerId, 'billing'),
    },
  ];

  const renderExpanded = (inv: Invoice) => (
    <div className="p-4 rounded-xl bg-gray-50/80 dark:bg-[#161618] border border-gray-200/60 dark:border-gray-800 text-xs space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Receipt className="w-4 h-4 text-[#F26B3A]" />
          <span className="font-bold text-gray-900 dark:text-gray-100">
            Invoice Breakdown • {inv.invoiceNumber}
          </span>
        </div>
        <span className="text-[11px] text-gray-400">
          Due by {formatDate(inv.dueDate)}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
        <div className="p-3 rounded-lg bg-white dark:bg-[#1C1C1F] border border-gray-200/50 dark:border-gray-800 space-y-1">
          <div className="text-gray-400 text-[11px]">Core Subscription</div>
          <div className="font-semibold text-gray-900 dark:text-gray-100">
            {currency}{(inv.amount * 0.85).toFixed(2)}
          </div>
        </div>
        <div className="p-3 rounded-lg bg-white dark:bg-[#1C1C1F] border border-gray-200/50 dark:border-gray-800 space-y-1">
          <div className="text-gray-400 text-[11px]">Taxes & Surcharges</div>
          <div className="font-semibold text-gray-900 dark:text-gray-100">
            {currency}{(inv.amount * 0.15).toFixed(2)}
          </div>
        </div>
        <div className="p-3 rounded-lg bg-white dark:bg-[#1C1C1F] border border-gray-200/50 dark:border-gray-800 space-y-1">
          <div className="text-gray-400 text-[11px]">Payment Method</div>
          <div className="font-semibold text-gray-900 dark:text-gray-100">
            Auto-debit Visa ****4242
          </div>
        </div>
      </div>
    </div>
  );

  const renderCard = (
    inv: Invoice,
    isSelected: boolean,
    onSelect: () => void
  ) => (
    <div
      onClick={() => openDrawer(inv.customerId, 'billing')}
      className={`p-5 rounded-2xl bg-white dark:bg-[#1C1C1F] border shadow-xs cursor-pointer transition-all flex flex-col justify-between ${isSelected
        ? 'border-[#F26B3A] bg-[#FFF6F2] dark:bg-orange-950/20'
        : 'border-gray-200/80 dark:border-gray-800 hover:border-gray-300'
        }`}
    >
      <div>
        <div className="flex items-center justify-between">
          <span className="font-mono font-bold text-sm text-gray-900 dark:text-gray-100">
            {inv.invoiceNumber}
          </span>
          <span
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${inv.status === 'Paid'
              ? 'bg-emerald-100 text-emerald-700'
              : inv.status === 'Overdue'
                ? 'bg-red-100 text-red-700'
                : 'bg-amber-100 text-amber-700'
              }`}
          >
            {inv.status}
          </span>
        </div>

        <div className="mt-3">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
            {inv.customerName}
          </h4>
          <p className="text-[11px] text-gray-400 truncate">{inv.customerEmail}</p>
        </div>

        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Issue Date:</span>
            <span className="text-gray-700 dark:text-gray-300 tabular-nums">
              {formatDate(inv.date)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Due Date:</span>
            <span className="text-gray-700 dark:text-gray-300 tabular-nums">
              {formatDate(inv.dueDate)}
            </span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-gray-800">
            <span className="font-medium text-gray-500">Total Due:</span>
            <span className="font-bold text-base text-gray-900 dark:text-gray-100 tabular-nums">
              {currency}{inv.amount.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      <div
        className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        {inv.status !== 'Paid' && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => markInvoicePaid(inv.id)}
            className="text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50"
          >
            <Check className="w-3.5 h-3.5" /> Mark Paid
          </Button>
        )}
        <Button
          size="sm"
          variant="secondary"
          onClick={() => handleDownloadPDF(inv.invoiceNumber)}
          className="text-xs"
        >
          <Download className="w-3.5 h-3.5" /> PDF
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 pb-12 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-[24px] leading-tight font-semibold text-[var(--text)] tracking-tight">
            Billing & Invoices
          </h2>
          <p className="text-[13px] text-[var(--text-muted)] mt-0.5">
            Automated subscriber billing, payment processing, and ledger history
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => openModal('recordPayment')}
          className="h-8 px-3 text-[12px]"
        >
          <Plus className="w-3.5 h-3.5 stroke-[1.75]" />
          <span>Record Payment</span>
        </Button>
      </div>

      {/* 3 Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-card)]">
          <span className="text-[12px] text-[var(--text-muted)] block font-medium">Total Invoiced (MTD)</span>
          <div className="text-[22px] font-semibold text-[var(--text)] mt-1 tabular-nums">
            {currency}{totalBilled.toFixed(2)}
          </div>
        </div>
        <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-card)]">
          <span className="text-[12px] text-[var(--text-muted)] block font-medium">Total Collected</span>
          <div className="text-[22px] font-semibold text-[var(--success-text)] mt-1 tabular-nums">
            {currency}{totalPaid.toFixed(2)}
          </div>
        </div>
        <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-card)]">
          <span className="text-[12px] text-[var(--text-muted)] block font-medium">Overdue / Outstanding</span>
          <div className="text-[22px] font-semibold text-[var(--danger-text)] mt-1 tabular-nums">
            {currency}{totalOverdue.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Full-Featured Invoices DataTable */}
      <DataTable<Invoice>
        columns={columns}
        data={invoices}
        rowId={(inv) => inv.id}
        viewKey="billing_invoices_table"
        onRowClick={(inv) => openDrawer(inv.customerId, 'billing')}
        rowActions={getRowActions}
        renderExpanded={renderExpanded}
        renderCard={renderCard}
        emptyTitle="No invoices found"
        emptySubtitle="Try adjusting filters or record a new invoice payment."
        onAddNew={() => openModal('recordPayment')}
        addNewLabel="Record Payment"
      />
    </div>
  );
};
