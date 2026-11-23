import test from 'node:test';
import assert from 'node:assert';
import { AuthService } from '../src/services/auth.service.ts';
import { CustomerService } from '../src/services/customer.service.ts';
import { MikroTikService } from '../src/services/mikrotik.service.ts';
import { NetworkService } from '../src/services/network.service.ts';
import { BillingService } from '../src/services/billing.service.ts';
import { PaymentService } from '../src/services/payment.service.ts';
import { AccountingService } from '../src/services/accounting.service.ts';
import { InventoryService } from '../src/services/inventory.service.ts';
import { ProcurementService } from '../src/services/procurement.service.ts';
import { OperationsService } from '../src/services/operations.service.ts';
import { dbStore } from '../src/db/store.ts';

test('--- NETPULSE AUTOMATED TEST SUITE ---', async (t) => {
  // 1. AUTH & RBAC
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

  // 2. CRM
  await t.test('3. CRM: Customer Creation, Search and Retrieval', () => {
    const newCust = CustomerService.createCustomer({
      fullName: 'Bopha Pich',
      email: 'bopha.pich@gmail.com',
      phone: '+855 12 777 999',
      address: 'Villa 45, Street 271',
      city: 'Phnom Penh',
      planName: 'Fiber Ultra 300M',
      monthlyPrice: 55.0,
      connectionType: 'FIBER',
    });

    assert.ok(newCust.id);
    assert.ok(newCust.code.startsWith('CUST-'));

    const searchRes = CustomerService.listCustomers({ searchQuery: 'Bopha' });
    assert.ok(searchRes.length >= 1);
    assert.strictEqual(searchRes[0].fullName, 'Bopha Pich');
  });

  // 3. MIKROTIK ROUTEROS & PPPoE PROVISIONING
  await t.test('4. Network: MikroTik RouterOS Ping & PPPoE Provisioning', async () => {
    const ping = await MikroTikService.testConnection('rtr-core-1');
    assert.strictEqual(ping.success, true);
    assert.ok(ping.latencyMs >= 1);

    const prov = await MikroTikService.provisionPPPoEAccount('rtr-core-1', {
      name: 'bopha_test_pppoe',
      password: 'secret_pw_123',
      service: 'pppoe',
      profile: 'profile-fiber-300m',
      remoteAddress: '10.20.1.99',
      callerId: '48:8F:5A:99:88:77',
      disabled: false,
    });
    assert.strictEqual(prov.success, true);

    const activeSessions = await MikroTikService.getActiveSessions('rtr-core-1');
    assert.ok(activeSessions.some((s) => s.user === 'bopha_test_pppoe'));

    // Suspend
    await MikroTikService.suspendSubscriber('rtr-core-1', 'bopha_test_pppoe', 'Test Suspension');
    const sessionsAfterSuspend = await MikroTikService.getActiveSessions('rtr-core-1');
    assert.strictEqual(sessionsAfterSuspend.some((s) => s.user === 'bopha_test_pppoe'), false);
  });

  // 4. VLAN CONFLICT DETECTION & IPAM
  await t.test('5. VLAN & IPAM: Duplicate Validation & IP Allocation', () => {
    // Duplicate VLAN on same router & interface must be rejected
    assert.throws(
      () =>
        NetworkService.createVlan({
          vlanId: 20, // Existing VLAN ID on sfp-sfpplus1
          name: 'Conflict VLAN',
          purpose: 'FIBER_INTERNET',
          routerId: 'rtr-core-1',
          interface: 'sfp-sfpplus1',
        }),
      /VLAN conflict/
    );

    const ip = NetworkService.allocateIpAddress('pool-fiber-1', 'cust-1001', false);
    assert.ok(ip.ipAddress.startsWith('10.20.'));
  });

  // 5. BILLING & PREVENTING DUPLICATE INVOICES
  await t.test('6. Billing: Duplicate Invoice Prevention & Accrual Accounting', () => {
    const period = '2027-01';
    const inv1 = BillingService.generateInvoice({
      customerId: 'cust-1001',
      billingPeriod: period,
      items: [{ description: 'Fiber Ultra 300M (Jan 2027)', amount: 55.0 }],
    });
    assert.ok(inv1.invoiceNumber);

    // Second attempt for same period must throw duplicate error
    assert.throws(
      () =>
        BillingService.generateInvoice({
          customerId: 'cust-1001',
          billingPeriod: period,
          items: [{ description: 'Fiber Ultra 300M (Jan 2027 duplicate)', amount: 55.0 }],
        }),
      /Duplicate invoice blocked/
    );
  });

  // 6. PAYMENTS, DOUBLE-ENTRY JOURNAL & RECONNECTION
  await t.test('7. Payment: Cashier Payment & Subscriber Reconnection', async () => {
    // Set customer to suspended
    const cust = dbStore.customers.find((c) => c.id === 'cust-1004')!;
    cust.status = 'SUSPENDED';
    cust.balanceDue = 110.0;

    const res = await PaymentService.recordPayment({
      customerId: cust.id,
      amount: 110.0,
      method: 'KHQR_BAKONG',
      transactionRef: `BAKONG-TXN-${Date.now()}`,
      notes: 'Full outstanding payment via Bakong QR',
    });

    assert.strictEqual(res.newCustomerBalance, 0);
    assert.strictEqual(res.customerStatus, 'ACTIVE');
    assert.strictEqual(res.reconnected, true);
  });

  // 7. DOUBLE-ENTRY ACCOUNTING ENGINE
  await t.test('8. Accounting: Debits == Credits Strict Balancing', () => {
    // Unbalanced journal must be rejected
    assert.throws(
      () =>
        AccountingService.postJournalEntry({
          description: 'Unbalanced Attempt',
          lines: [
            { accountCode: '1010', debit: 100.0, credit: 0.0 },
            { accountCode: '4010', debit: 0.0, credit: 90.0 }, // $10 difference!
          ],
        }),
      /Unbalanced Journal Entry/
    );

    // Balanced journal must succeed
    const balanced = AccountingService.postJournalEntry({
      description: 'Test Office Utility Expense',
      lines: [
        { accountCode: '5300', debit: 75.0, credit: 0.0, description: 'Power' },
        { accountCode: '1010', debit: 0.0, credit: 75.0, description: 'Petty cash payment' },
      ],
      createdBy: 'Accountant',
    });
    assert.ok(balanced.entry.entryNumber);

    // Trial balance must remain strictly balanced
    const trial = AccountingService.getTrialBalance();
    assert.strictEqual(trial.isBalanced, true);
    assert.strictEqual(trial.totalDebit, trial.totalCredit);

    // Reversal entry maintains audit trail
    const reversal = AccountingService.reverseJournalEntry(balanced.entry.entryNumber, 'Entered in error');
    assert.strictEqual(reversal.entry.isPosted, true);
    const original = dbStore.journalEntries.find((e) => e.entryNumber === balanced.entry.entryNumber)!;
    assert.strictEqual(original.isReversed, true);
  });

  // 8. INVENTORY & WAREHOUSE MANAGEMENT
  await t.test('9. Inventory: Prevent Negative Stock & Movement Tracking', () => {
    const prod = dbStore.products[0];
    const initialQty = prod.quantity;

    // Dispatching more than available must be blocked
    assert.throws(
      () =>
        InventoryService.recordMovement({
          productId: prod.id,
          type: 'STOCK_OUT',
          quantity: initialQty + 1000,
        }),
      /Negative stock prevented/
    );

    // Normal movement succeeds
    const mov = InventoryService.recordMovement({
      productId: prod.id,
      type: 'STOCK_IN',
      quantity: 10,
      actor: 'Warehouse Keeper',
    });
    assert.strictEqual(mov.currentStock, initialQty + 10);
  });

  // 9. PROCUREMENT & SUPPLIER PAYABLES
  await t.test('10. Procurement: PO -> Goods Receipt -> AP Accounting -> Payment', () => {
    const po = ProcurementService.createPurchaseOrder({
      supplierId: 'sup-1',
      items: [{ productId: 'prod-1', quantity: 5, unitPrice: 28.0 }],
    });
    assert.ok(po.poNumber);

    // Receive goods
    const grn = ProcurementService.receiveGoods(po.id, 'Warehouse Lead');
    assert.strictEqual(grn.po.status, 'COMPLETED');

    // Supplier balance should have increased by 5 * 28 = $140
    const sup = dbStore.suppliers.find((s) => s.id === 'sup-1')!;
    const prevBalance = sup.balancePayable;

    // Pay supplier
    ProcurementService.paySupplier('sup-1', 140.0, 'ABA Wire Transfer');
    assert.strictEqual(sup.balancePayable, prevBalance - 140.0);
  });

  // 10. OPERATIONS: INSTALLATION WORKFLOW
  await t.test('11. Operations: Complete Installation Workflow A', async () => {
    const newCust = CustomerService.createCustomer({
      fullName: 'Dararith Srun',
      email: 'dararith@gmail.com',
      phone: '+855 12 444 333',
      address: 'St. 1984, Sen Sok',
      city: 'Phnom Penh',
      planName: 'Fiber Starter 100M',
      monthlyPrice: 35.0,
      connectionType: 'FIBER',
    });

    const inst = OperationsService.createInstallation({
      customerId: newCust.id,
      scheduledDate: new Date().toISOString(),
      timeSlot: '09:00 - 11:00 AM',
    });
    assert.strictEqual(inst.status, 'SCHEDULED');

    // Complete installation
    const completed = await OperationsService.completeInstallation(inst.id, {
      assignedOntSn: 'SN-HW-2026-0006',
      opticalPowerDbm: -18.7,
      notes: 'Optical power optimal. Speed test validated at 100 Mbps.',
      actor: 'Marcus Vance',
    });

    assert.strictEqual(completed.installation.status, 'COMPLETED');
    assert.strictEqual(completed.customer.status, 'ACTIVE');
    assert.ok(completed.invoice, 'First monthly invoice generated');
  });
});
