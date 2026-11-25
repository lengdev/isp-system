import 'dotenv/config';
import { PrismaClient, Prisma } from '@prisma/client';
import { assertDevDbSafety } from './reset-customers.ts';
import { BillingService } from '../dist-server/services/billing.service.js';
import { PaymentService } from '../dist-server/services/payment.service.js';
import { AccountingService } from '../dist-server/services/accounting.service.js';

const prisma = new PrismaClient();

function parseFlagNumber(args: string[], prefix: string, fallback: number): number {
  const hit = args.find((a) => a.startsWith(prefix));
  if (!hit) return fallback;
  const parsed = parseInt(hit.slice(prefix.length), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function createMulberry32(seed: number) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickPaymentMethod(r: number): 'CASH' | 'BANK_TRANSFER' | 'KHQR_BAKONG' {
  if (r < 0.4) return 'CASH';
  if (r < 0.7) return 'BANK_TRANSFER';
  return 'KHQR_BAKONG';
}

function getBillingMonths(count: number): Array<{ period: string; year: number; monthIdx: number }> {
  // End on 2026-11 (current demo month) and walk backwards
  const anchorYear = 2026;
  const anchorMonthIdx = 10; // 0-indexed November
  const out: Array<{ period: string; year: number; monthIdx: number }> = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(anchorYear, anchorMonthIdx - i, 1));
    const year = d.getUTCFullYear();
    const monthIdx = d.getUTCMonth();
    const period = `${year}-${String(monthIdx + 1).padStart(2, '0')}`;
    out.push({ period, year, monthIdx });
  }
  return out;
}

async function resetBillingData() {
  console.log('🧹 Resetting billing, payment, and billing-journal records in dev DB...');
  await prisma.$transaction(async (tx) => {
    await tx.paymentAllocation.deleteMany({});
    await tx.payment.deleteMany({});
    await tx.invoiceItem.deleteMany({});
    await tx.invoice.deleteMany({});

    const billingJournals = await tx.journalEntry.findMany({
      where: {
        OR: [
          { reference: { startsWith: 'INV-' } },
          { reference: { startsWith: 'PAY-' } },
          { reference: { startsWith: 'VOID-' } },
        ],
      },
      select: { id: true },
    });
    const journalIds = billingJournals.map((j) => j.id);
    if (journalIds.length > 0) {
      await tx.journalEntryLine.deleteMany({ where: { journalEntryId: { in: journalIds } } });
      await tx.journalEntry.deleteMany({ where: { id: { in: journalIds } } });
    }

    await tx.customer.updateMany({
      data: { balanceDue: new Prisma.Decimal(0) },
    });

    // Recompute affected GL account balances strictly from remaining JournalEntryLines
    const billingAccountCodes = ['1010', '1020', '1030', '1100', '2200', '4010', '4020', '4030'];
    const accounts = await tx.account.findMany({
      where: { code: { in: billingAccountCodes } },
      include: { journalLines: { select: { debit: true, credit: true } } },
    });
    for (const acc of accounts) {
      const sumDebit = acc.journalLines.reduce((s, l) => s + Number(l.debit), 0);
      const sumCredit = acc.journalLines.reduce((s, l) => s + Number(l.credit), 0);
      const nextBal =
        acc.type === 'ASSET' || acc.type === 'EXPENSE'
          ? Math.round((sumDebit - sumCredit) * 100) / 100
          : Math.round((sumCredit - sumDebit) * 100) / 100;
      await tx.account.update({
        where: { id: acc.id },
        data: { balance: new Prisma.Decimal(nextBal) },
      });
    }
  });
  console.log('✓ Billing tables reset and GL accounts reconciled to remaining journal lines.');
}

async function main() {
  const args = process.argv.slice(2);
  assertDevDbSafety();

  const wantsReset = args.includes('--reset-billing');
  const confirmed = args.includes('--confirm');
  const seedOnlyReset = args.includes('--reset-only');
  if (wantsReset && !confirmed) {
    throw new Error('Refusing destructive --reset-billing without --confirm flag.');
  }

  const customerLimit = parseFlagNumber(args, '--customers=', 2000);
  const monthsCount = parseFlagNumber(args, '--months=', 3);
  const seed = parseFlagNumber(args, '--seed=', 42);

  if (wantsReset) {
    await resetBillingData();
    if (seedOnlyReset) {
      console.log('✓ Reset-only mode complete.');
      return;
    }
  }

  const customers = await prisma.customer.findMany({
    take: customerLimit,
    orderBy: { createdAt: 'asc' },
    include: {
      subscriptions: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: { package: true },
      },
    },
  });

  if (customers.length === 0) {
    console.log('⚠️ No customers found in dev database. Skipping billing demo seed.');
    return;
  }

  const months = getBillingMonths(monthsCount);
  const rng = createMulberry32(seed);
  const now = new Date();
  const startedAt = Date.now();

  let invoicesCreated = 0;
  let paidCount = 0;
  let partialCount = 0;
  let unpaidCount = 0;
  let overdueCount = 0;
  let voidedCount = 0;
  let paymentsCreated = 0;
  const methodCounts = { CASH: 0, BANK_TRANSFER: 0, KHQR_BAKONG: 0 };

  console.log(
    `🌱 Seeding billing demo via real services: ${customers.length} customers × ${months.length} months (seed=${seed})...`
  );

  for (let cIdx = 0; cIdx < customers.length; cIdx++) {
    const cust = customers[cIdx];
    const sub = cust.subscriptions[0];
    const pkgName = sub?.package?.name || 'Fiber Ultra 300M';
    const monthlyFee = Number(sub?.monthlyFee || sub?.package?.monthlyPrice || 55);

    for (const m of months) {
      const issueDate = new Date(Date.UTC(m.year, m.monthIdx, 1, 9, 0, 0));
      const dueDate = new Date(Date.UTC(m.year, m.monthIdx, 15, 23, 59, 59));

      const inv = await BillingService.generateInvoice({
        customerId: cust.id,
        subscriptionId: sub?.id,
        billingPeriod: m.period,
        dueDate: dueDate.toISOString(),
        items: [
          {
            description: `${pkgName} — Monthly Subscription (${m.period})`,
            amount: monthlyFee,
            packageId: sub?.packageId,
          },
        ],
        issueDate,
      });
      invoicesCreated++;

      const roll = rng();
      if (roll < 0.8) {
        // 80% Paid in full
        const payDayOffset = 2 + Math.floor(rng() * 11);
        const paidAt = new Date(issueDate.getTime() + payDayOffset * 86400 * 1000);
        const method = pickPaymentMethod(rng());
        await PaymentService.recordPayment({
          customerId: cust.id,
          amount: inv.amount,
          method,
          transactionRef: `SEED-${seed}-${cIdx}-${m.period}-FULL`,
          recordedBy: 'Billing Demo Seeder',
          paidAt,
          periodId: m.period,
        });
        paidCount++;
        paymentsCreated++;
        methodCounts[method]++;
      } else if (roll < 0.87) {
        // 7% Partial payment
        const partialPct = 0.35 + rng() * 0.4;
        const partialAmount = Math.max(1, Math.round(inv.amount * partialPct * 100) / 100);
        const paidAt = new Date(issueDate.getTime() + (3 + Math.floor(rng() * 10)) * 86400 * 1000);
        const method = pickPaymentMethod(rng());
        await PaymentService.recordPayment({
          customerId: cust.id,
          amount: partialAmount,
          method,
          transactionRef: `SEED-${seed}-${cIdx}-${m.period}-PART`,
          recordedBy: 'Billing Demo Seeder',
          paidAt,
          periodId: m.period,
        });
        partialCount++;
        paymentsCreated++;
        methodCounts[method]++;
      } else if (roll < 0.97) {
        // 10% Unpaid / Overdue
        if (dueDate.getTime() < now.getTime()) {
          await prisma.invoice.update({
            where: { id: inv.id },
            data: { status: 'OVERDUE' },
          });
          overdueCount++;
        } else {
          unpaidCount++;
        }
      } else {
        // 3% Voided / Cancelled
        const voidedAt = new Date(issueDate.getTime() + 2 * 86400 * 1000);
        await BillingService.voidInvoice(inv.id, 'Demo billing adjustment void', voidedAt);
        voidedCount++;
      }
    }

    if ((cIdx + 1) % 500 === 0) {
      const elapsedSec = ((Date.now() - startedAt) / 1000).toFixed(1);
      console.log(`  ... ${cIdx + 1}/${customers.length} customers processed (${elapsedSec}s)`);
    }
  }

  // Reconciliation verification
  const [openInvoicesAgg, arAccount, trialBalance, arAging] = await Promise.all([
    prisma.invoice.aggregate({
      where: { status: { notIn: ['PAID', 'CANCELLED'] } },
      _sum: { balanceDue: true },
    }),
    prisma.account.findUnique({ where: { code: '1100' } }),
    AccountingService.getTrialBalance(),
    AccountingService.getArAging(),
  ]);

  const unpaidSum = Math.round(Number(openInvoicesAgg._sum.balanceDue || 0) * 100) / 100;
  const gl1100Balance = Math.round(Number(arAccount?.balance || 0) * 100) / 100;
  const arAgingTotal = Math.round(Number(arAging.totalOutstanding || 0) * 100) / 100;

  const totalSec = ((Date.now() - startedAt) / 1000).toFixed(2);
  console.log('\n=== Billing Demo Seed Summary ===');
  console.log({
    elapsedSec: Number(totalSec),
    invoicesCreated,
    paidCount,
    partialCount,
    unpaidCount,
    overdueCount,
    voidedCount,
    paymentsCreated,
    methodCounts,
    trialBalanced: trialBalance.isBalanced,
    trialDebit: trialBalance.totalDebit,
    trialCredit: trialBalance.totalCredit,
    unpaidInvoicesSum: unpaidSum,
    gl1100Balance,
    arAgingTotal,
  });

  if (!trialBalance.isBalanced) {
    throw new Error('Ledger verification failed: Trial balance is unbalanced!');
  }
  if (Math.abs(unpaidSum - gl1100Balance) > 0.05 || Math.abs(unpaidSum - arAgingTotal) > 0.05) {
    throw new Error(
      `AR reconciliation mismatch! Unpaid=${unpaidSum}, GL1100=${gl1100Balance}, ARAging=${arAgingTotal}`
    );
  }
}

main()
  .catch((err) => {
    console.error('❌ Billing seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
