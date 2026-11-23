import { dbStore } from '../db/store.js';
import { AccountingService } from './accounting.service.js';

export class ProcurementService {
  // 1. Suppliers
  static listSuppliers() {
    return dbStore.suppliers;
  }

  static createSupplier(data: any) {
    const nextCode = `SUP-${(dbStore.suppliers.length + 1).toString().padStart(3, '0')}`;
    const newSupplier = {
      id: `sup-${Date.now()}`,
      code: nextCode,
      name: data.name,
      contactPerson: data.contactPerson || '',
      email: data.email || '',
      phone: data.phone || '',
      address: data.address || '',
      balancePayable: 0.0,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    dbStore.suppliers.push(newSupplier);
    dbStore.logAudit('CREATE_SUPPLIER', 'Supplier', newSupplier.code, `Added supplier ${newSupplier.name}`);
    return newSupplier;
  }

  // 2. Purchase Orders
  static listPurchaseOrders() {
    return dbStore.purchaseOrders.map((po) => {
      const sup = dbStore.suppliers.find((s) => s.id === po.supplierId);
      return {
        ...po,
        supplierName: sup?.name || 'Supplier',
      };
    });
  }

  static createPurchaseOrder(data: {
    supplierId: string;
    items: { productId: string; quantity: number; unitPrice: number }[];
    requestedBy?: string;
    notes?: string;
  }) {
    const supplier = dbStore.suppliers.find((s) => s.id === data.supplierId);
    if (!supplier) throw new Error('Supplier not found');

    const totalAmount = data.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const poNumber = `PO-2026-${(dbStore.purchaseOrders.length + 1).toString().padStart(3, '0')}`;

    const newPO = {
      id: `po-${Date.now()}`,
      poNumber,
      supplierId: supplier.id,
      status: 'APPROVED',
      totalAmount: Math.round(totalAmount * 100) / 100,
      requestedBy: data.requestedBy || 'Procurement Officer',
      issuedDate: new Date().toISOString(),
      items: data.items,
      notes: data.notes || null,
    };

    dbStore.purchaseOrders.unshift(newPO);
    dbStore.logAudit('CREATE_PO', 'PurchaseOrder', poNumber, `Created PO ${poNumber} for $${totalAmount.toFixed(2)} to ${supplier.name}`);
    return newPO;
  }

  // 3. Receive Goods (GRN) & Auto Accounts Payable Journal
  static receiveGoods(poId: string, receivedBy: string = 'Warehouse Staff') {
    const po = dbStore.purchaseOrders.find((p) => p.id === poId);
    if (!po) throw new Error('Purchase order not found');
    if (po.status === 'COMPLETED') throw new Error('PO is already fully received');

    const supplier = dbStore.suppliers.find((s) => s.id === po.supplierId);

    // Increase product inventory stock
    for (const item of po.items) {
      const prod = dbStore.products.find((p) => p.id === item.productId);
      if (prod) {
        prod.quantity += Number(item.quantity);
        if (prod.quantity > prod.minStockAlert) prod.status = 'IN_STOCK';
      }
    }

    po.status = 'COMPLETED';

    // Update Supplier Balance Payable
    if (supplier) {
      supplier.balancePayable = Math.round((supplier.balancePayable + po.totalAmount) * 100) / 100;
    }

    // AUTOMATIC DOUBLE-ENTRY ACCOUNTING INTEGRATION:
    // Debit Inventory Asset (1200): Goods received
    // Credit Accounts Payable - Suppliers (2010): Amount owed
    AccountingService.postJournalEntry({
      description: `Goods Received on PO ${po.poNumber} from ${supplier?.name || 'Supplier'}`,
      reference: po.poNumber,
      lines: [
        {
          accountCode: '1200', // Inventory Asset
          debit: po.totalAmount,
          credit: 0.0,
          description: `Inventory stock addition from ${po.poNumber}`,
        },
        {
          accountCode: '2010', // Accounts Payable - Suppliers
          debit: 0.0,
          credit: po.totalAmount,
          description: `Accounts payable recorded for ${supplier?.name}`,
        },
      ],
      createdBy: receivedBy,
    });

    dbStore.logAudit('RECEIVE_GOODS', 'PurchaseOrder', po.poNumber, `Goods received for PO ${po.poNumber}. Stock increased.`);
    return { po, message: 'Goods received successfully and Accounts Payable recorded.' };
  }

  // 4. Pay Supplier Bill
  static paySupplier(supplierId: string, amount: number, paymentMethod: string = 'ABA Bank', actor: string = 'Accountant') {
    const supplier = dbStore.suppliers.find((s) => s.id === supplierId);
    if (!supplier) throw new Error('Supplier not found');

    const payAmount = Number(amount);
    if (payAmount <= 0) throw new Error('Payment amount must be greater than zero');

    supplier.balancePayable = Math.max(0, Math.round((supplier.balancePayable - payAmount) * 100) / 100);

    const ref = `SUP-PAY-${Date.now().toString().slice(-6)}`;

    // AUTOMATIC DOUBLE-ENTRY ACCOUNTING INTEGRATION:
    // Debit Accounts Payable - Suppliers (2010): Clear debt
    // Credit Operating Bank (1020): Disburse cash
    AccountingService.postJournalEntry({
      description: `Supplier Payment: ${supplier.name} ($${payAmount.toFixed(2)}) via ${paymentMethod}`,
      reference: ref,
      lines: [
        {
          accountCode: '2010', // Accounts Payable
          debit: payAmount,
          credit: 0.0,
          description: `Settlement of vendor balance for ${supplier.name}`,
        },
        {
          accountCode: '1020', // Operating Bank Account (ABA Bank)
          debit: 0.0,
          credit: payAmount,
          description: `Bank wire disbursement to ${supplier.name}`,
        },
      ],
      createdBy: actor,
    });

    dbStore.logAudit('PAY_SUPPLIER', 'Supplier', supplier.code, `Disbursed $${payAmount.toFixed(2)} to ${supplier.name}`);
    return { supplier, message: 'Supplier payment posted and bank account deducted.' };
  }
}
