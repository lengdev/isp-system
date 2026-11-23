import { dbStore } from '../db/store.js';
import { AccountingService } from './accounting.service.js';

export interface CreateInvoiceInput {
  customerId: string;
  subscriptionId?: string;
  billingPeriod: string; // "2026-11"
  dueDate?: string;
  items: { description: string; amount: number; packageId?: string }[];
  taxRatePercent?: number;
}

export class BillingService {
  // 1. List Invoices with search and filters
  static listInvoices(filters?: { customerId?: string; status?: string; billingPeriod?: string; search?: string }) {
    let result = [...dbStore.invoices];

    if (filters?.customerId) {
      result = result.filter((i) => i.customerId === filters.customerId);
    }
    if (filters?.status) {
      result = result.filter((i) => i.status.toUpperCase() === filters.status!.toUpperCase());
    }
    if (filters?.billingPeriod) {
      result = result.filter((i) => i.billingPeriod === filters.billingPeriod);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (i) =>
          i.invoiceNumber.toLowerCase().includes(q) ||
          i.customerId.toLowerCase().includes(q)
      );
    }

    // Attach Customer names
    return result.map((inv) => {
      const cust = dbStore.customers.find((c) => c.id === inv.customerId);
      return {
        ...inv,
        customerName: cust?.fullName || 'Customer',
        customerEmail: cust?.email || '',
        customerPhone: cust?.phone || '',
      };
    });
  }

  // 2. Generate Single Invoice with Duplicate Prevention & Accrual Accounting
  static generateInvoice(input: CreateInvoiceInput) {
    const customer = dbStore.customers.find((c) => c.id === input.customerId);
    if (!customer) throw new Error(`Customer ${input.customerId} not found.`);

    // PREVENT DUPLICATE INVOICES: Check if an invoice already exists for this customer/period
    const existing = dbStore.invoices.find(
      (i) => i.customerId === input.customerId && i.billingPeriod === input.billingPeriod && i.status !== 'CANCELLED'
    );
    if (existing) {
      throw new Error(
        `Duplicate invoice blocked! Invoice ${existing.invoiceNumber} already exists for customer ${customer.code} for billing period ${input.billingPeriod}.`
      );
    }

    const itemsTotal = input.items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const taxRate = input.taxRatePercent !== undefined ? input.taxRatePercent : 10.0;
    const taxAmount = Math.round((itemsTotal * (taxRate / 100)) * 100) / 100;
    const totalAmount = Math.round((itemsTotal + taxAmount) * 100) / 100;

    const invoiceNumber = `INV-2026-${(dbStore.invoices.length + 101).toString().padStart(4, '0')}`;
    const issueDate = new Date().toISOString();
    const dueDate = input.dueDate || new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString();

    const newInvoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber,
      customerId: customer.id,
      subscriptionId: input.subscriptionId || null,
      amount: totalAmount,
      paidAmount: 0.0,
      balanceDue: totalAmount,
      status: 'PENDING',
      billingPeriod: input.billingPeriod,
      issueDate,
      dueDate,
      paidAt: null,
      paymentMethod: null,
      items: input.items,
    };

    dbStore.invoices.unshift(newInvoice);

    // Update Customer Balance
    customer.balanceDue = Math.round((Number(customer.balanceDue) + totalAmount) * 100) / 100;

    // AUTOMATIC DOUBLE-ENTRY ACCOUNTING INTEGRATION:
    // Debit Accounts Receivable (1100): Total Invoiced
    // Credit Internet Service Revenue (4010 for Fiber, 4020 for Wireless): Net Subtotal
    // Credit Tax Payable (2200): VAT collected
    const revenueAccountCode = customer.connectionType === 'WIRELESS' ? '4020' : '4010';
    const lines = [
      {
        accountCode: '1100', // Accounts Receivable
        debit: totalAmount,
        credit: 0.0,
        description: `Invoice ${invoiceNumber} issued to ${customer.fullName}`,
      },
      {
        accountCode: revenueAccountCode, // Internet Service Revenue
        debit: 0.0,
        credit: itemsTotal,
        description: `Broadband revenue recognized for ${input.billingPeriod}`,
      },
    ];

    if (taxAmount > 0) {
      lines.push({
        accountCode: '2200', // VAT / Tax Payable
        debit: 0.0,
        credit: taxAmount,
        description: `VAT payable (10%) on invoice ${invoiceNumber}`,
      });
    }

    AccountingService.postJournalEntry({
      description: `Customer Invoice Generated: ${invoiceNumber} (${customer.fullName})`,
      reference: invoiceNumber,
      lines,
      createdBy: 'Billing Automation',
    });

    dbStore.logAudit('CREATE_INVOICE', 'Invoice', invoiceNumber, `Generated invoice ${invoiceNumber} for $${totalAmount.toFixed(2)}`);

    return newInvoice;
  }

  // 3. Mark Invoice as Paid directly or Cancel
  static markAsPaid(invoiceId: string, paymentMethod: string = 'CASH', actor: string = 'Staff') {
    const inv = dbStore.invoices.find((i) => i.id === invoiceId);
    if (!inv) throw new Error('Invoice not found');
    if (inv.status === 'PAID') return inv;

    const remaining = inv.balanceDue;
    inv.paidAmount = inv.amount;
    inv.balanceDue = 0.0;
    inv.status = 'PAID';
    inv.paidAt = new Date().toISOString();
    inv.paymentMethod = paymentMethod;

    const customer = dbStore.customers.find((c) => c.id === inv.customerId);
    if (customer) {
      customer.balanceDue = Math.max(0, Math.round((Number(customer.balanceDue) - remaining) * 100) / 100);
      if (customer.balanceDue === 0 && customer.status === 'OVERDUE') {
        customer.status = 'ACTIVE';
      }
    }

    dbStore.logAudit('PAID_INVOICE', 'Invoice', inv.invoiceNumber, `Invoice ${inv.invoiceNumber} marked as paid ($${remaining}) by ${actor}`);
    return inv;
  }
}
