import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail,
  Wifi,
  Download,
  CheckCircle,
  Power,
  MoreHorizontal,
  Trash2,
  X,
  Loader2,
  User,
  Bell,
  Tag,
  KeyRound,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { downloadCSV } from '../../lib/utils';
import { Combobox, ComboboxOption } from '../../components/ui/Combobox';
import { Tooltip } from '../../components/ui/Tooltip';
import { SPRING_SOFT } from '../../lib/motion';
import { cn } from '../../lib/utils';

export const BulkActionBar: React.FC = () => {
  const selectedIds = useStore((s) => s.selectedCustomerIds);
  const selectAll = useStore((s) => s.selectAllCustomers);
  const clearSelected = useStore((s) => s.clearSelectedCustomers);
  const customers = useStore((s) => s.customers);
  const plans = useStore((s) => s.plans);
  const technicians = useStore((s) => s.technicians);
  const updateCustomer = useStore((s) => s.updateCustomer);
  const openModal = useStore((s) => s.openModal);
  const bulkSetCustomerStatus = useStore((s) => s.bulkSetCustomerStatus);
  const addToast = useStore((s) => s.addToast);

  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // Esc key clears selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedIds.length > 0) {
        clearSelected();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, clearSelected]);

  if (selectedIds.length === 0) return null;

  const totalCount = customers.length;
  const isAllSelected = selectedIds.length === totalCount;

  const planOptions: ComboboxOption[] = plans.map((p) => ({
    value: p.id,
    label: p.name,
    description: `${p.speedMbps} Mbps • $${p.monthlyPrice}/mo`,
  }));

  const handleBulkAssignPlan = async (planId: string) => {
    const chosenPlan = plans.find((p) => p.id === planId);
    if (!chosenPlan) return;
    setActiveAction('assignPlan');
    for (const id of selectedIds) {
      await updateCustomer(id, {
        planId: chosenPlan.id,
        planName: chosenPlan.name,
        monthlyPrice: chosenPlan.monthlyPrice,
        dataCapGB: chosenPlan.dataCapGB,
      });
    }
    setActiveAction(null);
    addToast({
      type: 'success',
      title: 'Plan Assigned',
      message: `Updated plan to ${chosenPlan.name} for ${selectedIds.length} subscribers.`,
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
    downloadCSV(`netpulse-selected-${Date.now()}.csv`, headers, rows);
    addToast({
      type: 'success',
      title: 'CSV Exported',
      message: `Exported ${selectedIds.length} subscriber records.`,
    });
  };

  return (
    <AnimatePresence>
      <motion.div
        role="toolbar"
        aria-label="Bulk actions toolbar"
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={SPRING_SOFT}
        className="fixed bottom-6 inset-x-0 mx-auto z-40 max-w-3xl w-[94%] sm:w-auto h-14 px-4 rounded-2xl bg-[#1A1C20] text-[#E7E9EE] shadow-2xl border border-white/10 flex items-center justify-between gap-3 select-none flex-nowrap"
      >
        {/* Left Count + Select All / Clear */}
        <div className="flex items-center gap-2.5 shrink-0" aria-live="polite">
          <span className="flex items-center justify-center min-w-6 h-6 px-1.5 rounded-full bg-[var(--brand)] text-white text-[11px] font-bold tabular-nums">
            {selectedIds.length}
          </span>
          <span className="text-[12px] font-medium text-[#B4B9C4] hidden sm:inline">
            selected
          </span>

          {!isAllSelected ? (
            <button
              type="button"
              onClick={() => selectAll(customers.map((c) => c.id))}
              className="text-[12px] font-medium text-[var(--brand)] hover:underline ml-1"
            >
              Select all {totalCount}
            </button>
          ) : (
            <button
              type="button"
              onClick={clearSelected}
              className="text-[12px] font-medium text-[var(--brand)] hover:underline ml-1"
            >
              All {totalCount} selected — Clear
            </button>
          )}
        </div>

        {/* Center Ghost Actions */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Message */}
          <button
            type="button"
            onClick={() => openModal('sendMessage', { isBulk: true })}
            className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[#D4D8E2] hover:text-white hover:bg-white/10 text-[12px] font-medium transition-colors"
          >
            <Mail className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Message</span>
          </button>

          {/* Assign Plan Combobox or Button */}
          {activeAction === 'plan' ? (
            <div className="w-44 text-black">
              <Combobox
                options={planOptions}
                value=""
                onChange={(val) => handleBulkAssignPlan(val as string)}
                placeholder="Choose plan..."
                size="sm"
                autoCloseOnSelect
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setActiveAction('plan')}
              className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[#D4D8E2] hover:text-white hover:bg-white/10 text-[12px] font-medium transition-colors"
            >
              <Wifi className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Assign plan</span>
            </button>
          )}

          {/* Export */}
          <button
            type="button"
            onClick={handleExportSelected}
            className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[#D4D8E2] hover:text-white hover:bg-white/10 text-[12px] font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Export</span>
          </button>

          {/* Segmented Activate / Suspend group (icon colors only, hover tint) */}
          <div className="flex items-center bg-white/5 rounded-lg border border-white/10 p-0.5">
            <button
              type="button"
              title="Activate selected"
              onClick={() => bulkSetCustomerStatus(selectedIds, 'Active')}
              className="flex items-center gap-1 h-7 px-2 rounded text-[12px] font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Activate</span>
            </button>
            <button
              type="button"
              title="Suspend selected"
              onClick={() =>
                openModal('statusConfirmation', {
                  customerIds: selectedIds,
                  targetStatus: 'Suspended',
                })
              }
              className="flex items-center gap-1 h-7 px-2 rounded text-[12px] font-medium text-amber-400 hover:bg-amber-500/20 transition-colors"
            >
              <Power className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Suspend</span>
            </button>
          </div>

          {/* Delete Action (red ghost) */}
          <button
            type="button"
            onClick={() =>
              openModal('deleteConfirmation', {
                customerIds: selectedIds,
                isBulk: true,
              })
            }
            className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 text-[12px] font-medium transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Delete</span>
          </button>
        </div>

        {/* Close X (Esc clears) */}
        <button
          type="button"
          onClick={clearSelected}
          title="Clear selection (Esc)"
          className="p-1.5 rounded-lg text-[#8B92A0] hover:text-white hover:bg-white/10 transition-colors shrink-0 ml-1"
        >
          <X className="w-4 h-4" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
};
export default BulkActionBar;
