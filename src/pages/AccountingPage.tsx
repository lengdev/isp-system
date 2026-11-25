import React, { useState, useEffect, useMemo } from 'react';
import {
  DollarSign,
  TrendingUp,
  Receipt,
  CreditCard,
  Building,
  CheckCircle2,
  AlertCircle,
  Plus,
  RefreshCw,
  RotateCcw,
  BookOpen,
  PieChart,
  FileSpreadsheet,
  ArrowRight,
  ShieldCheck,
  Scale,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Chip } from '../components/ui/Chip';
import { Field, Input } from '../components/ui/Field';
import { Modal } from '../components/ui/Modal';
import { Combobox, ComboboxOption } from '../components/ui/Combobox';
import { TableStateBody } from '../components/ui/TableState';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
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
  const [ledger, setLedger] = useState<any[]>([]);
  const [trialBalance, setTrialBalance] = useState<any>(null);
  const [pnl, setPnl] = useState<any>(null);
  const [balanceSheet, setBalanceSheet] = useState<any>(null);
  const [arAging, setArAging] = useState<any>(null);

  // New Journal Entry Modal State
  const [isNewJournalOpen, setIsNewJournalOpen] = useState(false);
  const [journalDesc, setJournalDesc] = useState('');
  const [journalRef, setJournalRef] = useState('');
  const [journalLines, setJournalLines] = useState<
    { accountCode: string; debit: number; credit: number; description: string }[]
  >([
    { accountCode: '1020', debit: 0, credit: 0, description: '' },
    { accountCode: '4010', debit: 0, credit: 0, description: '' },
  ]);

  const accountOptions: ComboboxOption[] = useMemo(
    () => accounts.map((acc) => ({ value: acc.code, label: `${acc.code} - ${acc.name}` })),
    [accounts]
  );

  const loadData = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [dashRes, accRes, tbRes, pnlRes, bsRes, arRes, ledgerRes] = await Promise.all([
        api.accounting.getDashboard(),
        api.accounting.getAccounts(),
        api.accounting.getTrialBalance(),
        api.accounting.getPnL(),
        api.accounting.getBalanceSheet(),
        api.accounting.getArAging(),
        api.accounting.getLedger(),
      ]);

      if (dashRes) setDashboard(dashRes);
      if (accRes) setAccounts(accRes);
      if (tbRes) setTrialBalance(tbRes);
      if (pnlRes) setPnl(pnlRes);
      if (bsRes) setBalanceSheet(bsRes);
      if (arRes) setArAging(arRes);
      if (ledgerRes) setLedger(ledgerRes);
    } catch (err: any) {
      setLoadError('Unable to load accounting ledger data.');
      addToast({ type: 'error', title: 'Failed to load accounting data', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalDebit = journalLines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
  const totalCredit = journalLines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  const handlePostJournal = async () => {
    if (!journalDesc) {
      addToast({ type: 'error', title: 'Description is required' });
      return;
    }
    if (!isBalanced) {
      addToast({
        type: 'error',
        title: 'Unbalanced Journal',
        message: `Total Debits ($${totalDebit.toFixed(2)}) must equal Total Credits ($${totalCredit.toFixed(2)})`,
      });
      return;
    }

    try {
      await api.accounting.postJournal({
        description: journalDesc,
        reference: journalRef || undefined,
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
      loadData();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Posting Failed', message: err.message });
    }
  };

  const handleReverseJournal = async (entryNumber: string) => {
    const reason = window.prompt(`Please enter the reversal reason for journal ${entryNumber}:`);
    if (!reason) return;

    try {
      await api.accounting.reverseJournal(entryNumber, reason);
      addToast({ type: 'success', title: 'Journal Reversed', message: `Counter-entry posted for ${entryNumber}.` });
      loadData();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Reversal Failed', message: err.message });
    }
  };

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
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className={loading ? 'animate-spin w-4 h-4' : 'w-4 h-4'} />
            <span>Refresh Ledger</span>
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
              <div className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Total Revenue (MRR + Sales)</div>
              <div className="text-2xl font-bold text-[var(--text)] mt-1.5 text-emerald-600 dark:text-emerald-400">
                {currency}{dashboard?.totalRevenue?.toLocaleString() || '0.00'}
              </div>
              <div className="text-xs text-[var(--text-muted)] mt-1">Accrual-recognized income</div>
            </div>

            <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-card)]">
              <div className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Total Operating Expenses</div>
              <div className="text-2xl font-bold text-[var(--text)] mt-1.5 text-rose-600 dark:text-rose-400">
                {currency}{dashboard?.totalExpenses?.toLocaleString() || '0.00'}
              </div>
              <div className="text-xs text-[var(--text-muted)] mt-1">Transit, payroll, power, COGS</div>
            </div>

            <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-card)]">
              <div className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Net Operating Profit</div>
              <div className="text-2xl font-bold text-[var(--brand)] mt-1.5">
                {currency}{dashboard?.netProfit?.toLocaleString() || '0.00'}
              </div>
              <div className="text-xs text-[var(--text-muted)] mt-1">P&L bottom line margin</div>
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
              <div className="text-xs text-[var(--text-muted)] mt-1">Billed subscriber invoices pending collection</div>
            </div>

            <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-card)]">
              <div className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Accounts Payable (Hardware Suppliers)</div>
              <div className="text-xl font-bold text-rose-600 dark:text-rose-400">
                {currency}{dashboard?.accountsPayable?.toLocaleString() || '0.00'}
              </div>
              <div className="text-xs text-[var(--text-muted)] mt-1">Bills owed to Huawei, MikroTik & transit carriers</div>
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
                    onRetry={loadData}
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

      {/* TAB 2: JOURNAL ENTRIES */}
      {activeTab === 'journal' && (
        <div className="space-y-4">
          <div className="p-5 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-[var(--text)] uppercase tracking-wider">Posted Journal Entries</h3>
              <span className="text-xs text-[var(--text-muted)]">Immutable Double-Entry Ledger</span>
            </div>

            {loading && !(dashboard?.recentJournals?.length) ? (
              <div className="space-y-3 py-2">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            ) : loadError && !(dashboard?.recentJournals?.length) ? (
              <EmptyState
                variant="error"
                title="Unable to load journal entries"
                description="Failed to fetch double-entry journal records."
                primaryAction={{ label: 'Retry', onClick: loadData }}
              />
            ) : !(dashboard?.recentJournals?.length) ? (
              <EmptyState
                variant="no-data"
                title="No journal entries posted yet"
                description="Invoices, customer payments, and manual adjustments create immutable journal entries here."
                primaryAction={
                  canCreateJournal
                    ? {
                        label: 'Post Manual Journal',
                        onClick: () => setIsNewJournalOpen(true),
                        permission: 'accounting.create',
                      }
                    : undefined
                }
              />
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {(dashboard?.recentJournals || []).map((je: any) => (
                  <div key={je.id} className="py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[var(--brand)]">{je.entryNumber}</span>
                        {je.isReversed ? (
                          <Chip size="sm" color="danger">Reversed ({je.reversalEntryId})</Chip>
                        ) : (
                          <Chip size="sm" color="success">Posted & Locked</Chip>
                        )}
                        <span className="text-xs text-[var(--text-muted)]">{new Date(je.entryDate).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm font-medium text-[var(--text)] mt-1">{je.description}</p>
                      {je.reference && <span className="font-mono text-[11px] text-[var(--text-muted)]">Source Ref: {je.reference}</span>}
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <span className="font-mono text-sm font-bold text-[var(--text)]">
                        {currency}{Number(je.totalAmount || 0).toFixed(2)}
                      </span>
                      {!je.isReversed && canDeleteJournal && (
                        <Button variant="outline" size="sm" onClick={() => handleReverseJournal(je.entryNumber)}>
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reverse</span>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: GENERAL LEDGER */}
      {activeTab === 'ledger' && (
        <div className="p-5 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-card)]">
          <h3 className="text-sm font-bold text-[var(--text)] uppercase tracking-wider mb-4">General Ledger Transaction Audit</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-[var(--border)] text-[var(--text-muted)] font-semibold">
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3">Entry #</th>
                  <th className="py-2 px-3">Account</th>
                  <th className="py-2 px-3">Narration</th>
                  <th className="py-2 px-3 text-right">Debit</th>
                  <th className="py-2 px-3 text-right">Credit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                <TableStateBody
                  colSpan={6}
                  loading={loading}
                  hasData={ledger.length > 0}
                  error={loadError}
                  onRetry={loadData}
                  emptyTitle="No ledger transactions yet"
                  emptyDescription="General ledger debit and credit postings will appear here."
                >
                  {ledger.map((row: any) => (
                    <tr key={row.id} className="hover:bg-[var(--surface-hover)]">
                      <td className="py-2 px-3 text-[var(--text-muted)]">{new Date(row.entryDate).toLocaleDateString()}</td>
                      <td className="py-2 px-3 text-[var(--brand)] font-bold">{row.entryNumber}</td>
                      <td className="py-2 px-3 text-[var(--text)] font-semibold">{row.accountCode} - {row.accountName}</td>
                      <td className="py-2 px-3 font-sans text-[var(--text-secondary)]">{row.description}</td>
                      <td className="py-2 px-3 text-right text-emerald-600 dark:text-emerald-400 font-bold">
                        {row.debit > 0 ? `${currency}${Number(row.debit).toFixed(2)}` : '-'}
                      </td>
                      <td className="py-2 px-3 text-right text-rose-600 dark:text-rose-400 font-bold">
                        {row.credit > 0 ? `${currency}${Number(row.credit).toFixed(2)}` : '-'}
                      </td>
                    </tr>
                  ))}
                </TableStateBody>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: FINANCIAL REPORTS (Trial Balance, P&L, Balance Sheet) */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          {/* Trial Balance Card */}
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
                    onRetry={loadData}
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
      <Modal isOpen={isNewJournalOpen} onClose={() => setIsNewJournalOpen(false)} title="Post Double-Entry Journal Entry">
        <div className="space-y-4 text-xs">
          <Field label="Journal Description / Narration">
            <Input
              placeholder="e.g. Monthly tower site electricity payment"
              value={journalDesc}
              onChange={(e) => setJournalDesc(e.target.value)}
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
                    searchable={accountOptions.length > 6}
                    clearable={false}
                    placeholder="Select account..."
                    size="sm"
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
              <span>Debits: <strong>${totalDebit.toFixed(2)}</strong></span>
              <span className="ml-4">Credits: <strong>${totalCredit.toFixed(2)}</strong></span>
            </div>
            <Chip size="sm" color={isBalanced ? 'success' : 'danger'}>
              {isBalanced ? 'Balanced' : 'Out of Balance'}
            </Chip>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsNewJournalOpen(false)}>Cancel</Button>
            <Button variant="primary" disabled={!isBalanced || !journalDesc} onClick={handlePostJournal}>Post Journal</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
