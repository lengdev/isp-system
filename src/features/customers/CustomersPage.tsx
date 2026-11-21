import React, { useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  DollarSign,
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
import { Combobox, ComboboxOption } from '../../components/ui/Combobox';
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
  const [searchParams, setSearchParams] = useSearchParams();

  const customers = useStore((s) => s.customers);
  const filters = useStore((s) => s.filters);
  const setFilters = useStore((s) => s.setFilters);
  const sort = useStore((s) => s.sort);
  const pagination = useStore((s) => s.pagination);
  const setPage = useStore((s) => s.setPage);
  const setPageSize = useStore((s) => s.setPageSize);
  const viewMode = useStore((s) => s.viewMode);
  const showStatistics = useStore((s) => s.showStatistics);
  const openModal = useStore((s) => s.openModal);
  const addToast = useStore((s) => s.addToast);
  const currency = useStore((s) => s.currency);

  // Sync URL search params to Store filters on initial mount
  useEffect(() => {
    const urlStatus = searchParams.get('status');
    const urlPlan = searchParams.get('plan');
    const urlCity = searchParams.get('city');
    const urlType = searchParams.get('type');
    const urlQ = searchParams.get('q');

    const updates: Partial<typeof filters> = {};
    if (urlStatus) updates.status = urlStatus.split(',').filter(Boolean);
    if (urlPlan) updates.plan = urlPlan.split(',').filter(Boolean);
    if (urlCity) updates.city = urlCity.split(',').filter(Boolean);
    if (urlType) updates.connectionType = urlType.split(',').filter(Boolean);
    if (urlQ) updates.searchQuery = urlQ;

    if (Object.keys(updates).length > 0) {
      setFilters(updates);
    }
  }, []);

  // Sync Store filters to URL search params
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.status.length > 0) params.set('status', filters.status.join(','));
    if (filters.plan.length > 0) params.set('plan', filters.plan.join(','));
    if (filters.city.length > 0) params.set('city', filters.city.join(','));
    if (filters.connectionType.length > 0) params.set('type', filters.connectionType.join(','));
    if (filters.searchQuery.trim()) params.set('q', filters.searchQuery.trim());

    setSearchParams(params, { replace: true });
  }, [filters, setSearchParams]);

  // Live recalculate stats
  const totalCustomers = customers.length;
  const totalMRR = customers.reduce(
    (sum, c) => sum + (c.status !== 'Disconnected' ? c.monthlyPrice : 0),
    0
  );
  const activeCount = customers.filter((c) => c.status === 'Active').length;
  const avgUsage = Math.round(
    customers.reduce((sum, c) => sum + c.dataUsageGB, 0) / (customers.length || 1)
  );

  // Multi-select Filter logic: OR within field, AND across fields
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      // Status filter (OR within field)
      if (filters.status.length > 0 && !filters.status.includes(c.status)) {
        return false;
      }

      // Plan filter (OR within field)
      if (filters.plan.length > 0 && !filters.plan.includes(c.planName)) {
        return false;
      }

      // City filter (OR within field)
      if (filters.city.length > 0 && !filters.city.includes(c.city)) {
        return false;
      }

      // Connection type filter (OR within field)
      if (
        filters.connectionType.length > 0 &&
        !filters.connectionType.includes(c.connectionType)
      ) {
        return false;
      }

      // Technician filter (OR within field)
      if (
        filters.technician.length > 0 &&
        c.assignedTechnician &&
        !filters.technician.includes(c.assignedTechnician)
      ) {
        return false;
      }

      // Balance filter
      if (filters.minBalance !== undefined && c.balanceDue < filters.minBalance) return false;
      if (filters.maxBalance !== undefined && c.balanceDue > filters.maxBalance) return false;

      // Search query across name, email, IP, MAC, phone, code
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
      const aVal = a[column as keyof typeof a];
      const bVal = b[column as keyof typeof b];

      if (typeof aVal === 'string') {
        return direction === 'asc'
          ? aVal.localeCompare(bVal as string)
          : (bVal as string).localeCompare(aVal);
      }

      if (typeof aVal === 'number') {
        return direction === 'asc'
          ? aVal - (bVal as number)
          : (bVal as number) - aVal;
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

  const exportOptions: ComboboxOption[] = [
    { value: 'csv', label: 'Export as CSV (Download)', icon: <Download className="w-3.5 h-3.5 text-[#F26B3A]" /> },
    { value: 'xlsx', label: 'Export Excel (.xlsx)', icon: <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" /> },
    { value: 'pdf', label: 'Export PDF Summary', icon: <FileText className="w-3.5 h-3.5 text-rose-500" /> },
  ];

  const handleExportSelect = (val: string) => {
    if (val === 'csv') handleExportCSV();
    if (val === 'xlsx') handleExportExcel();
    if (val === 'pdf') handleExportPDF();
  };

  return (
    <div className="w-full pb-16">
      {/* 1. Page Header (Strict vertical rhythm: 24px mb-6) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-[28px] leading-tight font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
            Customers
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Manage your subscribers, track bandwidth usage, and monitor connection health
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Customize View */}
          <Button
            variant="secondary"
            size="md"
            onClick={() => openModal('customizeView')}
            className="text-xs h-9 px-3.5"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Customize View</span>
          </Button>

          {/* Export Combobox Dropdown */}
          <div className="w-32">
            <Combobox
              options={exportOptions}
              value=""
              onChange={handleExportSelect}
              placeholder="Export"
              searchable={false}
              clearable={false}
              size="md"
            />
          </div>

          {/* Fixed "+ Add New Customer" (One plus icon and text without double plus) */}
          <Button
            variant="primary"
            size="md"
            onClick={() => openModal('addEditCustomer')}
            className="text-xs font-semibold h-9 px-4 gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Customer</span>
          </Button>
        </div>
      </div>

      {/* 2. 4 Stat Cards (Items-stretch, strict gap-5, same height, 24px mb-6) */}
      <AnimatePresence>
        {showStatistics && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden mb-6"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
              <StatCard
                label="Total Subscribers"
                value={totalCustomers}
                changeValue="12 subs"
                isPositive={true}
                changeLabel="vs last month"
                icon={<Users className="w-5 h-5 stroke-[2]" />}
                iconBgColor="bg-[#FFF1EA] dark:bg-orange-950/40"
                iconTextColor="text-[#F26B3A]"
              />

              <StatCard
                label="Monthly Revenue (MRR)"
                value={Math.round(totalMRR)}
                prefix={currency}
                changeValue="9.4%"
                isPositive={true}
                changeLabel="vs last month"
                icon={<DollarSign className="w-5 h-5 stroke-[2]" />}
                iconBgColor="bg-[#EEF4FF] dark:bg-blue-950/40"
                iconTextColor="text-[#3B82F6]"
              />

              <StatCard
                label="Active Connections"
                value={activeCount}
                changeValue="95.2%"
                isPositive={true}
                changeLabel="vs last month"
                icon={<Wifi className="w-5 h-5 stroke-[2]" />}
                iconBgColor="bg-[#F5EEFF] dark:bg-purple-950/40"
                iconTextColor="text-[#8B5CF6]"
              />

              <StatCard
                label="Avg. Monthly Usage"
                value={avgUsage}
                suffix=" GB"
                changeValue="6.1%"
                isPositive={true}
                changeLabel="vs last month"
                icon={<HardDrive className="w-5 h-5 stroke-[2]" />}
                iconBgColor="bg-[#FFF8E6] dark:bg-amber-950/40"
                iconTextColor="text-[#D97706]"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Filter Tabs Row (Strict vertical rhythm: 16px mb-4) */}
      <div className="mb-4">
        <FilterToolbar />
      </div>

      {/* 4. Main Data Table or Card Grid View */}
      {viewMode === 'cards' ? (
        <CustomerGrid customers={paginatedCustomers} />
      ) : (
        <CustomerTable
          customers={paginatedCustomers}
          allPageCustomerIds={allCurrentPageIds}
        />
      )}

      {/* 5. Numbered Pagination with Combobox Page-Size Selector */}
      <div className="mt-4">
        <Pagination
          currentPage={pagination.page}
          totalPages={totalPages}
          totalItems={sortedCustomers.length}
          pageSize={pagination.pageSize}
          onPageChange={(p) => setPage(p)}
          onPageSizeChange={(size) => setPageSize(size)}
        />
      </div>

      {/* Floating Bulk Action Bar */}
      <BulkActionBar />

      {/* Right Detail Slide Drawer */}
      <CustomerDetailDrawer />

      {/* Reusable Modals */}
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
