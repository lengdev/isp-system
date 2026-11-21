import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Table as TableIcon,
  LayoutGrid,
  AlignJustify,
  Filter,
  X,
  Wifi,
  SlidersHorizontal,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { CustomerStatus, TableViewMode } from '../../types';
import { Combobox, ComboboxOption } from '../../components/ui/Combobox';
import { Popover } from '../../components/ui/Popover';
import { Toggle } from '../../components/ui/Toggle';
import { cn } from '../../lib/utils';

export const FilterToolbar: React.FC = () => {
  const customers = useStore((s) => s.customers);
  const plans = useStore((s) => s.plans);
  const technicians = useStore((s) => s.technicians);
  const filters = useStore((s) => s.filters);
  const setFilters = useStore((s) => s.setFilters);
  const resetFilters = useStore((s) => s.resetFilters);
  const sort = useStore((s) => s.sort);
  const setSort = useStore((s) => s.setSort);
  const viewMode = useStore((s) => s.viewMode);
  const setViewMode = useStore((s) => s.setViewMode);
  const showStatistics = useStore((s) => s.showStatistics);
  const toggleStatistics = useStore((s) => s.toggleStatistics);

  // Compute status counts dynamically
  const statusCounts = {
    All: customers.length,
    Active: customers.filter((c) => c.status === 'Active').length,
    Suspended: customers.filter((c) => c.status === 'Suspended').length,
    Overdue: customers.filter((c) => c.status === 'Overdue').length,
    Pending: customers.filter((c) => c.status === 'Pending').length,
    Disconnected: customers.filter((c) => c.status === 'Disconnected').length,
  };

  const statusPills: { label: string; value: 'All' | CustomerStatus; count: number }[] = [
    { label: 'All Customers', value: 'All', count: statusCounts.All },
    { label: 'Active', value: 'Active', count: statusCounts.Active },
    { label: 'Suspended', value: 'Suspended', count: statusCounts.Suspended },
    { label: 'Overdue', value: 'Overdue', count: statusCounts.Overdue },
    { label: 'Pending', value: 'Pending', count: statusCounts.Pending },
    { label: 'Disconnected', value: 'Disconnected', count: statusCounts.Disconnected },
  ];

  const handlePillClick = (val: 'All' | CustomerStatus) => {
    if (val === 'All') {
      setFilters({ status: [] });
    } else {
      if (filters.status.includes(val)) {
        setFilters({ status: filters.status.filter((s) => s !== val) });
      } else {
        setFilters({ status: [val] });
      }
    }
  };

  // Distinct cities for filter combobox
  const cities = Array.from(new Set(customers.map((c) => c.city))).sort();

  // Combobox Options
  const planOptions: ComboboxOption[] = plans.map((p) => ({
    value: p.name,
    label: p.name,
    description: `${p.speedMbps} Mbps • $${p.monthlyPrice}/mo`,
    group: p.type,
  }));

  const cityOptions: ComboboxOption[] = cities.map((c) => ({
    value: c,
    label: c,
  }));

  const connectionTypeOptions: ComboboxOption[] = [
    { value: 'Fiber', label: 'Fiber Optic' },
    { value: 'Wireless', label: 'Fixed Wireless' },
    { value: 'DSL', label: 'DSL Copper' },
  ];

  const statusOptions: ComboboxOption[] = [
    { value: 'Active', label: 'Active (Connected)' },
    { value: 'Suspended', label: 'Suspended (Blocked)' },
    { value: 'Overdue', label: 'Overdue (Payment Pending)' },
    { value: 'Pending', label: 'Pending (Provisioning)' },
    { value: 'Disconnected', label: 'Disconnected (Cancelled)' },
  ];

  const technicianOptions: ComboboxOption[] = technicians.map((t) => ({
    value: t.name,
    label: t.name,
    description: t.zone,
  }));

  const viewModeOptions: ComboboxOption[] = [
    { value: 'table', label: 'Table View', icon: <TableIcon className="w-3.5 h-3.5" /> },
    { value: 'compact', label: 'Compact', icon: <AlignJustify className="w-3.5 h-3.5" /> },
    { value: 'cards', label: 'Card Grid', icon: <LayoutGrid className="w-3.5 h-3.5" /> },
  ];

  const sortOptions: ComboboxOption[] = [
    { value: 'fullName', label: 'Name (Alphabetical)' },
    { value: 'monthlyPrice', label: 'Monthly Price' },
    { value: 'dataUsageGB', label: 'Bandwidth Usage' },
    { value: 'balanceDue', label: 'Balance Due' },
    { value: 'rating', label: 'Rating' },
    { value: 'installationDate', label: 'Installation Date' },
  ];

  const activeFiltersCount =
    filters.status.length +
    filters.plan.length +
    filters.city.length +
    filters.connectionType.length +
    filters.technician.length +
    (filters.minBalance !== undefined ? 1 : 0) +
    (filters.maxBalance !== undefined ? 1 : 0);

  return (
    <div className="space-y-3 select-none">
      {/* Top Flex Row: Filter Pills (Left) & Controls (Right) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Filter Pills with Counts */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {statusPills.map((pill) => {
            const isSelected =
              pill.value === 'All'
                ? filters.status.length === 0
                : filters.status.length === 1 && filters.status[0] === pill.value;

            return (
              <button
                key={pill.value}
                type="button"
                onClick={() => handlePillClick(pill.value)}
                className={cn(
                  'h-8 flex items-center gap-1.5 px-3 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer',
                  isSelected
                    ? 'border border-[#F26B3A] text-[#F26B3A] bg-[#FFF1EA] dark:bg-orange-950/40 shadow-xs'
                    : 'border border-gray-200/90 dark:border-gray-800 text-gray-600 dark:text-gray-400 bg-white dark:bg-[#1C1C1F] hover:border-gray-300 dark:hover:border-gray-700 hover:text-gray-900 dark:hover:text-gray-200'
                )}
              >
                <span>{pill.label}</span>
                <span
                  className={cn(
                    'text-[11px] font-bold',
                    isSelected ? 'text-[#F26B3A]' : 'text-gray-400 dark:text-gray-500'
                  )}
                >
                  ({pill.count})
                </span>
              </button>
            );
          })}
        </div>

        {/* Right Toolbar Controls (Comboboxes + Filter Popover + Toggle) */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
          {/* Table View Combobox */}
          <div className="w-36">
            <Combobox
              options={viewModeOptions}
              value={viewMode}
              onChange={(val) => setViewMode(val as TableViewMode)}
              searchable={false}
              clearable={false}
              size="sm"
            />
          </div>

          {/* Filter Popover (Multi-Select Comboboxes inside) */}
          <Popover
            align="right"
            trigger={
              <button
                type="button"
                className={cn(
                  'h-8 flex items-center gap-1.5 px-3 rounded-[10px] border text-xs font-medium transition-colors shadow-xs',
                  activeFiltersCount > 0
                    ? 'border-[#F26B3A] text-[#F26B3A] bg-[#FFF1EA] dark:bg-orange-950/40'
                    : 'border-gray-200/90 dark:border-gray-800 bg-white dark:bg-[#1C1C1F] text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
                )}
              >
                <Filter className="w-3.5 h-3.5 text-gray-500" />
                <span>Filter</span>
                {activeFiltersCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-[#F26B3A] text-white text-[10px] flex items-center justify-center font-bold">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
            }
            content={
              <div className="w-80 space-y-3 p-1 select-none">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200">
                    Filter Subscribers
                  </h4>
                  {activeFiltersCount > 0 && (
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="text-xs font-semibold text-[#F26B3A] hover:underline"
                    >
                      Reset All
                    </button>
                  )}
                </div>

                {/* Plan Combobox (Multi) */}
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 block mb-1">
                    Internet Plan (Multi-select)
                  </label>
                  <Combobox
                    options={planOptions}
                    value={filters.plan}
                    onChange={(val) => setFilters({ plan: val })}
                    multiple={true}
                    placeholder="All Plans..."
                    size="sm"
                  />
                </div>

                {/* Connection Type Combobox (Multi) */}
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 block mb-1">
                    Connection Type
                  </label>
                  <Combobox
                    options={connectionTypeOptions}
                    value={filters.connectionType}
                    onChange={(val) => setFilters({ connectionType: val })}
                    multiple={true}
                    placeholder="All Types..."
                    size="sm"
                  />
                </div>

                {/* City Combobox (Multi) */}
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 block mb-1">
                    City / Region
                  </label>
                  <Combobox
                    options={cityOptions}
                    value={filters.city}
                    onChange={(val) => setFilters({ city: val })}
                    multiple={true}
                    placeholder="All Cities..."
                    size="sm"
                  />
                </div>

                {/* Status Combobox (Multi) */}
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 block mb-1">
                    Subscriber Status
                  </label>
                  <Combobox
                    options={statusOptions}
                    value={filters.status}
                    onChange={(val) => setFilters({ status: val })}
                    multiple={true}
                    placeholder="All Statuses..."
                    size="sm"
                  />
                </div>

                {/* Balance Status */}
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 block mb-1">
                    Balance Status
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setFilters({
                          minBalance: filters.minBalance === 1 ? undefined : 1,
                          maxBalance: undefined,
                        })
                      }
                      className={cn(
                        'flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                        filters.minBalance === 1
                          ? 'bg-[#FFF1EA] dark:bg-orange-950/40 border-[#F26B3A] text-[#F26B3A]'
                          : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                      )}
                    >
                      Has Balance Due
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setFilters({
                          maxBalance: filters.maxBalance === 0 ? undefined : 0,
                          minBalance: undefined,
                        })
                      }
                      className={cn(
                        'flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                        filters.maxBalance === 0
                          ? 'bg-[#FFF1EA] dark:bg-orange-950/40 border-[#F26B3A] text-[#F26B3A]'
                          : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                      )}
                    >
                      Zero Balance ($0)
                    </button>
                  </div>
                </div>
              </div>
            }
          />

          {/* Sort Combobox (Single) + Asc/Desc Button */}
          <div className="flex items-center gap-1">
            <div className="w-40">
              <Combobox
                options={sortOptions}
                value={sort.column}
                onChange={(val) => setSort(val as any)}
                searchable={false}
                clearable={false}
                size="sm"
              />
            </div>
            <button
              type="button"
              onClick={() => setSort(sort.column)}
              className="h-8 w-8 flex items-center justify-center rounded-[10px] border border-gray-200/90 dark:border-gray-800 bg-white dark:bg-[#1C1C1F] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-xs"
              title={sort.direction === 'asc' ? 'Ascending (A-Z)' : 'Descending (Z-A)'}
            >
              {sort.direction === 'asc' ? (
                <ArrowUp className="w-3.5 h-3.5 text-[#F26B3A]" />
              ) : (
                <ArrowDown className="w-3.5 h-3.5 text-[#F26B3A]" />
              )}
            </button>
          </div>

          {/* Show Statistics Toggle (Strictly matched 13px medium and aligned vertically) */}
          <div className="flex items-center pl-2 border-l border-gray-200 dark:border-gray-800 h-8">
            <Toggle
              checked={showStatistics}
              onChange={toggleStatistics}
              label="Show Statistics"
              className="text-[13px] font-medium"
            />
          </div>
        </div>
      </div>

      {/* Active Filter Chips Row with Animated Layout */}
      <AnimatePresence>
        {activeFiltersCount > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 flex-wrap pt-1 text-xs overflow-hidden"
          >
            <span className="text-gray-400 text-xs font-medium">Active filters:</span>

            {/* Status chips */}
            {filters.status.map((st) => (
              <span
                key={`st-${st}`}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FFF1EA] dark:bg-orange-950/40 text-[#F26B3A] text-xs font-medium border border-[#F26B3A]/20"
              >
                Status: {st}
                <button
                  type="button"
                  onClick={() =>
                    setFilters({ status: filters.status.filter((s) => s !== st) })
                  }
                  className="hover:text-red-600"
                >
                  <X className="w-3 h-3 stroke-[2.5]" />
                </button>
              </span>
            ))}

            {/* Plan chips */}
            {filters.plan.map((pl) => (
              <span
                key={`pl-${pl}`}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FFF1EA] dark:bg-orange-950/40 text-[#F26B3A] text-xs font-medium border border-[#F26B3A]/20"
              >
                Plan: {pl}
                <button
                  type="button"
                  onClick={() =>
                    setFilters({ plan: filters.plan.filter((p) => p !== pl) })
                  }
                  className="hover:text-red-600"
                >
                  <X className="w-3 h-3 stroke-[2.5]" />
                </button>
              </span>
            ))}

            {/* Connection Type chips */}
            {filters.connectionType.map((ct) => (
              <span
                key={`ct-${ct}`}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FFF1EA] dark:bg-orange-950/40 text-[#F26B3A] text-xs font-medium border border-[#F26B3A]/20"
              >
                Type: {ct}
                <button
                  type="button"
                  onClick={() =>
                    setFilters({
                      connectionType: filters.connectionType.filter((c) => c !== ct),
                    })
                  }
                  className="hover:text-red-600"
                >
                  <X className="w-3 h-3 stroke-[2.5]" />
                </button>
              </span>
            ))}

            {/* City chips */}
            {filters.city.map((ci) => (
              <span
                key={`ci-${ci}`}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FFF1EA] dark:bg-orange-950/40 text-[#F26B3A] text-xs font-medium border border-[#F26B3A]/20"
              >
                City: {ci}
                <button
                  type="button"
                  onClick={() =>
                    setFilters({ city: filters.city.filter((c) => c !== ci) })
                  }
                  className="hover:text-red-600"
                >
                  <X className="w-3 h-3 stroke-[2.5]" />
                </button>
              </span>
            ))}

            {/* Balance chips */}
            {filters.minBalance !== undefined && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FFF1EA] dark:bg-orange-950/40 text-[#F26B3A] text-xs font-medium border border-[#F26B3A]/20">
                Has Balance Due
                <button
                  type="button"
                  onClick={() => setFilters({ minBalance: undefined })}
                  className="hover:text-red-600"
                >
                  <X className="w-3 h-3 stroke-[2.5]" />
                </button>
              </span>
            )}
            {filters.maxBalance !== undefined && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FFF1EA] dark:bg-orange-950/40 text-[#F26B3A] text-xs font-medium border border-[#F26B3A]/20">
                Zero Balance ($0)
                <button
                  type="button"
                  onClick={() => setFilters({ maxBalance: undefined })}
                  className="hover:text-red-600"
                >
                  <X className="w-3 h-3 stroke-[2.5]" />
                </button>
              </span>
            )}

            <button
              type="button"
              onClick={resetFilters}
              className="text-xs font-bold text-gray-500 hover:text-red-600 hover:underline ml-1"
            >
              Clear all
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
