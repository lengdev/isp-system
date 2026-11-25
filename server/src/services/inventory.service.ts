import { Prisma } from '@prisma/client';
import { prisma, logAudit } from '../db/store.js';
import { AccountingService } from './accounting.service.js';

function computeStockStatus(quantity: number, minStockAlert: number): 'OUT_OF_STOCK' | 'LOW_STOCK' | 'IN_STOCK' {
  if (quantity <= 0) return 'OUT_OF_STOCK';
  if (quantity <= minStockAlert) return 'LOW_STOCK';
  return 'IN_STOCK';
}

export class InventoryService {
  // 1. Products
  static async listProducts(category?: string) {
    const list = await prisma.product.findMany({
      where: category ? { categoryName: category } : undefined,
      include: {
        _count: { select: { serialNumbers: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return list.map((p) => {
      const costPrice = Number(p.costPrice);
      return {
        ...p,
        costPrice,
        unitPrice: Number(p.unitPrice),
        totalValuation: Math.round(p.quantity * costPrice * 100) / 100,
        serializedUnitsCount: p._count.serialNumbers,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      };
    });
  }

  static async createProduct(data: any) {
    const qty = Number(data.quantity) || 0;
    const minAlert = Number(data.minStockAlert) || 10;
    const nextSku = data.sku || `SKU-${Date.now().toString().slice(-6)}`;

    const created = await prisma.product.create({
      data: {
        sku: nextSku,
        name: data.name,
        categoryName: data.categoryName || 'Accessories',
        quantity: qty,
        minStockAlert: minAlert,
        costPrice: new Prisma.Decimal(Number(data.costPrice) || 0.0),
        unitPrice: new Prisma.Decimal(Number(data.unitPrice) || 0.0),
        status: computeStockStatus(qty, minAlert),
        supplier: data.supplier || 'General Supplier',
        location: data.location || 'Main Warehouse',
        description: data.description || '',
      },
    });

    await logAudit('CREATE_PRODUCT', 'Product', created.sku, `Created product ${created.name} (${created.sku})`);
    return {
      ...created,
      costPrice: Number(created.costPrice),
      unitPrice: Number(created.unitPrice),
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };
  }

  static async updateProduct(id: string, updates: any) {
    const existing = await prisma.product.findFirst({
      where: { OR: [{ id }, { sku: id }] },
    });
    if (!existing) throw new Error('Product not found');

    const nextQty = updates.quantity !== undefined ? Number(updates.quantity) : existing.quantity;
    const nextMin = updates.minStockAlert !== undefined ? Number(updates.minStockAlert) : existing.minStockAlert;

    const updated = await prisma.product.update({
      where: { id: existing.id },
      data: {
        ...(updates.name !== undefined ? { name: updates.name } : {}),
        ...(updates.categoryName !== undefined ? { categoryName: updates.categoryName } : {}),
        ...(updates.supplier !== undefined ? { supplier: updates.supplier } : {}),
        ...(updates.location !== undefined ? { location: updates.location } : {}),
        ...(updates.description !== undefined ? { description: updates.description } : {}),
        ...(updates.costPrice !== undefined ? { costPrice: new Prisma.Decimal(updates.costPrice) } : {}),
        ...(updates.unitPrice !== undefined ? { unitPrice: new Prisma.Decimal(updates.unitPrice) } : {}),
        quantity: nextQty,
        minStockAlert: nextMin,
        status: computeStockStatus(nextQty, nextMin),
      },
    });

    await logAudit('UPDATE_PRODUCT', 'Product', updated.sku, `Updated product ${updated.name}`);
    return {
      ...updated,
      costPrice: Number(updated.costPrice),
      unitPrice: Number(updated.unitPrice),
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  // 2. Warehouses
  static async listWarehouses() {
    const warehouses = await prisma.warehouse.findMany({
      include: { _count: { select: { serialNumbers: true } } },
      orderBy: { code: 'asc' },
    });

    return warehouses.map((wh) => ({
      ...wh,
      serializedCount: wh._count.serialNumbers,
      createdAt: wh.createdAt.toISOString(),
      updatedAt: wh.updatedAt.toISOString(),
    }));
  }

  // 3. Stock Movement (In / Out / Transfer) with Negative Stock Prevention
  static async recordMovement(
    data: {
      productId: string;
      fromWarehouseId?: string;
      toWarehouseId?: string;
      type: 'STOCK_IN' | 'STOCK_OUT' | 'TRANSFER' | 'INSTALLATION_CONSUME';
      quantity: number;
      reference?: string;
      note?: string;
      actor?: string;
    },
    externalTx?: Prisma.TransactionClient
  ) {
    const qty = Number(data.quantity);
    if (isNaN(qty) || qty <= 0) throw new Error('Quantity must be greater than zero');

    const run = async (tx: Prisma.TransactionClient) => {
      const product = await tx.product.findFirst({
        where: { OR: [{ id: data.productId }, { sku: data.productId }] },
      });
      if (!product) throw new Error('Product not found');

      if (
        (data.type === 'STOCK_OUT' || data.type === 'TRANSFER' || data.type === 'INSTALLATION_CONSUME') &&
        product.quantity < qty
      ) {
        throw new Error(
          `Negative stock prevented! Cannot dispatch ${qty} units of ${product.name} (SKU: ${product.sku}). Current on-hand quantity is only ${product.quantity}.`
        );
      }

      const nextQty = data.type === 'STOCK_IN' ? product.quantity + qty : product.quantity - qty;
      const nextStatus = computeStockStatus(nextQty, product.minStockAlert);

      await tx.product.update({
        where: { id: product.id },
        data: {
          quantity: nextQty,
          status: nextStatus,
        },
      });

      const count = await tx.stockMovement.count();
      const year = new Date().getFullYear();
      let seq = count + 1;
      let movementNumber = `SM-${year}-${seq.toString().padStart(4, '0')}`;
      while (await tx.stockMovement.findUnique({ where: { movementNumber } })) {
        seq++;
        movementNumber = `SM-${year}-${seq.toString().padStart(4, '0')}`;
      }

      const unitCost = Number(product.costPrice);
      const totalCost = Math.round(qty * unitCost * 100) / 100;

      const movement = await tx.stockMovement.create({
        data: {
          movementNumber,
          productId: product.id,
          fromWarehouseId: data.fromWarehouseId || null,
          toWarehouseId: data.toWarehouseId || null,
          type: data.type,
          quantity: qty,
          unitCost: new Prisma.Decimal(unitCost),
          totalCost: new Prisma.Decimal(totalCost),
          actor: data.actor || 'Warehouse Staff',
          reference: data.reference || null,
          note: data.note || null,
        },
      });

      if (data.type === 'INSTALLATION_CONSUME') {
        await AccountingService.postJournalEntry(
          {
            description: `Inventory Consumption: ${product.name} x${qty} for ${data.reference || 'Installation'}`,
            reference: movementNumber,
            lines: [
              {
                accountCode: '5020',
                debit: totalCost,
                credit: 0.0,
                description: `COGS consumed on job ${data.reference || ''}`,
              },
              {
                accountCode: '1200',
                debit: 0.0,
                credit: totalCost,
                description: `Reduction of inventory valuation for ${product.sku}`,
              },
            ],
            createdBy: data.actor || 'Field Technician',
          },
          tx
        );
      }

      await tx.auditLog.create({
        data: {
          action: 'STOCK_MOVEMENT',
          resource: 'StockMovement',
          resourceId: movementNumber,
          details: `${data.type} of ${qty} units for ${product.name}`,
          userEmail: data.actor || 'Warehouse Staff',
          ipAddress: '127.0.0.1',
          ip: '127.0.0.1',
        },
      });

      return {
        movement: {
          ...movement,
          productName: product.name,
          unitCost,
          totalCost,
          timestamp: movement.createdAt.toISOString(),
        },
        currentStock: nextQty,
        status: nextStatus,
      };
    };

    if (externalTx) return run(externalTx);
    return prisma.$transaction(run);
  }

  // 4. Serial Number Management (ONT/CPE lifecycle)
  static async listSerialNumbers(filters?: { productId?: string; status?: string; customerId?: string }) {
    const where: any = {};
    if (filters?.productId) where.productId = filters.productId;
    if (filters?.status) where.status = filters.status.toUpperCase();
    if (filters?.customerId) where.customerId = filters.customerId;

    const list = await prisma.serialNumber.findMany({
      where,
      include: {
        product: true,
        customer: true,
        warehouse: true,
      },
      orderBy: { serialNumber: 'asc' },
    });

    return list.map((sn) => ({
      ...sn,
      productName: sn.product?.name || '',
      productSku: sn.product?.sku || '',
      customerName: sn.customer?.fullName || null,
      warehouseName: sn.warehouse?.name || null,
      installedAt: sn.installedAt?.toISOString() || null,
      createdAt: sn.createdAt.toISOString(),
      updatedAt: sn.updatedAt.toISOString(),
    }));
  }

  static async assignSerialToCustomer(
    serialNumber: string,
    customerId: string,
    externalTx?: Prisma.TransactionClient
  ) {
    const run = async (tx: Prisma.TransactionClient) => {
      const sn = await tx.serialNumber.findUnique({ where: { serialNumber } });
      if (!sn) throw new Error(`Serial number ${serialNumber} not found`);

      const customer = await tx.customer.findFirst({
        where: { OR: [{ id: customerId }, { code: customerId }] },
      });
      const resolvedCustomerId = customer?.id || customerId;

      if (sn.customerId && sn.customerId !== resolvedCustomerId && sn.status === 'INSTALLED') {
        throw new Error(`Serial conflict! Equipment ${serialNumber} is already active with customer ${sn.customerId}`);
      }

      const updated = await tx.serialNumber.update({
        where: { id: sn.id },
        data: {
          customerId: resolvedCustomerId,
          status: 'INSTALLED',
          installedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'ASSIGN_EQUIPMENT',
          resource: 'SerialNumber',
          resourceId: sn.serialNumber,
          details: `Assigned ${sn.serialNumber} to customer ${resolvedCustomerId}`,
          ipAddress: '127.0.0.1',
          ip: '127.0.0.1',
        },
      });

      return updated;
    };

    if (externalTx) return run(externalTx);
    return prisma.$transaction(run);
  }
}
