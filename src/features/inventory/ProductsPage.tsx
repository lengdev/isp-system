import React, { useMemo } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  Boxes,
  Plus,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Edit2,
  Trash2,
  History,
  Warehouse,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { api } from '../../lib/api';
import { Can, useCan } from '../../lib/permissions';
import { Product } from '../../types';
import { StatCard } from '../../components/ui/StatCard';
import { Button } from '../../components/ui/Button';
import { Chip } from '../../components/ui/Chip';
import { DataTable, DataTableColumnDef, RowAction } from '../../components/ui/DataTable';
import { ProductModal } from './ProductModal';
import { ProductLogModal } from './ProductLogModal';
import { DeleteProductModal } from './DeleteProductModal';
import { Tooltip } from '../../components/ui/Tooltip';
import { formatCurrency, cn } from '../../lib/utils';

function mapApiProduct(raw: any): Product {
  const st = String(raw.status || 'IN_STOCK').toUpperCase();
  const status =
    st === 'LOW_STOCK'
      ? 'Low Stock'
      : st === 'OUT_OF_STOCK'
      ? 'Out of Stock'
      : st === 'DISCONTINUED'
      ? 'Discontinued'
      : 'In Stock';
  return {
    ...raw,
    id: String(raw.id),
    name: raw.name,
    sku: raw.sku || `SKU-${raw.id}`,
    category: raw.categoryName || raw.category || 'Accessories',
    quantity: Number(raw.quantity ?? 0),
    minStockAlert: Number(raw.minStockAlert ?? 10),
    unitPrice: Number(raw.unitPrice ?? raw.costPrice ?? 0),
    status,
    location: raw.location || raw.warehouse || 'Phnom Penh Hub',
    supplier: raw.supplier || 'Primary Vendor',
    updatedAt: raw.updatedAt ? String(raw.updatedAt).slice(0, 10) : '',
  };
}

export const ProductsPage: React.FC = () => {
  const showProductStats = useStore((s) => s.showProductStats);
  const toggleProductStats = useStore((s) => s.toggleProductStats);
  const openModal = useStore((s) => s.openModal);
  const currency = useStore((s) => s.currency);
  const bulkDeleteProducts = useStore((s) => s.bulkDeleteProducts);
  const addToast = useStore((s) => s.addToast);
  const canCreateProduct = useCan('inventory.create');
  const canEditProduct = useCan('inventory.edit');
  const canDeleteProduct = useCan('inventory.delete');

  const productsQuery = useQuery<Product[], Error>({
    queryKey: ['products'],
    queryFn: async () => {
      const list = await api.inventory.getProducts();
      return (Array.isArray(list) ? list : []).map(mapApiProduct);
    },
    placeholderData: keepPreviousData,
  });

  const products = useMemo(() => productsQuery.data ?? [], [productsQuery.data]);

  // Live calculated stats
  const totalProducts = products.length;
  const totalUnits = products.reduce((acc, p) => acc + (p.quantity || 0), 0);
  const lowOrOutOfStockCount = products.filter(
    (p) => p.status === 'Low Stock' || p.status === 'Out of Stock' || p.quantity <= p.minStockAlert
  ).length;
  const totalInventoryValue = products.reduce(
    (acc, p) => acc + (p.quantity || 0) * (p.unitPrice || 0),
    0
  );

  // Category list for filter
  const categoryOptions = useMemo(() => {
    const unique = Array.from(new Set(products.map((p) => p.category).filter(Boolean))).sort();
    return unique.map((c) => ({ value: c, label: c }));
  }, [products]);

  const statusOptions = [
    { value: 'In Stock', label: 'In Stock' },
    { value: 'Low Stock', label: 'Low Stock' },
    { value: 'Out of Stock', label: 'Out of Stock' },
    { value: 'Discontinued', label: 'Discontinued' },
  ];

  const columns: DataTableColumnDef<Product>[] = useMemo(
    () => [
      {
        id: 'name',
        header: 'Product / SKU',
        accessorKey: 'name',
        width: 380,
        minWidth: 320,
        sortable: true,
        priority: 1,
        filter: {
          type: 'text',
          placeholder: 'Search product or SKU...',
        },
        cell: ({ row }) => {
          const p = row.original;
          return (
            <div className="flex items-center gap-2.5 min-w-0 py-1">
              <div className="w-8 h-8 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border)] flex items-center justify-center shrink-0 text-[var(--brand)]">
                <Package className="w-4 h-4 stroke-[1.8]" />
              </div>
              <div className="min-w-0 flex-1">
                <div
                  className="font-semibold text-[13px] text-[var(--text)] hover:text-[var(--brand)] transition-colors leading-snug whitespace-normal"
                  title={p.name}
                >
                  {p.name}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] mt-0.5 whitespace-nowrap">
                  <span className="font-mono text-[10px] font-medium text-[var(--text-secondary)] bg-[var(--surface-subtle)] px-1.5 py-0.5 rounded border border-[var(--border-subtle)] shrink-0">
                    {p.sku}
                  </span>
                  {p.location && (
                    <span className="text-[var(--text-muted)] truncate shrink-0">
                      • {p.location}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        id: 'category',
        header: 'Category',
        accessorKey: 'category',
        width: 160,
        minWidth: 140,
        sortable: true,
        priority: 2,
        filter: {
          type: 'select',
          options: categoryOptions,
        },
        cell: ({ row }) => (
          <Chip size="sm" variant="bordered" color="default" className="text-[11px] whitespace-nowrap shrink-0">
            {row.original.category}
          </Chip>
        ),
      },
      {
        id: 'quantity',
        header: 'Stock Qty',
        accessorKey: 'quantity',
        width: 120,
        minWidth: 110,
        align: 'right',
        sortable: true,
        priority: 1,
        aggregate: 'sum',
        filter: {
          type: 'range',
          min: 0,
          max: 200,
        },
        cell: ({ row }) => {
          const p = row.original;
          const isLow = p.quantity <= p.minStockAlert && p.quantity > 0;
          const isOut = p.quantity === 0;

          return (
            <div className="flex items-center justify-end gap-1.5 tabular-nums whitespace-nowrap">
              <span
                className={cn(
                  'w-2 h-2 rounded-full shrink-0',
                  isOut ? 'bg-red-500' : isLow ? 'bg-amber-500' : 'bg-emerald-500'
                )}
              />
              <span className="text-[13px] font-semibold text-[var(--text)]">
                {p.quantity}
              </span>
              <span className="text-[11px] text-[var(--text-muted)]">units</span>
            </div>
          );
        },
      },
      {
        id: 'unitPrice',
        header: 'Unit Price',
        accessorKey: 'unitPrice',
        width: 110,
        minWidth: 100,
        align: 'right',
        sortable: true,
        priority: 2,
        cell: ({ row }) => (
          <span className="text-[12px] font-medium text-[var(--text)] tabular-nums whitespace-nowrap">
            {currency}{row.original.unitPrice.toFixed(2)}
          </span>
        ),
      },
      {
        id: 'totalValue',
        header: 'Total Value',
        accessorFn: (row) => row.quantity * row.unitPrice,
        width: 130,
        minWidth: 120,
        align: 'right',
        sortable: true,
        priority: 2,
        aggregate: 'sum',
        cell: ({ row }) => {
          const val = row.original.quantity * row.original.unitPrice;
          return (
            <span className="text-[12px] font-semibold text-[var(--text)] tabular-nums whitespace-nowrap">
              {currency}{val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          );
        },
      },
      {
        id: 'status',
        header: 'Status',
        accessorKey: 'status',
        width: 140,
        minWidth: 130,
        sortable: true,
        priority: 1,
        filter: {
          type: 'select',
          options: statusOptions,
        },
        cell: ({ row }) => {
          const status = row.original.status;
          const color =
            status === 'In Stock'
              ? 'success'
              : status === 'Low Stock'
              ? 'warning'
              : status === 'Out of Stock'
              ? 'danger'
              : 'default';

          return (
            <Chip size="sm" variant="flat" color={color} className="text-[11px] font-semibold whitespace-nowrap shrink-0">
              {status}
            </Chip>
          );
        },
      },
      {
        id: 'supplier',
        header: 'Supplier',
        accessorKey: 'supplier',
        width: 240,
        minWidth: 200,
        sortable: true,
        priority: 3,
        cell: ({ row }) => (
          <span
            className="text-[12px] text-[var(--text-secondary)] whitespace-nowrap block"
            title={row.original.supplier}
          >
            {row.original.supplier}
          </span>
        ),
      },
      {
        id: 'updatedAt',
        header: 'Last Updated',
        accessorKey: 'updatedAt',
        width: 140,
        minWidth: 130,
        sortable: true,
        priority: 3,
        cell: ({ row }) => (
          <span className="text-[11px] text-[var(--text-muted)] font-mono whitespace-nowrap block">
            {row.original.updatedAt}
          </span>
        ),
      },
    ],
    [categoryOptions, currency]
  );

  // Row actions: edit, delete, log
  const getRowActions = (product: Product): RowAction<Product>[] => [
    ...(canEditProduct
      ? [
          {
            label: 'Edit Product',
            icon: <Edit2 className="w-3.5 h-3.5" />,
            onClick: () => openModal('addEditProduct', { productId: product.id }),
          },
        ]
      : []),
    {
      label: 'Stock & Activity Log',
      icon: <History className="w-3.5 h-3.5" />,
      onClick: () => openModal('productLog', { productId: product.id }),
    },
    ...(canDeleteProduct
      ? [
          { divider: true, label: '', onClick: () => {} },
          {
            label: 'Delete Product',
            icon: <Trash2 className="w-3.5 h-3.5" />,
            danger: true,
            onClick: () => openModal('deleteProduct', { productId: product.id }),
          },
        ]
      : []),
  ];

  return (
    <div className="w-full pb-16 space-y-4 select-none">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-1.5 text-[12px] text-[var(--text-muted)] mb-1">
            <span className="flex items-center gap-1">
              <Boxes className="w-3.5 h-3.5" />
              Inventory
            </span>
            <ChevronRight className="w-3 h-3 text-[var(--border-strong)]" />
            <span className="font-semibold text-[var(--text)]">Product</span>
          </div>

          <h2 className="text-[24px] font-semibold text-[var(--text)] tracking-tight">
            Products
          </h2>
          <p className="text-[13px] text-[var(--text-muted)] mt-0.5">
            Manage stock levels, hardware catalog, unit pricing, and warehouse logs
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => productsQuery.refetch()}
            disabled={productsQuery.isFetching}
            className="h-8 px-3 text-[12px] font-semibold gap-1.5 shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${productsQuery.isFetching ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
          {/* New Product Button */}
          <Can permission="inventory.create">
            <Button
              variant="primary"
              size="sm"
              onClick={() => openModal('addEditProduct')}
              className="h-8 px-3 text-[12px] font-semibold gap-1.5 shrink-0"
              title="Create New Product"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Product</span>
            </Button>
          </Can>
        </div>
      </div>

      {/* 2. Section Stat with Animated Show/Hide Toggle */}
      <AnimatePresence>
        {showProductStats && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
              <StatCard
                label="Total SKUs"
                value={totalProducts}
                changeValue="+2 items"
                isPositive={true}
                changeLabel="vs last month"
                icon={<Package className="w-4 h-4" />}
                iconBgColor="bg-[var(--brand-soft)]"
                iconTextColor="text-[var(--brand)]"
              />

              <StatCard
                label="Total Units in Stock"
                value={totalUnits}
                changeValue="Healthy"
                isPositive={true}
                changeLabel="across 3 sites"
                icon={<CheckCircle2 className="w-4 h-4" />}
                iconBgColor="bg-emerald-50 dark:bg-emerald-950/40"
                iconTextColor="text-emerald-600 dark:text-emerald-400"
              />

              <StatCard
                label="Low & Out of Stock"
                value={lowOrOutOfStockCount}
                changeValue={lowOrOutOfStockCount > 0 ? 'Action needed' : 'All good'}
                isPositive={lowOrOutOfStockCount === 0}
                changeLabel="reorder alerts"
                icon={<AlertTriangle className="w-4 h-4" />}
                iconBgColor="bg-amber-50 dark:bg-amber-950/40"
                iconTextColor="text-amber-600 dark:text-amber-400"
              />

              <StatCard
                label="Inventory Valuation"
                value={Math.round(totalInventoryValue)}
                prefix={currency}
                changeValue="+4.8%"
                isPositive={true}
                changeLabel="asset value"
                icon={<DollarSign className="w-4 h-4" />}
                iconBgColor="bg-blue-50 dark:bg-blue-950/40"
                iconTextColor="text-blue-600 dark:text-blue-400"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Full-featured DataTable */}
      <DataTable<Product>
        columns={columns}
        data={products}
        loading={productsQuery.isLoading}
        fetching={productsQuery.isFetching}
        error={productsQuery.error ? 'Unable to load inventory catalog.' : null}
        onRetry={() => productsQuery.refetch()}
        onRefresh={() => productsQuery.refetch()}
        viewKey="inventory_products_view"
        searchPlaceholder="Search products…"
        rowActions={getRowActions}
        rowId={(p) => p.id}
        noDataTitle="No inventory products yet"
        noDataDescription="Add ONUs, routers, fiber cables, or hardware SKUs to track warehouse stock."
        emptyTitle="No matching products"
        emptySubtitle="Adjust your search or clear active column filters."
        emptyActionPermission="inventory.create"
        onAddNew={canCreateProduct ? () => openModal('addEditProduct') : undefined}
        addNewLabel="New Product"
        showStatisticsToggle={true}
        showStatistics={showProductStats}
        onToggleStatistics={toggleProductStats}
        bulkActions={
          canDeleteProduct
            ? (selectedRows, clearSelection) => (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    const ids = selectedRows.map((r) => r.id);
                    bulkDeleteProducts(ids);
                    clearSelection();
                    addToast({
                      type: 'info',
                      title: 'Bulk Deletion',
                      message: `Removed ${ids.length} products from inventory.`,
                    });
                  }}
                  className="h-7 px-2.5 text-[11px] font-semibold gap-1.5 bg-red-600 text-white"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Selected ({selectedRows.length})
                </Button>
              )
            : undefined
        }
        renderCard={(product, isSelected, onSelect) => (
          <div
            data-testid="product-card"
            onClick={() => openModal('addEditProduct', { productId: product.id })}
            className={cn(
              'p-4 rounded-xl border transition-all cursor-pointer bg-[var(--surface)] hover:border-[var(--brand)] flex flex-col justify-between min-w-0 h-full group',
              isSelected ? 'border-[var(--brand)] ring-1 ring-[var(--brand)]' : 'border-[var(--border)]'
            )}
          >
            <div>
              <div className="flex items-start justify-between gap-2.5 min-w-0">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border)] flex items-center justify-center text-[var(--brand)] shrink-0 group-hover:scale-105 transition-transform">
                    <Package className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4
                      className="text-[13px] font-semibold text-[var(--text)] truncate group-hover:text-[var(--brand)] transition-colors"
                      title={product.name}
                    >
                      {product.name}
                    </h4>
                    <p className="text-[11px] text-[var(--text-muted)] font-mono truncate">{product.sku}</p>
                  </div>
                </div>

                <Chip
                  size="sm"
                  variant="flat"
                  className="shrink-0"
                  color={
                    product.status === 'In Stock'
                      ? 'success'
                      : product.status === 'Low Stock'
                      ? 'warning'
                      : product.status === 'Out of Stock'
                      ? 'danger'
                      : 'default'
                  }
                >
                  {product.status}
                </Chip>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-[var(--border-subtle)] text-[12px] min-w-0">
              <div className="min-w-0">
                <span className="text-[var(--text-muted)] text-[11px] block">Stock:</span>
                <p className="font-semibold text-[var(--text)] tabular-nums truncate">{product.quantity} units</p>
              </div>
              <div className="min-w-0">
                <span className="text-[var(--text-muted)] text-[11px] block">Price:</span>
                <p className="font-semibold text-[var(--text)] tabular-nums truncate">
                  {currency}{product.unitPrice.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        )}
      />

      {/* Popups & Modals */}
      <ProductModal />
      <ProductLogModal />
      <DeleteProductModal />
    </div>
  );
};
