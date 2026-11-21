import React from 'react';
import { motion } from 'framer-motion';
import {
  SlidersHorizontal,
  ArrowUpDown,
  Table as TableIcon,
  LayoutGrid,
  AlignJustify,
  Check,
  X,
  Filter,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { CustomerStatus, TableViewMode } from '../../types';
import { Dropdown } from '../../components/ui/Dropdown';
import { Popover } from '../../components/ui/Popover';
import { Toggle } from '../../components/ui/Toggle';
import { cn } from '../../lib/utils';

export const FilterToolbar: React.FC = () => {
  const customers = useStore((s) => s.customers);
  const plans = useStore((s) => s.plans);
  const filters = useStore((s) => s.filters);
  const setFilters = useStore((s) => s.setFilters);
  const resetFilters = useStore((s) => s.resetFilters);
  const sort = useStore((s) => s.sort);
  const setSort = useStore((s) => s.setSort);
  const viewMode = useStore((s) => s.viewMode);
  const setViewMode = useStore((s) => s.setViewMode);
  const showStatistics = useStore((s) => s.showStatistics);
  const toggleStatistics = useStore((s) => s.toggleStatistics);

  // Compute status counts dynamically from all customers
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

  // Distinct cities for filter dropdown
  const cities = Array.from(new Set(customers.map((c) => c.city))).sort();

  const activeFiltersCount =
    (filters.status !== 'All' ? 1 : 0) +
    (filters.plan !== 'All' ? 1 : 0) +
    (filters.city !== 'All' ? 1 : 0) +
    (filters.connectionType !== 'All' ? 1 : 0) +
    (filters.minBalance !== undefined ? 1 : 0) +
    (filters.maxBalance !== undefined ? 1 : 0) +
    (filters.dateRange !== 'all' ? 1 : 0);

  return (
    <div className="space-y-3 select-none">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2">
        {/* Filter Pills with Counts (Left side matching screenshot) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {statusPills.map((pill) => {
            const isSelected = filters.status === pill.value;
            return (
              <button
                key={pill.value}
                onClick={() => setFilters({ status: pill.value })}
                className={cn(
                  'relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer',
                  isSelected
                    ? 'border border-[#F26B3A] text-[#F26B3A] bg-[#FFF1EA] dark:bg-[#F26B3A]/20 shadow-2xs'
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

        {/* Right Toolbar Controls (matching screenshot: Table View, Filter, Sort, Show Statistics) */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
          {/* Table View Dropdown */}
          <Dropdown
            align="right"
            trigger={
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200/90 dark:border-gray-800 bg-white dark:bg-[#1C1C1F] text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-2xs">
                {viewMode === 'table' && <TableIcon className="w-3.5 h-3.5 text-gray-500" />}
                {viewMode === 'compact' && <AlignJustify className="w-3.5 h-3.5 text-gray-500" />}
                {viewMode === 'cards' && <LayoutGrid className="w-3.5 h-3.5 text-gray-500" />}
                <span className="capitalize">
                  {viewMode === 'table' ? 'Table View' : viewMode === 'compact' ? 'Compact' : 'Card Grid'}
                </span>
              </button>
            }
            items={[
              {
                label: 'Table View (Default)',
                icon: <TableIcon className="w-3.5 h-3.5" />,
                onClick: () => setViewMode('table'),
              },
              {
                label: 'Compact View',
                icon: <AlignJustify className="w-3.5 h-3.5" />,
                onClick: () => setViewMode('compact'),
              },
              {
                label: 'Card Grid View',
                icon: <LayoutGrid className="w-3.5 h-3.5" />,
                onClick: () => setViewMode('cards'),
              },
            ]}
          />

          {/* Filter Popover */}
          <Popover
            align="right"
            trigger={
              <button
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors shadow-2xs',
                  activeFiltersCount > 0
                    ? 'border-[#F26B3A] text-[#F26B3A] bg-[#FFF1EA] dark:bg-[#F26B3A]/20'
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
              <div className="w-72 sm:w-80 space-y-3.5 p-1 select-none">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200">
                    Filter Subscribers
                  </h4>
                  {activeFiltersCount > 0 && (
                    <button
                      onClick={resetFilters}
                      className="text-xs font-semibold text-[#F26B3A] hover:underline"
                    >
                      Reset All
                    </button>
                  )}
                </div>

                {/* Plan filter */}
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 block mb-1">
                    Internet Plan
                  </label>
                  <select
                    value={filters.plan}
                    onChange={(e) => setFilters({ plan: e.target.value })}
                    className="w-full text-xs p-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#18181B] text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-[#F26B3A]"
                  >
                    <option value="All">All Plans</option>
                    {plans.map((p) => (
                      <option key={p.id} value={p.name}>
                        {p.name} (${p.monthlyPrice}/mo)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Connection Type */}
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 block mb-1">
                    Connection Type
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {['All', 'Fiber', 'Wireless', 'DSL'].map((type) => (
                      <button
                        key={type}
                        onClick={() => setFilters({ connectionType: type as any })}
                        className={cn(
                          'py-1 rounded-lg text-xs font-medium border text-center transition-colors',
                          filters.connectionType === type
                            ? 'bg-[#FFF1EA] dark:bg-orange-950/40 border-[#F26B3A] text-[#F26B3A]'
                            : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                        )}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* City filter */}
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 block mb-1">
                    City / Region
                  </label>
                  <select
                    value={filters.city}
                    onChange={(e) => setFilters({ city: e.target.value })}
                    className="w-full text-xs p-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#18181B] text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-[#F26B3A]"
                  >
                    <option value="All">All Cities</option>
                    {cities.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Balance filter */}
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 block mb-1">
                    Balance Status
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setFilters({ minBalance: 1 })}
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
                      onClick={() => setFilters({ minBalance: undefined, maxBalance: 0 })}
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

          {/* Sort Dropdown */}
          <Dropdown
            align="right"
            trigger={
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200/90 dark:border-gray-800 bg-white dark:bg-[#1C1C1F] text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-2xs">
                <ArrowUpDown className="w-3.5 h-3.5 text-gray-500" />
                <span>Sort</span>
              </button>
            }
            items={[
              {
                label: 'Name (A - Z)',
                onClick: () => setSort('fullName'),
              },
              {
                label: 'Monthly Price (Low - High)',
                onClick: () => setSort('monthlyPrice'),
              },
              {
                label: 'Bandwidth Usage (High - Low)',
                onClick: () => setSort('dataUsageGB'),
              },
              {
                label: 'Balance Due (High - Low)',
                onClick: () => setSort('balanceDue'),
              },
              {
                label: 'Rating (High - Low)',
                onClick: () => setSort('rating'),
              },
              {
                label: 'Installation Date',
                onClick: () => setSort('installationDate'),
              },
            ]}
          />

          {/* Show Statistics Toggle Switch */}
          <div className="flex items-center pl-2 border-l border-gray-200 dark:border-gray-800">
            <Toggle
              checked={showStatistics}
              onChange={toggleStatistics}
              label="Show Statistics"
            />
          </div>
        </div>
      </div>

      {/* Active filter badges row */}
      {activeFiltersCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap pt-1 text-xs">
          <span className="text-gray-400 text-[11px] font-medium">Filtered by:</span>
          {filters.status !== 'All' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/60 text-[#F26B3A] text-xs font-medium">
              Status: {filters.status}
              <button onClick={() => setFilters({ status: 'All' })}>
                <X className="w-3 h-3 hover:text-red-600" />
              </button>
            </span>
          )}
          {filters.plan !== 'All' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/60 text-[#F26B3A] text-xs font-medium">
              Plan: {filters.plan}
              <button onClick={() => setFilters({ plan: 'All' })}>
                <X className="w-3 h-3 hover:text-red-600" />
              </button>
            </span>
          )}
          {filters.connectionType !== 'All' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/60 text-[#F26B3A] text-xs font-medium">
              Type: {filters.connectionType}
              <button onClick={() => setFilters({ connectionType: 'All' })}>
                <X className="w-3 h-3 hover:text-red-600" />
              </button>
            </span>
          )}
          {filters.city !== 'All' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/60 text-[#F26B3A] text-xs font-medium">
              City: {filters.city}
              <button onClick={() => setFilters({ city: 'All' })}>
                <X className="w-3 h-3 hover:text-red-600" />
              </button>
            </span>
          )}
          {filters.minBalance !== undefined && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/60 text-[#F26B3A] text-xs font-medium">
              Has Balance Due
              <button onClick={() => setFilters({ minBalance: undefined })}>
                <X className="w-3 h-3 hover:text-red-600" />
              </button>
            </span>
          )}
          {filters.maxBalance !== undefined && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/60 text-[#F26B3A] text-xs font-medium">
              Zero Balance
              <button onClick={() => setFilters({ maxBalance: undefined })}>
                <X className="w-3 h-3 hover:text-red-600" />
              </button>
            </span>
          )}
          <button
            onClick={resetFilters}
            className="text-[11px] font-bold text-gray-500 hover:text-red-600 hover:underline ml-1"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
};
