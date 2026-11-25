import { dbStore } from '../db/store.js';
import { AccountingService } from './accounting.service.js';
import { MikroTikService } from './mikrotik.service.js';

export interface RecordPaymentInput {
  customerId: string;
  amount: number;
  method: 'CASH' | 'BANK_TRANSFER' | 'KHQR_BAKONG' | 'GATEWAY_ONLINE';
  transactionRef?: string;
  notes?: string;
  recordedBy?: string;
}

export class PaymentService {
  // 1. List Payments
  static listPayments(customerId?: string) {
    let list = [...dbStore.payments];
    if (customerId) {
      list = list.filter((p) => p.customerId === customerId);
    }
    return list.map((p) => {
      const cust = dbStore.customers.find((c) => c.id === p.customerId);
      return {
        ...p,
        customerName: cust?.fullName || 'Customer',
        customerCode: cust?.code || '',
      };
    });
  }

  // 2. Record Customer Payment with Balanced Double-Entry Journal & Auto-Reconnection
  static async recordPayment(input: RecordPaymentInput) {
    const customer = dbStore.customers.find((c) => c.id === input.customerId);
    if (!customer) throw new Error(`Customer ${input.customerId} not found.`);

    const paymentAmount = Number(input.amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      throw new Error('Payment amount must be greater than zero.');
    }

    // Idempotency check: prevent duplicate payments using transactionRef
    if (input.transactionRef) {
      const duplicate = dbStore.payments.find(
        (p) => p.transactionRef === input.transactionRef && p.status === 'SUCCESSFUL'
      );
      if (duplicate) {
        return {
          payment: duplicate,
          message: 'Payment already recorded previously (idempotent duplicate request).',
          isDuplicate: true,
        };
      }
    }

    const paymentNumber = `PAY-2026-${(dbStore.payments.length + 1).toString().padStart(4, '0')}`;
    const receiptNumber = `RCPT-2026-${(dbStore.payments.length + 1001).toString()}`;
    const transactionRef = input.transactionRef || `REF-${Date.now()}`;

    // Allocate payment against pending / overdue invoices (oldest first)
    let unallocated = paymentAmount;
    const unpaidInvoices = dbStore.invoices
      .filter((i) => i.customerId === customer.id && i.status !== 'PAID')
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    const allocations = [];
    for (const inv of unpaidInvoices) {
      if (unallocated <= 0) break;

      const toPay = Math.min(inv.balanceDue, unallocated);
      inv.paidAmount = Math.round((Number(inv.paidAmount) + toPay) * 100) / 100;
      inv.balanceDue = Math.round((Number(inv.balanceDue) - toPay) * 100) / 100;

      if (inv.balanceDue <= 0.001) {
        inv.status = 'PAID';
        inv.paidAt = new Date().toISOString();
        inv.paymentMethod = input.method;
      }

      allocations.push({
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        allocatedAmount: toPay,
      });

      unallocated -= toPay;
    }

    // Update customer balanceDue
    customer.balanceDue = Math.max(0, Math.round((Number(customer.balanceDue) - paymentAmount) * 100) / 100);

    const paymentRecord = {
      id: `pay-${Date.now()}`,
      paymentNumber,
      customerId: customer.id,
      amount: paymentAmount,
      method: input.method,
      status: 'SUCCESSFUL',
      transactionRef,
      receiptNumber,
      notes: input.notes || null,
      recordedBy: input.recordedBy || 'Staff',
      allocations,
      createdAt: new Date().toISOString(),
    };

    dbStore.payments.unshift(paymentRecord);

    // AUTOMATIC DOUBLE-ENTRY ACCOUNTING INTEGRATION:
    // Debit Cash (1010) or Bank (1020) or Bakong Wallet (1030)
    // Credit Accounts Receivable (1100): payment amount
    let debitAccountCode = '1010'; // Petty Cash
    if (input.method === 'BANK_TRANSFER') debitAccountCode = '1020'; // ABA Bank
    if (input.method === 'KHQR_BAKONG') debitAccountCode = '1030'; // Bakong Wallet

    AccountingService.postJournalEntry({
      description: `Customer Payment Received: ${paymentNumber} (${customer.fullName}) via ${input.method}`,
      reference: paymentNumber,
      lines: [
        {
          accountCode: debitAccountCode,
          debit: paymentAmount,
          credit: 0.0,
          description: `Funds collected via ${input.method} (${receiptNumber})`,
        },
        {
          accountCode: '1100', // Accounts Receivable
          debit: 0.0,
          credit: paymentAmount,
          description: `Credit subscriber account ${customer.code} balance`,
        },
      ],
      createdBy: input.recordedBy || 'Cashier',
    });

    // END-TO-END WORKFLOW D: RECONNECTION ON CONFIRMED PAYMENT
    // If the customer was SUSPENDED or OVERDUE and now has zero balance due, restore service
    let reconnected = false;
    if (customer.balanceDue === 0 && (customer.status === 'SUSPENDED' || customer.status === 'OVERDUE')) {
      customer.status = 'ACTIVE';
      if (customer.pppoeUsername) {
        // Execute RouterOS reconnection
        await MikroTikService.reconnectSubscriber('rtr-core-1', customer.pppoeUsername);
        reconnected = true;
      }
    }

    dbStore.logAudit(
      'RECORD_PAYMENT',
      'Payment',
      paymentNumber,
      `Recorded payment of $${paymentAmount.toFixed(2)} from ${customer.fullName} (${input.method}). Reconnected: ${reconnected}`
    );

    return {
      payment: paymentRecord,
      newCustomerBalance: customer.balanceDue,
      customerStatus: customer.status,
      reconnected,
    };
  }

  // 3. Generate KHQR (Cambodia Bakong standard QR) Payload
  static generateKHQRPayload(customerId: string, amount: number) {
    const customer = dbStore.customers.find((c) => c.id === customerId);
    if (!customer) throw new Error('Customer not found');

    const bakongId = dbStore.companySettings.companyName.toLowerCase().replace(/[^a-z0-9]/g, '') + '@wing';
    const txnId = `NP-${Date.now()}`;

    // Standard EMVCo / KHQR string payload representation
    const khqrString = `00020101021229370016bakong@nbc.org.kh0113${bakongId}5204581253038405406${amount.toFixed(2)}5802KH5910NSMISP ISP6010PHNOM PENH62180114${txnId}6304ABCD`;

    return {
      khqrString,
      transactionId: txnId,
      merchantName: 'NSMISP High-Speed Broadband',
      merchantId: bakongId,
      amount,
      currency: 'USD',
      customerCode: customer.code,
      customerName: customer.fullName,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 mins
    };
  }
}
