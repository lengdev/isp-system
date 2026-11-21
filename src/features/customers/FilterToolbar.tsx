import React, { useState, useMemo, useEffect } from 'react';
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
  SlidersHorizontal,
  RotateCcw,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { CustomerStatus, TableViewMode } from '../../types';
import { Combobox, ComboboxOption } from '../../components/ui/Combobox';
import { Popover } from '../../components/ui/Popover';
import { Toggle } from '../../components/ui/Toggle';
import { Button } from '../../components/ui/Button';
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

  // Popover state and draft filters
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState(filters);

  useEffect(() => {
    if (isFilterOpen) {
      setDraftFilters(filters);
    }
  }, [isFilterOpen, filters]);

  // Compute status counts dynamically for filter pills
  const statusCounts = useMemo(() => ({
    All: customers.length,
    Active: customers.filter((c) => c.status === 'Active').length,
    Suspended: customers.filter((c) => c.status === 'Suspended').length,
    Overdue: customers.filter((c) => c.status === 'Overdue').length,
    Pending: customers.filter((c) => c.status === 'Pending').length,
    Disconnected: customers.filter((c) => c.status === 'Disconnected').length,
  }), [customers]);

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
  const cities = useMemo(() => Array.from(new Set(customers.map((c) => c.city))).sort(), [customers]);

  // Combobox Options
  const planOptions: ComboboxOption[] = useMemo(() => plans.map((p) => ({
    value: p.name,
    label: p.name,
    description: `${p.speedMbps} Mbps • $${p.monthlyPrice}/mo`,
    group: p.type,
  })), [plans]);

  const cityOptions: ComboboxOption[] = useMemo(() => cities.map((c) => ({
    value: c,
    label: c,
  })), [cities]);

  const connectionTypeOptions: ComboboxOption[] = [
    { value: 'Fiber', label: 'Fiber' },
    { value: 'Wireless', label: 'Wireless' },
    { value: 'DSL', label: 'DSL' },
  ];

  const statusOptions: ComboboxOption[] = [
    { value: 'Active', label: 'Active' },
    { value: 'Suspended', label: 'Suspended' },
    { value: 'Overdue', label: 'Overdue' },
    { value: 'Pending', label: 'Pending' },
    { value: 'Disconnected', label: 'Disconnected' },
  ];

  const technicianOptions: ComboboxOption[] = useMemo(() => technicians.map((t) => ({
    value: t.name,
    label: t.name,
    description: t.zone,
  })), [technicians]);

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

  // Applied filters count
  const activeFiltersCount =
    filters.status.length +
    filters.plan.length +
    filters.city.length +
    filters.connectionType.length +
    filters.technician.length +
    (filters.minBalance !== undefined ? 1 : 0) +
    (filters.maxBalance !== undefined ? 1 : 0);

  // Draft filters count
  const draftActiveCount =
    draftFilters.status.length +
    draftFilters.plan.length +
    draftFilters.city.length +
    draftFilters.connectionType.length +
    draftFilters.technician.length +
    (draftFilters.minBalance !== undefined ? 1 : 0) +
    (draftFilters.maxBalance !== undefined ? 1 : 0);

  // Live count preview for draft filters
  const liveCount = useMemo(() => {
    return customers.filter((c) => {
      if (draftFilters.status.length > 0 && !draftFilters.status.includes(c.status)) return false;
      if (draftFilters.plan.length > 0 && !draftFilters.plan.includes(c.planName)) return false;
      if (draftFilters.city.length > 0 && !draftFilters.city.includes(c.city)) return false;
      if (draftFilters.connectionType.length > 0 && !draftFilters.connectionType.includes(c.connectionType)) return false;
      if (draftFilters.technician.length > 0 && (!c.assignedTechnician || !draftFilters.technician.includes(c.assignedTechnician))) return false;
      if (draftFilters.minBalance !== undefined && c.balanceDue < draftFilters.minBalance) return false;
      if (draftFilters.maxBalance !== undefined && c.balanceDue > draftFilters.maxBalance) return false;
      return true;
    }).length;
  }, [customers, draftFilters]);

  const handleApplyFilters = () => {
    setFilters(draftFilters);
    setIsFilterOpen(false);
  };

  const handleResetDraft = () => {
    setDraftFilters((prev) => ({
      ...prev,
      status: [],
      plan: [],
      city: [],
      connectionType: [],
      technician: [],
      minBalance: undefined,
      maxBalance: undefined,
    }));
  };

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

          {/* Redesigned 360px Filter Popover */}
          <Popover
            align="right"
            isOpen={isFilterOpen}
            onOpenChange={setIsFilterOpen}
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
              <div className="w-[360px] max-w-[calc(100vw-32px)] flex flex-col select-none">
                {/* Popover Header: Sentence case "Filters", count badge, Reset all */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1E1E22]">
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                      Filters
                    </h4>
                    {draftActiveCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#FFF1EA] dark:bg-orange-950/40 text-[#F26B3A]">
                        {draftActiveCount}
                      </span>
                    )}
                  </div>
                  {draftActiveCount > 0 && (
                    <button
                      type="button"
                      onClick={handleResetDraft}
                      className="text-xs font-medium text-gray-500 hover:text-[#F26B3A] dark:hover:text-[#F26B3A] transition-colors"
                    >
                      Reset all
                    </button>
                  )}
                </div>

                {/* Popover Scrollable Body: px-5 py-4 with gap-4 */}
                <div className="px-5 py-4 space-y-4 max-h-[380px] overflow-y-auto scrollbar-thin">
                  {/* Plan */}
                  <div>
                    <label className="text-[13px] font-medium text-gray-700 dark:text-gray-300 block mb-1.5">
                      Internet Plan
                    </label>
                    <Combobox
                      options={planOptions}
                      value={draftFilters.plan}
                      onChange={(val) => setDraftFilters((prev) => ({ ...prev, plan: val }))}
                      multiple={true}
                      placeholder="All Plans..."
                      size="sm"
                    />
                  </div>

                  {/* Connection Type */}
                  <div>
                    <label className="text-[13px] font-medium text-gray-700 dark:text-gray-300 block mb-1.5">
                      Connection Type
                    </label>
                    <Combobox
                      options={connectionTypeOptions}
                      value={draftFilters.connectionType}
                      onChange={(val) => setDraftFilters((prev) => ({ ...prev, connectionType: val }))}
                      multiple={true}
                      placeholder="All Types..."
                      size="sm"
                    />
                  </div>

                  {/* City */}
                  <div>
                    <label className="text-[13px] font-medium text-gray-700 dark:text-gray-300 block mb-1.5">
                      City
                    </label>
                    <Combobox
                      options={cityOptions}
                      value={draftFilters.city}
                      onChange={(val) => setDraftFilters((prev) => ({ ...prev, city: val }))}
                      multiple={true}
                      placeholder="All Cities..."
                      size="sm"
                    />
                  </div>

                  {/* Status */}
                  <div>
                    <label className="text-[13px] font-medium text-gray-700 dark:text-gray-300 block mb-1.5">
                      Subscriber Status
                    </label>
                    <Combobox
                      options={statusOptions}
                      value={draftFilters.status}
                      onChange={(val) => setDraftFilters((prev) => ({ ...prev, status: val }))}
                      multiple={true}
                      placeholder="All Statuses..."
                      size="sm"
                    />
                  </div>

                  {/* Technician */}
                  <div>
                    <label className="text-[13px] font-medium text-gray-700 dark:text-gray-300 block mb-1.5">
                      Assigned Technician
                    </label>
                    <Combobox
                      options={technicianOptions}
                      value={draftFilters.technician}
                      onChange={(val) => setDraftFilters((prev) => ({ ...prev, technician: val }))}
                      multiple={true}
                      placeholder="All Technicians..."
                      size="sm"
                    />
                  </div>

                  {/* Balance Status */}
                  <div>
                    <label className="text-[13px] font-medium text-gray-700 dark:text-gray-300 block mb-1.5">
                      Balance Due
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setDraftFilters((prev) => ({
                            ...prev,
                            minBalance: prev.minBalance === 1 ? undefined : 1,
                            maxBalance: undefined,
                          }))
                        }
                        className={cn(
                          'py-2 px-2.5 rounded-lg text-xs font-medium border transition-colors',
                          draftFilters.minBalance === 1
                            ? 'bg-[#FFF1EA] dark:bg-orange-950/40 border-[#F26B3A] text-[#F26B3A]'
                            : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                        )}
                      >
                        Has Balance
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setDraftFilters((prev) => ({
                            ...prev,
                            maxBalance: prev.maxBalance === 0 ? undefined : 0,
                            minBalance: undefined,
                          }))
                        }
                        className={cn(
                          'py-2 px-2.5 rounded-lg text-xs font-medium border transition-colors',
                          draftFilters.maxBalance === 0
                            ? 'bg-[#FFF1EA] dark:bg-orange-950/40 border-[#F26B3A] text-[#F26B3A]'
                            : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                        )}
                      >
                        Zero Balance ($0)
                      </button>
                    </div>
                  </div>
                </div>

                {/* Popover Sticky Footer: Reset + Apply with Live Result Count */}
                <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-gray-800 bg-[#FAFAFA] dark:bg-[#18181B] shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleResetDraft}
                    className="h-8 px-3 text-xs"
                  >
                    Reset
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleApplyFilters}
                    className="h-8 px-4 text-xs font-semibold"
                  >
                    Show {liveCount} {liveCount === 1 ? 'result' : 'results'}
                  </Button>
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

            {/* Technician chips */}
            {filters.technician.map((tech) => (
              <span
                key={`tech-${tech}`}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FFF1EA] dark:bg-orange-950/40 text-[#F26B3A] text-xs font-medium border border-[#F26B3A]/20"
              >
                Technician: {tech}
                <button
                  type="button"
                  onClick={() =>
                    setFilters({
                      technician: filters.technician.filter((t) => t !== tech),
                    })
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
