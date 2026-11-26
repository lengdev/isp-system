import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  CreditCard,
  QrCode,
  RefreshCw,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Chip } from '../components/ui/Chip';
import { Field, Input } from '../components/ui/Field';
import { Modal } from '../components/ui/Modal';
import { Combobox, ComboboxOption } from '../components/ui/Combobox';
import { DataTable, DataTableColumnDef, TableQuery } from '../components/ui/DataTable';
import { Avatar } from '../components/ui/Avatar';
import { Can, useCan } from '../lib/permissions';
import { useStore } from '../store/useStore';
import { api } from '../lib/api';

const PAY_METHOD_OPTIONS: ComboboxOption[] = [
  { value: 'KHQR_BAKONG', label: 'KHQR / Bakong Merchant Wallet' },
  { value: 'BANK_TRANSFER', label: 'ABA Bank Wire Transfer' },
  { value: 'CASH', label: 'Cash Over-the-Counter' },
];

interface PaymentRecord {
  id: string;
  paymentNumber: string;
  customerId: string;
  customerName: string;
  customerCode?: string;
  method: string;
  amount: number;
  status?: string;
  transactionRef?: string;
  createdAt: string;
}

export const PaymentsPage: React.FC = () => {
  const addToast = useStore((s) => s.addToast);
  const currency = useStore((s) => s.currency) || '$';
  const canRecordPayment = useCan('payments.record');

  // Record Payment Modal
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [payAmount, setPayAmount] = useState(55);
  const [payMethod, setPayMethod] = useState<'CASH' | 'BANK_TRANSFER' | 'KHQR_BAKONG'>('KHQR_BAKONG');
  const [txnRef, setTxnRef] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // KHQR Modal
  const [isKhqrModalOpen, setIsKhqrModalOpen] = useState(false);
  const [khqrData, setKhqrData] = useState<any>(null);

  // Server pagination state
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
    return {
      page: tableQuery.page,
      limit: tableQuery.pageSize,
      search: debouncedSearch || undefined,
      sortBy: primarySort?.id || undefined,
      sortDir: primarySort ? (primarySort.desc ? 'desc' : 'asc') : undefined,
      method: Array.isArray(colFilters.method) && colFilters.method.length ? colFilters.method : undefined,
      paymentNumber: typeof colFilters.paymentNumber === 'string' && colFilters.paymentNumber ? colFilters.paymentNumber : undefined,
      customerName: typeof colFilters.customerName === 'string' && colFilters.customerName ? colFilters.customerName : undefined,
    };
  }, [tableQuery, debouncedSearch]);

  const paymentsQuery = useQuery({
    queryKey: ['payments', queryParams],
    queryFn: () => api.payments.listPaged(queryParams),
    placeholderData: keepPreviousData,
  });

  const customersPickerQuery = useQuery({
    queryKey: ['payments-customer-picker'],
    queryFn: async () => {
      const res = await api.customers.listPaged({ page: 1, limit: 100 });
      return res.items || [];
    },
    enabled: isRecordModalOpen,
    staleTime: 60_000,
  });

  const payments = useMemo<PaymentRecord[]>(
    () => paymentsQuery.data?.items ?? [],
    [paymentsQuery.data?.items]
  );
  const customers = useMemo(
    () => customersPickerQuery.data ?? [],
    [customersPickerQuery.data]
  );

  const effectiveSelectedCustomer = selectedCustomer || customers[0]?.id || '';

  const customerOptions: ComboboxOption[] = useMemo(
    () =>
      customers.map((c: any) => ({
        value: c.id,
        label: `${c.code} - ${c.nameEn || c.nameKm || c.fullName} (Balance: $${Number(c.balanceDue || 0).toFixed(2)})`,
      })),
    [customers]
  );

  const handleRefresh = useCallback(() => {
    paymentsQuery.refetch();
  }, [paymentsQuery]);

  const handleRecordPayment = async () => {
    if (!effectiveSelectedCustomer) {
      addToast({ type: 'error', title: 'Customer Required', message: 'Please select a subscriber first.' });
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await api.payments.record({
        customerId: effectiveSelectedCustomer,
        amount: Number(payAmount),
        method: payMethod,
        transactionRef: txnRef || `REF-${Date.now()}`,
        recordedBy: 'Cashier Staff',
      });

      addToast({
        type: 'success',
        title: 'Payment Confirmed',
        message: `Received $${Number(payAmount).toFixed(2)}. Balanced journal posted. Reconnected: ${res.reconnected ? 'Yes' : 'No'}`,
      });
      setIsRecordModalOpen(false);
      setTxnRef('');
      paymentsQuery.refetch();
      customersPickerQuery.refetch();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Payment Failed', message: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenKhqr = async (customerId: string, amount: number) => {
    if (!customerId) {
      addToast({ type: 'error', title: 'Customer Required', message: 'Please select a customer first.' });
      return;
    }
    try {
      const data = await api.payments.generateKHQR(customerId, amount);
      setKhqrData(data);
      setIsKhqrModalOpen(true);
    } catch (err: any) {
      addToast({ type: 'error', title: 'KHQR Generation Failed', message: err.message });
    }
  };

  const columns: DataTableColumnDef<PaymentRecord>[] = useMemo(
    () => [
      {
        id: 'paymentNumber',
        header: 'Receipt #',
        accessorKey: 'paymentNumber',
        width: 150,
        sortable: true,
        skeleton: 'text',
        filter: { type: 'text', placeholder: 'Search receipt #' },
        cell: ({ row }) => (
          <span className="font-mono text-xs font-bold text-[var(--brand)]">
            {row.original.paymentNumber}
          </span>
        ),
      },
      {
        id: 'customerName',
        header: 'Customer Subscriber',
        accessorKey: 'customerName',
        width: 240,
        sortable: true,
        skeleton: 'avatar-text',
        filter: { type: 'text', placeholder: 'Filter customer' },
        cell: ({ row }) => (
          <div className="flex items-center gap-2 min-w-0">
            <Avatar name={row.original.customerName || 'Customer'} size="sm" />
            <div className="min-w-0">
              <div className="text-[12px] font-semibold text-[var(--text)] truncate">
                {row.original.customerName || 'Customer'}
              </div>
              {row.original.customerCode && (
                <div className="text-[11px] font-mono text-[var(--text-muted)]">
                  {row.original.customerCode}
                </div>
              )}
            </div>
          </div>
        ),
      },
      {
        id: 'method',
        header: 'Payment Method',
        accessorKey: 'method',
        width: 170,
        sortable: true,
        skeleton: 'badge',
        filter: {
          type: 'multi',
          options: [
            { value: 'CASH', label: 'CASH' },
            { value: 'BANK_TRANSFER', label: 'BANK_TRANSFER' },
            { value: 'KHQR_BAKONG', label: 'KHQR_BAKONG' },
          ],
        },
        cell: ({ row }) => (
          <Chip size="sm" color={row.original.method === 'KHQR_BAKONG' ? 'primary' : 'default'}>
            {row.original.method}
          </Chip>
        ),
      },
      {
        id: 'createdAt',
        header: 'Date & Time',
        accessorKey: 'createdAt',
        width: 185,
        sortable: true,
        skeleton: 'text',
        cell: ({ row }) => (
          <span className="text-[12px] text-[var(--text-muted)] tabular-nums">
            {new Date(row.original.createdAt).toLocaleString()}
          </span>
        ),
      },
      {
        id: 'amount',
        header: 'Amount Collected',
        accessorKey: 'amount',
        width: 145,
        align: 'right',
        sortable: true,
        aggregate: 'sum',
        skeleton: 'number',
        cell: ({ row }) => (
          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
            {currency}
            {Number(row.original.amount || 0).toFixed(2)}
          </span>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        accessorFn: (row) => row.status || 'SUCCESSFUL',
        width: 150,
        sortable: true,
        skeleton: 'badge',
        cell: ({ row }) => {
          const isVoid = row.original.status === 'VOIDED' || row.original.status === 'FAILED';
          return (
            <Chip size="sm" color={isVoid ? 'danger' : 'success'}>
              {isVoid ? row.original.status : 'Verified & Posted'}
            </Chip>
          );
        },
      },
    ],
    [currency]
  );

  const renderCard = (p: PaymentRecord, isSelected: boolean, onSelect: () => void) => (
    <div
      onClick={onSelect}
      className={`min-w-0 p-4 rounded-2xl border bg-[var(--surface)] shadow-[var(--shadow-card)] flex flex-col justify-between gap-3 cursor-pointer transition-colors ${
        isSelected ? 'border-[var(--brand)] ring-1 ring-[var(--brand)]' : 'border-[var(--border)]'
      }`}
    >
      <div className="flex items-start justify-between gap-2 min-w-0">
        <div className="flex items-center gap-2.5 min-w-0 flex-1 overflow-hidden">
          <Avatar name={p.customerName || 'Customer'} size="sm" />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-[var(--text)] truncate">{p.customerName}</div>
            <div className="text-[11px] font-mono text-[var(--brand)] truncate">{p.paymentNumber}</div>
          </div>
        </div>
        <Chip size="sm" className="shrink-0" color={p.method === 'KHQR_BAKONG' ? 'primary' : 'default'}>
          {p.method}
        </Chip>
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)] text-xs">
        <span className="text-[var(--text-muted)] tabular-nums">
          {new Date(p.createdAt).toLocaleDateString()}
        </span>
        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
          {currency}
          {Number(p.amount || 0).toFixed(2)}
        </span>
      </div>
    </div>
  );

  return (
    <div className="space-y-5 pb-12 select-none">
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
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={paymentsQuery.isFetching}
          >
            <RefreshCw className={paymentsQuery.isFetching ? 'animate-spin w-4 h-4' : 'w-4 h-4'} />
            <span>Refresh</span>
          </Button>
          <Can permission="payments.record">
            <Button variant="primary" size="sm" onClick={() => setIsRecordModalOpen(true)}>
              <CreditCard className="w-4 h-4" />
              <span>Record Customer Payment</span>
            </Button>
          </Can>
        </div>
      </div>

      <DataTable<PaymentRecord>
        columns={columns}
        data={payments}
        serverMode={true}
        total={paymentsQuery.data?.total}
        onQueryChange={handleQueryChange}
        rowId={(p) => p.id}
        viewKey="payments_history_table"
        searchPlaceholder="Search receipts or customer..."
        loading={paymentsQuery.isLoading || (paymentsQuery.isFetching && paymentsQuery.isPlaceholderData)}
        fetching={paymentsQuery.isFetching}
        loadingMode={
          paymentsQuery.isLoading || (paymentsQuery.isFetching && paymentsQuery.isPlaceholderData)
            ? 'skeleton'
            : undefined
        }
        error={paymentsQuery.error ? 'Unable to load payment records.' : null}
        onRetry={handleRefresh}
        onRefresh={handleRefresh}
        isFilterActive={Boolean(
          (tableQuery.search || '').trim() || Object.keys(tableQuery.filters || {}).length > 0
        )}
        renderCard={renderCard}
        noDataTitle="No payments recorded yet"
        noDataDescription="Cash, ABA bank and Bakong KHQR payments will appear here once you record one."
        emptyTitle="No matching payments"
        emptySubtitle="Active search or column filters returned no matching receipts."
        emptyActionPermission="payments.record"
        onAddNew={canRecordPayment ? () => setIsRecordModalOpen(true) : undefined}
        addNewLabel="Record Customer Payment"
      />

      {/* RECORD PAYMENT MODAL */}
      <Modal isOpen={isRecordModalOpen} onClose={() => setIsRecordModalOpen(false)} title="Record Customer Payment">
        <div className="space-y-4 text-xs">
          <Field label="Customer Subscriber">
            <Combobox
              options={customerOptions}
              value={effectiveSelectedCustomer}
              onChange={(val) => {
                setSelectedCustomer(val);
                const cust = customers.find((c: any) => c.id === val);
                if (cust && cust.balanceDue > 0) setPayAmount(cust.balanceDue);
              }}
              searchable={true}
              clearable={false}
              placeholder="Select customer..."
              size="md"
            />
          </Field>

          <Field label="Payment Method">
            <Combobox
              options={PAY_METHOD_OPTIONS}
              value={payMethod}
              onChange={(val) => setPayMethod(val as 'CASH' | 'BANK_TRANSFER' | 'KHQR_BAKONG')}
              searchable={false}
              clearable={false}
              size="md"
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
            <Can permission="payments.khqr">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenKhqr(effectiveSelectedCustomer, payAmount)}
              >
                <QrCode className="w-3.5 h-3.5 text-[var(--brand)]" />
                <span>Show Bakong KHQR</span>
              </Button>
            </Can>
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" onClick={() => setIsRecordModalOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleRecordPayment} disabled={isSubmitting}>
                {isSubmitting ? 'Recording...' : 'Confirm Payment'}
              </Button>
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
export default PaymentsPage;
