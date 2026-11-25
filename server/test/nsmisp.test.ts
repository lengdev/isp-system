import test from 'node:test';
import assert from 'node:assert';
import { Prisma } from '@prisma/client';
import { AuthService } from '../src/services/auth.service.js';
import { CustomerService } from '../src/services/customer.service.js';
import { MikroTikService } from '../src/services/mikrotik.service.js';
import { NetworkService } from '../src/services/network.service.js';
import { BillingService } from '../src/services/billing.service.js';
import { PaymentService } from '../src/services/payment.service.js';
import { AccountingService } from '../src/services/accounting.service.js';
import { InventoryService } from '../src/services/inventory.service.js';
import { ProcurementService } from '../src/services/procurement.service.js';
import { OperationsService } from '../src/services/operations.service.js';
import { prisma } from '../src/db/store.js';

test('--- NSMISP AUTOMATED TEST SUITE ---', async (t) => {
  await t.test('1. Auth: Super Admin Login & JWT Generation', async () => {
    const res = await AuthService.login('admin', 'admin123!');
    assert.ok(res.token, 'Token must be issued');
    assert.strictEqual(res.user.role, 'SUPER_ADMIN');
    assert.ok(AuthService.hasPermission('SUPER_ADMIN', 'billing:create'));
    assert.ok(AuthService.hasPermission('ACCOUNTANT', 'accounting:journal'));
    assert.strictEqual(AuthService.hasPermission('TECHNICIAN', 'accounting:journal'), false);
  });

  await t.test('2. Auth: Reject Invalid Credentials', async () => {
    await assert.rejects(
      async () => await AuthService.login('admin', 'wrongpass999'),
      /Invalid username\/email or password/
    );
  });

  await t.test('3. CRM: Customer Creation, Search and Retrieval', async () => {
    const uniq = Date.now();
    const newCust = await CustomerService.createCustomer({
      fullName: 'Bopha Pich Test',
      email: `bopha.ts.${uniq}@nsmisp.net`,
      phone: '+855 12 777 999',
      address: 'Villa 45, Street 271',
      city: 'Phnom Penh',
      planName: 'Fiber Ultra 300M',
      monthlyPrice: 55.0,
      connectionType: 'FIBER',
    });

    try {
      assert.ok(newCust.id);
      assert.ok(newCust.code.startsWith('CUST-'));

      const searchRes = await CustomerService.listCustomers({ searchQuery: `bopha.ts.${uniq}` });
      assert.ok(searchRes.length >= 1);
      assert.strictEqual(searchRes[0].fullName, 'Bopha Pich Test');
    } finally {
      await prisma.customer.delete({ where: { id: newCust.id } }).catch(() => {});
    }
  });

  await t.test('4. Network: MikroTik RouterOS Ping & PPPoE Provisioning', async () => {
    const testUser = `bopha_ts_pppoe_${Date.now()}`;
    const ping = await MikroTikService.testConnection('rtr-core-1');
    assert.strictEqual(ping.success, true);
    assert.ok(ping.latencyMs >= 1);

    const prov = await MikroTikService.provisionPPPoEAccount('rtr-core-1', {
      name: testUser,
      password: 'secret_pw_123',
      service: 'pppoe',
      profile: 'profile-fiber-300m',
      remoteAddress: '10.20.1.99',
      callerId: '48:8F:5A:99:88:77',
      disabled: false,
    });
    assert.strictEqual(prov.success, true);

    const activeSessions = await MikroTikService.getActiveSessions('rtr-core-1');
    assert.ok(activeSessions.some((s) => s.user === testUser));

    await MikroTikService.suspendSubscriber('rtr-core-1', testUser, 'Test Suspension');
    const sessionsAfterSuspend = await MikroTikService.getActiveSessions('rtr-core-1');
    assert.strictEqual(sessionsAfterSuspend.some((s) => s.user === testUser), false);

    await prisma.networkProvisionJob.deleteMany({
      where: { payload: { contains: testUser } },
    });
  });

  await t.test('5. VLAN & IPAM: Duplicate Validation & IP Allocation', async () => {
    await assert.rejects(
      async () =>
        await NetworkService.createVlan({
          vlanId: 20,
          name: 'Conflict VLAN',
          purpose: 'FIBER_INTERNET',
          routerId: 'rtr-core-1',
          interface: 'sfp-sfpplus1',
        }),
      /VLAN conflict/
    );

    const poolBefore = await prisma.iPPool.findUnique({ where: { id: 'pool-fiber-1' } });
    const ip = await NetworkService.allocateIpAddress('pool-fiber-1', 'cust-1001', false);
    assert.ok(ip.ipAddress.startsWith('10.20.'));

    await prisma.iPAddress.delete({ where: { ipAddress: ip.ipAddress } }).catch(() => {});
    if (poolBefore) {
      await prisma.iPPool.update({
        where: { id: poolBefore.id },
        data: { usedIps: poolBefore.usedIps },
      });
    }
  });

  await t.test('6. Billing: Duplicate Invoice Prevention & Accrual Accounting', async () => {
    const period = `2098-${(Date.now() % 12 + 1).toString().padStart(2, '0')}`;
    const custBefore = await prisma.customer.findUnique({ where: { id: 'cust-1001' } });
    const inv1 = await BillingService.generateInvoice({
      customerId: 'cust-1001',
      billingPeriod: period,
      items: [{ description: 'Fiber Ultra 300M (Test)', amount: 55.0 }],
    });
    assert.ok(inv1.invoiceNumber);

    try {
      await assert.rejects(
        async () =>
          await BillingService.generateInvoice({
            customerId: 'cust-1001',
            billingPeriod: period,
            items: [{ description: 'Fiber Ultra 300M duplicate', amount: 55.0 }],
          }),
        /Duplicate invoice blocked/
      );
    } finally {
      await prisma.journalEntry.deleteMany({ where: { reference: inv1.invoiceNumber } });
      await prisma.invoice.delete({ where: { id: inv1.id } }).catch(() => {});
      if (custBefore) {
        await prisma.customer.update({
          where: { id: custBefore.id },
          data: { balanceDue: custBefore.balanceDue },
        });
      }
    }
  });

  await t.test('7. Payment: Cashier Payment & Subscriber Reconnection', async () => {
    const custBefore = await prisma.customer.findUnique({ where: { id: 'cust-1004' } });
    assert.ok(custBefore);

    await prisma.customer.update({
      where: { id: custBefore.id },
      data: { status: 'SUSPENDED', balanceDue: new Prisma.Decimal(110.0) },
    });

    const res = await PaymentService.recordPayment({
      customerId: custBefore.id,
      amount: 110.0,
      method: 'KHQR_BAKONG',
      transactionRef: `BAKONG-TXN-${Date.now()}`,
      notes: 'Full outstanding payment via Bakong QR',
    });

    try {
      assert.strictEqual(res.newCustomerBalance, 0);
      assert.strictEqual(res.customerStatus, 'ACTIVE');
      assert.strictEqual(res.reconnected, true);
    } finally {
      await prisma.journalEntry.deleteMany({ where: { reference: res.payment.paymentNumber } });
      await prisma.payment.delete({ where: { id: res.payment.id } }).catch(() => {});
      await prisma.customer.update({
        where: { id: custBefore.id },
        data: { status: custBefore.status, balanceDue: custBefore.balanceDue },
      });
    }
  });

  await t.test('8. Accounting: Debits == Credits Strict Balancing', async () => {
    await assert.rejects(
      async () =>
        await AccountingService.postJournalEntry({
          description: 'Unbalanced Attempt',
          lines: [
            { accountCode: '1010', debit: 100.0, credit: 0.0 },
            { accountCode: '4010', debit: 0.0, credit: 90.0 },
          ],
        }),
      /Unbalanced Journal Entry/
    );

    const balanced = await AccountingService.postJournalEntry({
      description: 'Test Office Utility Expense',
      lines: [
        { accountCode: '5300', debit: 75.0, credit: 0.0, description: 'Power' },
        { accountCode: '1010', debit: 0.0, credit: 75.0, description: 'Petty cash payment' },
      ],
      createdBy: 'Accountant',
    });
    assert.ok(balanced.entry.entryNumber);

    const trial = await AccountingService.getTrialBalance();
    assert.strictEqual(trial.isBalanced, true);
    assert.strictEqual(trial.totalDebit, trial.totalCredit);

    const reversal = await AccountingService.reverseJournalEntry(balanced.entry.entryNumber, 'Entered in error');
    assert.strictEqual(reversal.entry.isPosted, true);
    const original = await prisma.journalEntry.findUnique({ where: { entryNumber: balanced.entry.entryNumber } });
    assert.strictEqual(original?.isReversed, true);

    await prisma.journalEntry.deleteMany({
      where: { entryNumber: { in: [balanced.entry.entryNumber, reversal.entry.entryNumber] } },
    });
  });

  await t.test('9. Inventory: Prevent Negative Stock & Movement Tracking', async () => {
    const prod = await prisma.product.findFirst({ where: { id: 'prod-1' } });
    assert.ok(prod);
    const initialQty = prod.quantity;

    await assert.rejects(
      async () =>
        await InventoryService.recordMovement({
          productId: prod.id,
          type: 'STOCK_OUT',
          quantity: initialQty + 1000,
        }),
      /Negative stock prevented/
    );

    const mov = await InventoryService.recordMovement({
      productId: prod.id,
      type: 'STOCK_IN',
      quantity: 10,
      actor: 'Warehouse Keeper',
    });
    assert.strictEqual(mov.currentStock, initialQty + 10);

    await prisma.stockMovement.delete({ where: { id: mov.movement.id } }).catch(() => {});
    await prisma.product.update({
      where: { id: prod.id },
      data: { quantity: initialQty, status: prod.status },
    });
  });

  await t.test('10. Procurement: PO -> Goods Receipt -> AP Accounting -> Payment', async () => {
    const supBefore = await prisma.supplier.findUnique({ where: { id: 'sup-1' } });
    const prodBefore = await prisma.product.findUnique({ where: { id: 'prod-1' } });
    assert.ok(supBefore && prodBefore);

    const po = await ProcurementService.createPurchaseOrder({
      supplierId: supBefore.id,
      items: [{ productId: prodBefore.id, quantity: 5, unitPrice: 28.0 }],
    });
    assert.ok(po.poNumber);

    const grn = await ProcurementService.receiveGoods(po.id, 'Warehouse Lead');
    assert.strictEqual(grn.po.status, 'COMPLETED');

    const supMid = await prisma.supplier.findUnique({ where: { id: supBefore.id } });
    assert.strictEqual(Number(supMid?.balancePayable), Number(supBefore.balancePayable) + 140.0);

    const paid = await ProcurementService.paySupplier(supBefore.id, 140.0, 'ABA Wire Transfer');
    assert.strictEqual(paid.supplier.balancePayable, Number(supBefore.balancePayable));

    await prisma.journalEntry.deleteMany({ where: { reference: po.poNumber } });
    await prisma.purchaseOrder.delete({ where: { id: po.id } }).catch(() => {});
    await prisma.product.update({
      where: { id: prodBefore.id },
      data: { quantity: prodBefore.quantity, status: prodBefore.status },
    });
  });

  await t.test('11. Operations: Complete Installation Workflow A', async () => {
    const uniq = Date.now();
    const ontBefore = await prisma.serialNumber.findUnique({ where: { serialNumber: 'SN-HW-2026-0006' } });
    const prodBefore = await prisma.product.findUnique({ where: { sku: 'ONT-HG8245H5' } });

    const newCust = await CustomerService.createCustomer({
      fullName: 'Dararith Srun TS',
      email: `dararith.ts.${uniq}@nsmisp.net`,
      phone: '+855 12 444 333',
      address: 'St. 1984, Sen Sok',
      city: 'Phnom Penh',
      planName: 'Fiber Starter 100M',
      monthlyPrice: 35.0,
      connectionType: 'FIBER',
    });

    const inst = await OperationsService.createInstallation({
      customerId: newCust.id,
      scheduledDate: new Date().toISOString(),
      timeSlot: '09:00 - 11:00 AM',
    });
    assert.strictEqual(inst.status, 'SCHEDULED');

    let completed = null;
    try {
      completed = await OperationsService.completeInstallation(inst.id, {
        assignedOntSn: 'SN-HW-2026-0006',
        opticalPowerDbm: -18.7,
        notes: 'Optical power optimal. Speed test validated at 100 Mbps.',
        actor: 'Marcus Vance',
      });

      assert.strictEqual(completed.installation.status, 'COMPLETED');
      assert.strictEqual(completed.customer.status, 'ACTIVE');
      assert.ok(completed.invoice, 'First monthly invoice generated');
    } finally {
      if (completed?.invoice?.invoiceNumber) {
        await prisma.journalEntry.deleteMany({ where: { reference: completed.invoice.invoiceNumber } });
      }
      await prisma.stockMovement.deleteMany({ where: { reference: inst.orderNumber } });
      await prisma.installation.delete({ where: { id: inst.id } }).catch(() => {});
      await prisma.customer.delete({ where: { id: newCust.id } }).catch(() => {});
      if (ontBefore) {
        await prisma.serialNumber.update({
          where: { id: ontBefore.id },
          data: {
            customerId: ontBefore.customerId,
            status: ontBefore.status,
            installedAt: ontBefore.installedAt,
          },
        });
      }
      if (prodBefore) {
        await prisma.product.update({
          where: { id: prodBefore.id },
          data: { quantity: prodBefore.quantity, status: prodBefore.status },
        });
      }
    }
  });

  await prisma.$disconnect();
});
