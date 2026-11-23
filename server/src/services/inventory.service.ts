import { dbStore } from '../db/store.js';
import { AccountingService } from './accounting.service.js';

export class InventoryService {
  // 1. Products
  static listProducts(category?: string) {
    let list = [...dbStore.products];
    if (category) {
      list = list.filter((p) => p.categoryName === category);
    }
    return list.map((p) => {
      const serialCount = dbStore.serialNumbers.filter((s) => s.productId === p.id).length;
      return {
        ...p,
        totalValuation: Math.round(p.quantity * p.costPrice * 100) / 100,
        serializedUnitsCount: serialCount,
      };
    });
  }

  static createProduct(data: any) {
    const nextSku = data.sku || `SKU-${Date.now().toString().slice(-6)}`;
    const newProduct = {
      id: `prod-${Date.now()}`,
      sku: nextSku,
      name: data.name,
      categoryName: data.categoryName || 'Accessories',
      quantity: Number(data.quantity) || 0,
      minStockAlert: Number(data.minStockAlert) || 10,
      costPrice: Number(data.costPrice) || 0.0,
      unitPrice: Number(data.unitPrice) || 0.0,
      status: (Number(data.quantity) || 0) <= 0 ? 'OUT_OF_STOCK' : (Number(data.quantity) || 0) <= (Number(data.minStockAlert) || 10) ? 'LOW_STOCK' : 'IN_STOCK',
      supplier: data.supplier || 'General Supplier',
      location: data.location || 'Main Warehouse',
      description: data.description || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    dbStore.products.push(newProduct as any);
    dbStore.logAudit('CREATE_PRODUCT', 'Product', newProduct.sku, `Created product ${newProduct.name} (${newProduct.sku})`);
    return newProduct;
  }

  static updateProduct(id: string, updates: any) {
    const prod = dbStore.products.find((p) => p.id === id);
    if (!prod) throw new Error('Product not found');

    Object.assign(prod, updates);
    if (prod.quantity <= 0) prod.status = 'OUT_OF_STOCK';
    else if (prod.quantity <= prod.minStockAlert) prod.status = 'LOW_STOCK';
    else prod.status = 'IN_STOCK';

    dbStore.logAudit('UPDATE_PRODUCT', 'Product', prod.sku, `Updated product ${prod.name}`);
    return prod;
  }

  // 2. Warehouses
  static listWarehouses() {
    return dbStore.warehouses.map((wh) => {
      const serializedInWarehouse = dbStore.serialNumbers.filter((s) => s.warehouseId === wh.id).length;
      return {
        ...wh,
        serializedCount: serializedInWarehouse,
      };
    });
  }

  // 3. Stock Movement (In / Out / Transfer) with Negative Stock Prevention
  static recordMovement(data: {
    productId: string;
    fromWarehouseId?: string;
    toWarehouseId?: string;
    type: 'STOCK_IN' | 'STOCK_OUT' | 'TRANSFER' | 'INSTALLATION_CONSUME';
    quantity: number;
    reference?: string;
    note?: string;
    actor?: string;
  }) {
    const product = dbStore.products.find((p) => p.id === data.productId);
    if (!product) throw new Error('Product not found');

    const qty = Number(data.quantity);
    if (isNaN(qty) || qty <= 0) throw new Error('Quantity must be greater than zero');

    // PREVENT NEGATIVE STOCK
    if ((data.type === 'STOCK_OUT' || data.type === 'TRANSFER' || data.type === 'INSTALLATION_CONSUME') && product.quantity < qty) {
      throw new Error(
        `Negative stock prevented! Cannot dispatch ${qty} units of ${product.name} (SKU: ${product.sku}). Current on-hand quantity is only ${product.quantity}.`
      );
    }

    if (data.type === 'STOCK_IN') {
      product.quantity += qty;
    } else {
      product.quantity -= qty;
    }

    // Refresh stock status
    if (product.quantity <= 0) product.status = 'OUT_OF_STOCK';
    else if (product.quantity <= product.minStockAlert) product.status = 'LOW_STOCK';
    else product.status = 'IN_STOCK';

    const movementNumber = `SM-2026-${(dbStore.stockMovements.length + 1).toString().padStart(4, '0')}`;
    const totalCost = Math.round(qty * product.costPrice * 100) / 100;

    const movement = {
      id: `mov-${Date.now()}`,
      movementNumber,
      productId: product.id,
      productName: product.name,
      fromWarehouseId: data.fromWarehouseId || null,
      toWarehouseId: data.toWarehouseId || null,
      type: data.type,
      quantity: qty,
      unitCost: product.costPrice,
      totalCost,
      actor: data.actor || 'Warehouse Staff',
      reference: data.reference || null,
      note: data.note || null,
      timestamp: new Date().toISOString(),
    };

    dbStore.stockMovements.unshift(movement);

    // If stock consumed during installation, post COGS accounting journal
    if (data.type === 'INSTALLATION_CONSUME') {
      AccountingService.postJournalEntry({
        description: `Inventory Consumption: ${product.name} x${qty} for ${data.reference || 'Installation'}`,
        reference: movementNumber,
        lines: [
          {
            accountCode: '5020', // Cost of Goods Sold (CPE/ONTs)
            debit: totalCost,
            credit: 0.0,
            description: `COGS consumed on job ${data.reference}`,
          },
          {
            accountCode: '1200', // Inventory Asset
            debit: 0.0,
            credit: totalCost,
            description: `Reduction of inventory valuation for ${product.sku}`,
          },
        ],
        createdBy: data.actor || 'Field Technician',
      });
    }

    dbStore.logAudit('STOCK_MOVEMENT', 'StockMovement', movementNumber, `${data.type} of ${qty} units for ${product.name}`);
    return { movement, currentStock: product.quantity, status: product.status };
  }

  // 4. Serial Number Management (ONT/CPE lifecycle)
  static listSerialNumbers(filters?: { productId?: string; status?: string; customerId?: string }) {
    let list = [...dbStore.serialNumbers];
    if (filters?.productId) list = list.filter((s) => s.productId === filters.productId);
    if (filters?.status) list = list.filter((s) => s.status === filters.status);
    if (filters?.customerId) list = list.filter((s) => s.customerId === filters.customerId);

    return list.map((sn) => {
      const prod = dbStore.products.find((p) => p.id === sn.productId);
      const cust = dbStore.customers.find((c) => c.id === sn.customerId);
      const wh = dbStore.warehouses.find((w) => w.id === sn.warehouseId);
      return {
        ...sn,
        productName: prod?.name || '',
        productSku: prod?.sku || '',
        customerName: cust?.fullName || null,
        warehouseName: wh?.name || null,
      };
    });
  }

  static assignSerialToCustomer(serialNumber: string, customerId: string) {
    const sn = dbStore.serialNumbers.find((s) => s.serialNumber === serialNumber);
    if (!sn) throw new Error(`Serial number ${serialNumber} not found`);

    if (sn.customerId && sn.customerId !== customerId && sn.status === 'INSTALLED') {
      throw new Error(`Serial conflict! Equipment ${serialNumber} is already active with customer ${sn.customerId}`);
    }

    sn.customerId = customerId;
    sn.status = 'INSTALLED';
    sn.installedAt = new Date().toISOString();

    dbStore.logAudit('ASSIGN_EQUIPMENT', 'SerialNumber', sn.serialNumber, `Assigned ${sn.serialNumber} to customer ${customerId}`);
    return sn;
  }
}
