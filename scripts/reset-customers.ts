#!/usr/bin/env node
/**
 * Dev-only customer reset tool.
 *
 * Safely wipes all customer-owned records inside ONE transaction while
 * keeping infrastructure, RBAC, catalog, chart of accounts, and hardware rows intact.
 *
 * Usage:
 *   npm run db:reset:customers -- --confirm
 */

import dotenv from 'dotenv';
import { Prisma, PrismaClient } from '@prisma/client';

dotenv.config();

const ALLOWED_DEV_DBS = new Set(['nsmisp', 'nsmisp_dev', 'netpulse']);

function assertDevSafety(): { dbName: string; host: string; port: string } {
  if (process.env.NODE_ENV === 'production') {
    console.error('REFUSED: NODE_ENV is "production". Customer reset is strictly dev-only.');
    process.exit(1);
  }

  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) {
    console.error('REFUSED: DATABASE_URL is not configured.');
    process.exit(1);
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    console.error('REFUSED: DATABASE_URL is malformed.');
    process.exit(1);
  }

  const dbName = parsed.pathname.replace(/^\//, '');
  if (!ALLOWED_DEV_DBS.has(dbName)) {
    console.error(
      `REFUSED: Database "${dbName}" is not in the dev allow-list (${Array.from(ALLOWED_DEV_DBS).join(', ')}).`
    );
    process.exit(1);
  }

  if (!process.argv.includes('--confirm')) {
    console.error(
      'REFUSED: Destructive operation requires explicit --confirm flag.\n' +
        'Run: npm run db:reset:customers -- --confirm'
    );
    process.exit(1);
  }

  return {
    dbName,
    host: parsed.hostname || 'localhost',
    port: parsed.port || '5432',
  };
}

type CountSnapshot = Record<string, number>;

async function collectCounts(tx: Prisma.TransactionClient): Promise<{
  customerOwned: CountSnapshot;
  kept: CountSnapshot;
}> {
  const [
    customers,
    customerAddresses,
    customerAttachments,
    customerActivities,
    subscriptions,
    subscriptionHistory,
    pppoeAccounts,
    pppoeSessions,
    assignedIps,
    invoices,
    invoiceItems,
    payments,
    paymentAllocations,
    creditNotes,
    installations,
    supportTickets,
    ticketMessages,
    assignedSerials,
    totalSerials,
    users,
    roles,
    permissions,
    features,
    packages,
    routers,
    vlans,
    ipPools,
    products,
    warehouses,
    suppliers,
    accounts,
    companySettings,
    journalEntries,
  ] = await Promise.all([
    tx.customer.count(),
    tx.customerAddress.count(),
    tx.customerAttachment.count(),
    tx.customerActivity.count(),
    tx.subscription.count(),
    tx.subscriptionHistory.count(),
    tx.pPPoEAccount.count(),
    tx.pPPoESession.count(),
    tx.iPAddress.count({ where: { OR: [{ isAssigned: true }, { assignedTo: { not: null } }] } }),
    tx.invoice.count(),
    tx.invoiceItem.count(),
    tx.payment.count(),
    tx.paymentAllocation.count(),
    tx.creditNote.count(),
    tx.installation.count(),
    tx.supportTicket.count(),
    tx.ticketMessage.count(),
    tx.serialNumber.count({ where: { customerId: { not: null } } }),
    tx.serialNumber.count(),
    tx.user.count(),
    tx.role.count(),
    tx.permission.count(),
    tx.feature.count(),
    tx.package.count(),
    tx.router.count(),
    tx.vLAN.count(),
    tx.iPPool.count(),
    tx.product.count(),
    tx.warehouse.count(),
    tx.supplier.count(),
    tx.account.count(),
    tx.companySetting.count(),
    tx.journalEntry.count(),
  ]);

  return {
    customerOwned: {
      Customer: customers,
      CustomerAddress: customerAddresses,
      CustomerAttachment: customerAttachments,
      CustomerActivity: customerActivities,
      Subscription: subscriptions,
      SubscriptionHistory: subscriptionHistory,
      PPPoEAccount: pppoeAccounts,
      PPPoESession: pppoeSessions,
      'IPAddress(assigned)': assignedIps,
      Invoice: invoices,
      InvoiceItem: invoiceItems,
      Payment: payments,
      PaymentAllocation: paymentAllocations,
      CreditNote: creditNotes,
      Installation: installations,
      SupportTicket: supportTickets,
      TicketMessage: ticketMessages,
      'SerialNumber(assigned)': assignedSerials,
    },
    kept: {
      User: users,
      Role: roles,
      Permission: permissions,
      Feature: features,
      Package: packages,
      Router: routers,
      VLAN: vlans,
      IPPool: ipPools,
      Product: products,
      Warehouse: warehouses,
      Supplier: suppliers,
      Account: accounts,
      CompanySetting: companySettings,
      'SerialNumber(total)': totalSerials,
      'JournalEntry(total)': journalEntries,
    },
  };
}

async function computeLedgerTotals(tx: Prisma.TransactionClient) {
  const rows = await tx.$queryRaw<Array<{ debit: string; credit: string }>>`
    SELECT
      COALESCE(SUM(debit), 0)::text AS debit,
      COALESCE(SUM(credit), 0)::text AS credit
    FROM "JournalEntryLine"
  `;
  const totalDebit = Number(rows[0]?.debit ?? 0);
  const totalCredit = Number(rows[0]?.credit ?? 0);

  // Also check per-account trial balance sums identically to AccountingService.getTrialBalance()
  const accounts = await tx.account.findMany({
    include: { journalLines: true },
  });
  let tbDebit = 0;
  let tbCredit = 0;
  for (const acc of accounts) {
    const d = acc.journalLines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
    const c = acc.journalLines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);
    if (acc.type === 'ASSET' || acc.type === 'EXPENSE') {
      const net = d - c;
      if (net >= 0) tbDebit += net;
      else tbCredit += Math.abs(net);
    } else {
      const net = c - d;
      if (net >= 0) tbCredit += net;
      else tbDebit += Math.abs(net);
    }
  }

  return {
    totalDebit: Math.round(totalDebit * 100) / 100,
    totalCredit: Math.round(totalCredit * 100) / 100,
    tbDebit: Math.round(tbDebit * 100) / 100,
    tbCredit: Math.round(tbCredit * 100) / 100,
  };
}

function printComparisonTable(
  heading: string,
  before: CountSnapshot,
  after: CountSnapshot
): void {
  console.log(`\n=== ${heading} ===`);
  const rows = Object.keys(before).map((table) => ({
    table,
    before: before[table],
    after: after[table],
    delta: after[table] - before[table],
  }));
  console.table(rows);
}

async function main() {
  const target = assertDevSafety();
  console.log(`Target DB: ${target.host}:${target.port}/${target.dbName} (DEV mode verified)`);

  const prisma = new PrismaClient({
    log: ['error', 'warn'],
  });

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const before = await collectCounts(tx);
        const ledgerBefore = await computeLedgerTotals(tx);

        if (Math.abs(ledgerBefore.totalDebit - ledgerBefore.totalCredit) > 0.01) {
          throw new Error(
            `ABORTED: Pre-reset ledger is already unbalanced (debit=${ledgerBefore.totalDebit}, credit=${ledgerBefore.totalCredit}).`
          );
        }

        // Gather customer-linked billing/payment/installation source references for GL cleanup
        const [customerRows, invoiceRows, paymentRows, installationRows, creditNoteRows] =
          await Promise.all([
            tx.customer.findMany({ select: { id: true, code: true } }),
            tx.invoice.findMany({ select: { invoiceNumber: true } }),
            tx.payment.findMany({ select: { paymentNumber: true } }),
            tx.installation.findMany({ select: { orderNumber: true } }),
            tx.creditNote.findMany({ select: { creditNoteNumber: true } }),
          ]);

        const customerIds = customerRows.map((c) => c.id);
        const customerCodes = customerRows.map((c) => c.code);
        const sourceRefs = new Set<string>([
          ...invoiceRows.map((i) => i.invoiceNumber),
          ...paymentRows.map((p) => p.paymentNumber),
          ...installationRows.map((inst) => inst.orderNumber),
          ...creditNoteRows.map((cn) => cn.creditNoteNumber),
        ]);

        // Match customer-posted JournalEntries by source reference (and any linked reversals)
        let removedJournalIds: string[] = [];
        if (sourceRefs.size > 0) {
          const allEntries = await tx.journalEntry.findMany({
            include: {
              lines: { include: { account: true } },
            },
          });

          const byId = new Map(allEntries.map((e) => [e.id, e]));
          const matchedSet = new Set<string>();
          for (const entry of allEntries) {
            if (entry.reference && sourceRefs.has(entry.reference)) {
              matchedSet.add(entry.id);
            }
          }

          // Include linked reversals iteratively so no half-reversed pair remains
          let changed = true;
          while (changed) {
            changed = false;
            for (const entry of allEntries) {
              if (matchedSet.has(entry.id)) {
                if (entry.reversalEntryId && !matchedSet.has(entry.reversalEntryId)) {
                  matchedSet.add(entry.reversalEntryId);
                  changed = true;
                }
                const revRef = `REV-${entry.entryNumber}`;
                for (const candidate of allEntries) {
                  if (candidate.reference === revRef && !matchedSet.has(candidate.id)) {
                    matchedSet.add(candidate.id);
                    changed = true;
                  }
                }
              } else if (entry.reversalEntryId && matchedSet.has(entry.reversalEntryId)) {
                matchedSet.add(entry.id);
                changed = true;
              }
            }
          }

          // Verify each matched JournalEntry balances before deleting
          for (const id of matchedSet) {
            const entry = byId.get(id);
            if (!entry) continue;
            const d = entry.lines.reduce((s, l) => s + Number(l.debit), 0);
            const c = entry.lines.reduce((s, l) => s + Number(l.credit), 0);
            if (Math.abs(d - c) > 0.01) {
              throw new Error(
                `ABORTED: Customer journal entry ${entry.entryNumber} is unbalanced (${d} vs ${c}); manual inspection required.`
              );
            }
          }

          // Reverse account balance impact of deleted lines
          const accountAdjustments = new Map<string, number>();
          for (const id of matchedSet) {
            const entry = byId.get(id);
            if (!entry) continue;
            for (const line of entry.lines) {
              const d = Number(line.debit) || 0;
              const c = Number(line.credit) || 0;
              const delta =
                line.account.type === 'ASSET' || line.account.type === 'EXPENSE'
                  ? d - c
                  : c - d;
              accountAdjustments.set(
                line.accountId,
                (accountAdjustments.get(line.accountId) || 0) + delta
              );
            }
          }

          removedJournalIds = Array.from(matchedSet);
          if (removedJournalIds.length > 0) {
            await tx.journalEntry.deleteMany({
              where: { id: { in: removedJournalIds } },
            });
            for (const [accountId, delta] of accountAdjustments.entries()) {
              if (Math.abs(delta) > 0.0001) {
                await tx.account.update({
                  where: { id: accountId },
                  data: { balance: { decrement: new Prisma.Decimal(delta) } },
                });
              }
            }
          }
        }

        // 1. Unassign customer hardware without deleting inventory assets
        await tx.serialNumber.updateMany({
          where: { customerId: { not: null } },
          data: {
            customerId: null,
            status: 'IN_STOCK',
            installedAt: null,
          },
        });

        // 2. Free any IPAddress rows assigned to customers and resync IPPool.usedIps
        const ipAssignees = [...new Set([...customerIds, ...customerCodes])];
        if (ipAssignees.length > 0) {
          await tx.iPAddress.updateMany({
            where: { assignedTo: { in: ipAssignees } },
            data: {
              isAssigned: false,
              assignedTo: null,
              assignedAt: null,
            },
          });
        }
        await tx.iPAddress.updateMany({
          where: { OR: [{ isAssigned: true }, { assignedTo: { not: null } }] },
          data: {
            isAssigned: false,
            assignedTo: null,
            assignedAt: null,
          },
        });

        const pools = await tx.iPPool.findMany({ select: { id: true } });
        for (const pool of pools) {
          const usedCount = await tx.iPAddress.count({
            where: { poolId: pool.id, isAssigned: true },
          });
          await tx.iPPool.update({
            where: { id: pool.id },
            data: { usedIps: usedCount },
          });
        }

        // 3. Delete customer-owned dependents in explicit FK-safe dependency order
        await tx.ticketMessage.deleteMany({});
        await tx.supportTicket.deleteMany({});
        await tx.installation.deleteMany({});
        await tx.paymentAllocation.deleteMany({});
        await tx.payment.deleteMany({});
        await tx.invoiceItem.deleteMany({});
        await tx.invoice.deleteMany({});
        await tx.creditNote.deleteMany({});
        await tx.pPPoESession.deleteMany({});
        await tx.pPPoEAccount.deleteMany({});
        await tx.subscriptionHistory.deleteMany({});
        await tx.subscription.deleteMany({});
        await tx.customerActivity.deleteMany({});
        await tx.customerAttachment.deleteMany({});
        await tx.customerAddress.deleteMany({});
        await tx.customer.deleteMany({});

        // 4. Reset DB sequences owned by customer tables if any exist
        const seqRows = await tx.$queryRaw<Array<{ column_name: string; seq_name: string }>>`
          SELECT
            a.attname AS column_name,
            pg_get_serial_sequence(format('%I', c.relname), a.attname) AS seq_name
          FROM pg_class c
          JOIN pg_attribute a ON a.attrelid = c.oid
          WHERE c.relname = 'Customer'
            AND a.attnum > 0
            AND NOT a.attisdropped
            AND pg_get_serial_sequence(format('%I', c.relname), a.attname) IS NOT NULL
        `;
        for (const row of seqRows) {
          await tx.$executeRawUnsafe(`SELECT setval('${row.seq_name}', 1, false)`);
        }

        const after = await collectCounts(tx);
        const ledgerAfter = await computeLedgerTotals(tx);

        // 5. Strict post-reset invariants inside the transaction
        for (const [table, count] of Object.entries(after.customerOwned)) {
          if (count !== 0) {
            throw new Error(`ABORTED: Customer-owned table ${table} still has ${count} rows.`);
          }
        }

        const nonJournalKeptTables = Object.keys(before.kept).filter(
          (k) => k !== 'JournalEntry(total)'
        );
        for (const table of nonJournalKeptTables) {
          if (before.kept[table] !== after.kept[table]) {
            throw new Error(
              `ABORTED: Kept table ${table} row count changed unexpectedly (${before.kept[table]} -> ${after.kept[table]}).`
            );
          }
        }

        if (
          Math.abs(ledgerAfter.totalDebit - ledgerAfter.totalCredit) > 0.01 ||
          Math.abs(ledgerAfter.tbDebit - ledgerAfter.tbCredit) > 0.01
        ) {
          throw new Error(
            `ABORTED: Post-reset ledger is unbalanced! Lines=(${ledgerAfter.totalDebit} vs ${ledgerAfter.totalCredit}), TB=(${ledgerAfter.tbDebit} vs ${ledgerAfter.tbCredit}).`
          );
        }

        return {
          before,
          after,
          ledgerBefore,
          ledgerAfter,
          removedJournalCount: removedJournalIds.length,
          resetSequenceCount: seqRows.length,
        };
      },
      { timeout: 60000 }
    );

    printComparisonTable('Customer-Owned Tables (Reset)', result.before.customerOwned, result.after.customerOwned);
    printComparisonTable('Kept Infrastructure & Catalog Tables', result.before.kept, result.after.kept);

    console.log('\n=== Ledger & Sequences Summary ===');
    console.log(
      `Customer journal entries removed: ${result.removedJournalCount} (app-generated CUST-XXXX codes auto-start at CUST-1001; DB sequences reset: ${result.resetSequenceCount})`
    );
    console.log(
      `Ledger before: sumDebit=${result.ledgerBefore.totalDebit.toFixed(2)}, sumCredit=${result.ledgerBefore.totalCredit.toFixed(2)}, trialBalance=(${result.ledgerBefore.tbDebit.toFixed(2)} == ${result.ledgerBefore.tbCredit.toFixed(2)})`
    );
    console.log(
      `Ledger after:  sumDebit=${result.ledgerAfter.totalDebit.toFixed(2)}, sumCredit=${result.ledgerAfter.totalCredit.toFixed(2)}, trialBalance=(${result.ledgerAfter.tbDebit.toFixed(2)} == ${result.ledgerAfter.tbCredit.toFixed(2)})`
    );
    console.log('\n✓ Customer reset complete and verified.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('\n✗ Customer reset failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
