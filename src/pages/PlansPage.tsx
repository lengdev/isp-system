import React, { useState } from 'react';
import { Wifi, Plus, Edit2, Trash2, Check, ArrowDown, ArrowUp } from 'lucide-react';
import { useStore } from '../store/useStore';
import { Plan, ConnectionType } from '../types';
import { Button } from '../components/ui/Button';
import { Modal, ModalFooter } from '../components/ui/Modal';
import { Field, Input, Textarea } from '../components/ui/Field';
import { Combobox, ComboboxOption } from '../components/ui/Combobox';

export const PlansPage: React.FC = () => {
  const plans = useStore((s) => s.plans);
  const addPlan = useStore((s) => s.addPlan);
  const updatePlan = useStore((s) => s.updatePlan);
  const deletePlan = useStore((s) => s.deletePlan);
  const currency = useStore((s) => s.currency);

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
    } else {
      addPlan(payload);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 pb-12 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-[28px] leading-tight font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
            Internet Plans Catalog
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Configure speed tiers, bandwidth limits, and subscription pricing
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={handleOpenAdd}
          className="text-xs font-semibold h-9 px-4 gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Plan</span>
        </Button>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {plans.map((p) => (
          <div
            key={p.id}
            className="flex flex-col justify-between p-5 rounded-2xl bg-white dark:bg-[#1C1C1F] border border-gray-200/80 dark:border-gray-800 shadow-xs hover:shadow-soft-hover transition-all"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FFF1EA] text-[#F26B3A] dark:bg-orange-950/60 uppercase">
                  {p.type}
                </span>
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

              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mt-2">{p.name}</h3>
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
        ))}
      </div>

      {/* Add / Edit Plan Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        size="md"
        icon={<Wifi className="w-5 h-5" />}
        iconColor="orange"
        title={editingPlanId ? 'Edit Internet Plan' : 'Add New Internet Plan'}
        subtitle="Configure broadband speed tiers, bandwidth limits, and monthly pricing"
        footer={
          <ModalFooter
            onCancel={() => setIsModalOpen(false)}
            onSubmit={handleSubmit}
            submitText={editingPlanId ? 'Save Changes' : 'Create Plan'}
            submitDisabled={!name.trim() || !speedMbps || !monthlyPrice}
          />
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Plan name" required helperText="Visible on customer portal and invoice">
            <Input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Fiber Ultra 500M"
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Download speed" required>
              <Input
                type="number"
                required
                suffixAdornment="Mbps"
                value={speedMbps}
                onChange={(e) => setSpeedMbps(Number(e.target.value))}
              />
            </Field>

            <Field label="Upload speed" required>
              <Input
                type="number"
                required
                suffixAdornment="Mbps"
                value={uploadMbps}
                onChange={(e) => setUploadMbps(Number(e.target.value))}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Monthly price" required>
              <Input
                type="number"
                step="0.01"
                required
                prefixAdornment={currency}
                formatOnBlur={true}
                value={monthlyPrice}
                onChange={(e) => setMonthlyPrice(Number(e.target.value))}
              />
            </Field>

            <Field label="Connection medium">
              <Combobox
                options={connectionTypeOptions}
                value={type}
                onChange={(val) => setType(val as ConnectionType)}
                searchable={false}
                clearable={false}
                size="md"
              />
            </Field>
          </div>

          <Field label="Monthly data cap" helperText="Leave empty for unlimited unmetered bandwidth">
            <Input
              type="number"
              suffixAdornment="GB"
              value={dataCapGB}
              onChange={(e) => setDataCapGB(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="Unlimited"
            />
          </Field>

          <Field label="Marketing description">
            <Textarea
              rows={2}
              maxLength={200}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Highlights e.g. Ideal for multi-gigabit smart homes and 4K streaming..."
            />
          </Field>
        </form>
      </Modal>
    </div>
  );
};
