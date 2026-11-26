import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  DollarSign,
  TrendingUp,
  Receipt,
  Plus,
  RefreshCw,
  RotateCcw,
  BookOpen,
  Scale,
  Calendar,
  Layers,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Chip } from '../components/ui/Chip';
import { Field, Input, Textarea } from '../components/ui/Field';
import { Modal, ModalFooter } from '../components/ui/Modal';
import { Combobox, ComboboxOption } from '../components/ui/Combobox';
import { TableStateBody } from '../components/ui/TableState';
import { DataTable, DataTableColumnDef, RowAction, TableQuery } from '../components/ui/DataTable';
import { Can, useCan } from '../lib/permissions';
import { useStore } from '../store/useStore';
import { api } from '../lib/api';

export const AccountingPage: React.FC = () => {
  const addToast = useStore((s) => s.addToast);
  const currency = useStore((s) => s.currency) || '$';
  const canCreateJournal = useCan('accounting.create');
  const canDeleteJournal = useCan('accounting.delete');

  const [activeTab, setActiveTab] = useState<'overview' | 'journal' | 'ledger' | 'reports'>('overview');
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [trialBalance, setTrialBalance] = useState<any>(null);
  const [pnl, setPnl] = useState<any>(null);
  const [balanceSheet, setBalanceSheet] = useState<any>(null);
  const [arAging, setArAging] = useState<any>(null);

  // New Journal Entry Modal State
  const [isNewJournalOpen, setIsNewJournalOpen] = useState(false);
  const [journalDesc, setJournalDesc] = useState('');
  const [journalRef, setJournalRef] = useState('');
  const [isPostingJournal, setIsPostingJournal] = useState(false);
  const [journalLines, setJournalLines] = useState<
    { accountCode: string; debit: number; credit: number; description: string }[]
  >([
    { accountCode: '1020', debit: 0, credit: 0, description: '' },
    { accountCode: '4010', debit: 0, credit: 0, description: '' },
  ]);

  // Reversal Confirmation Modal State
  const [reversalTarget, setReversalTarget] = useState<any | null>(null);
  const [reversalReason, setReversalReason] = useState('');
  const [isReversing, setIsReversing] = useState(false);

  // Server-Side DataTable Query State for Journals
  const [journalQuery, setJournalQuery] = useState<TableQuery>({
    page: 1,
    pageSize: 25,
    search: '',
    sort: [{ id: 'entryDate', desc: true }],
    filters: {},
  });

  // Server-Side DataTable Query State for General Ledger
  const [ledgerQuery, setLedgerQuery] = useState<TableQuery>({
    page: 1,
    pageSize: 25,
    search: '',
    sort: [{ id: 'entryDate', desc: true }],
    filters: {},
  });

  const accountOptions: ComboboxOption[] = useMemo(
    () => accounts.map((acc) => ({ value: acc.code, label: `${acc.code} — ${acc.name}`, group: acc.type })),
    [accounts]
  );

  // Load KPI overview and accounts once
  const loadOverview = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [dashRes, accRes, tbRes, pnlRes, bsRes, arRes] = await Promise.all([
        api.accounting.getDashboard(),
        api.accounting.getAccounts(),
        api.accounting.getTrialBalance(),
        api.accounting.getPnL(),
        api.accounting.getBalanceSheet(),
        api.accounting.getArAging(),
      ]);

      if (dashRes) setDashboard(dashRes);
      if (accRes) setAccounts(accRes);
      if (tbRes) setTrialBalance(tbRes);
      if (pnlRes) setPnl(pnlRes);
      if (bsRes) setBalanceSheet(bsRes);
      if (arRes) setArAging(arRes);
    } catch (err: any) {
      setLoadError('Unable to load accounting overview data.');
      addToast({ type: 'error', title: 'Failed to load accounting data', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  // 1. Paginated Journals React Query (Prevents freezing/crashing on large data)
  const journalsQuery = useQuery({
    queryKey: ['accounting', 'journals', journalQuery],
    queryFn: () =>
      api.accounting.getJournalsPaged({
        page: journalQuery.page,
        limit: journalQuery.pageSize,
        search: journalQuery.search || undefined,
        sortBy: journalQuery.sort?.[0]?.id || 'entryDate',
        sortDir: journalQuery.sort?.[0]?.desc ? 'desc' : 'asc',
        status: (journalQuery.filters?.status as string) || undefined,
      }),
    enabled: activeTab === 'journal',
    placeholderData: keepPreviousData,
  });

  // 2. Paginated Ledger React Query (Prevents freezing/crashing on large data)
  const pagedLedgerQuery = useQuery({
    queryKey: ['accounting', 'ledger', ledgerQuery],
    queryFn: () =>
      api.accounting.getLedgerPaged({
        page: ledgerQuery.page,
        limit: ledgerQuery.pageSize,
        search: ledgerQuery.search || undefined,
        sortBy: ledgerQuery.sort?.[0]?.id || 'entryDate',
        sortDir: ledgerQuery.sort?.[0]?.desc ? 'desc' : 'asc',
        accountCode: (ledgerQuery.filters?.accountCode as string) || undefined,
        accountType: (ledgerQuery.filters?.accountType as string) || undefined,
      }),
    enabled: activeTab === 'ledger',
    placeholderData: keepPreviousData,
  });

  const totalDebit = journalLines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
  const totalCredit = journalLines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  const handlePostJournal = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!journalDesc.trim()) {
      addToast({ type: 'error', title: 'Validation Error', message: 'Description is required.' });
      return;
    }
    if (!isBalanced) {
      addToast({
        type: 'error',
        title: 'Unbalanced Journal',
        message: `Total Debits (${currency}${totalDebit.toFixed(2)}) must equal Total Credits (${currency}${totalCredit.toFixed(2)})`,
      });
      return;
    }

    setIsPostingJournal(true);
    try {
      await api.accounting.postJournal({
        description: journalDesc.trim(),
        reference: journalRef.trim() || undefined,
        lines: journalLines.filter((l) => Number(l.debit) > 0 || Number(l.credit) > 0),
        createdBy: 'Accountant',
      });

      addToast({ type: 'success', title: 'Journal Posted', message: 'Balanced double-entry journal saved.' });
      setIsNewJournalOpen(false);
      setJournalDesc('');
      setJournalRef('');
      setJournalLines([
        { accountCode: '1020', debit: 0, credit: 0, description: '' },
        { accountCode: '4010', debit: 0, credit: 0, description: '' },
      ]);
      loadOverview();
      journalsQuery.refetch();
      pagedLedgerQuery.refetch();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Posting Failed', message: err.message });
    } finally {
      setIsPostingJournal(false);
    }
  };

  const handleConfirmReverse = async () => {
    if (!reversalTarget) return;
    if (!reversalReason.trim()) {
      addToast({ type: 'error', title: 'Validation Error', message: 'Reversal reason is required.' });
      return;
    }

    setIsReversing(true);
    try {
      await api.accounting.reverseJournal(reversalTarget.entryNumber, reversalReason.trim());
      addToast({
        type: 'success',
        title: 'Journal Reversed',
        message: `Counter-entry posted for ${reversalTarget.entryNumber}.`,
      });
      setReversalTarget(null);
      setReversalReason('');
      loadOverview();
      journalsQuery.refetch();
      pagedLedgerQuery.refetch();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Reversal Failed', message: err.message });
    } finally {
      setIsReversing(false);
    }
  };

  // ─── JOURNAL ENTRIES DATATABLE COLUMNS ─────────────────────────────────────────
  const journalColumns: DataTableColumnDef<any>[] = useMemo(
    () => [
      {
        id: 'entryNumber',
        header: 'Entry Number',
        accessorKey: 'entryNumber',
        width: 150,
        sortable: true,
        pinned: 'left',
        priority: 1,
        cell: ({ row }) => (
          <span className="font-mono text-xs font-bold text-[var(--brand)]">
            {row.original.entryNumber}
          </span>
        ),
      },
      {
        id: 'entryDate',
        header: 'Date',
        accessorKey: 'entryDate',
        width: 125,
        sortable: true,
        priority: 1,
        cell: ({ row }) => (
          <span className="text-xs text-[var(--text-muted)]">
            {new Date(row.original.entryDate).toLocaleDateString()}
          </span>
        ),
      },
      {
        id: 'description',
        header: 'Narration / Description',
        accessorKey: 'description',
        width: 300,
        priority: 1,
        cell: ({ row }) => (
          <div className="min-w-0">
            <span className="font-medium text-gray-900 dark:text-gray-100 truncate block text-xs">
              {row.original.description}
            </span>
            {row.original.reference && (
              <span className="font-mono text-[11px] text-[var(--text-muted)]">
                Ref: {row.original.reference}
              </span>
            )}
          </div>
        ),
      },
      {
        id: 'totalAmount',
        header: 'Total Amount',
        accessorKey: 'totalAmount',
        width: 140,
        align: 'right',
        sortable: true,
        priority: 1,
        cell: ({ row }) => (
          <span className="font-mono text-xs font-bold text-gray-900 dark:text-gray-100 tabular-nums">
            {currency}{Number(row.original.totalAmount || 0).toFixed(2)}
          </span>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        accessorKey: 'isReversed',
        width: 140,
        sortable: true,
        priority: 1,
        filter: {
          type: 'select',
          options: [
            { value: 'POSTED', label: 'Posted & Locked' },
            { value: 'REVERSED', label: 'Reversed' },
          ],
        },
        cell: ({ row }) => {
          const isReversed = row.original.isReversed;
          return (
            <Chip size="sm" color={isReversed ? 'danger' : 'success'}>
              {isReversed ? 'Reversed' : 'Posted & Locked'}
            </Chip>
          );
        },
      },
      {
        id: 'createdBy',
        header: 'Posted By',
        accessorKey: 'createdBy',
        width: 140,
        priority: 2,
        cell: ({ row }) => (
          <span className="text-xs text-[var(--text-muted)]">
            {row.original.createdBy || 'System'}
          </span>
        ),
      },
    ],
    [currency]
  );

  const getJournalRowActions = (je: any): RowAction<any>[] => [
    ...(!je.isReversed && canDeleteJournal
      ? [
          {
            label: 'Reverse Journal Entry',
            icon: <RotateCcw className="w-3.5 h-3.5" />,
            danger: true,
            onClick: () => {
              setReversalTarget(je);
              setReversalReason('');
            },
          },
        ]
      : []),
  ];

  const renderJournalExpanded = (je: any) => (
    <div className="p-3.5 rounded-xl bg-gray-50/80 dark:bg-[#161618] border border-gray-200/60 dark:border-gray-800 text-xs space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="font-bold text-[var(--text)]">
          Double-Entry Breakdown • {je.entryNumber}
        </span>
        <span className="text-[11px] text-[var(--text-muted)]">
          {je.lines?.length || 0} line(s) • Created {new Date(je.createdAt).toLocaleString()}
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200/70 dark:border-gray-800 bg-white dark:bg-[#1C1C1F]">
        <table className="w-full text-left border-collapse font-mono text-xs">
          <thead>
            <tr className="border-b border-gray-200/70 dark:border-gray-800 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              <th className="py-2 px-3">Account Code</th>
              <th className="py-2 px-3">Account Title</th>
              <th className="py-2 px-3">Line Narration</th>
              <th className="py-2 px-3 text-right">Debit</th>
              <th className="py-2 px-3 text-right">Credit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {(je.lines || []).map((l: any) => (
              <tr key={l.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40">
                <td className="py-2 px-3 font-bold text-[var(--brand)]">{l.accountCode}</td>
                <td className="py-2 px-3 font-sans font-medium text-[var(--text)]">{l.accountName}</td>
                <td className="py-2 px-3 font-sans text-gray-500">{l.description || '—'}</td>
                <td className="py-2 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                  {l.debit > 0 ? `${currency}${Number(l.debit).toFixed(2)}` : '—'}
                </td>
                <td className="py-2 px-3 text-right font-bold text-rose-600 dark:text-rose-400">
                  {l.credit > 0 ? `${currency}${Number(l.credit).toFixed(2)}` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderJournalCard = (
    je: any,
    _isSelected: boolean,
    _onSelect: () => void,
    actionMenu?: React.ReactNode
  ) => (
    <div className="flex flex-col justify-between p-4 rounded-xl bg-white dark:bg-[#1C1C1F] border border-gray-200/80 dark:border-gray-800 shadow-xs space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-mono text-xs font-bold text-[var(--brand)]">{je.entryNumber}</span>
          <Chip size="sm" color={je.isReversed ? 'danger' : 'success'}>
            {je.isReversed ? 'Reversed' : 'Posted'}
          </Chip>
        </div>
        <div className="flex items-center gap-1">{actionMenu}</div>
      </div>

      <div>
        <p className="text-xs font-medium text-gray-900 dark:text-gray-100 line-clamp-2">
          {je.description}
        </p>
        {je.reference && (
          <span className="font-mono text-[11px] text-[var(--text-muted)] block mt-0.5">
            Ref: {je.reference}
          </span>
        )}
      </div>

      <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs">
        <span className="text-[var(--text-muted)]">
          {new Date(je.entryDate).toLocaleDateString()}
        </span>
        <span className="font-mono font-bold text-gray-900 dark:text-gray-100 tabular-nums">
          {currency}{Number(je.totalAmount || 0).toFixed(2)}
        </span>
      </div>
    </div>
  );

  // ─── GENERAL LEDGER DATATABLE COLUMNS ──────────────────────────────────────────
  const ledgerColumns: DataTableColumnDef<any>[] = useMemo(
    () => [
      {
        id: 'entryDate',
        header: 'Posting Date',
        accessorKey: 'entryDate',
        width: 125,
        sortable: true,
        priority: 1,
        cell: ({ row }) => (
          <span className="text-xs text-[var(--text-muted)] font-mono">
            {new Date(row.original.entryDate).toLocaleDateString()}
          </span>
        ),
      },
      {
        id: 'entryNumber',
        header: 'JE Number',
        accessorKey: 'entryNumber',
        width: 140,
        sortable: true,
        priority: 1,
        cell: ({ row }) => (
          <span className="font-mono text-xs font-bold text-[var(--brand)]">
            {row.original.entryNumber}
          </span>
        ),
      },
      {
        id: 'accountCode',
        header: 'GL Code',
        accessorKey: 'accountCode',
        width: 100,
        sortable: true,
        priority: 1,
        cell: ({ row }) => (
          <span className="font-mono text-xs font-bold text-gray-900 dark:text-gray-100">
            {row.original.accountCode}
          </span>
        ),
      },
      {
        id: 'accountName',
        header: 'Account Title',
        accessorKey: 'accountName',
        width: 220,
        priority: 1,
        cell: ({ row }) => (
          <span className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate block">
            {row.original.accountName}
          </span>
        ),
      },
      {
        id: 'accountType',
        header: 'Class',
        accessorKey: 'accountType',
        width: 110,
        priority: 2,
        filter: {
          type: 'select',
          options: [
            { value: 'ASSET', label: 'Asset' },
            { value: 'LIABILITY', label: 'Liability' },
            { value: 'EQUITY', label: 'Equity' },
            { value: 'REVENUE', label: 'Revenue' },
            { value: 'EXPENSE', label: 'Expense' },
          ],
        },
        cell: ({ row }) => {
          const t = row.original.accountType;
          return (
            <Chip
              size="sm"
              color={
                t === 'ASSET'
                  ? 'secondary'
                  : t === 'REVENUE'
                  ? 'success'
                  : t === 'EXPENSE'
                  ? 'danger'
                  : 'default'
              }
            >
              {t}
            </Chip>
          );
        },
      },
      {
        id: 'description',
        header: 'Narration / Source Document',
        accessorKey: 'description',
        width: 260,
        priority: 1,
        cell: ({ row }) => (
          <span className="text-xs text-[var(--text-secondary)] truncate block">
            {row.original.description || row.original.reference || '—'}
          </span>
        ),
      },
      {
        id: 'debit',
        header: 'Debit',
        accessorKey: 'debit',
        width: 130,
        align: 'right',
        sortable: true,
        priority: 1,
        cell: ({ row }) => (
          <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
            {row.original.debit > 0 ? `${currency}${Number(row.original.debit).toFixed(2)}` : '—'}
          </span>
        ),
      },
      {
        id: 'credit',
        header: 'Credit',
        accessorKey: 'credit',
        width: 130,
        align: 'right',
        sortable: true,
        priority: 1,
        cell: ({ row }) => (
          <span className="font-mono text-xs font-bold text-rose-600 dark:text-rose-400 tabular-nums">
            {row.original.credit > 0 ? `${currency}${Number(row.original.credit).toFixed(2)}` : '—'}
          </span>
        ),
      },
    ],
    [currency]
  );

  const renderLedgerCard = (row: any) => (
    <div className="p-4 rounded-xl bg-white dark:bg-[#1C1C1F] border border-gray-200/80 dark:border-gray-800 shadow-xs space-y-2.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-mono font-bold text-[var(--brand)]">{row.entryNumber}</span>
        <span className="text-[var(--text-muted)] font-mono">
          {new Date(row.entryDate).toLocaleDateString()}
        </span>
      </div>

      <div className="text-xs">
        <div className="font-semibold text-gray-900 dark:text-gray-100">
          {row.accountCode} — {row.accountName}
        </div>
        <p className="text-[11px] text-[var(--text-muted)] mt-0.5 truncate">
          {row.description || '—'}
        </p>
      </div>

      <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs font-mono font-bold">
        <span className="text-emerald-600 dark:text-emerald-400">
          Debit: {row.debit > 0 ? `${currency}${Number(row.debit).toFixed(2)}` : '—'}
        </span>
        <span className="text-rose-600 dark:text-rose-400">
          Credit: {row.credit > 0 ? `${currency}${Number(row.credit).toFixed(2)}` : '—'}
        </span>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 pb-12 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-[24px] leading-tight font-semibold text-[var(--text)] tracking-tight flex items-center gap-2">
            Accounting & General Ledger
            <Chip size="sm" color={dashboard?.isTrialBalanced ? 'success' : 'warning'}>
              {dashboard?.isTrialBalanced ? 'Balanced & Reconciled' : 'Reconciliation Pending'}
            </Chip>
          </h2>
          <p className="text-[13px] text-[var(--text-muted)] mt-0.5">
            Strict double-entry bookkeeping, chart of accounts, and financial statement reporting
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              loadOverview();
              journalsQuery.refetch();
              pagedLedgerQuery.refetch();
            }}
            disabled={loading || journalsQuery.isFetching || pagedLedgerQuery.isFetching}
          >
            <RefreshCw
              className={
                loading || journalsQuery.isFetching || pagedLedgerQuery.isFetching
                  ? 'animate-spin w-4 h-4'
                  : 'w-4 h-4'
              }
            />
            <span>Refresh</span>
          </Button>
          <Can permission="accounting.create">
            <Button variant="primary" size="sm" onClick={() => setIsNewJournalOpen(true)}>
              <Plus className="w-4 h-4" />
              <span>Post Manual Journal</span>
            </Button>
          </Can>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--border)] gap-6">
        {[
          { id: 'overview', label: 'Financial KPI' },
          { id: 'journal', label: 'Journal Entries' },
          { id: 'ledger', label: 'General Ledger' },
          { id: 'reports', label: 'Financial Reports' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-3 text-sm font-semibold transition-colors relative ${
              activeTab === tab.id
                ? 'text-[var(--brand)] font-bold'
                : 'text-[var(--text-muted)] hover:text-[var(--text)]'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--brand)] rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW KPI */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-card)]">
              <div className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Total Revenue</div>
              <div className="text-2xl font-bold text-[var(--text)] mt-1.5 text-emerald-600 dark:text-emerald-400">
                {currency}{dashboard?.totalRevenue?.toLocaleString() || '0.00'}
              </div>
              <div className="text-xs text-[var(--text-muted)] mt-1">Accrual-recognized revenue</div>
            </div>

            <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-card)]">
              <div className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Operating Expenses</div>
              <div className="text-2xl font-bold text-[var(--text)] mt-1.5 text-rose-600 dark:text-rose-400">
                {currency}{dashboard?.totalExpenses?.toLocaleString() || '0.00'}
              </div>
              <div className="text-xs text-[var(--text-muted)] mt-1">Transit, power, payroll & COGS</div>
            </div>

            <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-card)]">
              <div className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Net Operating Profit</div>
              <div className="text-2xl font-bold text-[var(--brand)] mt-1.5">
                {currency}{dashboard?.netProfit?.toLocaleString() || '0.00'}
              </div>
              <div className="text-xs text-[var(--text-muted)] mt-1">Bottom line margin</div>
            </div>

            <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-card)]">
              <div className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Cash & Bank Accounts</div>
              <div className="text-2xl font-bold text-[var(--text)] mt-1.5">
                {currency}{dashboard?.bankBalance?.toLocaleString() || '0.00'}
              </div>
              <div className="text-xs text-[var(--text-muted)] mt-1">ABA Bank & Bakong Wallet</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-card)]">
              <div className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Accounts Receivable (Subscribers)</div>
              <div className="text-xl font-bold text-amber-600 dark:text-amber-400">
                {currency}{dashboard?.accountsReceivable?.toLocaleString() || '0.00'}
              </div>
              <div className="text-xs text-[var(--text-muted)] mt-1">Unpaid subscriber invoices</div>
            </div>

            <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-card)]">
              <div className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Accounts Payable (Hardware Suppliers)</div>
              <div className="text-xl font-bold text-rose-600 dark:text-rose-400">
                {currency}{dashboard?.accountsPayable?.toLocaleString() || '0.00'}
              </div>
              <div className="text-xs text-[var(--text-muted)] mt-1">Vendor balances pending disbursement</div>
            </div>
          </div>

          {/* Chart of Accounts Grid */}
          <div className="p-5 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-card)]">
            <h3 className="text-sm font-bold text-[var(--text)] uppercase tracking-wider mb-3">Chart of Accounts Directory</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[var(--text-muted)] font-semibold">
                    <th className="py-2 px-3">Code</th>
                    <th className="py-2 px-3">Account Title</th>
                    <th className="py-2 px-3">Classification</th>
                    <th className="py-2 px-3 text-right">Current Ledger Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] font-mono">
                  <TableStateBody
                    colSpan={4}
                    loading={loading}
                    hasData={accounts.length > 0}
                    error={loadError}
                    onRetry={loadOverview}
                    emptyTitle="No chart of accounts configured"
                    emptyDescription="GL accounts will appear here once initialized."
                  >
                    {accounts.map((acc) => (
                      <tr key={acc.code} className="hover:bg-[var(--surface-hover)]">
                        <td className="py-2.5 px-3 font-bold text-[var(--brand)]">{acc.code}</td>
                        <td className="py-2.5 px-3 font-sans font-medium text-[var(--text)]">{acc.name}</td>
                        <td className="py-2.5 px-3">
                          <Chip size="sm" color={acc.type === 'ASSET' ? 'secondary' : acc.type === 'REVENUE' ? 'success' : acc.type === 'EXPENSE' ? 'danger' : 'default'}>
                            {acc.type}
                          </Chip>
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-[var(--text)]">
                          {currency}{Number(acc.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </TableStateBody>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* USER REQUEST: TAB 2 - JOURNAL ENTRIES DATATABLE */}
      {activeTab === 'journal' && (
        <DataTable
          columns={journalColumns}
          data={journalsQuery.data?.items ?? []}
          serverMode={true}
          total={journalsQuery.data?.total ?? 0}
          onQueryChange={(next) => setJournalQuery(next)}
          loading={journalsQuery.isLoading}
          fetching={journalsQuery.isFetching}
          error={journalsQuery.error ? 'Unable to load journal entries.' : null}
          onRetry={() => journalsQuery.refetch()}
          onRefresh={() => journalsQuery.refetch()}
          rowId={(row) => row.id}
          viewKey="accounting_journals_table"
          searchPlaceholder="Search entry number, source reference, or narration..."
          rowActions={getJournalRowActions}
          renderExpanded={renderJournalExpanded}
          renderCard={renderJournalCard}
          noDataTitle="No journal entries posted yet"
          noDataDescription="Invoices, collections, and manual adjustments create immutable journal records here."
          emptyTitle="No matching journal entries"
          emptySubtitle="Try adjusting search or status filters."
          onAddNew={canCreateJournal ? () => setIsNewJournalOpen(true) : undefined}
          addNewLabel="Post Manual Journal"
        />
      )}

      {/* USER REQUEST: TAB 3 - GENERAL LEDGER DATATABLE */}
      {activeTab === 'ledger' && (
        <DataTable
          columns={ledgerColumns}
          data={pagedLedgerQuery.data?.items ?? []}
          serverMode={true}
          total={pagedLedgerQuery.data?.total ?? 0}
          onQueryChange={(next) => setLedgerQuery(next)}
          loading={pagedLedgerQuery.isLoading}
          fetching={pagedLedgerQuery.isFetching}
          error={pagedLedgerQuery.error ? 'Unable to load general ledger transactions.' : null}
          onRetry={() => pagedLedgerQuery.refetch()}
          onRefresh={() => pagedLedgerQuery.refetch()}
          rowId={(row) => row.id}
          viewKey="accounting_ledger_table"
          searchPlaceholder="Search GL code, account title, or narration..."
          renderCard={renderLedgerCard}
          noDataTitle="No general ledger transactions yet"
          noDataDescription="Postings across all debit and credit lines will appear here in chronological order."
          emptyTitle="No matching ledger transactions"
          emptySubtitle="Try clearing account filters or modifying your search."
        />
      )}

      {/* TAB 4: FINANCIAL REPORTS (Trial Balance, P&L, Balance Sheet) */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="p-5 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-[var(--text)] uppercase tracking-wider flex items-center gap-2">
                <Scale className="w-4 h-4 text-[var(--brand)]" />
                Trial Balance Reconciliation
              </h3>
              <Chip size="sm" color={trialBalance?.isBalanced ? 'success' : 'danger'}>
                {trialBalance?.isBalanced ? 'STRICTLY BALANCED' : 'UNBALANCED'}
              </Chip>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[var(--text-muted)]">
                    <th className="py-2 px-3">Code</th>
                    <th className="py-2 px-3">Account</th>
                    <th className="py-2 px-3 text-right">Debit Total</th>
                    <th className="py-2 px-3 text-right">Credit Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  <TableStateBody
                    colSpan={4}
                    loading={loading}
                    hasData={Boolean(trialBalance?.rows?.length)}
                    error={loadError}
                    onRetry={loadOverview}
                    emptyTitle="No trial balance entries yet"
                    emptyDescription="Trial balance rows appear after ledger postings."
                  >
                    {(trialBalance?.rows || []).map((r: any) => (
                      <tr key={r.code}>
                        <td className="py-2 px-3 font-bold text-[var(--brand)]">{r.code}</td>
                        <td className="py-2 px-3 font-sans">{r.name}</td>
                        <td className="py-2 px-3 text-right">{r.debit > 0 ? `${currency}${r.debit.toFixed(2)}` : '-'}</td>
                        <td className="py-2 px-3 text-right">{r.credit > 0 ? `${currency}${r.credit.toFixed(2)}` : '-'}</td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-[var(--border)] font-bold text-sm bg-[var(--surface-hover)]">
                      <td colSpan={2} className="py-3 px-3">RECONCILED TOTALS</td>
                      <td className="py-3 px-3 text-right text-emerald-600 dark:text-emerald-400">
                        {currency}{Number(trialBalance?.totalDebit ?? 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right text-rose-600 dark:text-rose-400">
                        {currency}{Number(trialBalance?.totalCredit ?? 0).toFixed(2)}
                      </td>
                    </tr>
                  </TableStateBody>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* POST NEW JOURNAL MODAL */}
      <Modal
        isOpen={isNewJournalOpen}
        onClose={() => setIsNewJournalOpen(false)}
        size="lg"
        title="Post Double-Entry Journal Entry"
        subtitle="Create an audited debit and credit posting to the general ledger"
        icon={<BookOpen className="w-5 h-5 text-[#F26B3A]" />}
      >
        <form onSubmit={handlePostJournal} className="space-y-4 text-xs">
          <Field label="Journal Description / Narration" required>
            <Input
              placeholder="e.g. Monthly tower site electricity payment"
              value={journalDesc}
              onChange={(e) => setJournalDesc(e.target.value)}
              required
            />
          </Field>

          <Field label="Reference Document (Optional)">
            <Input
              placeholder="e.g. EDC-INV-99234"
              value={journalRef}
              onChange={(e) => setJournalRef(e.target.value)}
            />
          </Field>

          <div className="space-y-2">
            <label className="font-semibold text-[var(--text)]">Journal Entry Lines (Debits & Credits)</label>
            {journalLines.map((line, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-[var(--surface-hover)] p-2.5 rounded-lg border border-[var(--border)]">
                <div className="col-span-5">
                  <Combobox
                    options={accountOptions}
                    value={line.accountCode}
                    onChange={(val) => {
                      const updated = [...journalLines];
                      updated[idx].accountCode = val;
                      setJournalLines(updated);
                    }}
                    searchable={true}
                    clearable={false}
                    placeholder="Select account..."
                    size="sm"
                    popoverWidth="min(440px, calc(100vw - 24px))"
                  />
                </div>
                <div className="col-span-3">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Debit"
                    className="w-full text-xs p-1.5 rounded bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] font-mono"
                    value={line.debit || ''}
                    onChange={(e) => {
                      const updated = [...journalLines];
                      updated[idx].debit = parseFloat(e.target.value) || 0;
                      if (updated[idx].debit > 0) updated[idx].credit = 0;
                      setJournalLines(updated);
                    }}
                  />
                </div>
                <div className="col-span-3">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Credit"
                    className="w-full text-xs p-1.5 rounded bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] font-mono"
                    value={line.credit || ''}
                    onChange={(e) => {
                      const updated = [...journalLines];
                      updated[idx].credit = parseFloat(e.target.value) || 0;
                      if (updated[idx].credit > 0) updated[idx].debit = 0;
                      setJournalLines(updated);
                    }}
                  />
                </div>
                <div className="col-span-1 text-center">
                  {journalLines.length > 2 && (
                    <button
                      type="button"
                      onClick={() => setJournalLines(journalLines.filter((_, i) => i !== idx))}
                      className="text-rose-500 font-bold hover:text-rose-700"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setJournalLines([...journalLines, { accountCode: '1010', debit: 0, credit: 0, description: '' }])
              }
            >
              + Add Entry Line
            </Button>
          </div>

          <div className="p-3 rounded-lg bg-[var(--surface-hover)] border border-[var(--border)] flex items-center justify-between font-mono">
            <div>
              <span>Debits: <strong>{currency}{totalDebit.toFixed(2)}</strong></span>
              <span className="ml-4">Credits: <strong>{currency}{totalCredit.toFixed(2)}</strong></span>
            </div>
            <Chip size="sm" color={isBalanced ? 'success' : 'danger'}>
              {isBalanced ? 'Balanced' : 'Out of Balance'}
            </Chip>
          </div>

          <ModalFooter
            onCancel={() => setIsNewJournalOpen(false)}
            cancelText="Cancel"
            submitText="Post Journal"
            onSubmit={handlePostJournal}
            isSubmitting={isPostingJournal}
            submitDisabled={!isBalanced || !journalDesc.trim()}
          />
        </form>
      </Modal>

      {/* REVERSE JOURNAL MODAL (Replaces intrusive window.prompt) */}
      <Modal
        isOpen={Boolean(reversalTarget)}
        onClose={() => setReversalTarget(null)}
        size="md"
        title="Reverse Journal Entry"
        subtitle={`Create an audited counter-entry for ${reversalTarget?.entryNumber}`}
        icon={<RotateCcw className="w-5 h-5 text-rose-500" />}
      >
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-gray-50 dark:bg-zinc-800/50 border border-gray-200/60 dark:border-zinc-700 text-xs space-y-1">
            <div className="font-semibold text-gray-900 dark:text-gray-100">
              Entry: {reversalTarget?.entryNumber}
            </div>
            <div className="text-[var(--text-muted)]">
              {reversalTarget?.description}
            </div>
            <div className="font-mono font-bold text-gray-900 dark:text-gray-100 pt-1">
              Amount: {currency}{Number(reversalTarget?.totalAmount || 0).toFixed(2)}
            </div>
          </div>

          <Field label="Reversal Reason" required>
            <Textarea
              value={reversalReason}
              onChange={(e) => setReversalReason(e.target.value)}
              placeholder="State the reason for this reversal (e.g. Invoicing error, billing period correction)..."
              rows={3}
              required
            />
          </Field>

          <ModalFooter
            onCancel={() => setReversalTarget(null)}
            cancelText="Cancel"
            submitText="Confirm Reversal"
            onSubmit={handleConfirmReverse}
            isSubmitting={isReversing}
            submitDisabled={!reversalReason.trim()}
          />
        </div>
      </Modal>
    </div>
  );
};
