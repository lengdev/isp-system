import React, { useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  DollarSign,
  Wifi,
  HardDrive,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { StatCard } from '../../components/ui/StatCard';
import { Button } from '../../components/ui/Button';
import { StatusTabs } from './StatusTabs';
import { CustomerTable } from './CustomerTable';
import { BulkActionBar } from './BulkActionBar';

export const CustomersPage: React.FC = () => {
  const customers = useStore((s) => s.customers);
  const showStatistics = useStore((s) => s.showStatistics);
  const openModal = useStore((s) => s.openModal);
  const currency = useStore((s) => s.currency);
  const fetchCustomers = useStore((s) => s.fetchCustomers);
  const isCustomersLoading = useStore((s) => s.isCustomersLoading);

  // Synchronize customers with backend API on mount
  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Live recalculate stats
  const totalCustomers = customers.length;
  const totalMRR = customers.reduce(
    (sum, c) => sum + (c.status !== 'Disconnected' ? c.monthlyPrice : 0),
    0
  );
  const activeCount = customers.filter((c) => c.status === 'Active').length;
  const avgUsage = Math.round(
    customers.reduce((sum, c) => sum + (c.dataUsageGB || 0), 0) / (customers.length || 1)
  );

  return (
    <div className="w-full pb-16 space-y-4 select-none">
      {/* 1. Page Header: Title, 13px muted subtitle, single "+ Add New Customer" (32px, 12px) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-[24px] font-semibold text-[var(--text)] tracking-tight">
            Customers
          </h2>
          <p className="text-[13px] text-[var(--text-muted)] mt-0.5">
            Manage your subscribers, track bandwidth usage, and monitor connection health
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchCustomers()}
            disabled={isCustomersLoading}
            className="h-8 px-3 text-[12px] font-semibold gap-1.5 shrink-0"
            title="Refresh Customers from Server"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isCustomersLoading ? 'animate-spin' : ''}`} />
            <span className="hidden min-[480px]:inline">Refresh</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => openModal('addEditCustomer')}
            className="h-8 px-3 text-[12px] font-semibold gap-1.5 shrink-0"
            title="Add New Customer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden min-[480px]:inline">Add New Customer</span>
          </Button>
        </div>
      </div>

      {/* 2. 4 Stat Cards: collapsible via showStatistics, recomputes live */}
      <AnimatePresence>
        {showStatistics && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
              <StatCard
                label="Total Subscribers"
                value={totalCustomers}
                changeValue="12 subs"
                isPositive={true}
                changeLabel="vs last month"
                icon={<Users className="w-4 h-4" />}
                iconBgColor="bg-[var(--brand-soft)]"
                iconTextColor="text-[var(--brand)]"
              />

              <StatCard
                label="Monthly Revenue (MRR)"
                value={Math.round(totalMRR)}
                prefix={currency}
                changeValue="9.4%"
                isPositive={true}
                changeLabel="vs last month"
                icon={<DollarSign className="w-4 h-4" />}
                iconBgColor="bg-blue-50 dark:bg-blue-950/40"
                iconTextColor="text-blue-600 dark:text-blue-400"
              />

              <StatCard
                label="Active Connections"
                value={activeCount}
                changeValue="95.2%"
                isPositive={true}
                changeLabel="vs last month"
                icon={<Wifi className="w-4 h-4" />}
                iconBgColor="bg-purple-50 dark:bg-purple-950/40"
                iconTextColor="text-purple-600 dark:text-purple-400"
              />

              <StatCard
                label="Avg. Monthly Usage"
                value={avgUsage}
                suffix=" GB"
                changeValue="6.1%"
                isPositive={true}
                changeLabel="vs last month"
                icon={<HardDrive className="w-4 h-4" />}
                iconBgColor="bg-amber-50 dark:bg-amber-950/40"
                iconTextColor="text-amber-600 dark:text-amber-400"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Status Tabs row (pills with counts + Show statistics switch on right) */}
      <StatusTabs />

      {/* 4. DataTable (own toolbar INSIDE with Search, Filter, Sort, View, Columns, Export, More) */}
      <CustomerTable customers={customers} />

      {/* Floating Bulk Action Bar */}
      <BulkActionBar />
    </div>
  );
};
export default CustomersPage;
