import React, { useState, useEffect } from 'react';
import { Package, Hash, Tag, DollarSign, Layers, MapPin, Building, AlertCircle } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Field, Input, Textarea, FormSectionTitle } from '../../components/ui/Field';
import { Combobox, ComboboxOption } from '../../components/ui/Combobox';
import { ProductStatus } from '../../types';

const CATEGORY_OPTIONS: ComboboxOption[] = [
  { value: 'ONT / Modem', label: 'ONT / Modem' },
  { value: 'Wi-Fi Router', label: 'Wi-Fi Router' },
  { value: 'Fiber Cable', label: 'Fiber Cable' },
  { value: 'Splitter', label: 'Splitter' },
  { value: 'Connector', label: 'Connector' },
  { value: 'SFP Transceiver', label: 'SFP Transceiver' },
  { value: 'Tool & Equipment', label: 'Tool & Equipment' },
  { value: 'Access Point', label: 'Access Point' },
];

const STATUS_OPTIONS: ComboboxOption[] = [
  { value: 'In Stock', label: 'In Stock' },
  { value: 'Low Stock', label: 'Low Stock' },
  { value: 'Out of Stock', label: 'Out of Stock' },
  { value: 'Discontinued', label: 'Discontinued' },
];

const CATEGORIES = CATEGORY_OPTIONS.map((c) => c.value);
const STATUSES: ProductStatus[] = ['In Stock', 'Low Stock', 'Out of Stock', 'Discontinued'];

export const ProductModal: React.FC = () => {
  const modalState = useStore((s) => s.modalState.addEditProduct);
  const closeModal = useStore((s) => s.closeModal);
  const products = useStore((s) => s.products);
  const addProduct = useStore((s) => s.addProduct);
  const updateProduct = useStore((s) => s.updateProduct);
  const currency = useStore((s) => s.currency);

  const isEdit = Boolean(modalState?.productId);
  const existingProduct = products.find((p) => p.id === modalState?.productId);

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [quantity, setQuantity] = useState(10);
  const [minStockAlert, setMinStockAlert] = useState(5);
  const [unitPrice, setUnitPrice] = useState(49.99);
  const [costPrice, setCostPrice] = useState(30.0);
  const [status, setStatus] = useState<ProductStatus>('In Stock');
  const [supplier, setSupplier] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (modalState?.isOpen) {
      setErrors({});
      setIsSubmitting(false);
      if (isEdit && existingProduct) {
        setName(existingProduct.name);
        setSku(existingProduct.sku);
        setCategory(existingProduct.category || CATEGORIES[0]);
        setQuantity(existingProduct.quantity);
        setMinStockAlert(existingProduct.minStockAlert);
        setUnitPrice(existingProduct.unitPrice);
        setCostPrice(existingProduct.costPrice);
        setStatus(existingProduct.status);
        setSupplier(existingProduct.supplier || '');
        setLocation(existingProduct.location || '');
        setDescription(existingProduct.description || '');
      } else {
        const randomNum = Math.floor(Math.random() * 8999 + 1000);
        setName('');
        setSku(`PRD-${randomNum}`);
        setCategory(CATEGORIES[0]);
        setQuantity(20);
        setMinStockAlert(5);
        setUnitPrice(59.99);
        setCostPrice(38.0);
        setStatus('In Stock');
        setSupplier('FiberTech Components Ltd');
        setLocation('Warehouse A - Shelf 01');
        setDescription('');
      }
    }
  }, [modalState?.isOpen, isEdit, existingProduct]);

  // Auto calculate status when quantity changes
  const handleQuantityChange = (val: number) => {
    const q = Math.max(0, val);
    setQuantity(q);
    if (q === 0) {
      setStatus('Out of Stock');
    } else if (q <= minStockAlert) {
      setStatus('Low Stock');
    } else {
      setStatus('In Stock');
    }
  };

  const handleGenerateSku = () => {
    const prefix = category.split(' ')[0].replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || 'ITM';
    const num = Math.floor(Math.random() * 8999 + 1000);
    setSku(`${prefix}-${num}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Product name is required';
    }
    if (!sku.trim()) {
      newErrors.sku = 'SKU / Part Number is required';
    }
    if (isNaN(quantity) || quantity < 0) {
      newErrors.quantity = 'Valid quantity is required';
    }
    if (isNaN(unitPrice) || unitPrice < 0) {
      newErrors.unitPrice = 'Valid unit price is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);

    if (isEdit && existingProduct) {
      updateProduct(existingProduct.id, {
        name: name.trim(),
        sku: sku.trim().toUpperCase(),
        category,
        quantity,
        minStockAlert,
        unitPrice: Number(unitPrice),
        costPrice: Number(costPrice),
        status,
        supplier: supplier.trim(),
        location: location.trim(),
        description: description.trim(),
      });
    } else {
      addProduct({
        name: name.trim(),
        sku: sku.trim().toUpperCase(),
        category,
        quantity,
        minStockAlert,
        unitPrice: Number(unitPrice),
        costPrice: Number(costPrice),
        status,
        supplier: supplier.trim() || 'General Supplier',
        location: location.trim() || 'Central Warehouse',
        description: description.trim(),
      });
    }

    closeModal('addEditProduct');
  };

  return (
    <Modal
      isOpen={Boolean(modalState?.isOpen)}
      onClose={() => closeModal('addEditProduct')}
      title={isEdit ? 'Edit Product' : 'New Product'}
      subtitle={
        isEdit
          ? `Update specifications and pricing for ${existingProduct?.sku}`
          : 'Add a new hardware device, cabling, or equipment to the inventory catalog'
      }
      icon={<Package className="w-5 h-5" />}
      iconColor="orange"
      size="lg"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => closeModal('addEditProduct')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="product-form"
            variant="primary"
            size="sm"
            isLoading={isSubmitting}
          >
            {isEdit ? 'Save Changes' : 'Create Product'}
          </Button>
        </div>
      }
    >
      <form id="product-form" onSubmit={handleSubmit} className="space-y-4">
        {/* Basic Information */}
        <FormSectionTitle>General Information</FormSectionTitle>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <Field label="Product Name" required error={errors.name}>
              <Input
                placeholder="e.g. Huawei EchoLife EG8145V5 Dual-Band GPON ONT"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </Field>
          </div>

          <div>
            <Field label="SKU / Part #" required error={errors.sku}>
              <div className="relative">
                <Input
                  placeholder="e.g. ONT-HW-1001"
                  value={sku}
                  onChange={(e) => setSku(e.target.value.toUpperCase())}
                  className="pr-12 font-mono uppercase"
                />
                <button
                  type="button"
                  onClick={handleGenerateSku}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2 py-0.5 text-[10px] font-semibold text-[var(--brand)] bg-[var(--brand-soft)] rounded hover:opacity-85 transition-opacity"
                  title="Generate random SKU"
                >
                  Gen
                </button>
              </div>
            </Field>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Field label="Category" required>
              <Combobox
                options={CATEGORY_OPTIONS}
                value={category}
                onChange={(val) => setCategory(val as string)}
                placeholder="Select category..."
                size="md"
                clearable={false}
              />
            </Field>
          </div>

          <div>
            <Field label="Catalog Status" required>
              <Combobox
                options={STATUS_OPTIONS}
                value={status}
                onChange={(val) => setStatus(val as ProductStatus)}
                placeholder="Select status..."
                size="md"
                clearable={false}
              />
            </Field>
          </div>
        </div>

        {/* Stock & Storage */}
        <FormSectionTitle>Stock & Warehouse Location</FormSectionTitle>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Field label="Current Stock Quantity" required error={errors.quantity}>
              <Input
                type="number"
                min="0"
                value={quantity}
                onChange={(e) => handleQuantityChange(parseInt(e.target.value, 10) || 0)}
              />
            </Field>
          </div>

          <div>
            <Field label="Low Stock Alert Threshold" helperText="Triggers warning when stock falls below">
              <Input
                type="number"
                min="0"
                value={minStockAlert}
                onChange={(e) => setMinStockAlert(parseInt(e.target.value, 10) || 0)}
              />
            </Field>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Field label="Storage Location" helperText="Warehouse rack, shelf or bin">
              <Input
                placeholder="e.g. Warehouse A - Rack 04"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </Field>
          </div>

          <div>
            <Field label="Primary Supplier / Vendor">
              <Input
                placeholder="e.g. Huawei Telecommunications Corp"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
              />
            </Field>
          </div>
        </div>

        {/* Pricing */}
        <FormSectionTitle>Pricing & Valuation</FormSectionTitle>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Field label={`Retail / Sale Price (${currency})`} required error={errors.unitPrice}>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={unitPrice}
                onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
              />
            </Field>
          </div>

          <div>
            <Field label={`Cost Price (${currency})`} helperText="Wholesale or purchase cost per unit">
              <Input
                type="number"
                step="0.01"
                min="0"
                value={costPrice}
                onChange={(e) => setCostPrice(parseFloat(e.target.value) || 0)}
              />
            </Field>
          </div>
        </div>

        {/* Notes / Description */}
        <Field label="Product Notes / Specifications">
          <Textarea
            rows={2}
            placeholder="Technical specs, interface ports, compatibility details, or warranty notes..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>
      </form>
    </Modal>
  );
};
