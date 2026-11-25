import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail,
  Wifi,
  Download,
  Trash2,
  X,
  Power,
  CheckCircle,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Combobox } from '../../components/ui/Combobox';
import { downloadCSV, cn } from '../../lib/utils';
import { SPRING_SOFT } from '../../lib/motion';

export const BulkActionBar: React.FC = () => {
  const selectedIds = useStore((s) => s.selectedCustomerIds);
  const clearSelected = useStore((s) => s.clearSelectedCustomers);
  const selectAll = useStore((s) => s.setSelectedCustomerIds);
  const customers = useStore((s) => s.customers);
  const totalCount = customers.length;
  const plans = useStore((s) => s.plans);
  const updateCustomer = useStore((s) => s.updateCustomer);
  const bulkSetCustomerStatus = useStore((s) => s.bulkSetCustomerStatus);
  const openModal = useStore((s) => s.openModal);
  const addToast = useStore((s) => s.addToast);
  const sidebarCollapsed = useStore((s) => s.sidebarCollapsed);

  const [activeAction, setActiveAction] = useState<'plan' | null>(null);

  // Keyboard shortcut: Esc to clear selection
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

  const isAllSelected = selectedIds.length === totalCount;

  const planOptions = plans.map((p) => ({
    value: p.id,
    label: p.name,
    description: `${p.speedMbps} Mbps • $${p.monthlyPrice}/mo`,
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

    addToast({
      type: 'success',
      title: 'Plans Assigned',
      message: `Updated plan to ${chosenPlan.name} for ${selectedIds.length} subscribers.`,
    });
    setActiveAction(null);
  };

  const handleExportSelected = () => {
    const selectedCustomers = customers.filter((c) => selectedIds.includes(c.id));
    const headers = [
      'ID',
      'Account Code',
      'Full Name',
      'Email',
      'Phone',
      'Address',
      'City',
      'Plan',
      'Monthly Price',
      'Status',
      'IP Address',
      'MAC Address',
      'Data Usage (GB)',
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
    downloadCSV(`nsmisp-selected-${Date.now()}.csv`, headers, rows);
    addToast({
      type: 'success',
      title: 'CSV Exported',
      message: `Exported ${selectedIds.length} subscriber records.`,
    });
  };

  return (
    <AnimatePresence>
      <div
        className={cn(
          'fixed bottom-6 z-40 flex justify-center pointer-events-none transition-[left] duration-200',
          sidebarCollapsed ? 'left-0 md:left-16 right-0' : 'left-0 md:left-[232px] right-0'
        )}
      >
        <motion.div
          role="toolbar"
          aria-label="Bulk actions toolbar"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={SPRING_SOFT}
          className="pointer-events-auto max-w-[calc(100vw-32px)] w-max h-14 pl-4 pr-3.5 rounded-2xl bg-[#1A1C20] text-[#E7E9EE] shadow-2xl border border-white/10 flex items-center justify-between gap-2.5 sm:gap-4 select-none flex-nowrap"
        >
        {/* Left Count + Select All / Clear */}
        <div className="flex items-center gap-2 shrink-0" aria-live="polite">
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
              className="text-[12px] font-medium text-[var(--brand)] hover:underline ml-1 cursor-pointer"
            >
              Select all {totalCount}
            </button>
          ) : (
            <button
              type="button"
              onClick={clearSelected}
              className="text-[12px] font-medium text-[#8B92A0] hover:text-white hover:underline ml-1 cursor-pointer"
            >
              All {totalCount} selected — Clear
            </button>
          )}
        </div>

        {/* Center Actions */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Message */}
          <button
            type="button"
            onClick={() => openModal('sendMessage', { isBulk: true })}
            title="Send bulk message"
            className="flex items-center gap-1.5 h-8 px-2 sm:px-2.5 rounded-lg text-[#D4D8E2] hover:text-white hover:bg-white/10 text-[12px] font-medium transition-colors cursor-pointer"
          >
            <Mail className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden md:inline">Message</span>
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
              title="Assign plan to selected"
              className="flex items-center gap-1.5 h-8 px-2 sm:px-2.5 rounded-lg text-[#D4D8E2] hover:text-white hover:bg-white/10 text-[12px] font-medium transition-colors cursor-pointer"
            >
              <Wifi className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline">Assign plan</span>
            </button>
          )}

          {/* Export */}
          <button
            type="button"
            onClick={handleExportSelected}
            title="Export selected as CSV"
            className="flex items-center gap-1.5 h-8 px-2 sm:px-2.5 rounded-lg text-[#D4D8E2] hover:text-white hover:bg-white/10 text-[12px] font-medium transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">Export</span>
          </button>

          {/* Segmented Activate / Suspend group */}
          <div className="flex items-center bg-white/5 rounded-lg border border-white/10 p-0.5">
            <button
              type="button"
              title="Activate selected"
              onClick={() => bulkSetCustomerStatus(selectedIds, 'Active')}
              className="flex items-center gap-1 h-7 px-2 rounded text-[12px] font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors cursor-pointer"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Activate</span>
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
              className="flex items-center gap-1 h-7 px-2 rounded text-[12px] font-medium text-amber-400 hover:bg-amber-500/20 transition-colors cursor-pointer"
            >
              <Power className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Suspend</span>
            </button>
          </div>
        </div>

        {/* Right End: Delete + Divider + Close X */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Delete Action (red ghost) */}
          <button
            type="button"
            onClick={() =>
              openModal('deleteConfirmation', {
                customerIds: selectedIds,
                isBulk: true,
              })
            }
            title="Delete selected subscribers"
            className="flex items-center gap-1.5 h-8 px-2 sm:px-2.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 text-[12px] font-medium transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Delete</span>
          </button>

          <div className="h-5 w-px bg-white/15 shrink-0 mx-0.5 sm:mx-1" />

          {/* Close X (Esc clears) */}
          <button
            type="button"
            onClick={clearSelected}
            title="Clear selection (Esc)"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-[#8B92A0] hover:text-white hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </div>
  </AnimatePresence>
  );
};
export default BulkActionBar;
