import React, { useState, useMemo } from 'react';
import {
  Wifi,
  Plus,
  Edit2,
  Trash2,
  Check,
  ArrowDown,
  ArrowUp,
  Layers,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { Plan, ConnectionType } from '../types';
import { Button } from '../components/ui/Button';
import { Chip } from '../components/ui/Chip';
import { Modal, ModalFooter } from '../components/ui/Modal';
import { Field, Input, Textarea } from '../components/ui/Field';
import { Combobox, ComboboxOption } from '../components/ui/Combobox';
import { DataTable, DataTableColumnDef, RowAction } from '../components/ui/DataTable';

export const PlansPage: React.FC = () => {
  const plans = useStore((s) => s.plans);
  const addPlan = useStore((s) => s.addPlan);
  const updatePlan = useStore((s) => s.updatePlan);
  const deletePlan = useStore((s) => s.deletePlan);
  const currency = useStore((s) => s.currency);
  const addToast = useStore((s) => s.addToast);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [speedMbps, setSpeedMbps] = useState(300);
  const [uploadMbps, setUploadMbps] = useState(150);
  const [monthlyPrice, setMonthlyPrice] = useState(54.99);
  const [dataCapGB, setDataCapGB] = useState<number | ''>('');
  const [type, setType] = useState<ConnectionType>('Fiber');
  const [description, setDescription] = useState('');

  const connectionTypeOptions: ComboboxOption[] = [
    { value: 'Fiber', label: 'Fiber Optic' },
    { value: 'Wireless', label: 'Fixed Wireless' },
    { value: 'DSL', label: 'DSL Copper' },
  ];

  const handleOpenAdd = () => {
    setEditingPlanId(null);
    setName('');
    setSpeedMbps(300);
    setUploadMbps(150);
    setMonthlyPrice(54.99);
    setDataCapGB('');
    setType('Fiber');
    setDescription('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (plan: Plan) => {
    setEditingPlanId(plan.id);
    setName(plan.name);
    setSpeedMbps(plan.speedMbps);
    setUploadMbps(plan.uploadMbps);
    setMonthlyPrice(plan.monthlyPrice);
    setDataCapGB(plan.dataCapGB || '');
    setType(plan.type);
    setDescription(plan.description || '');
    setIsModalOpen(true);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const payload = {
      name,
      speedMbps: Number(speedMbps),
      uploadMbps: Number(uploadMbps),
      monthlyPrice: Number(monthlyPrice),
      dataCapGB: dataCapGB === '' ? null : Number(dataCapGB),
      type,
      description,
    };

    if (editingPlanId) {
      updatePlan(editingPlanId, payload);
      addToast({
        type: 'success',
        title: 'Plan Updated',
        message: `Updated tier configuration for ${name}`,
      });
    } else {
      addPlan(payload);
      addToast({
        type: 'success',
        title: 'Plan Created',
        message: `New plan ${name} added to catalog`,
      });
    }
    setIsModalOpen(false);
  };

  const columns: DataTableColumnDef<Plan>[] = useMemo(
    () => [
      {
        id: 'name',
        header: 'Plan name',
        accessorKey: 'name',
        width: 220,
        sortable: true,
        pinned: 'left',
        priority: 1,
        filter: { type: 'text', placeholder: 'Search plan...' },
        cell: ({ row }) => {
          const p = row.original;
          return (
            <div>
              <div className="font-bold text-gray-900 dark:text-gray-100 truncate">
                {p.name}
              </div>
              <div className="text-[11px] text-gray-400 truncate">
                {p.description || 'High-speed broadband connectivity'}
              </div>
            </div>
          );
        },
      },
      {
        id: 'type',
        header: 'Medium',
        accessorKey: 'type',
        width: 140,
        sortable: true,
        priority: 1,
        filter: {
          type: 'select',
          options: [
            { value: 'Fiber', label: 'Fiber' },
            { value: 'Wireless', label: 'Wireless' },
            { value: 'DSL', label: 'DSL' },
          ],
        },
        cell: ({ row }) => {
          const p = row.original;
          const color = p.type === 'Fiber' ? 'accent' : p.type === 'Wireless' ? 'warning' : 'default';
          return (
            <Chip size="sm" color={color} className="uppercase font-semibold tracking-wide">
              {p.type}
            </Chip>
          );
        },
      },
      {
        id: 'monthlyPrice',
        header: 'Monthly fee',
        accessorKey: 'monthlyPrice',
        width: 140,
        align: 'right',
        sortable: true,
        priority: 1,
        aggregate: 'avg',
        filter: { type: 'range', min: 0, max: 200 },
        cell: ({ row }) => (
          <span className="font-bold text-gray-900 dark:text-gray-100 tabular-nums">
            {currency}{row.original.monthlyPrice.toFixed(2)}
          </span>
        ),
      },
      {
        id: 'speedMbps',
        header: 'Download',
        accessorKey: 'speedMbps',
        width: 130,
        align: 'right',
        sortable: true,
        priority: 1,
        cell: ({ row }) => (
          <span className="font-semibold text-gray-800 dark:text-gray-200 tabular-nums">
            {row.original.speedMbps} Mbps
          </span>
        ),
      },
      {
        id: 'uploadMbps',
        header: 'Upload',
        accessorKey: 'uploadMbps',
        width: 130,
        align: 'right',
        sortable: true,
        priority: 2,
        cell: ({ row }) => (
          <span className="font-semibold text-gray-800 dark:text-gray-200 tabular-nums">
            {row.original.uploadMbps} Mbps
          </span>
        ),
      },
      {
        id: 'dataCapGB',
        header: 'Data cap',
        accessorKey: 'dataCapGB',
        width: 130,
        align: 'right',
        sortable: true,
        priority: 2,
        cell: ({ row }) => (
          <span className="font-medium text-[var(--text)]">
            {row.original.dataCapGB ? `${row.original.dataCapGB} GB` : 'Unlimited'}
          </span>
        ),
      },
      {
        id: 'subscribersCount',
        header: 'Subscribers',
        accessorKey: 'subscribersCount',
        width: 140,
        align: 'right',
        sortable: true,
        priority: 1,
        aggregate: 'sum',
        cell: ({ row }) => (
          <span className="font-bold text-gray-800 dark:text-gray-200 tabular-nums">
            {row.original.subscribersCount || 0}
          </span>
        ),
      },
    ],
    [currency]
  );

  const getRowActions = (p: Plan): RowAction<Plan>[] => [
    {
      label: 'Edit Plan Configuration',
      icon: <Edit2 className="w-3.5 h-3.5" />,
      onClick: () => handleOpenEdit(p),
    },
    {
      label: 'Delete Plan',
      icon: <Trash2 className="w-3.5 h-3.5" />,
      danger: true,
      onClick: () => {
        deletePlan(p.id);
        addToast({
          type: 'info',
          title: 'Plan Removed',
          message: `Removed ${p.name} from catalog`,
        });
      },
    },
  ];

  const renderExpanded = (p: Plan) => (
    <div className="p-4 rounded-xl bg-gray-50/80 dark:bg-[#161618] border border-gray-200/60 dark:border-gray-800 text-xs space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wifi className="w-4 h-4 text-[var(--brand)]" />
          <span className="font-bold text-[var(--text)]">
            Broadband Tier Specifications • {p.name}
          </span>
        </div>
        <span className="text-[11px] text-gray-400">
          Subscribers enrolled: {p.subscribersCount || 0}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3 rounded-lg bg-white dark:bg-[#1C1C1F] border border-gray-200/50 dark:border-gray-800 space-y-1">
          <span className="text-[11px] text-gray-400">Bandwidth Profile</span>
          <div className="font-semibold text-gray-900 dark:text-gray-100">
            {p.speedMbps} Mbps Down / {p.uploadMbps} Mbps Up (Symmetric QOS)
          </div>
        </div>
        <div className="p-3 rounded-lg bg-white dark:bg-[#1C1C1F] border border-gray-200/50 dark:border-gray-800 space-y-1">
          <span className="text-[11px] text-gray-400">Included Hardware</span>
          <div className="font-semibold text-emerald-600">
            Free Wi-Fi 6 Mesh Router + Optical ONT
          </div>
        </div>
        <div className="p-3 rounded-lg bg-white dark:bg-[#1C1C1F] border border-gray-200/50 dark:border-gray-800 space-y-1">
          <span className="text-[11px] text-gray-400">SLA Guarantee</span>
          <div className="font-semibold text-gray-900 dark:text-gray-100">
            99.9% Uptime with 24/7 Priority Support
          </div>
        </div>
      </div>
    </div>
  );

  const renderCard = (
    p: Plan,
    isSelected: boolean,
    onSelect: () => void
  ) => (
    <div
      className={`flex flex-col justify-between p-5 rounded-2xl bg-white dark:bg-[#1C1C1F] border shadow-xs transition-all ${isSelected
          ? 'border-[#F26B3A] bg-[#FFF6F2] dark:bg-orange-950/20'
          : 'border-gray-200/80 dark:border-gray-800 hover:border-gray-300'
        }`}
    >
      <div>
        <div className="flex items-start justify-between gap-2">
          <Chip
            size="sm"
            color={p.type === 'Fiber' ? 'accent' : p.type === 'Wireless' ? 'warning' : 'default'}
            className="uppercase font-semibold tracking-wide"
          >
            {p.type}
          </Chip>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleOpenEdit(p)}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => deletePlan(p.id)}
              className="p-1 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mt-2">
          {p.name}
        </h3>
        <p className="text-[11px] text-gray-400 mt-1 line-clamp-2">
          {p.description || 'High-speed broadband connectivity.'}
        </p>

        {/* Price */}
        <div className="mt-4 flex items-baseline gap-1">
          <span className="text-[28px] font-bold text-gray-900 dark:text-gray-100 tabular-nums">
            {currency}{p.monthlyPrice.toFixed(2)}
          </span>
          <span className="text-xs text-gray-400">/month</span>
        </div>

        {/* Speeds */}
        <div className="mt-4 p-3 rounded-xl bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-gray-500">
              <ArrowDown className="w-3.5 h-3.5 text-[#F26B3A]" /> Download:
            </span>
            <span className="font-semibold text-gray-800 dark:text-gray-200 tabular-nums">
              {p.speedMbps} Mbps
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-gray-500">
              <ArrowUp className="w-3.5 h-3.5 text-blue-500" /> Upload:
            </span>
            <span className="font-semibold text-gray-800 dark:text-gray-200 tabular-nums">
              {p.uploadMbps} Mbps
            </span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-gray-200/60 dark:border-gray-700">
            <span className="text-gray-500">Monthly Cap:</span>
            <span className="font-semibold text-[#F26B3A]">
              {p.dataCapGB ? `${p.dataCapGB} GB` : 'Unlimited'}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-[11px] text-gray-400">
        <span>Subscribers</span>
        <span className="font-bold text-gray-700 dark:text-gray-300 tabular-nums">
          {p.subscribersCount || 0} active
        </span>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 pb-12 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-[24px] leading-tight font-semibold text-[var(--text)] tracking-tight">
            Internet Plans Catalog
          </h2>
          <p className="text-[13px] text-[var(--text-muted)] mt-0.5">
            Configure speed tiers, bandwidth limits, and subscription pricing
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={handleOpenAdd}
          className="h-8 px-3 text-[12px]"
        >
          <Plus className="w-3.5 h-3.5 stroke-[1.75]" />
          <span>Add New Plan</span>
        </Button>
      </div>

      {/* Full-Featured Plans DataTable */}
      <DataTable<Plan>
        columns={columns}
        data={plans}
        rowId={(p) => p.id}
        viewKey="plans_catalog_table"
        enableRowReorder={true}
        rowActions={getRowActions}
        renderExpanded={renderExpanded}
        renderCard={renderCard}
        emptyTitle="No internet plans configured"
        emptySubtitle="Create broadband plans to begin subscriber provisioning."
        onAddNew={handleOpenAdd}
        addNewLabel="Add New Plan"
      />

      {/* Add / Edit Plan Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        size="md"
        title={editingPlanId ? 'Edit Plan' : 'Add New Internet Plan'}
        subtitle="Set bandwidth limits, pricing, and medium characteristics"
        icon={<Wifi className="w-5 h-5 text-[#F26B3A]" />}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Plan Name" required>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Gig-Speed Fiber 1000"
              required
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Download Speed (Mbps)" required>
              <Input
                type="number"
                value={speedMbps}
                onChange={(e) => setSpeedMbps(Number(e.target.value))}
                min={1}
                required
              />
            </Field>
            <Field label="Upload Speed (Mbps)" required>
              <Input
                type="number"
                value={uploadMbps}
                onChange={(e) => setUploadMbps(Number(e.target.value))}
                min={1}
                required
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Monthly Price ($)" required>
              <Input
                type="number"
                step="0.01"
                value={monthlyPrice}
                onChange={(e) => setMonthlyPrice(Number(e.target.value))}
                min={0}
                required
              />
            </Field>
            <Field label="Monthly Cap (GB)">
              <Input
                type="number"
                value={dataCapGB}
                onChange={(e) =>
                  setDataCapGB(e.target.value === '' ? '' : Number(e.target.value))
                }
                placeholder="Unlimited if blank"
              />
            </Field>
          </div>

          <Field label="Medium / Connection Type" required>
            <Combobox
              options={connectionTypeOptions}
              value={type}
              onChange={(val) => setType(val as ConnectionType)}
              searchable={false}
              clearable={false}
              size="md"
            />
          </Field>

          <Field label="Description">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Ultra low latency fiber broadband..."
              rows={3}
            />
          </Field>

          <ModalFooter
            onCancel={() => setIsModalOpen(false)}
            cancelText="Cancel"
            submitText={editingPlanId ? 'Save Changes' : 'Create Plan'}
          />
        </form>
      </Modal>
    </div>
  );
};
