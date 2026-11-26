import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingBag,
  Building2,
  CheckCircle2,
  Clock,
  Plus,
  RefreshCw,
  PackageCheck,
  CreditCard,
  FileText,
  DollarSign,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Chip } from '../components/ui/Chip';
import { Field, Input } from '../components/ui/Field';
import { Modal } from '../components/ui/Modal';
import { Combobox, ComboboxOption } from '../components/ui/Combobox';
import { TableStateBody } from '../components/ui/TableState';
import { Can, useCan } from '../lib/permissions';
import { useStore } from '../store/useStore';
import { api } from '../lib/api';

export const ProcurementPage: React.FC = () => {
  const addToast = useStore((s) => s.addToast);
  const currency = useStore((s) => s.currency) || '$';
  const canCreatePo = useCan('procurement.create');
  const canEditPo = useCan('procurement.edit');

  const [activeTab, setActiveTab] = useState<'orders' | 'suppliers'>('orders');
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // New PO Modal
  const [isPoModalOpen, setIsPoModalOpen] = useState(false);
  const [poSupplierId, setPoSupplierId] = useState('');
  const [poProductId, setPoProductId] = useState('');
  const [poQuantity, setPoQuantity] = useState(10);
  const [poUnitPrice, setPoUnitPrice] = useState(28);

  // Pay Supplier Modal
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [paySupplierId, setPaySupplierId] = useState('');
  const [payAmount, setPayAmount] = useState(0);

  const supplierOptions: ComboboxOption[] = useMemo(
    () => suppliers.map((s) => ({ value: s.id, label: `${s.name} (${s.code})` })),
    [suppliers]
  );

  const productOptions: ComboboxOption[] = useMemo(
    () => products.map((p) => ({ value: p.id, label: `${p.sku} - ${p.name}` })),
    [products]
  );

  const loadData = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [supRes, ordRes, prodRes] = await Promise.all([
        api.procurement.getSuppliers(),
        api.procurement.getOrders(),
        api.inventory.getProducts(),
      ]);
      setSuppliers(Array.isArray(supRes) ? supRes : []);
      setOrders(Array.isArray(ordRes) ? ordRes : []);
      setProducts(Array.isArray(prodRes) ? prodRes : []);
      if (supRes.length > 0 && !poSupplierId) setPoSupplierId(supRes[0].id);
      if (prodRes.length > 0 && !poProductId) setPoProductId(prodRes[0].id);
    } catch (err: any) {
      setLoadError('Unable to load procurement orders and vendors.');
      addToast({ type: 'error', title: 'Failed to load procurement data', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreatePo = async () => {
    try {
      await api.procurement.createOrder({
        supplierId: poSupplierId,
        items: [{ productId: poProductId, quantity: Number(poQuantity), unitPrice: Number(poUnitPrice) }],
      });
      addToast({ type: 'success', title: 'Purchase Order Issued', message: 'New PO approved and recorded.' });
      setIsPoModalOpen(false);
      loadData();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Creation Failed', message: err.message });
    }
  };

  const handleReceiveGoods = async (poId: string) => {
    try {
      const res = await api.procurement.receiveGoods(poId, 'Warehouse Lead');
      addToast({
        type: 'success',
        title: 'Goods Received (GRN)',
        message: 'Stock balance increased and Accounts Payable recorded in Ledger.',
      });
      loadData();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Receive Failed', message: err.message });
    }
  };

  const handlePaySupplier = async () => {
    try {
      await api.procurement.paySupplier(paySupplierId, Number(payAmount), 'ABA Bank Wire');
      addToast({
        type: 'success',
        title: 'Supplier Paid',
        message: 'Accounts payable settled and operating bank account deducted.',
      });
      setIsPayModalOpen(false);
      loadData();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Payment Failed', message: err.message });
    }
  };

  return (
    <div className="space-y-6 pb-12 select-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-[24px] leading-tight font-semibold text-[var(--text)] tracking-tight">
            Procurement & Supplier Purchasing
          </h2>
          <p className="text-[13px] text-[var(--text-muted)] mt-0.5">
            Purchase orders, goods received notes (GRN), and supplier accounts payable integration
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className={loading ? 'animate-spin w-4 h-4' : 'w-4 h-4'} />
            <span>Refresh</span>
          </Button>
          <Can permission="procurement.create">
            <Button variant="primary" size="sm" onClick={() => setIsPoModalOpen(true)}>
              <Plus className="w-4 h-4" />
              <span>Create Purchase Order</span>
            </Button>
          </Can>
        </div>
      </div>

      <div className="flex border-b border-[var(--border)] gap-6">
        {[
          { id: 'orders', label: 'Purchase Orders' },
          { id: 'suppliers', label: 'Hardware Vendors & Suppliers' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-3 text-sm font-semibold transition-colors relative ${
              activeTab === tab.id ? 'text-[var(--brand)] font-bold' : 'text-[var(--text-muted)] hover:text-[var(--text)]'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--brand)] rounded-full" />}
          </button>
        ))}
      </div>

      {activeTab === 'orders' && (
        <div className="p-5 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-card)]">
          <h3 className="text-sm font-bold text-[var(--text)] uppercase tracking-wider mb-4">Purchase Orders (PO) Register</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-[var(--border)] text-[var(--text-muted)]">
                  <th className="py-2.5 px-3">PO Number</th>
                  <th className="py-2.5 px-3">Supplier Name</th>
                  <th className="py-2.5 px-3">Order Date</th>
                  <th className="py-2.5 px-3 text-right">Order Amount</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                <TableStateBody
                  colSpan={6}
                  loading={loading}
                  hasData={orders.length > 0}
                  error={loadError}
                  onRetry={loadData}
                  emptyTitle="No purchase orders yet"
                  emptyDescription="Draft vendor purchase orders to procure routers, ONTs, and fiber supplies."
                  primaryAction={
                    canCreatePo
                      ? {
                          label: 'Create Purchase Order',
                          onClick: () => setIsPoModalOpen(true),
                          permission: 'procurement.create',
                        }
                      : undefined
                  }
                >
                  {orders.map((po) => (
                    <tr key={po.id} className="hover:bg-[var(--surface-hover)]">
                      <td className="py-3 px-3 font-bold text-[var(--brand)]">{po.poNumber}</td>
                      <td className="py-3 px-3 font-sans font-semibold text-[var(--text)]">{po.supplierName}</td>
                      <td className="py-3 px-3 text-[var(--text-muted)]">{new Date(po.issuedDate).toLocaleDateString()}</td>
                      <td className="py-3 px-3 text-right font-bold text-[var(--text)]">
                        {currency}{Number(po.totalAmount || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-3">
                        <Chip size="sm" color={po.status === 'COMPLETED' ? 'success' : 'secondary'}>
                          {po.status === 'COMPLETED' ? 'Received (In Stock)' : 'Approved & Pending Delivery'}
                        </Chip>
                      </td>
                      <td className="py-3 px-3 text-right">
                        {po.status !== 'COMPLETED' && canEditPo && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleReceiveGoods(po.id)}
                          >
                            <PackageCheck className="w-3.5 h-3.5" />
                            <span>Receive Goods (GRN)</span>
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </TableStateBody>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'suppliers' && (
        <div className="p-5 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-card)]">
          <h3 className="text-sm font-bold text-[var(--text)] uppercase tracking-wider mb-4">Vendor Accounts Payable Directory</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-[var(--border)] text-[var(--text-muted)]">
                  <th className="py-2.5 px-3">Vendor Code</th>
                  <th className="py-2.5 px-3">Supplier Name</th>
                  <th className="py-2.5 px-3">Contact</th>
                  <th className="py-2.5 px-3">Phone</th>
                  <th className="py-2.5 px-3 text-right">Outstanding Balance Payable</th>
                  <th className="py-2.5 px-3 text-right">Disburse Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                <TableStateBody
                  colSpan={6}
                  loading={loading}
                  hasData={suppliers.length > 0}
                  error={loadError}
                  onRetry={loadData}
                  emptyTitle="No suppliers registered yet"
                  emptyDescription="Upstream vendors and hardware distributors will appear here."
                >
                  {suppliers.map((sup) => (
                    <tr key={sup.id} className="hover:bg-[var(--surface-hover)]">
                      <td className="py-3 px-3 font-bold text-[var(--brand)]">{sup.code}</td>
                      <td className="py-3 px-3 font-sans font-semibold text-[var(--text)]">{sup.name}</td>
                      <td className="py-3 px-3 font-sans text-[var(--text-secondary)]">{sup.contactPerson}</td>
                      <td className="py-3 px-3 text-[var(--text-muted)]">{sup.phone}</td>
                      <td className="py-3 px-3 text-right font-bold text-rose-600 dark:text-rose-400">
                        {currency}{Number(sup.balancePayable || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {canEditPo && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setPaySupplierId(sup.id);
                              setPayAmount(sup.balancePayable);
                              setIsPayModalOpen(true);
                            }}
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Settle AP Bill</span>
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </TableStateBody>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE PO MODAL */}
      <Modal isOpen={isPoModalOpen} onClose={() => setIsPoModalOpen(false)} title="Issue Hardware Purchase Order">
        <div className="space-y-4 text-xs">
          <Field label="Hardware Supplier">
            <Combobox
              options={supplierOptions}
              value={poSupplierId}
              onChange={(val) => setPoSupplierId(val)}
              searchable={supplierOptions.length > 6}
              clearable={false}
              placeholder="Select supplier..."
              size="md"
            />
          </Field>

          <Field label="Product to Order">
            <Combobox
              options={productOptions}
              value={poProductId}
              onChange={(val) => {
                setPoProductId(val);
                const prod = products.find((p) => p.id === val);
                if (prod) setPoUnitPrice(prod.costPrice);
              }}
              searchable={productOptions.length > 6}
              clearable={false}
              placeholder="Select product..."
              size="md"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Order Quantity">
              <Input
                type="number"
                min="1"
                value={poQuantity}
                onChange={(e) => setPoQuantity(parseInt(e.target.value) || 1)}
              />
            </Field>

            <Field label="Unit Cost Price ($)">
              <Input
                type="number"
                step="0.01"
                value={poUnitPrice}
                onChange={(e) => setPoUnitPrice(parseFloat(e.target.value) || 0)}
              />
            </Field>
          </div>

          <div className="p-3 rounded-lg bg-[var(--surface-hover)] border border-[var(--border)] flex justify-between font-mono font-bold">
            <span>Estimated PO Total:</span>
            <span className="text-[var(--brand)]">${(poQuantity * poUnitPrice).toFixed(2)}</span>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsPoModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreatePo}>Approve & Issue PO</Button>
          </div>
        </div>
      </Modal>

      {/* PAY SUPPLIER MODAL */}
      <Modal isOpen={isPayModalOpen} onClose={() => setIsPayModalOpen(false)} title="Settle Supplier Accounts Payable">
        <div className="space-y-4 text-xs">
          <Field label="Payment Amount ($)">
            <Input
              type="number"
              step="0.01"
              value={payAmount}
              onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
            />
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsPayModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handlePaySupplier}>Confirm Disbursement</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
