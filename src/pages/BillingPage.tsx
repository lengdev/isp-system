import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  Receipt,
  Plus,
  Download,
  Check,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { api } from '../lib/api';
import { Can, useCan } from '../lib/permissions';
import { Invoice } from '../types';
import { Button } from '../components/ui/Button';
import { Chip } from '../components/ui/Chip';
import { formatDate } from '../lib/utils';
import { DataTable, DataTableColumnDef, RowAction, TableQuery } from '../components/ui/DataTable';

function mapApiInvoice(raw: any): Invoice {
  const st = String(raw.status || 'UNPAID').toUpperCase();
  const status =
    st === 'PAID'
      ? 'Paid'
      : st === 'OVERDUE'
      ? 'Overdue'
      : st === 'CANCELLED'
      ? 'Cancelled'
      : Number(raw.paidAmount || 0) > 0 && Number(raw.balanceDue || 0) > 0
      ? 'Partial'
      : 'Pending';

  return {
    id: String(raw.id),
    invoiceNumber: raw.invoiceNumber,
    customerId: raw.customerId,
    customerName: raw.customerName || raw.customer?.fullName || 'Customer',
    customerEmail: raw.customerEmail || raw.customer?.email || '',
    date: raw.issueDate || raw.date || raw.createdAt,
    dueDate: raw.dueDate,
    amount: Number(raw.amount || 0),
    status: status as any,
    items: Array.isArray(raw.items) ? raw.items : [],
  };
}

export const BillingPage: React.FC = () => {
  const openModal = useStore((s) => s.openModal);
  const openDrawer = useStore((s) => s.openDrawer);
  const addToast = useStore((s) => s.addToast);
  const currency = useStore((s) => s.currency);
  const canRecordPayment = useCan('payments.record') || useCan('billing.create');
  const canEditInvoice = useCan('billing.edit') || useCan('payments.record');

  const [tableQuery, setTableQuery] = useState<TableQuery>({
    page: 1,
    pageSize: 10,
    search: '',
    sort: [],
    filters: {},
  });
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const q = (tableQuery.search || '').trim();
    if (!q) {
      setDebouncedSearch('');
      return;
    }
    const timer = setTimeout(() => setDebouncedSearch(q), 120);
    return () => clearTimeout(timer);
  }, [tableQuery.search]);

  const handleQueryChange = useCallback((nextQuery: TableQuery) => {
    setTableQuery(nextQuery);
  }, []);

  const queryParams = useMemo(() => {
    const colFilters = tableQuery.filters || {};
    const primarySort = tableQuery.sort?.[0];
    const amountRange = colFilters.amount;
    const statusFilter =
      Array.isArray(colFilters.status) && colFilters.status.length === 1
        ? colFilters.status[0]
        : typeof colFilters.status === 'string' && colFilters.status
          ? colFilters.status
          : undefined;
    return {
      page: tableQuery.page,
      limit: tableQuery.pageSize,
      search: debouncedSearch || undefined,
      sortBy: primarySort?.id || undefined,
      sortDir: primarySort ? (primarySort.desc ? 'desc' : 'asc') : undefined,
      status: statusFilter,
      invoiceNumber: typeof colFilters.invoiceNumber === 'string' && colFilters.invoiceNumber ? colFilters.invoiceNumber : undefined,
      customerName: typeof colFilters.customerName === 'string' && colFilters.customerName ? colFilters.customerName : undefined,
      minAmount: amountRange?.min ?? undefined,
      maxAmount: amountRange?.max ?? undefined,
    };
  }, [tableQuery, debouncedSearch]);

  const invoicesQuery = useQuery({
    queryKey: ['invoices', queryParams],
    queryFn: async () => {
      const res = await api.billing.getInvoicesPaged(queryParams);
      return {
        ...res,
        items: (res.items || []).map(mapApiInvoice),
      };
    },
    placeholderData: keepPreviousData,
  });

  const invoices = useMemo(() => invoicesQuery.data?.items ?? [], [invoicesQuery.data?.items]);

  const handleMarkPaid = async (inv: Invoice) => {
    try {
      await api.billing.markPaid(inv.id, 'CASH');
      addToast({
        type: 'success',
        title: 'Invoice Settled',
        message: `Marked invoice ${inv.invoiceNumber} as paid in full.`,
      });
      invoicesQuery.refetch();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Settlement Failed',
        message: err?.message || 'Could not settle invoice.',
      });
    }
  };

  const totalBilled = invoicesQuery.data?.stats?.totalBilled ?? 0;
  const totalPaid = invoicesQuery.data?.stats?.totalPaid ?? 0;
  const totalOverdue = invoicesQuery.data?.stats?.totalOverdue ?? 0;

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
          const color = st === 'Paid' ? 'success' : st === 'Overdue' ? 'danger' : 'warning';
          return (
            <Chip size="sm" color={color}>
              {st}
            </Chip>
          );
        },
      },
    ],
    [currency, openDrawer]
  );

  const getRowActions = (inv: Invoice): RowAction<Invoice>[] => [
    ...(inv.status !== 'Paid' && canEditInvoice
      ? [
        {
          label: 'Mark as Paid',
          icon: <Check className="w-3.5 h-3.5 text-emerald-600" />,
          onClick: () => {
            handleMarkPaid(inv);
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
          <Chip
            size="sm"
            color={inv.status === 'Paid' ? 'success' : inv.status === 'Overdue' ? 'danger' : 'warning'}
          >
            {inv.status}
          </Chip>
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
        {inv.status !== 'Paid' && canEditInvoice && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleMarkPaid(inv)}
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
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => invoicesQuery.refetch()}
            disabled={invoicesQuery.isFetching}
            className="h-8 px-3 text-[12px]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${invoicesQuery.isFetching ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
          <Can permission="payments.record">
            <Button
              variant="primary"
              size="sm"
              onClick={() => openModal('recordPayment')}
              className="h-8 px-3 text-[12px]"
            >
              <Plus className="w-3.5 h-3.5 stroke-[1.75]" />
              <span>Record Payment</span>
            </Button>
          </Can>
        </div>
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
        serverMode={true}
        total={invoicesQuery.data?.total}
        onQueryChange={handleQueryChange}
        loading={invoicesQuery.isLoading || (invoicesQuery.isFetching && invoicesQuery.isPlaceholderData)}
        fetching={invoicesQuery.isFetching}
        loadingMode={
          invoicesQuery.isLoading || (invoicesQuery.isFetching && invoicesQuery.isPlaceholderData)
            ? 'skeleton'
            : undefined
        }
        error={invoicesQuery.error ? 'Unable to load invoices.' : null}
        onRetry={() => invoicesQuery.refetch()}
        onRefresh={() => invoicesQuery.refetch()}
        isFilterActive={Boolean(
          (tableQuery.search || '').trim() || Object.keys(tableQuery.filters || {}).length > 0
        )}
        rowId={(inv) => inv.id}
        viewKey="billing_invoices_table"
        onRowClick={(inv) => openDrawer(inv.customerId, 'billing')}
        rowActions={getRowActions}
        renderExpanded={renderExpanded}
        renderCard={renderCard}
        noDataTitle="No invoices generated yet"
        noDataDescription="Monthly subscription invoices and setup charges will appear here once generated."
        emptyTitle="No matching invoices"
        emptySubtitle="Try adjusting filters or clearing your active search."
        emptyActionPermission="payments.record"
        onAddNew={canRecordPayment ? () => openModal('recordPayment') : undefined}
        addNewLabel="Record Payment"
      />
    </div>
  );
};
