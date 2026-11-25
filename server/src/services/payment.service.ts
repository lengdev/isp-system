import { Prisma } from '@prisma/client';
import { prisma } from '../db/store.js';
import { AccountingService } from './accounting.service.js';
import { MikroTikService } from './mikrotik.service.js';

export interface RecordPaymentInput {
  customerId: string;
  amount: number;
  method: 'CASH' | 'BANK_TRANSFER' | 'KHQR_BAKONG' | 'GATEWAY_ONLINE';
  transactionRef?: string;
  notes?: string;
  recordedBy?: string;
  // Internal seed options
  paidAt?: Date;
  periodId?: string;
}

async function nextPaymentNumber(tx: Prisma.TransactionClient): Promise<{ paymentNumber: string; seq: number }> {
  const year = new Date().getFullYear();
  const prefix = `PAY-${year}-`;
  const latest = await tx.payment.findFirst({
    where: { paymentNumber: { startsWith: prefix } },
    orderBy: { paymentNumber: 'desc' },
    select: { paymentNumber: true },
  });
  let maxSeq = 0;
  if (latest) {
    const seq = parseInt(latest.paymentNumber.slice(prefix.length), 10);
    if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
  }
  let candidate = `${prefix}${(maxSeq + 1).toString().padStart(5, '0')}`;
  while (await tx.payment.findUnique({ where: { paymentNumber: candidate } })) {
    maxSeq++;
    candidate = `${prefix}${(maxSeq + 1).toString().padStart(5, '0')}`;
  }
  return { paymentNumber: candidate, seq: maxSeq + 1 };
}

export class PaymentService {
  private static formatPaymentRecord(p: any) {
    return {
      ...p,
      amount: Number(p.amount),
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      customerName: p.customer?.nameEn || p.customer?.nameKm || p.customer?.fullName || 'Customer',
      customerCode: p.customer?.code || '',
      allocations: (p.allocations || []).map((al: any) => ({
        invoiceId: al.invoiceId,
        invoiceNumber: al.invoice.invoiceNumber,
        allocatedAmount: Number(al.amount),
      })),
    };
  }

  // 1. List Payments
  static async listPayments(customerId?: string) {
    const payments = await prisma.payment.findMany({
      where: customerId ? { customerId } : undefined,
      include: {
        customer: true,
        allocations: { include: { invoice: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return payments.map(PaymentService.formatPaymentRecord);
  }

  static async listPaymentsPaged(filters: {
    customerId?: string;
    page?: number | string;
    limit?: number | string;
    search?: string;
    method?: string;
    paymentNumber?: string;
    customerName?: string;
    sortBy?: string;
    sortDir?: string;
  } = {}) {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 25));
    const skip = (page - 1) * limit;

    const andClauses: Prisma.PaymentWhereInput[] = [];
    if (filters.customerId) andClauses.push({ customerId: filters.customerId });

    if (filters.method) {
      const methods = String(filters.method)
        .split(',')
        .map((m) => m.trim().toUpperCase())
        .filter((m) => ['CASH', 'BANK_TRANSFER', 'KHQR_BAKONG', 'GATEWAY_ONLINE'].includes(m));
      if (methods.length > 0) {
        andClauses.push({ method: { in: methods as any[] } });
      }
    }

    if (filters.paymentNumber) {
      andClauses.push({ paymentNumber: { contains: filters.paymentNumber.trim(), mode: 'insensitive' } });
    }
    if (filters.customerName) {
      const cn = filters.customerName.trim().normalize('NFC');
      andClauses.push({
        customer: {
          OR: [
            { fullName: { contains: cn, mode: 'insensitive' } },
            { nameEn: { contains: cn, mode: 'insensitive' } },
            { nameKm: { contains: cn, mode: 'insensitive' } },
            { code: { contains: cn, mode: 'insensitive' } },
          ],
        },
      });
    }

    if (filters.search) {
      const q = filters.search.trim().normalize('NFC');
      andClauses.push({
        OR: [
          { paymentNumber: { contains: q, mode: 'insensitive' } },
          { transactionRef: { contains: q, mode: 'insensitive' } },
          { customer: { fullName: { contains: q, mode: 'insensitive' } } },
          { customer: { nameEn: { contains: q, mode: 'insensitive' } } },
          { customer: { nameKm: { contains: q, mode: 'insensitive' } } },
          { customer: { code: { contains: q, mode: 'insensitive' } } },
        ],
      });
    }

    const where: Prisma.PaymentWhereInput = andClauses.length > 0 ? { AND: andClauses } : {};
    const sortDir = filters.sortDir === 'asc' ? 'asc' : 'desc';
    let orderBy: Prisma.PaymentOrderByWithRelationInput = { createdAt: 'desc' };
    if (filters.sortBy === 'paymentNumber') orderBy = { paymentNumber: sortDir };
    else if (filters.sortBy === 'customerName') orderBy = { customer: { fullName: sortDir } };
    else if (filters.sortBy === 'method') orderBy = { method: sortDir };
    else if (filters.sortBy === 'amount') orderBy = { amount: sortDir };
    else if (filters.sortBy === 'status') orderBy = { status: sortDir };
    else if (filters.sortBy === 'createdAt') orderBy = { createdAt: sortDir };

    const [total, payments] = await prisma.$transaction([
      prisma.payment.count({ where }),
      prisma.payment.findMany({
        where,
        include: {
          customer: true,
          allocations: { include: { invoice: true } },
        },
        orderBy,
        skip,
        take: limit,
      }),
    ]);

    return {
      items: payments.map(PaymentService.formatPaymentRecord),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  // 2. Record Customer Payment with Balanced Double-Entry Journal & Auto-Reconnection
  static async recordPayment(input: RecordPaymentInput) {
    const paymentAmount = Number(input.amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      throw new Error('Payment amount must be greater than zero.');
    }

    if (input.transactionRef) {
      const duplicate = await prisma.payment.findFirst({
        where: { transactionRef: input.transactionRef, status: 'SUCCESSFUL' },
      });
      if (duplicate) {
        return {
          payment: {
            ...duplicate,
            amount: Number(duplicate.amount),
            createdAt: duplicate.createdAt.toISOString(),
          },
          message: 'Payment already recorded previously (idempotent duplicate request).',
          isDuplicate: true,
        };
      }
    }

    const txResult = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findFirst({
        where: { OR: [{ id: input.customerId }, { code: input.customerId }] },
        include: {
          subscriptions: { include: { pppoeAccount: true } },
        },
      });
      if (!customer) throw new Error(`Customer ${input.customerId} not found.`);

      const { paymentNumber, seq } = await nextPaymentNumber(tx);
      const receiptNumber = `RCPT-${new Date().getFullYear()}-${(seq + 1000).toString()}`;
      const transactionRef = input.transactionRef || `REF-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      let unallocated = paymentAmount;
      const unpaidInvoices = await tx.invoice.findMany({
        where: { customerId: customer.id, status: { notIn: ['PAID', 'CANCELLED'] } },
        orderBy: { dueDate: 'asc' },
      });

      const allocations: { invoiceId: string; invoiceNumber: string; allocatedAmount: number }[] = [];
      for (const inv of unpaidInvoices) {
        if (unallocated <= 0) break;
        const currentDue = Number(inv.balanceDue);
        const toPay = Math.min(currentDue, unallocated);
        const nextPaid = Math.round((Number(inv.paidAmount) + toPay) * 100) / 100;
        const nextDue = Math.round((currentDue - toPay) * 100) / 100;
        const settled = nextDue <= 0.001;

        const paidAtDate = input.paidAt || new Date();
        await tx.invoice.update({
          where: { id: inv.id },
          data: {
            paidAmount: new Prisma.Decimal(nextPaid),
            balanceDue: new Prisma.Decimal(settled ? 0 : nextDue),
            ...(settled ? { status: 'PAID', paidAt: paidAtDate, paymentMethod: input.method } : {}),
          },
        });

        allocations.push({
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber,
          allocatedAmount: toPay,
        });

        unallocated = Math.round((unallocated - toPay) * 100) / 100;
      }

      const nextCustomerBalance = Math.max(
        0,
        Math.round((Number(customer.balanceDue) - paymentAmount) * 100) / 100
      );

      const shouldReconnect =
        nextCustomerBalance === 0 && (customer.status === 'SUSPENDED' || customer.status === 'OVERDUE');

      const nextStatus = shouldReconnect ? 'ACTIVE' : customer.status;

      await tx.customer.update({
        where: { id: customer.id },
        data: {
          balanceDue: new Prisma.Decimal(nextCustomerBalance),
          status: nextStatus as any,
        },
      });

      const paymentRecord = await tx.payment.create({
        data: {
          paymentNumber,
          customerId: customer.id,
          amount: new Prisma.Decimal(paymentAmount),
          method: input.method as any,
          status: 'SUCCESSFUL',
          transactionRef,
          receiptNumber,
          notes: input.notes || null,
          recordedBy: input.recordedBy || 'Staff',
          ...(input.paidAt ? { createdAt: input.paidAt } : {}),
          allocations: {
            create: allocations.map((a) => ({
              invoiceId: a.invoiceId,
              amount: new Prisma.Decimal(a.allocatedAmount),
            })),
          },
        },
      });

      let debitAccountCode = '1010';
      if (input.method === 'BANK_TRANSFER') debitAccountCode = '1020';
      if (input.method === 'KHQR_BAKONG') debitAccountCode = '1030';

      await AccountingService.postJournalEntry(
        {
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
              accountCode: '1100',
              debit: 0.0,
              credit: paymentAmount,
              description: `Credit subscriber account ${customer.code} balance`,
            },
          ],
          createdBy: input.recordedBy || 'Cashier',
          periodId: input.periodId,
          entryDate: input.paidAt,
        },
        tx
      );

      const sub = customer.subscriptions[0];
      const pppoeUsername =
        sub?.pppoeAccount?.username || `${customer.fullName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_pppoe`;

      await tx.auditLog.create({
        data: {
          action: 'RECORD_PAYMENT',
          resource: 'Payment',
          resourceId: paymentNumber,
          details: `Recorded payment of $${paymentAmount.toFixed(2)} from ${customer.fullName} (${input.method}). Reconnected: ${shouldReconnect}`,
          userEmail: input.recordedBy || 'Staff',
          ipAddress: '127.0.0.1',
          ip: '127.0.0.1',
        },
      });

      return {
        paymentRecord,
        allocations,
        nextCustomerBalance,
        nextStatus,
        shouldReconnect,
        routerId: sub?.routerId || 'rtr-core-1',
        pppoeUsername,
      };
    });

    let reconnected = false;
    if (txResult.shouldReconnect && txResult.pppoeUsername) {
      await MikroTikService.reconnectSubscriber(txResult.routerId, txResult.pppoeUsername);
      reconnected = true;
    }

    return {
      payment: {
        ...txResult.paymentRecord,
        amount: Number(txResult.paymentRecord.amount),
        allocations: txResult.allocations,
        createdAt: txResult.paymentRecord.createdAt.toISOString(),
      },
      newCustomerBalance: txResult.nextCustomerBalance,
      customerStatus: txResult.nextStatus,
      reconnected,
    };
  }

  // 3. Generate KHQR (Cambodia Bakong standard QR) Payload
  static async generateKHQRPayload(customerId: string, amount: number) {
    const [customer, companySetting] = await Promise.all([
      prisma.customer.findFirst({ where: { OR: [{ id: customerId }, { code: customerId }] } }),
      prisma.companySetting.findFirst(),
    ]);
    if (!customer) throw new Error('Customer not found');

    const companyName = companySetting?.companyName || 'NSMISP High-Speed Broadband LLC';
    const bakongId = companyName.toLowerCase().replace(/[^a-z0-9]/g, '') + '@wing';
    const txnId = `NP-${Date.now()}`;

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
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    };
  }
}
