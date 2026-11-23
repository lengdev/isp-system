import React, { useState, useEffect, useMemo } from 'react';
import {
  Boxes,
  Warehouse,
  ArrowRightLeft,
  Truck,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Barcode,
  Layers,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Chip } from '../components/ui/Chip';
import { Field, Input } from '../components/ui/Field';
import { Modal } from '../components/ui/Modal';
import { Combobox, ComboboxOption } from '../components/ui/Combobox';
import { useStore } from '../store/useStore';
import { api } from '../lib/api';

const MOVE_TYPE_OPTIONS: ComboboxOption[] = [
  { value: 'TRANSFER', label: 'Internal Warehouse Transfer' },
  { value: 'STOCK_IN', label: 'Stock In (Inbound Shipment)' },
  { value: 'STOCK_OUT', label: 'Stock Out (Disposal / Defective)' },
];

export const WarehousesPage: React.FC = () => {
  const addToast = useStore((s) => s.addToast);
  const [activeTab, setActiveTab] = useState<'warehouses' | 'serials'>('warehouses');
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [serials, setSerials] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Transfer / Movement Modal
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [moveType, setMoveType] = useState<'STOCK_IN' | 'STOCK_OUT' | 'TRANSFER'>('TRANSFER');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [fromWarehouse, setFromWarehouse] = useState('wh-1');
  const [toWarehouse, setToWarehouse] = useState('wh-3');
  const [moveQuantity, setMoveQuantity] = useState(1);
  const [moveNote, setMoveNote] = useState('');

  const productOptions: ComboboxOption[] = useMemo(
    () => products.map((p) => ({ value: p.id, label: `${p.sku} - ${p.name} (Stock: ${p.quantity})` })),
    [products]
  );

  const warehouseOptions: ComboboxOption[] = useMemo(
    () => warehouses.map((wh) => ({ value: wh.id, label: `${wh.name} (${wh.code})` })),
    [warehouses]
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const [whRes, prodRes, serRes] = await Promise.all([
        api.inventory.getWarehouses().catch(() => []),
        api.inventory.getProducts().catch(() => []),
        api.inventory.getSerials().catch(() => []),
      ]);
      setWarehouses(whRes);
      setProducts(prodRes);
      setSerials(serRes);
      if (prodRes.length > 0 && !selectedProduct) {
        setSelectedProduct(prodRes[0].id);
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed to load inventory data', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRecordMovement = async () => {
    try {
      await api.inventory.recordMovement({
        productId: selectedProduct,
        fromWarehouseId: moveType === 'STOCK_IN' ? undefined : fromWarehouse,
        toWarehouseId: moveType === 'STOCK_OUT' ? undefined : toWarehouse,
        type: moveType,
        quantity: Number(moveQuantity),
        note: moveNote,
        actor: 'Warehouse Lead',
      });

      addToast({ type: 'success', title: 'Stock Movement Recorded', message: `${moveType} completed successfully.` });
      setIsMoveModalOpen(false);
      setMoveNote('');
      loadData();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Movement Blocked', message: err.message });
    }
  };

  return (
    <div className="space-y-6 pb-12 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-[24px] leading-tight font-semibold text-[var(--text)] tracking-tight flex items-center gap-2">
            Warehouse & Serial Number Inventory
          </h2>
          <p className="text-[13px] text-[var(--text-muted)] mt-0.5">
            Multi-location warehouse logistics, stock transfers, and ONT/CPE serialized lifecycle
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className={loading ? 'animate-spin w-4 h-4' : 'w-4 h-4'} />
            <span>Refresh</span>
          </Button>
          <Button variant="primary" size="sm" onClick={() => setIsMoveModalOpen(true)}>
            <ArrowRightLeft className="w-4 h-4" />
            <span>Stock Movement / Transfer</span>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--border)] gap-6">
        {[
          { id: 'warehouses', label: 'Warehouses & Locations' },
          { id: 'serials', label: 'Serialized Equipment (ONT/CPE)' },
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

      {activeTab === 'warehouses' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {warehouses.map((wh) => (
              <div key={wh.id} className="p-5 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-card)] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-[var(--brand)]">{wh.code}</span>
                  {wh.isDefault && <Chip size="sm" color="secondary">Primary Hub</Chip>}
                </div>
                <h3 className="text-base font-bold text-[var(--text)]">{wh.name}</h3>
                <p className="text-xs text-[var(--text-muted)]">{wh.address}</p>
                <div className="pt-2 border-t border-[var(--border)] flex justify-between text-xs text-[var(--text-secondary)]">
                  <span>Manager: <strong>{wh.managerName}</strong></span>
                  <span>Serialized: <strong>{wh.serializedCount} units</strong></span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-5 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-card)]">
            <h3 className="text-sm font-bold text-[var(--text)] uppercase tracking-wider mb-4">On-Hand Stock Directory</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[var(--text-muted)]">
                    <th className="py-2.5 px-3">SKU</th>
                    <th className="py-2.5 px-3">Item Description</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3 text-right">Available Qty</th>
                    <th className="py-2.5 px-3 text-right">Cost Value</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-[var(--surface-hover)]">
                      <td className="py-2.5 px-3 font-bold text-[var(--brand)]">{p.sku}</td>
                      <td className="py-2.5 px-3 font-sans font-medium text-[var(--text)]">{p.name}</td>
                      <td className="py-2.5 px-3 text-[var(--text-secondary)]">{p.categoryName}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-[var(--text)]">{p.quantity}</td>
                      <td className="py-2.5 px-3 text-right">${Number(p.costPrice || 0).toFixed(2)}</td>
                      <td className="py-2.5 px-3">
                        <Chip size="sm" color={p.quantity <= 0 ? 'danger' : p.quantity <= p.minStockAlert ? 'warning' : 'success'}>
                          {p.status}
                        </Chip>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'serials' && (
        <div className="p-5 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-card)]">
          <h3 className="text-sm font-bold text-[var(--text)] uppercase tracking-wider mb-4">Serialized ONU / CPE Fleet Register</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-[var(--border)] text-[var(--text-muted)]">
                  <th className="py-2.5 px-3">Serial Number</th>
                  <th className="py-2.5 px-3">MAC Address</th>
                  <th className="py-2.5 px-3">Equipment Model</th>
                  <th className="py-2.5 px-3">Assigned Customer / Hub</th>
                  <th className="py-2.5 px-3">Hardware Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {serials.map((sn) => (
                  <tr key={sn.id} className="hover:bg-[var(--surface-hover)]">
                    <td className="py-2.5 px-3 font-bold text-[var(--brand)]">{sn.serialNumber}</td>
                    <td className="py-2.5 px-3 text-[var(--text-secondary)]">{sn.macAddress || '-'}</td>
                    <td className="py-2.5 px-3 font-sans text-[var(--text)]">{sn.productName}</td>
                    <td className="py-2.5 px-3 font-sans text-[var(--text-secondary)]">
                      {sn.customerName ? <span className="font-semibold text-emerald-600 dark:text-emerald-400">{sn.customerName}</span> : sn.warehouseName || 'Warehouse'}
                    </td>
                    <td className="py-2.5 px-3">
                      <Chip size="sm" color={sn.status === 'INSTALLED' ? 'success' : sn.status === 'RESERVED' ? 'warning' : 'secondary'}>
                        {sn.status}
                      </Chip>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* STOCK MOVEMENT MODAL */}
      <Modal isOpen={isMoveModalOpen} onClose={() => setIsMoveModalOpen(false)} title="Record Stock Movement & Transfer">
        <div className="space-y-4 text-xs">
          <Field label="Movement Type">
            <Combobox
              options={MOVE_TYPE_OPTIONS}
              value={moveType}
              onChange={(val) => setMoveType(val)}
              searchable={MOVE_TYPE_OPTIONS.length > 6}
              clearable={false}
              size="sm"
            />
          </Field>

          <Field label="Select Hardware Product">
            <Combobox
              options={productOptions}
              value={selectedProduct}
              onChange={(val) => setSelectedProduct(val)}
              searchable={productOptions.length > 6}
              clearable={false}
              placeholder="Select product..."
              size="sm"
            />
          </Field>

          {moveType !== 'STOCK_IN' && (
            <Field label="Origin Warehouse">
              <Combobox
                options={warehouseOptions}
                value={fromWarehouse}
                onChange={(val) => setFromWarehouse(val)}
                searchable={warehouseOptions.length > 6}
                clearable={false}
                placeholder="Select origin warehouse..."
                size="sm"
              />
            </Field>
          )}

          {moveType !== 'STOCK_OUT' && (
            <Field label="Destination Warehouse">
              <Combobox
                options={warehouseOptions}
                value={toWarehouse}
                onChange={(val) => setToWarehouse(val)}
                searchable={warehouseOptions.length > 6}
                clearable={false}
                placeholder="Select destination warehouse..."
                size="sm"
              />
            </Field>
          )}

          <Field label="Quantity to Move">
            <Input
              type="number"
              min="1"
              value={moveQuantity}
              onChange={(e) => setMoveQuantity(parseInt(e.target.value) || 1)}
            />
          </Field>

          <Field label="Movement Reason / Notes">
            <Input
              placeholder="e.g. Replenish Field Van #1 before morning installations"
              value={moveNote}
              onChange={(e) => setMoveNote(e.target.value)}
            />
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsMoveModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleRecordMovement}>Confirm Transfer</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
