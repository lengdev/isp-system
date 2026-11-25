import { Prisma } from '@prisma/client';
import { prisma, logAudit } from '../db/store.js';
import { AccountingService } from './accounting.service.js';

async function nextPoNumber(tx: Prisma.TransactionClient): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PO-${year}-`;
  const existing = await tx.purchaseOrder.findMany({
    where: { poNumber: { startsWith: prefix } },
    select: { poNumber: true },
  });
  let maxSeq = 0;
  for (const row of existing) {
    const seq = parseInt(row.poNumber.slice(prefix.length), 10);
    if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
  }
  let candidate = `${prefix}${(maxSeq + 1).toString().padStart(3, '0')}`;
  while (await tx.purchaseOrder.findUnique({ where: { poNumber: candidate } })) {
    maxSeq++;
    candidate = `${prefix}${(maxSeq + 1).toString().padStart(3, '0')}`;
  }
  return candidate;
}

export class ProcurementService {
  // 1. Suppliers
  static async listSuppliers() {
    const suppliers = await prisma.supplier.findMany({ orderBy: { code: 'asc' } });
    return suppliers.map((s) => ({
      ...s,
      balancePayable: Number(s.balancePayable),
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }));
  }

  static async createSupplier(data: any) {
    const count = await prisma.supplier.count();
    let seq = count + 1;
    let code = `SUP-${seq.toString().padStart(3, '0')}`;
    while (await prisma.supplier.findUnique({ where: { code } })) {
      seq++;
      code = `SUP-${seq.toString().padStart(3, '0')}`;
    }

    const newSupplier = await prisma.supplier.create({
      data: {
        code,
        name: data.name,
        contactPerson: data.contactPerson || '',
        email: data.email || '',
        phone: data.phone || '',
        address: data.address || '',
        balancePayable: new Prisma.Decimal(0.0),
        isActive: true,
      },
    });

    await logAudit('CREATE_SUPPLIER', 'Supplier', newSupplier.code, `Added supplier ${newSupplier.name}`);
    return {
      ...newSupplier,
      balancePayable: Number(newSupplier.balancePayable),
      createdAt: newSupplier.createdAt.toISOString(),
      updatedAt: newSupplier.updatedAt.toISOString(),
    };
  }

  // 2. Purchase Orders
  static async listPurchaseOrders() {
    const orders = await prisma.purchaseOrder.findMany({
      include: { supplier: true, items: true },
      orderBy: { issuedDate: 'desc' },
    });

    return orders.map((po) => ({
      ...po,
      totalAmount: Number(po.totalAmount),
      issuedDate: po.issuedDate.toISOString(),
      createdAt: po.createdAt.toISOString(),
      updatedAt: po.updatedAt.toISOString(),
      supplierName: po.supplier?.name || 'Supplier',
      items: po.items.map((it) => ({
        ...it,
        unitPrice: Number(it.unitPrice),
        totalPrice: Number(it.totalPrice),
      })),
    }));
  }

  static async createPurchaseOrder(data: {
    supplierId: string;
    items: { productId: string; quantity: number; unitPrice: number }[];
    requestedBy?: string;
    notes?: string;
  }) {
    const created = await prisma.$transaction(async (tx) => {
      const supplier = await tx.supplier.findFirst({
        where: { OR: [{ id: data.supplierId }, { code: data.supplierId }] },
      });
      if (!supplier) throw new Error('Supplier not found');

      const totalAmount =
        Math.round(data.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0) * 100) / 100;
      const poNumber = await nextPoNumber(tx);

      const po = await tx.purchaseOrder.create({
        data: {
          poNumber,
          supplierId: supplier.id,
          status: 'APPROVED',
          totalAmount: new Prisma.Decimal(totalAmount),
          requestedBy: data.requestedBy || 'Procurement Officer',
          notes: data.notes || null,
          items: {
            create: data.items.map((item) => ({
              productId: item.productId,
              quantity: Number(item.quantity),
              unitPrice: new Prisma.Decimal(Number(item.unitPrice)),
              totalPrice: new Prisma.Decimal(Math.round(Number(item.quantity) * Number(item.unitPrice) * 100) / 100),
            })),
          },
        },
        include: { items: true },
      });

      await tx.auditLog.create({
        data: {
          action: 'CREATE_PO',
          resource: 'PurchaseOrder',
          resourceId: poNumber,
          details: `Created PO ${poNumber} for $${totalAmount.toFixed(2)} to ${supplier.name}`,
          userEmail: data.requestedBy || 'Procurement Officer',
          ipAddress: '127.0.0.1',
          ip: '127.0.0.1',
        },
      });

      return po;
    });

    return {
      ...created,
      totalAmount: Number(created.totalAmount),
      issuedDate: created.issuedDate.toISOString(),
      items: created.items.map((it) => ({
        ...it,
        unitPrice: Number(it.unitPrice),
        totalPrice: Number(it.totalPrice),
      })),
    };
  }

  // 3. Receive Goods (GRN) & Auto Accounts Payable Journal
  static async receiveGoods(poId: string, receivedBy: string = 'Warehouse Staff') {
    const updatedPo = await prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.findFirst({
        where: { OR: [{ id: poId }, { poNumber: poId }] },
        include: { supplier: true, items: true },
      });
      if (!po) throw new Error('Purchase order not found');
      if (po.status === 'COMPLETED') throw new Error('PO is already fully received');

      for (const item of po.items) {
        const prod = await tx.product.findUnique({ where: { id: item.productId } });
        if (prod) {
          const nextQty = prod.quantity + Number(item.quantity);
          const nextStatus = nextQty <= 0 ? 'OUT_OF_STOCK' : nextQty <= prod.minStockAlert ? 'LOW_STOCK' : 'IN_STOCK';
          await tx.product.update({
            where: { id: prod.id },
            data: { quantity: nextQty, status: nextStatus },
          });
        }
        await tx.purchaseOrderItem.update({
          where: { id: item.id },
          data: { receivedQuantity: item.quantity },
        });
      }

      const grnCount = await tx.goodsReceivedNote.count();
      const grnNumber = `GRN-${new Date().getFullYear()}-${(grnCount + 1).toString().padStart(3, '0')}`;
      await tx.goodsReceivedNote.create({
        data: {
          grnNumber,
          purchaseOrderId: po.id,
          receivedBy,
          items: {
            create: po.items.map((it) => ({
              productId: it.productId,
              quantity: it.quantity,
              unitCost: it.unitPrice,
            })),
          },
        },
      });

      const finishedPo = await tx.purchaseOrder.update({
        where: { id: po.id },
        data: { status: 'COMPLETED' },
      });

      const poAmount = Number(po.totalAmount);
      if (po.supplier) {
        await tx.supplier.update({
          where: { id: po.supplier.id },
          data: {
            balancePayable: { increment: new Prisma.Decimal(poAmount) },
          },
        });
      }

      await AccountingService.postJournalEntry(
        {
          description: `Goods Received on PO ${po.poNumber} from ${po.supplier?.name || 'Supplier'}`,
          reference: po.poNumber,
          lines: [
            {
              accountCode: '1200',
              debit: poAmount,
              credit: 0.0,
              description: `Inventory stock addition from ${po.poNumber}`,
            },
            {
              accountCode: '2010',
              debit: 0.0,
              credit: poAmount,
              description: `Accounts payable recorded for ${po.supplier?.name || 'Supplier'}`,
            },
          ],
          createdBy: receivedBy,
        },
        tx
      );

      await tx.auditLog.create({
        data: {
          action: 'RECEIVE_GOODS',
          resource: 'PurchaseOrder',
          resourceId: po.poNumber,
          details: `Goods received for PO ${po.poNumber}. Stock increased.`,
          userEmail: receivedBy,
          ipAddress: '127.0.0.1',
          ip: '127.0.0.1',
        },
      });

      return finishedPo;
    });

    return {
      po: { ...updatedPo, totalAmount: Number(updatedPo.totalAmount) },
      message: 'Goods received successfully and Accounts Payable recorded.',
    };
  }

  // 4. Pay Supplier Bill
  static async paySupplier(
    supplierId: string,
    amount: number,
    paymentMethod: string = 'ABA Bank',
    actor: string = 'Accountant'
  ) {
    const payAmount = Number(amount);
    if (isNaN(payAmount) || payAmount <= 0) throw new Error('Payment amount must be greater than zero');

    const updatedSupplier = await prisma.$transaction(async (tx) => {
      const supplier = await tx.supplier.findFirst({
        where: { OR: [{ id: supplierId }, { code: supplierId }] },
      });
      if (!supplier) throw new Error('Supplier not found');

      const nextBalance = Math.max(0, Math.round((Number(supplier.balancePayable) - payAmount) * 100) / 100);
      const updated = await tx.supplier.update({
        where: { id: supplier.id },
        data: { balancePayable: new Prisma.Decimal(nextBalance) },
      });

      const ref = `SUP-PAY-${Date.now().toString().slice(-6)}`;
      await AccountingService.postJournalEntry(
        {
          description: `Supplier Payment: ${supplier.name} ($${payAmount.toFixed(2)}) via ${paymentMethod}`,
          reference: ref,
          lines: [
            {
              accountCode: '2010',
              debit: payAmount,
              credit: 0.0,
              description: `Settlement of vendor balance for ${supplier.name}`,
            },
            {
              accountCode: '1020',
              debit: 0.0,
              credit: payAmount,
              description: `Bank wire disbursement to ${supplier.name}`,
            },
          ],
          createdBy: actor,
        },
        tx
      );

      await tx.auditLog.create({
        data: {
          action: 'PAY_SUPPLIER',
          resource: 'Supplier',
          resourceId: supplier.code,
          details: `Disbursed $${payAmount.toFixed(2)} to ${supplier.name}`,
          userEmail: actor,
          ipAddress: '127.0.0.1',
          ip: '127.0.0.1',
        },
      });

      return updated;
    });

    return {
      supplier: { ...updatedSupplier, balancePayable: Number(updatedSupplier.balancePayable) },
      message: 'Supplier payment posted and bank account deducted.',
    };
  }
}
