import React, { useMemo, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  Users,
  DollarSign,
  Wifi,
  HardDrive,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { useStore, normalizeApiCustomer } from '../../store/useStore';
import { api } from '../../lib/api';
import { StatCard } from '../../components/ui/StatCard';
import { Button } from '../../components/ui/Button';
import type { TableQuery } from '../../components/ui/DataTable';
import { StatusTabs } from './StatusTabs';
import { CustomerTable } from './CustomerTable';
import { BulkActionBar } from './BulkActionBar';
import { Can } from '../../lib/permissions';

export const CustomersPage: React.FC = () => {
  const showStatistics = useStore((s) => s.showStatistics);
  const openModal = useStore((s) => s.openModal);
  const currency = useStore((s) => s.currency);
  const storeFilters = useStore((s) => s.filters);
  const resetStoreFilters = useStore((s) => s.resetFilters);
  const mergeCustomers = useStore((s) => s.mergeCustomers);

  const [tableQuery, setTableQuery] = useState<TableQuery>({
    page: 1,
    pageSize: 10,
    search: '',
    sort: [],
    filters: {},
  });
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const rawSearch = (tableQuery.search || storeFilters.searchQuery || '').trim();
  useEffect(() => {
    if (!rawSearch) {
      setDebouncedSearch('');
      return;
    }
    const timer = setTimeout(() => {
      setDebouncedSearch(rawSearch);
    }, 120);
    return () => clearTimeout(timer);
  }, [rawSearch]);

  const handleQueryChange = useCallback((nextQuery: TableQuery) => {
    setTableQuery(nextQuery);
  }, []);

  const queryParams = useMemo(() => {
    const colFilters = tableQuery.filters || {};
    const mergedStatuses =
      Array.isArray(colFilters.status) && colFilters.status.length > 0
        ? colFilters.status
        : storeFilters.status;
    const mergedPlans =
      Array.isArray(colFilters.planName) && colFilters.planName.length > 0
        ? colFilters.planName
        : storeFilters.plan;
    const mergedCities = colFilters.city
      ? Array.isArray(colFilters.city)
        ? colFilters.city
        : [colFilters.city]
      : storeFilters.city;

    const primarySort = tableQuery.sort?.[0];
    const balanceRange = colFilters.balanceDue;

    return {
      page: tableQuery.page,
      limit: tableQuery.pageSize,
      search: debouncedSearch || undefined,
      sortBy: primarySort?.id || undefined,
      sortDir: primarySort ? (primarySort.desc ? 'desc' : 'asc') : undefined,
      status: mergedStatuses?.length ? mergedStatuses : undefined,
      plan: mergedPlans?.length ? mergedPlans : undefined,
      city: mergedCities?.length ? mergedCities : undefined,
      connectionType: storeFilters.connectionType?.length ? storeFilters.connectionType : undefined,
      nameFilter: typeof colFilters.fullName === 'string' && colFilters.fullName ? colFilters.fullName : undefined,
      codeFilter: typeof colFilters.code === 'string' && colFilters.code ? colFilters.code : undefined,
      minBalance: balanceRange?.min ?? storeFilters.minBalance ?? undefined,
      maxBalance: balanceRange?.max ?? storeFilters.maxBalance ?? undefined,
    };
  }, [tableQuery, storeFilters, debouncedSearch]);

  const statsQuery = useQuery({
    queryKey: ['customer-stats'],
    queryFn: ({ signal }) => api.customers.getStats(signal),
    staleTime: 30_000,
  });

  const customersQuery = useQuery({
    queryKey: ['customers', queryParams],
    queryFn: async ({ signal }) => {
      const res = await api.customers.listPaged(queryParams, signal);
      return {
        ...res,
        items: (res.items || []).map(normalizeApiCustomer),
      };
    },
    placeholderData: keepPreviousData,
  });

  const pageCustomers = useMemo(
    () => customersQuery.data?.items ?? [],
    [customersQuery.data?.items]
  );

  // Sync current page rows into store cache so modals/drawer actions always resolve row records
  useEffect(() => {
    if (pageCustomers.length > 0) {
      mergeCustomers(pageCustomers);
    }
  }, [pageCustomers, mergeCustomers]);

  const totalCustomers = statsQuery.data?.totalCustomers ?? customersQuery.data?.total ?? 0;
  const totalMRR = statsQuery.data?.totalMRR ?? 0;
  const activeCount = statsQuery.data?.activeCount ?? 0;
  const avgUsage = statsQuery.data?.avgUsage ?? 0;

  const isAnyFilterActive = Boolean(
    rawSearch ||
      storeFilters.status.length > 0 ||
      storeFilters.plan.length > 0 ||
      storeFilters.city.length > 0 ||
      storeFilters.connectionType.length > 0 ||
      Object.keys(tableQuery.filters || {}).length > 0
  );

  const handleRefresh = useCallback(() => {
    customersQuery.refetch();
    statsQuery.refetch();
  }, [customersQuery, statsQuery]);

  const handleClearAllFilters = useCallback(() => {
    resetStoreFilters();
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      params.delete('status');
      const nextUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
      window.history.replaceState(null, '', nextUrl);
    }
  }, [resetStoreFilters]);

  const isQuerySkeleton =
    customersQuery.isLoading || (customersQuery.isFetching && customersQuery.isPlaceholderData);

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
            onClick={handleRefresh}
            disabled={customersQuery.isFetching}
            className="h-8 px-3 text-[12px] font-semibold gap-1.5 shrink-0"
            title="Refresh Customers from Server"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${customersQuery.isFetching ? 'animate-spin' : ''}`} />
            <span className="hidden min-[480px]:inline">Refresh</span>
          </Button>

          <Can feature="customers.btn.create">
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
          </Can>
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
      <StatusTabs
        statusCounts={statsQuery.data?.statusCounts}
      />

      {/* 4. Server-Paginated DataTable */}
      <CustomerTable
        customers={pageCustomers}
        total={customersQuery.data?.total}
        loading={isQuerySkeleton}
        fetching={customersQuery.isFetching}
        loadingMode={isQuerySkeleton ? 'skeleton' : undefined}
        error={customersQuery.error ? 'Unable to load customer directory.' : null}
        onRetry={handleRefresh}
        onRefresh={handleRefresh}
        onQueryChange={handleQueryChange}
        availableCities={statsQuery.data?.cities}
        availablePlans={statsQuery.data?.plans}
        isFilterActive={isAnyFilterActive}
        externalFilterKey={JSON.stringify(storeFilters.status)}
        onClearFilters={handleClearAllFilters}
      />

      {/* Floating Bulk Action Bar */}
      <BulkActionBar />
    </div>
  );
};
export default CustomersPage;
