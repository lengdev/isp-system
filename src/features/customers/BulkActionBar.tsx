import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Power, CheckCircle, Mail, Download, Trash2, X, Wifi, User } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { downloadCSV } from '../../lib/utils';
import { Combobox, ComboboxOption } from '../../components/ui/Combobox';

export const BulkActionBar: React.FC = () => {
  const selectedIds = useStore((s) => s.selectedCustomerIds);
  const clearSelected = useStore((s) => s.clearSelectedCustomers);
  const customers = useStore((s) => s.customers);
  const plans = useStore((s) => s.plans);
  const technicians = useStore((s) => s.technicians);
  const updateCustomer = useStore((s) => s.updateCustomer);
  const openModal = useStore((s) => s.openModal);
  const bulkSetCustomerStatus = useStore((s) => s.bulkSetCustomerStatus);
  const addToast = useStore((s) => s.addToast);

  const [activeAction, setActiveAction] = useState<'none' | 'plan' | 'technician'>('none');

  if (selectedIds.length === 0) return null;

  const planOptions: ComboboxOption[] = plans.map((p) => ({
    value: p.id,
    label: p.name,
    description: `${p.speedMbps} Mbps • $${p.monthlyPrice}/mo`,
  }));

  const technicianOptions: ComboboxOption[] = technicians.map((t) => ({
    value: t.name,
    label: t.name,
    description: t.zone,
  }));

  const handleBulkAssignPlan = async (planId: string) => {
    const chosenPlan = plans.find((p) => p.id === planId);
    if (!chosenPlan) return;
    for (const id of selectedIds) {
      await updateCustomer(id, {
        planId: chosenPlan.id,
        planName: chosenPlan.name,
        monthlyPrice: chosenPlan.monthlyPrice,
        dataCapGB: chosenPlan.dataCapGB,
      });
    }
    setActiveAction('none');
    addToast({
      type: 'success',
      title: 'Plan Assigned',
      message: `Updated plan to ${chosenPlan.name} for ${selectedIds.length} subscribers.`,
    });
  };

  const handleBulkAssignTechnician = async (techName: string) => {
    for (const id of selectedIds) {
      await updateCustomer(id, { assignedTechnician: techName });
    }
    setActiveAction('none');
    addToast({
      type: 'success',
      title: 'Technician Assigned',
      message: `Assigned ${techName} to ${selectedIds.length} subscribers.`,
    });
  };

  const handleExportSelected = () => {
    const selectedCustomers = customers.filter((c) => selectedIds.includes(c.id));
    const headers = [
      'Customer ID',
      'Code',
      'Name',
      'Email',
      'Phone',
      'Address',
      'City',
      'Plan',
      'Price',
      'Status',
      'IP Address',
      'MAC Address',
      'Usage (GB)',
      'Balance Due',
    ];
    const rows = selectedCustomers.map((c) => [
      c.id,
      c.code,
      c.fullName,
      c.email,
      c.phone,
      c.address,
      c.city,
      c.planName,
      c.monthlyPrice,
      c.status,
      c.ipAddress,
      c.macAddress,
      c.dataUsageGB,
      c.balanceDue,
    ]);
    downloadCSV(`netpulse-selected-subscribers-${Date.now()}.csv`, headers, rows);
    addToast({
      type: 'success',
      title: 'CSV Exported',
      message: `Exported ${selectedIds.length} subscriber records.`,
    });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        className="fixed bottom-6 inset-x-0 mx-auto z-40 max-w-2xl w-[94%] sm:w-auto px-4 py-3 rounded-2xl bg-gray-900/95 dark:bg-[#1E1E22]/95 backdrop-blur-md text-white shadow-2xl border border-gray-700/60 flex items-center justify-between gap-3 sm:gap-4 select-none flex-wrap sm:flex-nowrap"
      >
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#F26B3A] text-white text-xs font-bold">
            {selectedIds.length}
          </span>
          <span className="text-xs font-semibold text-gray-200">
            Selected
          </span>
        </div>

        {/* Quick Bulk Action Buttons + Inline Comboboxes */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          {activeAction === 'plan' ? (
            <div className="w-48 text-gray-900">
              <Combobox
                options={planOptions}
                value=""
                onChange={(val) => handleBulkAssignPlan(val as string)}
                placeholder="Select plan..."
                size="sm"
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setActiveAction('plan')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold transition-colors"
            >
              <Wifi className="w-3.5 h-3.5 text-[#F26B3A]" />
              <span>Assign Plan</span>
            </button>
          )}

          {activeAction === 'technician' ? (
            <div className="w-44 text-gray-900">
              <Combobox
                options={technicianOptions}
                value=""
                onChange={(val) => handleBulkAssignTechnician(val as string)}
                placeholder="Select engineer..."
                size="sm"
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setActiveAction('technician')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold transition-colors"
            >
              <User className="w-3.5 h-3.5 text-blue-400" />
              <span>Assign Tech</span>
            </button>
          )}

          {/* Activate */}
          <button
            type="button"
            onClick={() => bulkSetCustomerStatus(selectedIds, 'Active')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold transition-colors"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Activate</span>
          </button>

          {/* Suspend */}
          <button
            type="button"
            onClick={() =>
              openModal('statusConfirmation', {
                customerIds: selectedIds,
                targetStatus: 'Suspended',
              })
            }
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold transition-colors"
          >
            <Power className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Suspend</span>
          </button>

          {/* Send Message */}
          <button
            type="button"
            onClick={() => openModal('sendMessage', { isBulk: true })}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-xs font-semibold transition-colors"
          >
            <Mail className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Message</span>
          </button>

          {/* Export Selected */}
          <button
            type="button"
            onClick={handleExportSelected}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>

          {/* Delete Selected */}
          <button
            type="button"
            onClick={() =>
              openModal('deleteConfirmation', {
                customerIds: selectedIds,
                isBulk: true,
              })
            }
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-semibold transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Delete</span>
          </button>
        </div>

        <button
          type="button"
          onClick={clearSelected}
          className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
};
