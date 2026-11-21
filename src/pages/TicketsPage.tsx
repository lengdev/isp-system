import React, { useMemo } from 'react';
import {
  LifeBuoy,
  Plus,
  User,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Eye,
  MessageSquare,
  Wrench,
  Check,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { SupportTicket } from '../types';

type TicketStatus = 'Open' | 'In Progress' | 'Resolved' | 'Closed';
type TicketPriority = 'Low' | 'Medium' | 'High' | 'Critical';
import { Button } from '../components/ui/Button';
import { formatDate, cn } from '../lib/utils';
import { CreateTicketModal } from '../features/customers/CreateTicketModal';
import { DataTable, DataTableColumnDef, RowAction } from '../components/ui/DataTable';

export const TicketsPage: React.FC = () => {
  const tickets = useStore((s) => s.tickets);
  const technicians = useStore((s) => s.technicians);
  const updateTicketStatus = useStore((s) => s.updateTicketStatus);
  const assignTicketTechnician = useStore((s) => s.assignTicketTechnician);
  const openModal = useStore((s) => s.openModal);
  const openDrawer = useStore((s) => s.openDrawer);
  const addToast = useStore((s) => s.addToast);

  const technicianOptions = useMemo(
    () =>
      technicians.map((t) => ({
        value: t.name,
        label: t.name,
        description: t.zone,
      })),
    [technicians]
  );

  const statusOptions: { value: TicketStatus; label: string }[] = [
    { value: 'Open', label: 'Open' },
    { value: 'In Progress', label: 'In Progress' },
    { value: 'Resolved', label: 'Resolved' },
    { value: 'Closed', label: 'Closed' },
  ];

  const priorityOptions: { value: TicketPriority; label: string }[] = [
    { value: 'Critical', label: 'Critical' },
    { value: 'High', label: 'High' },
    { value: 'Medium', label: 'Medium' },
    { value: 'Low', label: 'Low' },
  ];

  const columns: DataTableColumnDef<SupportTicket>[] = useMemo(
    () => [
      {
        id: 'ticketNumber',
        header: 'Ticket #',
        accessorKey: 'ticketNumber',
        width: 130,
        sortable: true,
        pinned: 'left',
        priority: 1,
        filter: { type: 'text', placeholder: 'Search ticket...' },
        cell: ({ row }) => (
          <span className="font-mono text-xs font-bold text-[var(--brand)]">
            {row.original.ticketNumber}
          </span>
        ),
      },
      {
        id: 'title',
        header: 'Issue / Description',
        accessorKey: 'title',
        width: 280,
        sortable: true,
        priority: 1,
        filter: { type: 'text', placeholder: 'Filter issue...' },
        cell: ({ row }) => {
          const t = row.original;
          return (
            <div>
              <div className="font-bold text-gray-900 dark:text-gray-100 truncate">
                {t.title}
              </div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                {t.description}
              </div>
            </div>
          );
        },
      },
      {
        id: 'customerName',
        header: 'Subscriber',
        accessorKey: 'customerName',
        width: 200,
        sortable: true,
        priority: 1,
        filter: { type: 'text', placeholder: 'Filter subscriber...' },
        cell: ({ row }) => {
          const t = row.original;
          return (
            <button
              type="button"
              onClick={() => openDrawer(t.customerId, 'tickets')}
              className="font-semibold text-[var(--text)] hover:text-[var(--brand)] text-left truncate transition-colors"
            >
              {t.customerName}
            </button>
          );
        },
      },
      {
        id: 'priority',
        header: 'Priority',
        accessorKey: 'priority',
        width: 130,
        sortable: true,
        priority: 1,
        filter: { type: 'select', options: priorityOptions },
        cell: ({ row }) => {
          const p = row.original.priority;
          return (
            <span
              className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${p === 'Critical'
                ? 'bg-red-100 text-red-700 dark:bg-red-950/60'
                : p === 'High'
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60'
                  : 'bg-blue-100 text-blue-700 dark:bg-blue-950/60'
                }`}
            >
              {p} Priority
            </span>
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
        filter: { type: 'select', options: statusOptions },
        editable: {
          type: 'select',
          options: statusOptions,
          onSave: async (val, row) => {
            updateTicketStatus(row.id, val as TicketStatus);
            addToast({
              type: 'success',
              title: 'Ticket Updated',
              message: `Ticket ${row.ticketNumber} is now marked ${val}.`,
            });
          },
        },
        cell: ({ row }) => {
          const st = row.original.status;
          return (
            <span
              className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${st === 'Resolved' || st === 'Closed'
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60'
                : st === 'In Progress'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60'
                }`}
            >
              {st}
            </span>
          );
        },
      },
      {
        id: 'assignedTechnician',
        header: 'Technician',
        accessorKey: 'assignedTechnician',
        width: 180,
        sortable: true,
        priority: 2,
        filter: { type: 'select', options: technicianOptions },
        editable: {
          type: 'select',
          options: technicianOptions,
          onSave: async (val, row) => {
            assignTicketTechnician(row.id, val as string);
            addToast({
              type: 'success',
              title: 'Technician Dispatched',
              message: `Assigned ${val} to ticket ${row.ticketNumber}.`,
            });
          },
        },
        cell: ({ row }) => {
          const tech = row.original.assignedTechnician;
          return tech ? (
            <div className="flex items-center gap-1.5 text-gray-800 dark:text-gray-200">
              <User className="w-3.5 h-3.5 text-gray-400" />
              <span className="font-medium truncate">{tech}</span>
            </div>
          ) : (
            <span className="text-gray-400 italic">Unassigned</span>
          );
        },
      },
      {
        id: 'createdAt',
        header: 'Opened',
        accessorKey: 'createdAt',
        width: 140,
        sortable: true,
        priority: 2,
        cell: ({ row }) => (
          <span className="text-gray-500 tabular-nums">
            {formatDate(row.original.createdAt)}
          </span>
        ),
      },
    ],
    [priorityOptions, statusOptions, technicianOptions, openDrawer, updateTicketStatus, assignTicketTechnician, addToast]
  );

  const getRowActions = (t: SupportTicket): RowAction<SupportTicket>[] => [
    {
      label: 'View Subscriber Profile',
      icon: <Eye className="w-3.5 h-3.5" />,
      onClick: () => openDrawer(t.customerId, 'tickets'),
    },
    ...(t.status !== 'In Progress' && t.status !== 'Resolved'
      ? [
        {
          label: 'Mark In Progress',
          icon: <Clock className="w-3.5 h-3.5 text-blue-500" />,
          onClick: () => {
            updateTicketStatus(t.id, 'In Progress');
            addToast({
              type: 'info',
              title: 'Ticket In Progress',
              message: `Status updated for ${t.ticketNumber}`,
            });
          },
        },
      ]
      : []),
    ...(t.status !== 'Resolved'
      ? [
        {
          label: 'Mark Resolved',
          icon: <Check className="w-3.5 h-3.5 text-emerald-600" />,
          onClick: () => {
            updateTicketStatus(t.id, 'Resolved');
            addToast({
              type: 'success',
              title: 'Ticket Resolved',
              message: `Marked ${t.ticketNumber} as resolved.`,
            });
          },
        },
      ]
      : []),
    {
      label: 'Close Ticket',
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
      onClick: () => {
        updateTicketStatus(t.id, 'Closed');
        addToast({
          type: 'info',
          title: 'Ticket Closed',
          message: `Closed ticket ${t.ticketNumber}`,
        });
      },
    },
  ];

  const renderExpanded = (t: SupportTicket) => (
    <div className="p-4 rounded-xl bg-gray-50/80 dark:bg-[#161618] border border-gray-200/60 dark:border-gray-800 text-xs space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LifeBuoy className="w-4 h-4 text-[#F26B3A]" />
          <span className="font-bold text-gray-900 dark:text-gray-100">
            Telemetry & Dispatch Log • {t.ticketNumber}
          </span>
        </div>
        <span className="text-[11px] text-gray-400">
          Created: {formatDate(t.createdAt)}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3 rounded-lg bg-white dark:bg-[#1C1C1F] border border-gray-200/50 dark:border-gray-800 space-y-1">
          <span className="text-[11px] text-gray-400">Signal Diagnostics</span>
          <div className="font-semibold text-gray-900 dark:text-gray-100">
            Downlink Optical Power: -27.8 dBm (High Loss)
          </div>
        </div>
        <div className="p-3 rounded-lg bg-white dark:bg-[#1C1C1F] border border-gray-200/50 dark:border-gray-800 space-y-1">
          <span className="text-[11px] text-gray-400">Field Engineer</span>
          <div className="font-semibold text-[#F26B3A]">
            {t.assignedTechnician || 'Pending field crew dispatch'}
          </div>
        </div>
        <div className="p-3 rounded-lg bg-white dark:bg-[#1C1C1F] border border-gray-200/50 dark:border-gray-800 space-y-1">
          <span className="text-[11px] text-gray-400">SLA Priority Target</span>
          <div className="font-semibold text-gray-900 dark:text-gray-100">
            Within 4 Hours (Critical)
          </div>
        </div>
      </div>
    </div>
  );

  const renderCard = (
    t: SupportTicket,
    isSelected: boolean,
    onSelect: () => void
  ) => (
    <div
      onClick={() => openDrawer(t.customerId, 'tickets')}
      className={cn(
        'p-5 rounded-2xl bg-[var(--surface)] border shadow-[var(--shadow-card)] cursor-pointer transition-all flex flex-col justify-between space-y-3',
        isSelected
          ? 'border-[var(--selected-indicator)] bg-[var(--selected-bg)] ring-2 ring-[var(--selected-ring)]'
          : 'border-[var(--border)] hover:border-[var(--border-strong)]'
      )}
    >
      <div>
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs font-bold text-[var(--brand)]">
            {t.ticketNumber}
          </span>
          <span
            className={cn(
              'px-2 py-0.5 rounded-full text-[10px] font-bold',
              t.priority === 'Critical'
                ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                : t.priority === 'High'
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                  : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
            )}
          >
            {t.priority}
          </span>
        </div>

        <h4 className="text-[13px] font-semibold text-[var(--text)] mt-2 truncate">
          {t.title}
        </h4>
        <p className="text-[11px] text-[var(--text-muted)] mt-1 line-clamp-2">
          {t.description}
        </p>
      </div>

      <div className="pt-3 border-t border-[var(--border-subtle)] space-y-2 text-[12px]">
        <div className="flex items-center justify-between">
          <span className="text-[var(--text-muted)]">Subscriber:</span>
          <span className="font-semibold text-[var(--text)] truncate">
            {t.customerName}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[var(--text-muted)]">Technician:</span>
          <span className="font-medium text-[var(--text-secondary)]">
            {t.assignedTechnician || 'Unassigned'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[var(--text-muted)]">Status:</span>
          <span
            className={cn(
              'px-2 py-0.5 rounded-full text-[10px] font-bold',
              t.status === 'Resolved' || t.status === 'Closed'
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
            )}
          >
            {t.status}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 pb-12 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-[24px] leading-tight font-semibold text-[var(--text)] tracking-tight">
            Support Tickets & Dispatch
          </h2>
          <p className="text-[13px] text-[var(--text-muted)] mt-0.5">
            Resolve network incidents, signal quality complaints, and dispatch field crews
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => openModal('createTicket')}
          className="h-8 px-3 text-[12px]"
        >
          <Plus className="w-3.5 h-3.5 stroke-[1.75]" />
          <span>Open Support Ticket</span>
        </Button>
      </div>

      {/* Full-Featured Tickets DataTable */}
      <DataTable<SupportTicket>
        columns={columns}
        data={tickets}
        rowId={(t) => t.id}
        viewKey="support_tickets_table"
        onRowClick={(t) => openDrawer(t.customerId, 'tickets')}
        rowActions={getRowActions}
        renderExpanded={renderExpanded}
        renderCard={renderCard}
        emptyTitle="No support tickets found"
        emptySubtitle="All network incidents and subscriber issues are currently resolved."
        onAddNew={() => openModal('createTicket')}
        addNewLabel="Open Support Ticket"
      />
    </div>
  );
};
