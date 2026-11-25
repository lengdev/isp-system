import { Prisma } from '@prisma/client';
import { prisma, logAudit } from '../db/store.js';

export interface JournalLineInput {
  accountCode: string;
  debit: number;
  credit: number;
  description?: string;
}

export interface PostJournalInput {
  description: string;
  reference?: string;
  lines: JournalLineInput[];
  createdBy?: string;
  periodId?: string;
}

async function resolveOrCreatePeriod(tx: Prisma.TransactionClient, periodInput?: string): Promise<string | null> {
  const periodName = (periodInput || new Date().toISOString().slice(0, 7)).trim();
  if (!periodName) return null;

  const existingById = await tx.accountingPeriod.findUnique({ where: { id: periodName } });
  if (existingById) return existingById.id;

  const existingByName = await tx.accountingPeriod.findUnique({ where: { name: periodName } });
  if (existingByName) return existingByName.id;

  const yearMonth = /^(\d{4})-(\d{2})$/.exec(periodName);
  const startDate = yearMonth
    ? new Date(Date.UTC(Number(yearMonth[1]), Number(yearMonth[2]) - 1, 1))
    : new Date();
  const endDate = yearMonth
    ? new Date(Date.UTC(Number(yearMonth[1]), Number(yearMonth[2]), 0, 23, 59, 59))
    : new Date();

  const created = await tx.accountingPeriod.create({
    data: {
      name: periodName,
      startDate,
      endDate,
    },
  });
  return created.id;
}

async function nextEntryNumber(tx: Prisma.TransactionClient): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `JE-${year}-`;
  const existing = await tx.journalEntry.findMany({
    where: { entryNumber: { startsWith: prefix } },
    select: { entryNumber: true },
  });
  let maxSeq = 0;
  for (const row of existing) {
    const num = parseInt(row.entryNumber.slice(prefix.length), 10);
    if (!isNaN(num) && num > maxSeq) maxSeq = num;
  }
  let candidate = `${prefix}${(maxSeq + 1).toString().padStart(5, '0')}`;
  while (await tx.journalEntry.findUnique({ where: { entryNumber: candidate } })) {
    maxSeq++;
    candidate = `${prefix}${(maxSeq + 1).toString().padStart(5, '0')}`;
  }
  return candidate;
}

export class AccountingService {
  // 1. Get Chart of Accounts with Live Balances
  static async getChartOfAccounts() {
    const accounts = await prisma.account.findMany({
      orderBy: { code: 'asc' },
    });
    return accounts.map((a) => ({
      ...a,
      balance: Number(a.balance),
    }));
  }

  // 2. Post a Double-Entry Journal (Strict validation: Debits === Credits)
  static async postJournalEntry(input: PostJournalInput, externalTx?: Prisma.TransactionClient) {
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

    const roundedDebit = Math.round(totalDebit * 100) / 100;
    const roundedCredit = Math.round(totalCredit * 100) / 100;

    if (Math.abs(roundedDebit - roundedCredit) > 0.001) {
      throw new Error(
        `Unbalanced Journal Entry! Total Debits ($${roundedDebit.toFixed(2)}) must equal Total Credits ($${roundedCredit.toFixed(2)}). Difference: $${Math.abs(roundedDebit - roundedCredit).toFixed(2)}`
      );
    }

    const execute = async (tx: Prisma.TransactionClient) => {
      const entryNumber = await nextEntryNumber(tx);
      const resolvedPeriodId = await resolveOrCreatePeriod(tx, input.periodId);

      const newEntry = await tx.journalEntry.create({
        data: {
          entryNumber,
          periodId: resolvedPeriodId,
          description: input.description,
          reference: input.reference || null,
          isPosted: true,
          isReversed: false,
          reversalEntryId: null,
          createdBy: input.createdBy || 'System',
        },
      });

      const createdLines = [];
      for (const line of input.lines) {
        const debit = Number(line.debit) || 0;
        const credit = Number(line.credit) || 0;

        const account = await tx.account.findUnique({ where: { code: line.accountCode } });
        if (!account) {
          throw new Error(`Chart of Accounts code '${line.accountCode}' not found.`);
        }

        const entryLine = await tx.journalEntryLine.create({
          data: {
            journalEntryId: newEntry.id,
            accountId: account.id,
            debit: new Prisma.Decimal(debit),
            credit: new Prisma.Decimal(credit),
            description: line.description || input.description,
          },
        });

        const delta =
          account.type === 'ASSET' || account.type === 'EXPENSE'
            ? debit - credit
            : credit - debit;

        await tx.account.update({
          where: { id: account.id },
          data: {
            balance: { increment: new Prisma.Decimal(delta) },
          },
        });

        createdLines.push({
          id: entryLine.id,
          journalEntryId: newEntry.id,
          accountId: account.id,
          accountCode: account.code,
          accountName: account.name,
          accountType: account.type,
          debit,
          credit,
          description: entryLine.description || '',
        });
      }

      await tx.auditLog.create({
        data: {
          action: 'POST_JOURNAL',
          resource: 'JournalEntry',
          resourceId: entryNumber,
          details: `Posted journal ${entryNumber}: ${input.description} (Amount: $${roundedDebit.toFixed(2)})`,
          userEmail: input.createdBy || 'System',
          ipAddress: '127.0.0.1',
          ip: '127.0.0.1',
        },
      });

      return {
        entry: {
          ...newEntry,
          entryDate: newEntry.entryDate.toISOString(),
          createdAt: newEntry.createdAt.toISOString(),
          totalAmount: roundedDebit,
        },
        lines: createdLines,
      };
    };

    if (externalTx) {
      return execute(externalTx);
    }
    return prisma.$transaction(execute);
  }

  // 3. Reverse a Posted Journal Entry (Maintains Immutable Audit Trail)
  static async reverseJournalEntry(entryNumber: string, reason: string, actor: string = 'Accountant') {
    const result = await prisma.$transaction(async (tx) => {
      const entry = await tx.journalEntry.findUnique({
        where: { entryNumber },
        include: {
          lines: { include: { account: true } },
          period: true,
        },
      });

      if (!entry) throw new Error(`Journal entry ${entryNumber} not found.`);
      if (entry.isReversed) throw new Error(`Journal entry ${entryNumber} has already been reversed.`);

      const reversalLines: JournalLineInput[] = entry.lines.map((l) => ({
        accountCode: l.account.code,
        debit: Number(l.credit),
        credit: Number(l.debit),
        description: `Reversal of ${entryNumber}: ${l.description || ''}`,
      }));

      const reversal = await this.postJournalEntry(
        {
          description: `REVERSAL of ${entryNumber} - Reason: ${reason}`,
          reference: `REV-${entryNumber}`,
          lines: reversalLines,
          createdBy: actor,
          periodId: entry.period?.name || undefined,
        },
        tx
      );

      await tx.journalEntry.update({
        where: { id: entry.id },
        data: {
          isReversed: true,
          reversalEntryId: reversal.entry.entryNumber,
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'REVERSE_JOURNAL',
          resource: 'JournalEntry',
          resourceId: entryNumber,
          details: `Reversed journal ${entryNumber} via replacement entry ${reversal.entry.entryNumber}. Reason: ${reason}`,
          userEmail: actor,
          ipAddress: '127.0.0.1',
          ip: '127.0.0.1',
        },
      });

      return reversal;
    });

    return result;
  }

  // 4. General Ledger
  static async getGeneralLedger(filters?: { accountCode?: string; startDate?: string; endDate?: string }) {
    const where: any = {};
    if (filters?.accountCode) {
      where.account = { code: filters.accountCode };
    }
    if (filters?.startDate || filters?.endDate) {
      where.journalEntry = {
        entryDate: {
          ...(filters.startDate ? { gte: new Date(filters.startDate) } : {}),
          ...(filters.endDate ? { lte: new Date(filters.endDate) } : {}),
        },
      };
    }

    const lines = await prisma.journalEntryLine.findMany({
      where,
      include: {
        account: true,
        journalEntry: true,
      },
      orderBy: {
        journalEntry: { entryDate: 'desc' },
      },
    });

    return lines.map((l) => ({
      id: l.id,
      journalEntryId: l.journalEntryId,
      accountId: l.accountId,
      accountCode: l.account.code,
      accountName: l.account.name,
      accountType: l.account.type,
      debit: Number(l.debit),
      credit: Number(l.credit),
      description: l.description || '',
      entryNumber: l.journalEntry.entryNumber,
      entryDate: l.journalEntry.entryDate.toISOString(),
      reference: l.journalEntry.reference,
      isReversed: l.journalEntry.isReversed,
    }));
  }

  // 5. Trial Balance (Must balance: Total Debits == Total Credits)
  static async getTrialBalance() {
    const accounts = await prisma.account.findMany({
      include: { journalLines: true },
      orderBy: { code: 'asc' },
    });

    let totalDebit = 0;
    let totalCredit = 0;

    const rows = accounts.map((acc) => {
      const debitSum = acc.journalLines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
      const creditSum = acc.journalLines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);

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
        debit: Math.round(closingDebit * 100) / 100,
        credit: Math.round(closingCredit * 100) / 100,
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
  static async getProfitAndLoss() {
    const accounts = await prisma.account.findMany({
      where: { type: { in: ['REVENUE', 'EXPENSE'] } },
      include: { journalLines: true },
      orderBy: { code: 'asc' },
    });

    let totalRevenue = 0;
    const revenues = accounts
      .filter((a) => a.type === 'REVENUE')
      .map((a) => {
        const net = a.journalLines.reduce((sum, l) => sum + (Number(l.credit) - Number(l.debit)), 0);
        totalRevenue += net;
        return { code: a.code, name: a.name, amount: Math.round(net * 100) / 100 };
      });

    let totalExpenses = 0;
    const expenses = accounts
      .filter((a) => a.type === 'EXPENSE')
      .map((a) => {
        const net = a.journalLines.reduce((sum, l) => sum + (Number(l.debit) - Number(l.credit)), 0);
        totalExpenses += net;
        return { code: a.code, name: a.name, amount: Math.round(net * 100) / 100 };
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
  static async getBalanceSheet() {
    const [accounts, pnl] = await Promise.all([
      prisma.account.findMany({
        where: { type: { in: ['ASSET', 'LIABILITY', 'EQUITY'] } },
        include: { journalLines: true },
        orderBy: { code: 'asc' },
      }),
      this.getProfitAndLoss(),
    ]);

    let totalAssets = 0;
    const assets = accounts
      .filter((a) => a.type === 'ASSET')
      .map((a) => {
        const net = a.journalLines.reduce((sum, l) => sum + (Number(l.debit) - Number(l.credit)), 0);
        totalAssets += net;
        return { code: a.code, name: a.name, amount: Math.round(net * 100) / 100 };
      });

    let totalLiabilities = 0;
    const liabilities = accounts
      .filter((a) => a.type === 'LIABILITY')
      .map((a) => {
        const net = a.journalLines.reduce((sum, l) => sum + (Number(l.credit) - Number(l.debit)), 0);
        totalLiabilities += net;
        return { code: a.code, name: a.name, amount: Math.round(net * 100) / 100 };
      });

    let totalEquity = pnl.netProfit;
    const equity = accounts
      .filter((a) => a.type === 'EQUITY')
      .map((a) => {
        const net = a.journalLines.reduce((sum, l) => sum + (Number(l.credit) - Number(l.debit)), 0);
        totalEquity += net;
        return { code: a.code, name: a.name, amount: Math.round(net * 100) / 100 };
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
  static async getAccountingDashboard() {
    const [pnl, trial, accounts, recentEntries] = await Promise.all([
      this.getProfitAndLoss(),
      this.getTrialBalance(),
      prisma.account.findMany({
        where: { code: { in: ['1010', '1020', '1030', '1100', '2010', '1200'] } },
      }),
      prisma.journalEntry.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { lines: true },
      }),
    ]);

    const byCode = new Map(accounts.map((a) => [a.code, Number(a.balance)]));
    const pettyCash = byCode.get('1010') || 0;
    const bankAba = byCode.get('1020') || 0;
    const bakongWallet = byCode.get('1030') || 0;
    const arSubscribers = byCode.get('1100') || 0;
    const apSuppliers = byCode.get('2010') || 0;
    const inventoryVal = byCode.get('1200') || 0;

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
      recentJournals: recentEntries.map((je) => ({
        ...je,
        entryDate: je.entryDate.toISOString(),
        createdAt: je.createdAt.toISOString(),
        totalAmount:
          Math.round(je.lines.reduce((sum, l) => sum + Number(l.debit), 0) * 100) / 100,
      })),
    };
  }

  // 9. Accounts Receivable Aging
  static async getArAging() {
    const overdueInvoices = await prisma.invoice.findMany({
      where: { status: { notIn: ['PAID', 'CANCELLED'] } },
      include: { customer: true },
      orderBy: { dueDate: 'asc' },
    });

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

      aging.invoices.push({
        invoiceNumber: inv.invoiceNumber,
        customerId: inv.customerId,
        customerName: inv.customer?.fullName || 'Customer',
        amount: Number(inv.amount),
        balanceDue: balance,
        dueDate: inv.dueDate.toISOString(),
        diffDays: Math.max(0, diffDays),
        bucket,
      });
    }

    return aging;
  }

  static async audit(action: string, resourceId: string | null, details: string, actor: string = 'system') {
    await logAudit(action, 'Accounting', resourceId, details, actor);
  }
}
