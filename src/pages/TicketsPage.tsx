import React, { useMemo } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  LifeBuoy,
  Plus,
  User,
  CheckCircle2,
  Clock,
  Eye,
  Check,
  RefreshCw,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { api } from '../lib/api';
import { Can, useCan } from '../lib/permissions';
import { SupportTicket } from '../types';

type TicketStatus = 'Open' | 'In Progress' | 'Resolved' | 'Closed';
type TicketPriority = 'Low' | 'Medium' | 'High' | 'Critical';
import { Button } from '../components/ui/Button';
import { Chip } from '../components/ui/Chip';
import { formatDate, cn } from '../lib/utils';
import { DataTable, DataTableColumnDef, RowAction } from '../components/ui/DataTable';
import { DataTableCheckbox } from '../components/ui/DataTable/DataTableCheckbox';

function normalizeTicketStatus(raw?: string): TicketStatus {
  const up = String(raw || 'OPEN').toUpperCase();
  if (up === 'IN_PROGRESS' || up === 'IN PROGRESS') return 'In Progress';
  if (up === 'RESOLVED') return 'Resolved';
  if (up === 'CLOSED') return 'Closed';
  return 'Open';
}

function normalizeTicketPriority(raw?: string): TicketPriority {
  const up = String(raw || 'MEDIUM').toUpperCase();
  if (up === 'CRITICAL') return 'Critical';
  if (up === 'HIGH') return 'High';
  if (up === 'LOW') return 'Low';
  return 'Medium';
}

function toApiTicketStatus(st: string): string {
  return st.toUpperCase().replace(/\s+/g, '_');
}

export const TicketsPage: React.FC = () => {
  const assignTicketTechnician = useStore((s) => s.assignTicketTechnician);
  const openModal = useStore((s) => s.openModal);
  const openDrawer = useStore((s) => s.openDrawer);
  const addToast = useStore((s) => s.addToast);
  const canCreateTicket = useCan('tickets.create');
  const canEditTicket = useCan('tickets.edit');

  const ticketsQuery = useQuery<SupportTicket[], Error>({
    queryKey: ['tickets'],
    queryFn: async () => {
      const list = await api.operations.getTickets();
      return (Array.isArray(list) ? list : []).map((t: any) => ({
        ...t,
        status: normalizeTicketStatus(t.status),
        priority: normalizeTicketPriority(t.priority),
      }));
    },
    placeholderData: keepPreviousData,
  });

  const techniciansQuery = useQuery<any[], Error>({
    queryKey: ['technicians'],
    queryFn: () => api.operations.getTechnicians(),
    staleTime: 60_000,
  });

  const tickets = useMemo(() => ticketsQuery.data ?? [], [ticketsQuery.data]);
  const technicians = useMemo(() => techniciansQuery.data ?? [], [techniciansQuery.data]);

  const handleTicketStatusUpdate = async (id: string, nextStatus: TicketStatus, ticketNum?: string) => {
    try {
      await api.operations.updateTicket(id, toApiTicketStatus(nextStatus));
      addToast({
        type: 'success',
        title: 'Ticket Updated',
        message: `Ticket ${ticketNum || id} is now marked ${nextStatus}.`,
      });
      ticketsQuery.refetch();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Ticket Update Failed',
        message: err?.message || 'Unable to update ticket status.',
      });
    }
  };

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
              <div className="font-bold text-[var(--text)] truncate">
                {t.title}
              </div>
              <div className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">
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
              onClick={(e) => {
                e.stopPropagation();
                openDrawer(t.customerId, 'tickets');
              }}
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
          const color =
            p === 'Critical'
              ? 'danger'
              : p === 'High'
                ? 'warning'
                : p === 'Medium'
                  ? 'accent'
                  : 'default';
          return (
            <Chip size="sm" color={color}>
              {p} Priority
            </Chip>
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
        editable: canEditTicket
          ? {
              type: 'select',
              options: statusOptions,
              onSave: async (val, row) => {
                await handleTicketStatusUpdate(row.id, val as TicketStatus, row.ticketNumber);
              },
            }
          : undefined,
        cell: ({ row }) => {
          const st = row.original.status;
          const color =
            st === 'Resolved' || st === 'Closed'
              ? 'success'
              : st === 'In Progress'
                ? 'accent'
                : 'warning';
          return (
            <Chip size="sm" color={color}>
              {st}
            </Chip>
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
    [priorityOptions, statusOptions, technicianOptions, canEditTicket, openDrawer, assignTicketTechnician, addToast]
  );

  const getRowActions = (t: SupportTicket): RowAction<SupportTicket>[] => [
    {
      label: 'View Subscriber Profile',
      icon: <Eye className="w-3.5 h-3.5" />,
      onClick: () => openDrawer(t.customerId, 'tickets'),
    },
    ...(canEditTicket && t.status !== 'In Progress' && t.status !== 'Resolved'
      ? [
        {
          label: 'Mark In Progress',
          icon: <Clock className="w-3.5 h-3.5 text-blue-500" />,
          onClick: () => handleTicketStatusUpdate(t.id, 'In Progress', t.ticketNumber),
        },
      ]
      : []),
    ...(canEditTicket && t.status !== 'Resolved'
      ? [
        {
          label: 'Mark Resolved',
          icon: <Check className="w-3.5 h-3.5 text-emerald-600" />,
          onClick: () => handleTicketStatusUpdate(t.id, 'Resolved', t.ticketNumber),
        },
      ]
      : []),
    ...(canEditTicket
      ? [
          {
            label: 'Close Ticket',
            icon: <CheckCircle2 className="w-3.5 h-3.5" />,
            onClick: () => handleTicketStatusUpdate(t.id, 'Closed', t.ticketNumber),
          },
        ]
      : []),
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
      data-testid="support-ticket-card"
      onClick={() => openDrawer(t.customerId, 'tickets')}
      className={cn(
        'p-5 rounded-2xl bg-[var(--surface)] border shadow-[var(--shadow-card)] cursor-pointer transition-all flex flex-col justify-between space-y-3 select-none',
        isSelected
          ? 'border-[var(--selected-indicator)] bg-[var(--selected-bg)] ring-2 ring-[var(--selected-ring)]'
          : 'border-[var(--border)] hover:border-[var(--border-strong)]'
      )}
    >
      <div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div onClick={(e) => e.stopPropagation()}>
              <DataTableCheckbox
                checked={isSelected}
                onChange={onSelect}
                ariaLabel={`Select ticket ${t.ticketNumber}`}
              />
            </div>
            <span className="font-mono text-xs font-bold text-[var(--brand)]">
              {t.ticketNumber}
            </span>
          </div>
          <Chip
            size="sm"
            color={
              t.priority === 'Critical'
                ? 'danger'
                : t.priority === 'High'
                  ? 'warning'
                  : t.priority === 'Medium'
                    ? 'accent'
                    : 'default'
            }
          >
            {t.priority}
          </Chip>
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
          <Chip
            size="sm"
            color={
              t.status === 'Resolved' || t.status === 'Closed'
                ? 'success'
                : t.status === 'In Progress'
                  ? 'accent'
                  : 'warning'
            }
          >
            {t.status}
          </Chip>
        </div>
      </div>
    </div>
  );

  const handleBulkStatus = async (selectedRows: SupportTicket[], nextStatus: TicketStatus, clearSelection: () => void) => {
    await Promise.all(selectedRows.map((t) => api.operations.updateTicket(t.id, toApiTicketStatus(nextStatus)).catch(() => null)));
    addToast({
      type: 'success',
      title: `Tickets ${nextStatus}`,
      message: `Updated ${selectedRows.length} ticket(s).`,
    });
    clearSelection();
    ticketsQuery.refetch();
  };

  const renderBulkActions = (selectedRows: SupportTicket[], clearSelection: () => void) =>
    canEditTicket ? (
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleBulkStatus(selectedRows, 'In Progress', clearSelection)}
          className="h-8 text-xs"
        >
          <Clock className="w-3.5 h-3.5 text-blue-500" />
          <span>Mark In Progress</span>
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleBulkStatus(selectedRows, 'Resolved', clearSelection)}
          className="h-8 text-xs"
        >
          <Check className="w-3.5 h-3.5 text-emerald-600" />
          <span>Mark Resolved</span>
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleBulkStatus(selectedRows, 'Closed', clearSelection)}
          className="h-8 text-xs"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Close Tickets</span>
        </Button>
      </div>
    ) : null;

  const handleRefresh = () => {
    ticketsQuery.refetch();
  };

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
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={ticketsQuery.isFetching}
            className="h-8 px-3 text-[12px]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${ticketsQuery.isFetching ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
          <Can permission="tickets.create">
            <Button
              variant="primary"
              size="sm"
              onClick={() => openModal('createTicket')}
              className="h-8 px-3 text-[12px]"
            >
              <Plus className="w-3.5 h-3.5 stroke-[1.75]" />
              <span>Open Support Ticket</span>
            </Button>
          </Can>
        </div>
      </div>

      {/* Full-Featured Tickets DataTable */}
      <DataTable<SupportTicket>
        columns={columns}
        data={tickets}
        loading={ticketsQuery.isLoading}
        fetching={ticketsQuery.isFetching}
        error={ticketsQuery.error ? 'Unable to load support tickets.' : null}
        onRetry={handleRefresh}
        rowId={(t) => t.id}
        viewKey="support_tickets_table"
        onRowClick={(t) => openDrawer(t.customerId, 'tickets')}
        rowActions={getRowActions}
        renderExpanded={renderExpanded}
        renderCard={renderCard}
        bulkActions={renderBulkActions}
        autoRefreshInterval={30}
        onRefresh={handleRefresh}
        noDataTitle="No support tickets yet"
        noDataDescription="All network incidents and subscriber inquiries have been resolved."
        emptyTitle="No matching support tickets"
        emptySubtitle="Try adjusting filters or clearing your active search."
        emptyActionPermission="tickets.create"
        onAddNew={canCreateTicket ? () => openModal('createTicket') : undefined}
        addNewLabel="Open Support Ticket"
      />
    </div>
  );
};
