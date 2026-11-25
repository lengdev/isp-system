import { Prisma } from '@prisma/client';
import { prisma, logAudit } from '../db/store.js';
import { AccountingService } from './accounting.service.js';

export interface CreateInvoiceInput {
  customerId: string;
  subscriptionId?: string;
  billingPeriod: string; // "2026-11"
  dueDate?: string;
  items: { description: string; amount: number; packageId?: string }[];
  taxRatePercent?: number;
}

async function nextInvoiceNumber(tx: Prisma.TransactionClient): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  const existing = await tx.invoice.findMany({
    where: { invoiceNumber: { startsWith: prefix } },
    select: { invoiceNumber: true },
  });
  let maxSeq = 100;
  for (const inv of existing) {
    const seq = parseInt(inv.invoiceNumber.slice(prefix.length), 10);
    if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
  }
  let candidate = `${prefix}${(maxSeq + 1).toString().padStart(4, '0')}`;
  while (await tx.invoice.findUnique({ where: { invoiceNumber: candidate } })) {
    maxSeq++;
    candidate = `${prefix}${(maxSeq + 1).toString().padStart(4, '0')}`;
  }
  return candidate;
}

export class BillingService {
  // 1. List Invoices with search and filters
  static async listInvoices(filters?: {
    customerId?: string;
    status?: string;
    billingPeriod?: string;
    search?: string;
  }) {
    const where: any = {};
    if (filters?.customerId) where.customerId = filters.customerId;
    if (filters?.status) where.status = filters.status.toUpperCase();
    if (filters?.billingPeriod) where.billingPeriod = filters.billingPeriod;
    if (filters?.search) {
      const q = filters.search;
      where.OR = [
        { invoiceNumber: { contains: q, mode: 'insensitive' } },
        { customerId: { contains: q, mode: 'insensitive' } },
      ];
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        customer: true,
        items: true,
      },
      orderBy: { issueDate: 'desc' },
    });

    return invoices.map((inv) => ({
      ...inv,
      amount: Number(inv.amount),
      paidAmount: Number(inv.paidAmount),
      balanceDue: Number(inv.balanceDue),
      issueDate: inv.issueDate.toISOString(),
      dueDate: inv.dueDate.toISOString(),
      paidAt: inv.paidAt?.toISOString() || null,
      createdAt: inv.createdAt.toISOString(),
      updatedAt: inv.updatedAt.toISOString(),
      items: inv.items.map((it) => ({
        ...it,
        unitPrice: Number(it.unitPrice),
        amount: Number(it.amount),
      })),
      customerName: inv.customer?.fullName || 'Customer',
      customerEmail: inv.customer?.email || '',
      customerPhone: inv.customer?.phone || '',
    }));
  }

  // 2. Generate Single Invoice with Duplicate Prevention & Accrual Accounting
  static async generateInvoice(input: CreateInvoiceInput) {
    return prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findFirst({
        where: { OR: [{ id: input.customerId }, { code: input.customerId }] },
        include: { subscriptions: true },
      });
      if (!customer) throw new Error(`Customer ${input.customerId} not found.`);

      const existing = await tx.invoice.findFirst({
        where: {
          customerId: customer.id,
          billingPeriod: input.billingPeriod,
          status: { not: 'CANCELLED' },
        },
      });
      if (existing) {
        throw new Error(
          `Duplicate invoice blocked! Invoice ${existing.invoiceNumber} already exists for customer ${customer.code} for billing period ${input.billingPeriod}.`
        );
      }

      const itemsTotal = Math.round(
        input.items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0) * 100
      ) / 100;
      const taxRate = input.taxRatePercent !== undefined ? input.taxRatePercent : 10.0;
      const taxAmount = Math.round(itemsTotal * (taxRate / 100) * 100) / 100;
      const totalAmount = Math.round((itemsTotal + taxAmount) * 100) / 100;

      const invoiceNumber = await nextInvoiceNumber(tx);
      const dueDate = input.dueDate ? new Date(input.dueDate) : new Date(Date.now() + 14 * 24 * 3600 * 1000);

      const newInvoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          customerId: customer.id,
          subscriptionId: input.subscriptionId || customer.subscriptions[0]?.id || null,
          amount: new Prisma.Decimal(totalAmount),
          paidAmount: new Prisma.Decimal(0.0),
          balanceDue: new Prisma.Decimal(totalAmount),
          status: 'PENDING',
          billingPeriod: input.billingPeriod,
          dueDate,
          items: {
            create: input.items.map((it) => ({
              description: it.description,
              packageId: it.packageId || null,
              quantity: 1,
              unitPrice: new Prisma.Decimal(Number(it.amount) || 0),
              amount: new Prisma.Decimal(Number(it.amount) || 0),
            })),
          },
        },
        include: { items: true },
      });

      await tx.customer.update({
        where: { id: customer.id },
        data: {
          balanceDue: { increment: new Prisma.Decimal(totalAmount) },
        },
      });

      const connectionType = customer.subscriptions[0]?.technology || 'FIBER';
      const revenueAccountCode = connectionType === 'WIRELESS' ? '4020' : '4010';
      const lines = [
        {
          accountCode: '1100',
          debit: totalAmount,
          credit: 0.0,
          description: `Invoice ${invoiceNumber} issued to ${customer.fullName}`,
        },
        {
          accountCode: revenueAccountCode,
          debit: 0.0,
          credit: itemsTotal,
          description: `Broadband revenue recognized for ${input.billingPeriod}`,
        },
      ];

      if (taxAmount > 0) {
        lines.push({
          accountCode: '2200',
          debit: 0.0,
          credit: taxAmount,
          description: `VAT payable (${taxRate}%) on invoice ${invoiceNumber}`,
        });
      }

      await AccountingService.postJournalEntry(
        {
          description: `Customer Invoice Generated: ${invoiceNumber} (${customer.fullName})`,
          reference: invoiceNumber,
          lines,
          createdBy: 'Billing Automation',
          periodId: input.billingPeriod,
        },
        tx
      );

      await tx.auditLog.create({
        data: {
          action: 'CREATE_INVOICE',
          resource: 'Invoice',
          resourceId: invoiceNumber,
          details: `Generated invoice ${invoiceNumber} for $${totalAmount.toFixed(2)}`,
          ipAddress: '127.0.0.1',
          ip: '127.0.0.1',
        },
      });

      return {
        ...newInvoice,
        amount: Number(newInvoice.amount),
        paidAmount: Number(newInvoice.paidAmount),
        balanceDue: Number(newInvoice.balanceDue),
        issueDate: newInvoice.issueDate.toISOString(),
        dueDate: newInvoice.dueDate.toISOString(),
        paidAt: null,
        items: newInvoice.items.map((it) => ({
          ...it,
          unitPrice: Number(it.unitPrice),
          amount: Number(it.amount),
        })),
      };
    });
  }

  // 3. Mark Invoice as Paid directly
  static async markAsPaid(invoiceId: string, paymentMethod: string = 'CASH', actor: string = 'Staff') {
    const result = await prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.findFirst({
        where: { OR: [{ id: invoiceId }, { invoiceNumber: invoiceId }] },
      });
      if (!inv) throw new Error('Invoice not found');
      if (inv.status === 'PAID') return inv;

      const remaining = Number(inv.balanceDue);
      const updatedInv = await tx.invoice.update({
        where: { id: inv.id },
        data: {
          paidAmount: inv.amount,
          balanceDue: new Prisma.Decimal(0.0),
          status: 'PAID',
          paidAt: new Date(),
          paymentMethod,
        },
      });

      const customer = await tx.customer.findUnique({ where: { id: inv.customerId } });
      if (customer) {
        const nextBalance = Math.max(0, Math.round((Number(customer.balanceDue) - remaining) * 100) / 100);
        await tx.customer.update({
          where: { id: customer.id },
          data: {
            balanceDue: new Prisma.Decimal(nextBalance),
            ...(nextBalance === 0 && customer.status === 'OVERDUE' ? { status: 'ACTIVE' } : {}),
          },
        });
      }

      await logAudit(
        'PAID_INVOICE',
        'Invoice',
        inv.invoiceNumber,
        `Invoice ${inv.invoiceNumber} marked as paid ($${remaining}) by ${actor}`,
        actor
      );

      return updatedInv;
    });

    return {
      ...result,
      amount: Number(result.amount),
      paidAmount: Number(result.paidAmount),
      balanceDue: Number(result.balanceDue),
      issueDate: result.issueDate.toISOString(),
      dueDate: result.dueDate.toISOString(),
      paidAt: result.paidAt?.toISOString() || null,
    };
  }
}
