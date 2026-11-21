import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Power, CheckCircle, Mail, Download, Trash2, X } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { downloadCSV } from '../../lib/utils';

export const BulkActionBar: React.FC = () => {
  const selectedIds = useStore((s) => s.selectedCustomerIds);
  const clearSelected = useStore((s) => s.clearSelectedCustomers);
  const customers = useStore((s) => s.customers);
  const openModal = useStore((s) => s.openModal);
  const bulkSetCustomerStatus = useStore((s) => s.bulkSetCustomerStatus);
  const addToast = useStore((s) => s.addToast);

  if (selectedIds.length === 0) return null;

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
        className="fixed bottom-6 inset-x-0 mx-auto z-40 max-w-xl w-[92%] sm:w-auto px-4 py-3 rounded-2xl bg-gray-900/95 dark:bg-[#1E1E22]/95 backdrop-blur-md text-white shadow-2xl border border-gray-700/60 flex items-center justify-between gap-3 sm:gap-6 select-none"
      >
        <div className="flex items-center gap-2.5">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#F26B3A] text-white text-xs font-bold">
            {selectedIds.length}
          </span>
          <span className="text-xs sm:text-sm font-semibold text-gray-200">
            Selected
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Activate */}
          <button
            onClick={() => bulkSetCustomerStatus(selectedIds, 'Active')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold transition-colors"
            title="Activate all selected"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Activate</span>
          </button>

          {/* Suspend */}
          <button
            onClick={() =>
              openModal('statusConfirmation', {
                customerIds: selectedIds,
                targetStatus: 'Suspended',
              })
            }
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold transition-colors"
            title="Suspend all selected"
          >
            <Power className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Suspend</span>
          </button>

          {/* Send Reminder / Message */}
          <button
            onClick={() => openModal('sendMessage', { isBulk: true })}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-xs font-semibold transition-colors"
            title="Send Message to selected"
          >
            <Mail className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Message</span>
          </button>

          {/* Export Selected */}
          <button
            onClick={handleExportSelected}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold transition-colors"
            title="Export CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>

          {/* Delete Selected */}
          <button
            onClick={() =>
              openModal('deleteConfirmation', {
                customerIds: selectedIds,
                isBulk: true,
              })
            }
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-semibold transition-colors"
            title="Delete selected"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Delete</span>
          </button>
        </div>

        <button
          onClick={clearSelected}
          className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
};
