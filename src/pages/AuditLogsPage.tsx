import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ShieldCheck, RefreshCw, X } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Chip } from '../components/ui/Chip';
import { api } from '../lib/api';
import { DataTable, DataTableColumnDef } from '../components/ui/DataTable';

interface AuditLog {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: string;
}

function getActionColor(action?: string): 'danger' | 'success' | 'secondary' {
  if (!action) return 'secondary';
  if (action.includes('DELETE') || action.includes('SUSPEND') || action.includes('DEACTIVATE'))
    return 'danger';
  if (
    action.includes('CREATE') ||
    action.includes('PAYMENT') ||
    action.includes('COMPLETE') ||
    action.includes('ACTIVATE') ||
    action.includes('SUCCESS')
  )
    return 'success';
  return 'secondary';
}

export const AuditLogsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const actorIdFilter = searchParams.get('actorId') || '';
  const actorLabelFilter = searchParams.get('actor') || '';

  const logsQuery = useQuery<AuditLog[], Error>({
    queryKey: ['audit-logs', actorIdFilter, actorLabelFilter],
    queryFn: () =>
      api.settings.getAuditLogs(
        actorIdFilter
          ? { actorId: actorIdFilter }
          : actorLabelFilter
            ? { actor: actorLabelFilter }
            : undefined
      ),
    placeholderData: keepPreviousData,
  });

  const logs = useMemo(() => logsQuery.data ?? [], [logsQuery.data]);

  const clearActorFilter = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('actorId');
    next.delete('actor');
    setSearchParams(next);
  };

  const columns = useMemo<DataTableColumnDef<AuditLog>[]>(
    () => [
      {
        id: 'timestamp',
        header: 'Timestamp',
        accessorKey: 'timestamp',
        width: 160,
        sortable: true,
        cell: ({ getValue }) => (
          <span className="text-[var(--text-muted)] tabular-nums text-xs">
            {new Date(getValue() as string).toLocaleString()}
          </span>
        ),
      },
      {
        id: 'actor',
        header: 'Actor',
        accessorKey: 'actor',
        width: 180,
        sortable: true,
        filter: { type: 'text', placeholder: 'Filter by actor…' },
        cell: ({ getValue }) => (
          <span className="font-semibold text-[var(--text)] text-xs">{getValue() as string}</span>
        ),
      },
      {
        id: 'action',
        header: 'Operation / Action',
        accessorKey: 'action',
        width: 200,
        sortable: true,
        filter: {
          type: 'multi',
          options: [
            { value: 'TOKEN_REFRESH', label: 'TOKEN_REFRESH' },
            { value: 'LOGIN_SUCCESS', label: 'LOGIN_SUCCESS' },
            { value: 'CREATE', label: 'CREATE' },
            { value: 'DELETE', label: 'DELETE' },
            { value: 'SUSPEND', label: 'SUSPEND' },
            { value: 'ACTIVATE', label: 'ACTIVATE' },
            { value: 'PAYMENT', label: 'PAYMENT' },
          ],
        },
        cell: ({ getValue }) => {
          const val = getValue() as string;
          return (
            <Chip size="sm" color={getActionColor(val)}>
              {val}
            </Chip>
          );
        },
      },
      {
        id: 'resource',
        header: 'Entity Resource',
        accessorKey: 'resource',
        width: 140,
        sortable: true,
        filter: { type: 'text', placeholder: 'Filter by resource…' },
        cell: ({ getValue }) => (
          <span className="text-[var(--text-secondary)] text-xs">{getValue() as string}</span>
        ),
      },
      {
        id: 'resourceId',
        header: 'Resource Ref',
        accessorKey: 'resourceId',
        width: 240,
        sortable: false,
        cell: ({ getValue }) => {
          const val = getValue() as string | undefined;
          return (
            <span className="font-mono text-[var(--text)] text-[11px] truncate block">
              {val || '—'}
            </span>
          );
        },
      },
      {
        id: 'details',
        header: 'Audit Details',
        accessorKey: 'details',
        width: 320,
        sortable: false,
        filter: { type: 'text', placeholder: 'Search details…' },
        cell: ({ getValue }) => (
          <span className="text-[var(--text-secondary)] text-xs truncate block max-w-xs">
            {(getValue() as string) || '—'}
          </span>
        ),
      },
    ],
    []
  );

  const toolbarExtras = (
    <div className="flex items-center gap-2">
      {(actorIdFilter || actorLabelFilter) && (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--brand-soft)] text-[var(--brand)] text-xs font-medium border border-[var(--brand)]/20">
          <span>User: @{actorLabelFilter || actorIdFilter}</span>
          <button
            type="button"
            onClick={clearActorFilter}
            aria-label="Clear user filter"
            className="hover:text-rose-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </span>
      )}
      <Button variant="outline" size="sm" onClick={() => logsQuery.refetch()} disabled={logsQuery.isFetching}>
        <RefreshCw className={logsQuery.isFetching ? 'animate-spin w-4 h-4' : 'w-4 h-4'} />
        <span>Refresh Logs</span>
      </Button>
    </div>
  );

  return (
    <div className="space-y-6 pb-12 select-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-[24px] leading-tight font-semibold text-[var(--text)] tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-[var(--brand)]" /> System Audit Trail &amp;
            Compliance Logs
          </h2>
          <p className="text-[13px] text-[var(--text-muted)] mt-0.5">
            Tamper-evident activity logs tracking sensitive financial, subscriber, and network
            provisioning operations
          </p>
        </div>
      </div>

      <DataTable<AuditLog>
        viewKey="audit_logs"
        columns={columns}
        data={logs}
        loading={logsQuery.isLoading}
        fetching={logsQuery.isFetching}
        error={logsQuery.error ? 'Unable to load audit logs.' : null}
        onRetry={() => logsQuery.refetch()}
        rowId={(r) => r.id}
        searchPlaceholder="Search action, resource, actor, or details…"
        toolbarExtras={toolbarExtras}
        onRefresh={() => logsQuery.refetch()}
        emptyTitle="No matching audit records"
        emptySubtitle="Try adjusting your search or clearing active filters."
        noDataTitle="No audit logs yet"
        noDataDescription="Activity logs will appear here as operations are performed."
      />
    </div>
  );
};
