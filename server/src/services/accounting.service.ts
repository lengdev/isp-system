import { dbStore } from '../db/store.js';

export interface JournalLineInput {
  accountCode: string; // e.g. "1100"
  debit: number;
  credit: number;
  description?: string;
}

export interface PostJournalInput {
  description: string;
  reference?: string; // e.g. "INV-2026-0001", "PAY-2026-001"
  lines: JournalLineInput[];
  createdBy?: string;
  periodId?: string;
}

export class AccountingService {
  // 1. Get Chart of Accounts with Live Balances
  static getChartOfAccounts() {
    return dbStore.accounts;
  }

  // 2. Post a Double-Entry Journal (Strict validation: Debits === Credits)
  static postJournalEntry(input: PostJournalInput) {
    if (!input.lines || input.lines.length < 2) {
      throw new Error('A valid double-entry journal must have at least two entry lines (Debit and Credit).');
    }

    let totalDebit = 0;
    let totalCredit = 0;

    for (const line of input.lines) {
      const debit = Number(line.debit) || 0;
      const credit = Number(line.credit) || 0;
      if (debit < 0 || credit < 0) {
        throw new Error('Debit and credit values cannot be negative.');
      }
      if (debit > 0 && credit > 0) {
        throw new Error('An entry line cannot have both debit and credit amounts.');
      }
      totalDebit += debit;
      totalCredit += credit;
    }

    // Round to 2 decimal places to prevent floating-point mismatch
    const roundedDebit = Math.round(totalDebit * 100) / 100;
    const roundedCredit = Math.round(totalCredit * 100) / 100;

    if (Math.abs(roundedDebit - roundedCredit) > 0.001) {
      throw new Error(
        `Unbalanced Journal Entry! Total Debits ($${roundedDebit.toFixed(2)}) must equal Total Credits ($${roundedCredit.toFixed(2)}). Difference: $${Math.abs(roundedDebit - roundedCredit).toFixed(2)}`
      );
    }

    const entryId = `je-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const entryNumber = `JE-2026-${(dbStore.journalEntries.length + 1).toString().padStart(5, '0')}`;
    const period = input.periodId || new Date().toISOString().slice(0, 7);

    const newEntry = {
      id: entryId,
      entryNumber,
      periodId: period,
      entryDate: new Date().toISOString(),
      description: input.description,
      reference: input.reference || null,
      isPosted: true,
      isReversed: false,
      reversalEntryId: null,
      createdBy: input.createdBy || 'System',
      createdAt: new Date().toISOString(),
      totalAmount: roundedDebit,
    };

    dbStore.journalEntries.unshift(newEntry);

    // Create Lines and Update Account Balances
    const createdLines = [];
    for (const line of input.lines) {
      const debit = Number(line.debit) || 0;
      const credit = Number(line.credit) || 0;

      const account = dbStore.accounts.find((a) => a.code === line.accountCode);
      if (!account) {
        throw new Error(`Chart of Accounts code '${line.accountCode}' not found.`);
      }

      const lineId = `jel-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      const entryLine = {
        id: lineId,
        journalEntryId: entryId,
        accountId: account.id,
        accountCode: account.code,
        accountName: account.name,
        accountType: account.type,
        debit,
        credit,
        description: line.description || input.description,
      };

      dbStore.journalLines.push(entryLine);
      createdLines.push(entryLine);

      // Apply balance based on account standard normal balance:
      // Assets & Expenses: Balance = Debit - Credit
      // Liabilities, Equity, Revenue: Balance = Credit - Debit
      if (account.type === 'ASSET' || account.type === 'EXPENSE') {
        account.balance += debit - credit;
      } else {
        account.balance += credit - debit;
      }
    }

    dbStore.logAudit(
      'POST_JOURNAL',
      'JournalEntry',
      entryNumber,
      `Posted journal ${entryNumber}: ${input.description} (Amount: $${roundedDebit.toFixed(2)})`,
      input.createdBy || 'System'
    );

    return {
      entry: newEntry,
      lines: createdLines,
    };
  }

  // 3. Reverse a Posted Journal Entry (Maintains Immutable Audit Trail)
  static reverseJournalEntry(entryNumber: string, reason: string, actor: string = 'Accountant') {
    const entry = dbStore.journalEntries.find((e) => e.entryNumber === entryNumber);
    if (!entry) throw new Error(`Journal entry ${entryNumber} not found.`);
    if (entry.isReversed) throw new Error(`Journal entry ${entryNumber} has already been reversed.`);

    const originalLines = dbStore.journalLines.filter((l) => l.journalEntryId === entry.id);

    // Swap debits and credits for exact reversal
    const reversalLines: JournalLineInput[] = originalLines.map((l) => ({
      accountCode: l.accountCode,
      debit: l.credit, // Credit becomes Debit
      credit: l.debit, // Debit becomes Credit
      description: `Reversal of ${entryNumber}: ${l.description}`,
    }));

    const reversal = this.postJournalEntry({
      description: `REVERSAL of ${entryNumber} - Reason: ${reason}`,
      reference: `REV-${entryNumber}`,
      lines: reversalLines,
      createdBy: actor,
      periodId: entry.periodId,
    });

    entry.isReversed = true;
    entry.reversalEntryId = reversal.entry.entryNumber;

    dbStore.logAudit(
      'REVERSE_JOURNAL',
      'JournalEntry',
      entryNumber,
      `Reversed journal ${entryNumber} via replacement entry ${reversal.entry.entryNumber}. Reason: ${reason}`,
      actor
    );

    return reversal;
  }

  // 4. General Ledger
  static getGeneralLedger(filters?: { accountCode?: string; startDate?: string; endDate?: string }) {
    let lines = [...dbStore.journalLines];

    if (filters?.accountCode) {
      lines = lines.filter((l) => l.accountCode === filters.accountCode);
    }

    return lines.map((l) => {
      const parentEntry = dbStore.journalEntries.find((e) => e.id === l.journalEntryId);
      return {
        ...l,
        entryNumber: parentEntry?.entryNumber,
        entryDate: parentEntry?.entryDate,
        reference: parentEntry?.reference,
        isReversed: parentEntry?.isReversed,
      };
    });
  }

  // 5. Trial Balance (Must balance: Total Debits == Total Credits)
  static getTrialBalance() {
    let totalDebit = 0;
    let totalCredit = 0;

    const rows = dbStore.accounts.map((acc) => {
      const lines = dbStore.journalLines.filter((l) => l.accountId === acc.id);
      const debitSum = lines.reduce((sum, l) => sum + (l.debit || 0), 0);
      const creditSum = lines.reduce((sum, l) => sum + (l.credit || 0), 0);

      let closingDebit = 0;
      let closingCredit = 0;

      if (acc.type === 'ASSET' || acc.type === 'EXPENSE') {
        const net = debitSum - creditSum;
        if (net >= 0) closingDebit = net;
        else closingCredit = Math.abs(net);
      } else {
        const net = creditSum - debitSum;
        if (net >= 0) closingCredit = net;
        else closingDebit = Math.abs(net);
      }

      totalDebit += closingDebit;
      totalCredit += closingCredit;

      return {
        code: acc.code,
        name: acc.name,
        type: acc.type,
        debit: closingDebit,
        credit: closingCredit,
      };
    });

    return {
      rows,
      totalDebit: Math.round(totalDebit * 100) / 100,
      totalCredit: Math.round(totalCredit * 100) / 100,
      isBalanced: Math.abs(totalDebit - totalCredit) < 0.01,
    };
  }

  // 6. Profit and Loss (Income Statement)
  static getProfitAndLoss() {
    const revenueAccounts = dbStore.accounts.filter((a) => a.type === 'REVENUE');
    const expenseAccounts = dbStore.accounts.filter((a) => a.type === 'EXPENSE');

    let totalRevenue = 0;
    const revenues = revenueAccounts.map((a) => {
      const lines = dbStore.journalLines.filter((l) => l.accountId === a.id);
      const net = lines.reduce((sum, l) => sum + (l.credit - l.debit), 0);
      totalRevenue += net;
      return { code: a.code, name: a.name, amount: net };
    });

    let totalExpenses = 0;
    const expenses = expenseAccounts.map((a) => {
      const lines = dbStore.journalLines.filter((l) => l.accountId === a.id);
      const net = lines.reduce((sum, l) => sum + (l.debit - l.credit), 0);
      totalExpenses += net;
      return { code: a.code, name: a.name, amount: net };
    });

    const netProfit = totalRevenue - totalExpenses;

    return {
      revenues,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      expenses,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      netProfit: Math.round(netProfit * 100) / 100,
    };
  }

  // 7. Balance Sheet (Assets = Liabilities + Equity)
  static getBalanceSheet() {
    const assetAccounts = dbStore.accounts.filter((a) => a.type === 'ASSET');
    const liabilityAccounts = dbStore.accounts.filter((a) => a.type === 'LIABILITY');
    const equityAccounts = dbStore.accounts.filter((a) => a.type === 'EQUITY');

    let totalAssets = 0;
    const assets = assetAccounts.map((a) => {
      const lines = dbStore.journalLines.filter((l) => l.accountId === a.id);
      const net = lines.reduce((sum, l) => sum + (l.debit - l.credit), 0);
      totalAssets += net;
      return { code: a.code, name: a.name, amount: net };
    });

    let totalLiabilities = 0;
    const liabilities = liabilityAccounts.map((a) => {
      const lines = dbStore.journalLines.filter((l) => l.accountId === a.id);
      const net = lines.reduce((sum, l) => sum + (l.credit - l.debit), 0);
      totalLiabilities += net;
      return { code: a.code, name: a.name, amount: net };
    });

    // P&L Net Profit roll into Retained Earnings
    const pnl = this.getProfitAndLoss();
    let totalEquity = pnl.netProfit;

    const equity = equityAccounts.map((a) => {
      const lines = dbStore.journalLines.filter((l) => l.accountId === a.id);
      const net = lines.reduce((sum, l) => sum + (l.credit - l.debit), 0);
      totalEquity += net;
      return { code: a.code, name: a.name, amount: net };
    });

    equity.push({
      code: '3020-CURR',
      name: 'Current Period Net Operating Income (P&L)',
      amount: pnl.netProfit,
    });

    const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

    return {
      assets,
      totalAssets: Math.round(totalAssets * 100) / 100,
      liabilities,
      totalLiabilities: Math.round(totalLiabilities * 100) / 100,
      equity,
      totalEquity: Math.round(totalEquity * 100) / 100,
      totalLiabilitiesAndEquity: Math.round(totalLiabilitiesAndEquity * 100) / 100,
      isBalanced: Math.abs(totalAssets - totalLiabilitiesAndEquity) < 0.1,
    };
  }

  // 8. Accounting Overview KPI Dashboard
  static getAccountingDashboard() {
    const pnl = this.getProfitAndLoss();
    const trial = this.getTrialBalance();

    const pettyCash = dbStore.accounts.find((a) => a.code === '1010')?.balance || 0;
    const bankAba = dbStore.accounts.find((a) => a.code === '1020')?.balance || 0;
    const bakongWallet = dbStore.accounts.find((a) => a.code === '1030')?.balance || 0;
    const arSubscribers = dbStore.accounts.find((a) => a.code === '1100')?.balance || 0;
    const apSuppliers = dbStore.accounts.find((a) => a.code === '2010')?.balance || 0;
    const inventoryVal = dbStore.accounts.find((a) => a.code === '1200')?.balance || 0;

    return {
      totalRevenue: pnl.totalRevenue,
      totalExpenses: pnl.totalExpenses,
      netProfit: pnl.netProfit,
      accountsReceivable: Math.round(arSubscribers * 100) / 100,
      accountsPayable: Math.round(apSuppliers * 100) / 100,
      cashBalance: Math.round(pettyCash * 100) / 100,
      bankBalance: Math.round((bankAba + bakongWallet) * 100) / 100,
      inventoryValuation: Math.round(inventoryVal * 100) / 100,
      isTrialBalanced: trial.isBalanced,
      recentJournals: dbStore.journalEntries.slice(0, 10),
    };
  }

  // 9. Accounts Receivable Aging
  static getArAging() {
    const overdueInvoices = dbStore.invoices.filter((i) => i.status !== 'PAID');
    const now = new Date();

    const aging = {
      current: 0,
      days1To30: 0,
      days31To60: 0,
      days61To90: 0,
      daysOver90: 0,
      totalOutstanding: 0,
      invoices: [] as any[],
    };

    for (const inv of overdueInvoices) {
      const due = new Date(inv.dueDate);
      const diffDays = Math.floor((now.getTime() - due.getTime()) / (1000 * 3600 * 24));
      const balance = Number(inv.balanceDue);

      aging.totalOutstanding += balance;

      let bucket = 'Current';
      if (diffDays <= 0) {
        aging.current += balance;
      } else if (diffDays <= 30) {
        aging.days1To30 += balance;
        bucket = '1 - 30 Days';
      } else if (diffDays <= 60) {
        aging.days31To60 += balance;
        bucket = '31 - 60 Days';
      } else if (diffDays <= 90) {
        aging.days61To90 += balance;
        bucket = '61 - 90 Days';
      } else {
        aging.daysOver90 += balance;
        bucket = '90+ Days';
      }

      const cust = dbStore.customers.find((c) => c.id === inv.customerId);

      aging.invoices.push({
        invoiceNumber: inv.invoiceNumber,
        customerId: inv.customerId,
        customerName: cust?.fullName || 'Customer',
        amount: inv.amount,
        balanceDue: inv.balanceDue,
        dueDate: inv.dueDate,
        diffDays: Math.max(0, diffDays),
        bucket,
      });
    }

    return aging;
  }
}
