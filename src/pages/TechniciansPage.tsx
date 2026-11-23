import React, { useMemo } from 'react';
import {
  Wrench,
  Calendar,
  Phone,
  Mail,
  Star,
  MapPin,
  CheckCircle,
  Clock,
  User,
  Check,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { Technician, InstallationSchedule } from '../types';
import { Avatar } from '../components/ui/Avatar';
import { Chip } from '../components/ui/Chip';
import { DataTable, DataTableColumnDef, RowAction } from '../components/ui/DataTable';

export const TechniciansPage: React.FC = () => {
  const technicians = useStore((s) => s.technicians);
  const schedules = useStore((s) => s.schedules);
  const addToast = useStore((s) => s.addToast);

  // Columns for Today's Scheduled Installations
  const scheduleColumns: DataTableColumnDef<InstallationSchedule>[] = useMemo(
    () => [
      {
        id: 'timeSlot',
        header: 'Time slot',
        accessorKey: 'timeSlot',
        width: 140,
        sortable: true,
        pinned: 'left',
        priority: 1,
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5 font-bold text-[var(--text)] tabular-nums">
            <Clock className="w-3.5 h-3.5 text-[var(--brand)]" />
            <span>{row.original.timeSlot}</span>
          </div>
        ),
      },
      {
        id: 'customerName',
        header: 'Subscriber',
        accessorKey: 'customerName',
        width: 220,
        sortable: true,
        priority: 1,
        filter: { type: 'text', placeholder: 'Search subscriber...' },
        cell: ({ row }) => {
          const sch = row.original;
          return (
            <div>
              <div className="font-bold text-gray-800 dark:text-gray-200 truncate">
                {sch.customerName}
              </div>
              <div className="text-[11px] text-gray-400 font-mono truncate">
                {sch.customerPhone}
              </div>
            </div>
          );
        },
      },
      {
        id: 'address',
        header: 'Service address',
        accessorKey: 'address',
        width: 260,
        sortable: true,
        priority: 2,
        filter: { type: 'text' },
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300 truncate">
            <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span className="truncate">{row.original.address}</span>
          </div>
        ),
      },
      {
        id: 'planName',
        header: 'Plan',
        accessorKey: 'planName',
        width: 160,
        sortable: true,
        priority: 2,
        filter: { type: 'text' },
        cell: ({ row }) => (
          <span className="font-semibold text-[var(--brand)]">
            {row.original.planName}
          </span>
        ),
      },
      {
        id: 'technicianName',
        header: 'Field engineer',
        accessorKey: 'technicianName',
        width: 180,
        sortable: true,
        priority: 1,
        filter: { type: 'text' },
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Avatar name={row.original.technicianName} size="sm" />
            <span className="font-medium text-gray-800 dark:text-gray-200 truncate">
              {row.original.technicianName}
            </span>
          </div>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        accessorKey: 'status',
        width: 140,
        sortable: true,
        priority: 1,
        filter: {
          type: 'select',
          options: [
            { value: 'Completed', label: 'Completed' },
            { value: 'In Progress', label: 'In Progress' },
            { value: 'Scheduled', label: 'Scheduled' },
          ],
        },
        cell: ({ row }) => {
          const st = row.original.status;
          const color = st === 'Completed' ? 'success' : st === 'In Progress' ? 'accent' : 'warning';
          return (
            <Chip size="sm" color={color}>
              {st}
            </Chip>
          );
        },
      },
    ],
    []
  );

  const getScheduleRowActions = (
    sch: InstallationSchedule
  ): RowAction<InstallationSchedule>[] => [
      {
        label: 'Mark Installation Completed',
        icon: <Check className="w-3.5 h-3.5 text-emerald-600" />,
        onClick: () => {
          addToast({
            type: 'success',
            title: 'Dispatch Job Completed',
            message: `Installation for ${sch.customerName} marked complete.`,
          });
        },
      },
      {
        label: 'Call Subscriber',
        icon: <Phone className="w-3.5 h-3.5" />,
        onClick: () => {
          addToast({
            type: 'info',
            title: 'Dialing Subscriber',
            message: `Connecting to ${sch.customerPhone}...`,
          });
        },
      },
    ];

  const renderScheduleExpanded = (sch: InstallationSchedule) => (
    <div className="p-4 rounded-xl bg-gray-50/80 dark:bg-[#161618] border border-gray-200/60 dark:border-gray-800 text-xs space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wrench className="w-4 h-4 text-[#F26B3A]" />
          <span className="font-bold text-gray-900 dark:text-gray-100">
            Field Dispatch Order • {sch.timeSlot}
          </span>
        </div>
        <span className="text-[11px] text-gray-400">
          Assigned Tech: {sch.technicianName}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3 rounded-lg bg-white dark:bg-[#1C1C1F] border border-gray-200/50 dark:border-gray-800 space-y-1">
          <span className="text-[11px] text-gray-400">Target Plan Tier</span>
          <div className="font-semibold text-gray-900 dark:text-gray-100">
            {sch.planName}
          </div>
        </div>
        <div className="p-3 rounded-lg bg-white dark:bg-[#1C1C1F] border border-gray-200/50 dark:border-gray-800 space-y-1">
          <span className="text-[11px] text-gray-400">Provisioned Gear</span>
          <div className="font-semibold text-gray-900 dark:text-gray-100">
            GPON ONT + Dual-Band Wi-Fi 6 Gateway
          </div>
        </div>
        <div className="p-3 rounded-lg bg-white dark:bg-[#1C1C1F] border border-gray-200/50 dark:border-gray-800 space-y-1">
          <span className="text-[11px] text-gray-400">Premises Access Notes</span>
          <div className="font-semibold text-gray-900 dark:text-gray-100">
            Gate code #4492 • Drop fiber via backyard conduit
          </div>
        </div>
      </div>
    </div>
  );

  const renderScheduleCard = (
    sch: InstallationSchedule,
    isSelected: boolean,
    onSelect: () => void
  ) => (
    <div
      className={`p-5 rounded-2xl bg-white dark:bg-[#1C1C1F] border shadow-xs transition-all space-y-3 ${isSelected
        ? 'border-[#F26B3A] bg-[#FFF6F2] dark:bg-orange-950/20'
        : 'border-gray-200/80 dark:border-gray-800 hover:border-gray-300'
        }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-bold text-gray-900 dark:text-gray-100">
          <Clock className="w-3.5 h-3.5 text-[#F26B3A]" />
          <span>{sch.timeSlot}</span>
        </div>
        <Chip
          size="sm"
          color={sch.status === 'Completed' ? 'success' : sch.status === 'In Progress' ? 'accent' : 'warning'}
        >
          {sch.status}
        </Chip>
      </div>

      <div>
        <h4 className="font-bold text-gray-900 dark:text-gray-100">{sch.customerName}</h4>
        <p className="text-[11px] text-gray-400 font-mono mt-0.5">{sch.customerPhone}</p>
        <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">{sch.address}</p>
      </div>

      <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs">
        <span className="font-semibold text-[#F26B3A]">{sch.planName}</span>
        <span className="text-gray-700 dark:text-gray-300 font-medium">
          {sch.technicianName}
        </span>
      </div>
    </div>
  );

  // Columns for Field Engineers Roster
  const techColumns: DataTableColumnDef<Technician>[] = useMemo(
    () => [
      {
        id: 'name',
        header: 'Engineer',
        accessorKey: 'name',
        width: 220,
        sortable: true,
        pinned: 'left',
        priority: 1,
        filter: { type: 'text', placeholder: 'Filter engineer...' },
        cell: ({ row }) => {
          const tech = row.original;
          return (
            <div className="flex items-center gap-3">
              <Avatar
                name={tech.name}
                size="md"
                online={tech.status === 'Available' || tech.status === 'On Job'}
              />
              <div>
                <div className="font-bold text-gray-900 dark:text-gray-100">
                  {tech.name}
                </div>
                <div className="text-[11px] text-gray-400">{tech.email}</div>
              </div>
            </div>
          );
        },
      },
      {
        id: 'status',
        header: 'Status',
        accessorKey: 'status',
        width: 140,
        sortable: true,
        priority: 1,
        filter: {
          type: 'select',
          options: [
            { value: 'Available', label: 'Available' },
            { value: 'On Job', label: 'On Job' },
            { value: 'Off Duty', label: 'Off Duty' },
          ],
        },
        cell: ({ row }) => {
          const st = row.original.status;
          const color = st === 'Available' ? 'success' : st === 'On Job' ? 'accent' : 'default';
          return (
            <Chip size="sm" color={color}>
              {st}
            </Chip>
          );
        },
      },
      {
        id: 'zone',
        header: 'Coverage zone',
        accessorKey: 'zone',
        width: 180,
        sortable: true,
        priority: 1,
        filter: { type: 'text' },
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
            <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span>{row.original.zone}</span>
          </div>
        ),
      },
      {
        id: 'phone',
        header: 'Phone',
        accessorKey: 'phone',
        width: 150,
        sortable: true,
        priority: 2,
        cell: ({ row }) => (
          <span className="font-mono text-xs text-gray-600 dark:text-gray-300">
            {row.original.phone}
          </span>
        ),
      },
      {
        id: 'rating',
        header: 'Rating',
        accessorKey: 'rating',
        width: 120,
        sortable: true,
        priority: 2,
        aggregate: 'avg',
        cell: ({ row }) => (
          <div className="flex items-center gap-1 font-bold text-amber-500">
            <Star className="w-3.5 h-3.5 fill-amber-400 stroke-amber-400" />
            <span className="text-gray-800 dark:text-gray-200 tabular-nums">
              {row.original.rating}
            </span>
          </div>
        ),
      },
      {
        id: 'completedToday',
        header: 'Completed today',
        accessorKey: 'completedToday',
        width: 150,
        align: 'right',
        sortable: true,
        priority: 2,
        aggregate: 'sum',
        cell: ({ row }) => (
          <span className="font-bold text-gray-900 dark:text-gray-100 tabular-nums">
            {row.original.completedToday} jobs
          </span>
        ),
      },
    ],
    []
  );

  const renderTechCard = (
    tech: Technician,
    isSelected: boolean,
    onSelect: () => void
  ) => (
    <div
      className={`p-5 rounded-2xl bg-white dark:bg-[#1C1C1F] border shadow-xs space-y-3 transition-all ${isSelected
        ? 'border-[#F26B3A] bg-[#FFF6F2] dark:bg-orange-950/20'
        : 'border-gray-200/80 dark:border-gray-800 hover:border-gray-300'
        }`}
    >
      <div className="flex items-center gap-3">
        <Avatar
          name={tech.name}
          size="lg"
          online={tech.status === 'Available' || tech.status === 'On Job'}
        />
        <div>
          <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">
            {tech.name}
          </h4>
          <Chip
            size="sm"
            color={tech.status === 'Available' ? 'success' : tech.status === 'On Job' ? 'accent' : 'default'}
          >
            {tech.status}
          </Chip>
        </div>
      </div>

      <div className="pt-2 border-t border-gray-100 dark:border-gray-800/80 space-y-1.5 text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-gray-400" />
          <span>Coverage Zone: {tech.zone}</span>
        </div>
        <div className="flex items-center gap-2">
          <Phone className="w-3.5 h-3.5 text-gray-400" />
          <span>{tech.phone}</span>
        </div>
        <div className="flex items-center gap-2">
          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
          <span className="font-bold text-gray-700 dark:text-gray-200">
            {tech.rating} / 5.0 Rating ({tech.completedToday} done today)
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 pb-12 select-none">
      <div>
        <h2 className="text-[24px] leading-tight font-semibold text-[var(--text)] tracking-tight">
          Technicians & Field Installations
        </h2>
        <p className="text-[13px] text-[var(--text-muted)] mt-0.5">
          Manage field engineers, ONT splicing schedules, and service dispatch
        </p>
      </div>

      {/* Field Engineer Roster with DataTable */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
          Field Engineer Roster ({technicians.length})
        </h3>
        <DataTable<Technician>
          columns={techColumns}
          data={technicians}
          rowId={(t) => t.id}
          viewKey="technicians_roster_table"
          renderCard={renderTechCard}
          emptyTitle="No technicians found"
        />
      </div>

      {/* Installations Schedule with DataTable */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
          Today's Scheduled Installations ({schedules.length})
        </h3>
        <DataTable<InstallationSchedule>
          columns={scheduleColumns}
          data={schedules}
          rowId={(s) => s.id}
          viewKey="technicians_schedule_table"
          rowActions={getScheduleRowActions}
          renderExpanded={renderScheduleExpanded}
          renderCard={renderScheduleCard}
          emptyTitle="No installations scheduled today"
          emptySubtitle="Field engineers have completed all pending drops."
        />
      </div>
    </div>
  );
};
