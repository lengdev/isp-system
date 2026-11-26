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
  // Internal seed/automation options (never accepted from public API body)
  issueDate?: Date;
  statusOverride?: 'PENDING' | 'OVERDUE';
}

async function nextInvoiceNumber(tx: Prisma.TransactionClient): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  const latest = await tx.invoice.findFirst({
    where: { invoiceNumber: { startsWith: prefix } },
    orderBy: { invoiceNumber: 'desc' },
    select: { invoiceNumber: true },
  });
  let maxSeq = 100;
  if (latest) {
    const seq = parseInt(latest.invoiceNumber.slice(prefix.length), 10);
    if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
  }
  let candidate = `${prefix}${(maxSeq + 1).toString().padStart(5, '0')}`;
  while (await tx.invoice.findUnique({ where: { invoiceNumber: candidate } })) {
    maxSeq++;
    candidate = `${prefix}${(maxSeq + 1).toString().padStart(5, '0')}`;
  }
  return candidate;
}

export class BillingService {
  private static formatInvoiceRecord(inv: any) {
    return {
      ...inv,
      amount: Number(inv.amount),
      paidAmount: Number(inv.paidAmount),
      balanceDue: Number(inv.balanceDue),
      issueDate: inv.issueDate.toISOString(),
      dueDate: inv.dueDate.toISOString(),
      paidAt: inv.paidAt?.toISOString() || null,
      createdAt: inv.createdAt.toISOString(),
      updatedAt: inv.updatedAt.toISOString(),
      items: inv.items.map((it: any) => ({
        ...it,
        unitPrice: Number(it.unitPrice),
        amount: Number(it.amount),
      })),
      customerName: inv.customer?.nameEn || inv.customer?.nameKm || inv.customer?.fullName || 'Customer',
      customerEmail: inv.customer?.email || '',
      customerPhone: inv.customer?.phone || '',
    };
  }

  private static buildInvoiceWhere(filters: {
    customerId?: string;
    status?: string;
    billingPeriod?: string;
    search?: string;
    invoiceNumber?: string;
    customerName?: string;
    minAmount?: number | string;
    maxAmount?: number | string;
  } = {}): Prisma.InvoiceWhereInput {
    const andClauses: Prisma.InvoiceWhereInput[] = [];
    if (filters.customerId) andClauses.push({ customerId: filters.customerId });
    if (filters.billingPeriod) andClauses.push({ billingPeriod: filters.billingPeriod });

    if (filters.status) {
      const st = String(filters.status).toUpperCase();
      if (st === 'PARTIAL') {
        andClauses.push({
          status: { notIn: ['PAID', 'CANCELLED'] },
          paidAmount: { gt: 0 },
          balanceDue: { gt: 0 },
        });
      } else if (st === 'PENDING' || st === 'OVERDUE' || st === 'PAID' || st === 'CANCELLED') {
        andClauses.push({ status: st as any });
      }
    }

    if (filters.invoiceNumber) {
      andClauses.push({ invoiceNumber: { contains: filters.invoiceNumber.trim(), mode: 'insensitive' } });
    }
    if (filters.customerName) {
      const cn = filters.customerName.trim().normalize('NFC');
      andClauses.push({
        customer: {
          OR: [
            { fullName: { contains: cn, mode: 'insensitive' } },
            { nameEn: { contains: cn, mode: 'insensitive' } },
            { nameKm: { contains: cn, mode: 'insensitive' } },
            { email: { contains: cn, mode: 'insensitive' } },
          ],
        },
      });
    }

    const minA = filters.minAmount !== undefined && filters.minAmount !== '' ? Number(filters.minAmount) : NaN;
    const maxA = filters.maxAmount !== undefined && filters.maxAmount !== '' ? Number(filters.maxAmount) : NaN;
    if (!Number.isNaN(minA)) andClauses.push({ amount: { gte: minA } });
    if (!Number.isNaN(maxA)) andClauses.push({ amount: { lte: maxA } });

    if (filters.search) {
      const q = filters.search.trim().normalize('NFC');
      andClauses.push({
        OR: [
          { invoiceNumber: { contains: q, mode: 'insensitive' } },
          { customerId: { contains: q, mode: 'insensitive' } },
          { customer: { fullName: { contains: q, mode: 'insensitive' } } },
          { customer: { nameEn: { contains: q, mode: 'insensitive' } } },
          { customer: { nameKm: { contains: q, mode: 'insensitive' } } },
          { customer: { email: { contains: q, mode: 'insensitive' } } },
        ],
      });
    }

    return andClauses.length > 0 ? { AND: andClauses } : {};
  }

  // 1. List Invoices with search and filters
  static async listInvoices(filters?: {
    customerId?: string;
    status?: string;
    billingPeriod?: string;
    search?: string;
  }) {
    const where = BillingService.buildInvoiceWhere(filters);
    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        customer: true,
        items: true,
      },
      orderBy: { issueDate: 'desc' },
    });

    return invoices.map(BillingService.formatInvoiceRecord);
  }

  static async listInvoicesPaged(filters: {
    customerId?: string;
    status?: string;
    billingPeriod?: string;
    search?: string;
    invoiceNumber?: string;
    customerName?: string;
    minAmount?: number | string;
    maxAmount?: number | string;
    page?: number | string;
    limit?: number | string;
    sortBy?: string;
    sortDir?: string;
  } = {}) {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 25));
    const skip = (page - 1) * limit;
    const where = BillingService.buildInvoiceWhere(filters);

    const sortDir = filters.sortDir === 'asc' ? 'asc' : 'desc';
    let orderBy: Prisma.InvoiceOrderByWithRelationInput = { issueDate: 'desc' };
    if (filters.sortBy === 'invoiceNumber') orderBy = { invoiceNumber: sortDir };
    else if (filters.sortBy === 'customerName') orderBy = { customer: { fullName: sortDir } };
    else if (filters.sortBy === 'date') orderBy = { issueDate: sortDir };
    else if (filters.sortBy === 'dueDate') orderBy = { dueDate: sortDir };
    else if (filters.sortBy === 'amount') orderBy = { amount: sortDir };
    else if (filters.sortBy === 'status') orderBy = { status: sortDir };

    const [total, invoices, allAgg, paidAgg, overdueAgg] = await prisma.$transaction([
      prisma.invoice.count({ where }),
      prisma.invoice.findMany({
        where,
        include: {
          customer: true,
          items: true,
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.invoice.aggregate({
        where: { status: { not: 'CANCELLED' } },
        _sum: { amount: true },
      }),
      prisma.invoice.aggregate({
        where: { status: 'PAID' },
        _sum: { amount: true },
      }),
      prisma.invoice.aggregate({
        where: { status: 'OVERDUE' },
        _sum: { balanceDue: true },
      }),
    ]);

    return {
      items: invoices.map(BillingService.formatInvoiceRecord),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      stats: {
        totalBilled: Number(allAgg._sum.amount || 0),
        totalPaid: Number(paidAgg._sum.amount || 0),
        totalOverdue: Number(overdueAgg._sum.balanceDue || 0),
      },
    };
  }

  // 2. Generate Single Invoice with Duplicate Prevention & Accrual Accounting
  static async generateInvoice(input: CreateInvoiceInput) {
    return prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findFirst({
        where: { OR: [{ id: input.customerId }, { code: input.customerId }] },
        include: {
          subscriptions: {
            include: { package: true },
          },
        },
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
      const issueDate = input.issueDate || new Date();
      const dueDate = input.dueDate ? new Date(input.dueDate) : new Date(issueDate.getTime() + 14 * 24 * 3600 * 1000);

      const newInvoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          customerId: customer.id,
          subscriptionId: input.subscriptionId || customer.subscriptions[0]?.id || null,
          amount: new Prisma.Decimal(totalAmount),
          paidAmount: new Prisma.Decimal(0.0),
          balanceDue: new Prisma.Decimal(totalAmount),
          status: input.statusOverride || 'PENDING',
          billingPeriod: input.billingPeriod,
          issueDate,
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

      const primarySub = customer.subscriptions[0];
      const pkg = primarySub?.package;
      const connectionType = primarySub?.technology || 'FIBER';
      const receivableAccountCode = pkg?.receivableAccountCode || '1100';
      const revenueAccountCode =
        pkg?.revenueAccountCode || (connectionType === 'WIRELESS' ? '4020' : '4010');
      const taxAccountCode = pkg?.taxAccountCode || '2200';
      const lines = [
        {
          accountCode: receivableAccountCode,
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
          accountCode: taxAccountCode,
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
          entryDate: issueDate,
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

  // 4. Void/Cancel an Unpaid Invoice with GL Reversal
  static async voidInvoice(invoiceId: string, reason: string = 'Invoice voided', voidedAt?: Date) {
    return prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.findFirst({
        where: { OR: [{ id: invoiceId }, { invoiceNumber: invoiceId }] },
        include: {
          customer: true,
          items: true,
          subscription: {
            include: { package: true },
          },
        },
      });
      if (!inv) throw new Error(`Invoice ${invoiceId} not found.`);
      if (inv.status === 'CANCELLED') throw new Error(`Invoice ${inv.invoiceNumber} is already cancelled.`);
      if (Number(inv.paidAmount) > 0) {
        throw new Error(`Cannot void invoice ${inv.invoiceNumber} with existing payments.`);
      }

      const totalAmount = Number(inv.amount);
      const balanceToClear = Number(inv.balanceDue);
      const itemsTotal =
        Math.round(inv.items.reduce((sum, it) => sum + Number(it.amount), 0) * 100) / 100 || totalAmount;
      const taxAmount = Math.max(0, Math.round((totalAmount - itemsTotal) * 100) / 100);
      const pkg = inv.subscription?.package;
      const receivableAccountCode = pkg?.receivableAccountCode || '1100';
      const revenueAccountCode =
        pkg?.revenueAccountCode || (inv.subscription?.technology === 'WIRELESS' ? '4020' : '4010');
      const taxAccountCode = pkg?.taxAccountCode || '2200';

      const updated = await tx.invoice.update({
        where: { id: inv.id },
        data: {
          status: 'CANCELLED',
          balanceDue: new Prisma.Decimal(0),
        },
      });

      if (inv.customer && balanceToClear > 0) {
        const nextBalance = Math.max(
          0,
          Math.round((Number(inv.customer.balanceDue) - balanceToClear) * 100) / 100
        );
        await tx.customer.update({
          where: { id: inv.customer.id },
          data: { balanceDue: new Prisma.Decimal(nextBalance) },
        });
      }

      const lines = [
        {
          accountCode: revenueAccountCode,
          debit: itemsTotal,
          credit: 0,
          description: `Reverse revenue for voided invoice ${inv.invoiceNumber}`,
        },
        {
          accountCode: receivableAccountCode,
          debit: 0,
          credit: totalAmount,
          description: `Reverse AR for voided invoice ${inv.invoiceNumber}`,
        },
      ];
      if (taxAmount > 0) {
        lines.push({
          accountCode: taxAccountCode,
          debit: taxAmount,
          credit: 0,
          description: `Reverse VAT for voided invoice ${inv.invoiceNumber}`,
        });
      }

      await AccountingService.postJournalEntry(
        {
          description: `Void Invoice ${inv.invoiceNumber}: ${reason}`,
          reference: `VOID-${inv.invoiceNumber}`,
          lines,
          createdBy: 'Billing Automation',
          periodId: inv.billingPeriod,
          entryDate: voidedAt || new Date(),
        },
        tx
      );

      return {
        ...updated,
        amount: Number(updated.amount),
        paidAmount: Number(updated.paidAmount),
        balanceDue: Number(updated.balanceDue),
      };
    });
  }
}
