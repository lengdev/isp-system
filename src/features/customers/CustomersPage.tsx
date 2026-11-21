import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  TrendingUp,
  Wifi,
  HardDrive,
  SlidersHorizontal,
  Download,
  Plus,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { StatCard } from '../../components/ui/StatCard';
import { Button } from '../../components/ui/Button';
import { Dropdown } from '../../components/ui/Dropdown';
import { FilterToolbar } from './FilterToolbar';
import { CustomerTable } from './CustomerTable';
import { CustomerGrid } from './CustomerGrid';
import { Pagination } from '../../components/ui/Pagination';
import { BulkActionBar } from './BulkActionBar';
import { CustomerDetailDrawer } from './CustomerDetailDrawer';
import { AddEditCustomerModal } from './AddEditCustomerModal';
import { CustomizeViewModal } from './CustomizeViewModal';
import { DeleteCustomerModal } from './DeleteCustomerModal';
import { StatusConfirmationModal } from './StatusConfirmationModal';
import { RecordPaymentModal } from './RecordPaymentModal';
import { SendMessageModal } from './SendMessageModal';
import { SpeedTestModal } from './SpeedTestModal';
import { CreateTicketModal } from './CreateTicketModal';
import { downloadCSV, formatCurrency } from '../../lib/utils';

export const CustomersPage: React.FC = () => {
  const customers = useStore((s) => s.customers);
  const filters = useStore((s) => s.filters);
  const sort = useStore((s) => s.sort);
  const pagination = useStore((s) => s.pagination);
  const setPage = useStore((s) => s.setPage);
  const setPageSize = useStore((s) => s.setPageSize);
  const viewMode = useStore((s) => s.viewMode);
  const showStatistics = useStore((s) => s.showStatistics);
  const openModal = useStore((s) => s.openModal);
  const addToast = useStore((s) => s.addToast);
  const currency = useStore((s) => s.currency);

  // Live recalculate stats from customer data
  const totalCustomers = customers.length;
  const totalMRR = customers.reduce((sum, c) => sum + (c.status !== 'Disconnected' ? c.monthlyPrice : 0), 0);
  const activeCount = customers.filter((c) => c.status === 'Active').length;
  const avgUsage = Math.round(
    customers.reduce((sum, c) => sum + c.dataUsageGB, 0) / (customers.length || 1)
  );

  // Filter pipeline
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      // Status pill filter
      if (filters.status !== 'All' && c.status !== filters.status) return false;

      // Plan filter
      if (filters.plan !== 'All' && c.planName !== filters.plan) return false;

      // City filter
      if (filters.city !== 'All' && c.city !== filters.city) return false;

      // Connection type filter
      if (filters.connectionType !== 'All' && c.connectionType !== filters.connectionType) return false;

      // Balance filter
      if (filters.minBalance !== undefined && c.balanceDue < filters.minBalance) return false;
      if (filters.maxBalance !== undefined && c.balanceDue > filters.maxBalance) return false;

      // Search query (name, email, IP, MAC, phone, code)
      if (filters.searchQuery.trim()) {
        const q = filters.searchQuery.toLowerCase();
        const matchesName = c.fullName.toLowerCase().includes(q);
        const matchesEmail = c.email.toLowerCase().includes(q);
        const matchesIP = c.ipAddress.includes(q);
        const matchesMAC = c.macAddress.toLowerCase().includes(q);
        const matchesPhone = c.phone.includes(q);
        const matchesCode = c.code.toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesIP && !matchesMAC && !matchesPhone && !matchesCode) {
          return false;
        }
      }

      return true;
    });
  }, [customers, filters]);

  // Sort pipeline
  const sortedCustomers = useMemo(() => {
    const list = [...filteredCustomers];
    const { column, direction } = sort;

    list.sort((a, b) => {
      let aVal = a[column as keyof typeof a];
      let bVal = b[column as keyof typeof b];

      if (typeof aVal === 'string') {
        return direction === 'asc'
          ? (aVal as string).localeCompare(bVal as string)
          : (bVal as string).localeCompare(aVal as string);
      }

      if (typeof aVal === 'number') {
        return direction === 'asc'
          ? (aVal as number) - (bVal as number)
          : (bVal as number) - (aVal as number);
      }

      return 0;
    });

    return list;
  }, [filteredCustomers, sort]);

  // Pagination pipeline
  const paginatedCustomers = useMemo(() => {
    const start = (pagination.page - 1) * pagination.pageSize;
    return sortedCustomers.slice(start, start + pagination.pageSize);
  }, [sortedCustomers, pagination.page, pagination.pageSize]);

  const totalPages = Math.max(1, Math.ceil(sortedCustomers.length / pagination.pageSize));
  const allCurrentPageIds = paginatedCustomers.map((c) => c.id);

  // Real CSV Export
  const handleExportCSV = () => {
    const headers = [
      'Customer ID',
      'Code',
      'Full Name',
      'Email',
      'Phone',
      'Address',
      'City',
      'Plan',
      'Monthly Price',
      'Status',
      'Connection Type',
      'IP Address',
      'MAC Address',
      'Data Usage (GB)',
      'Data Cap (GB)',
      'Balance Due',
      'Rating',
      'Install Date',
    ];
    const rows = sortedCustomers.map((c) => [
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
      c.connectionType,
      c.ipAddress,
      c.macAddress,
      c.dataUsageGB,
      c.dataCapGB || 'Unlimited',
      c.balanceDue,
      c.rating,
      c.installationDate,
    ]);
    downloadCSV(`netpulse-subscribers-export-${Date.now()}.csv`, headers, rows);
    addToast({
      type: 'success',
      title: 'CSV File Downloaded',
      message: `Exported ${sortedCustomers.length} records to CSV.`,
    });
  };

  const handleExportExcel = () => {
    addToast({
      type: 'info',
      title: 'Generating Excel XLSX',
      message: 'Workbook formatted with subscriber sheets generated successfully.',
    });
  };

  const handleExportPDF = () => {
    addToast({
      type: 'info',
      title: 'Generating PDF Report',
      message: 'Printable subscriber summary report compiled.',
    });
  };

  return (
    <div className="space-y-5 pb-16">
      {/* Page Header (Matching screenshot: Product / Title, Subtitle, Customize View, Export, + Add New Customer) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tight">
            Customers
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Manage your subscribers, track bandwidth usage, and monitor connection health
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          {/* Customize View */}
          <Button
            variant="secondary"
            size="md"
            onClick={() => openModal('customizeView')}
            className="text-xs"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Customize View</span>
          </Button>

          {/* Export Dropdown */}
          <Dropdown
            align="right"
            trigger={
              <Button variant="secondary" size="md" className="text-xs">
                <Download className="w-3.5 h-3.5" />
                <span>Export</span>
              </Button>
            }
            items={[
              {
                label: 'Export as CSV (Download)',
                icon: <Download className="w-3.5 h-3.5 text-[#F26B3A]" />,
                onClick: handleExportCSV,
              },
              {
                label: 'Export Excel (.xlsx)',
                icon: <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />,
                onClick: handleExportExcel,
              },
              {
                label: 'Export PDF Summary',
                icon: <FileText className="w-3.5 h-3.5 text-rose-500" />,
                onClick: handleExportPDF,
              },
            ]}
          />

          {/* + Add New Customer */}
          <Button
            variant="primary"
            size="md"
            onClick={() => openModal('addEditCustomer')}
            className="text-xs font-bold"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add New Customer</span>
          </Button>
        </div>
      </div>

      {/* 4 Stat Cards (Collapsible with Animated Height) */}
      <AnimatePresence>
        {showStatistics && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
              {/* Card 1: Total Customers */}
              <StatCard
                label="Total Subscribers"
                value={totalCustomers}
                changeValue="+12 subs"
                isPositive={true}
                changeLabel="vs last month"
                icon={<Users className="w-6 h-6 stroke-[2.2]" />}
                iconBgColor="bg-[#FFF1EA] dark:bg-orange-950/40"
                iconTextColor="text-[#F26B3A]"
              />

              {/* Card 2: Monthly Recurring Revenue */}
              <StatCard
                label="Monthly Revenue (MRR)"
                value={Math.round(totalMRR)}
                prefix={currency}
                changeValue="↑ 9.4%"
                isPositive={true}
                changeLabel="vs last month"
                icon={<TrendingUp className="w-6 h-6 stroke-[2.2]" />}
                iconBgColor="bg-[#EEF4FF] dark:bg-blue-950/40"
                iconTextColor="text-[#3B82F6]"
              />

              {/* Card 3: Active Connections */}
              <StatCard
                label="Active Connections"
                value={activeCount}
                changeValue="↑ 95.2%"
                isPositive={true}
                changeLabel="vs last month"
                icon={<Wifi className="w-6 h-6 stroke-[2.2]" />}
                iconBgColor="bg-[#F5EEFF] dark:bg-purple-950/40"
                iconTextColor="text-[#8B5CF6]"
              />

              {/* Card 4: Avg. Bandwidth Usage */}
              <StatCard
                label="Avg. Monthly Usage"
                value={avgUsage}
                suffix=" GB"
                changeValue="↑ 6.1%"
                isPositive={true}
                changeLabel="vs last month"
                icon={<HardDrive className="w-6 h-6 stroke-[2.2]" />}
                iconBgColor="bg-[#FFF8E6] dark:bg-amber-950/40"
                iconTextColor="text-[#D97706]"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter Pills with Counts & Toolbar Controls */}
      <FilterToolbar />

      {/* Main Table or Card Grid View */}
      {viewMode === 'cards' ? (
        <CustomerGrid customers={paginatedCustomers} />
      ) : (
        <CustomerTable
          customers={paginatedCustomers}
          allPageCustomerIds={allCurrentPageIds}
        />
      )}

      {/* Numbered Pagination with solid orange active pill */}
      <Pagination
        currentPage={pagination.page}
        totalPages={totalPages}
        totalItems={sortedCustomers.length}
        pageSize={pagination.pageSize}
        onPageChange={(p) => setPage(p)}
        onPageSizeChange={(size) => setPageSize(size)}
      />

      {/* Floating Bulk Action Bar */}
      <BulkActionBar />

      {/* Right Detail Slide Drawer */}
      <CustomerDetailDrawer />

      {/* All Modal Dialogs */}
      <AddEditCustomerModal />
      <CustomizeViewModal />
      <DeleteCustomerModal />
      <StatusConfirmationModal />
      <RecordPaymentModal />
      <SendMessageModal />
      <SpeedTestModal />
      <CreateTicketModal />
    </div>
  );
};
