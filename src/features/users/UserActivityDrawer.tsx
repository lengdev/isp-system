import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Clock, ExternalLink, Globe, History, RotateCcw, Shield, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Drawer } from '../../components/ui/Drawer';
import { Button } from '../../components/ui/Button';
import { Chip, ChipColor } from '../../components/ui/Chip';
import { DatePicker } from '../../components/ui/DatePicker';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { Tooltip } from '../../components/ui/Tooltip';
import { api } from '../../lib/api';
import type { UserAuditLogItem, UserWithRoles } from '../../types/roles';

export interface UserActivityDrawerProps {
  user: UserWithRoles | null;
  onClose: () => void;
}

const PAGE_SIZE = 20;

function getActionChipColor(action: string): ChipColor {
  if (action.includes('DELETE') || action.includes('DEACTIVATE') || action.includes('LOCK') || action.includes('FAIL')) {
    return 'danger';
  }
  if (action.includes('CREATE') || action.includes('ACTIVATE') || action.includes('LOGIN_SUCCESS')) {
    return 'success';
  }
  if (action.includes('ROLE') || action.includes('PERMISSION') || action.includes('RESET')) {
    return 'warning';
  }
  return 'secondary';
}

function formatDetailsSummary(details: string | null): string {
  if (!details) return '';
  try {
    const parsed = JSON.parse(details);
    if (parsed && typeof parsed === 'object') {
      const parts: string[] = [];
      if (parsed.softDeleted !== undefined) {
        parts.push(parsed.softDeleted ? 'Soft-deleted (deactivated)' : 'Permanently deleted');
      }
      if (parsed.before && parsed.after) {
        const changedKeys = Object.keys(parsed.after);
        if (changedKeys.length > 0) {
          const diffs = changedKeys.map((k) => {
            const b = parsed.before[k];
            const a = parsed.after[k];
            const fmt = (v: any) => (Array.isArray(v) ? v.join(', ') : String(v ?? '—'));
            return `${k}: ${fmt(b)} → ${fmt(a)}`;
          });
          parts.push(diffs.join(' • '));
        }
      } else if (parsed.after) {
        const summaryKeys = Object.keys(parsed.after).filter((k) => k !== 'password' && k !== 'passwordHash');
        if (summaryKeys.length > 0) {
          parts.push(
            summaryKeys
              .map((k) => `${k}: ${Array.isArray(parsed.after[k]) ? parsed.after[k].join(', ') : String(parsed.after[k] ?? '—')}`)
              .join(' • ')
          );
        }
      }
      if (parts.length > 0) return parts.join(' — ');
    }
  } catch {
    // Plain text details
  }
  return details;
}

export const UserActivityDrawer: React.FC<UserActivityDrawerProps> = ({ user, onClose }) => {
  const [logs, setLogs] = useState<UserAuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLogs = useCallback(
    async (targetPage: number, append: boolean) => {
      if (!user) return;
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);

      try {
        const res = await api.auth.getUserLogs(user.id, {
          page: targetPage,
          pageSize: PAGE_SIZE,
          from: fromDate || undefined,
          to: toDate || undefined,
        });
        setLogs((prev) => (append ? [...prev, ...(res.items || [])] : res.items || []));
        setTotal(res.total || 0);
        setPage(targetPage);
      } catch (err: any) {
        setError(err?.message || 'Failed to load user activity logs');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [user, fromDate, toDate]
  );

  useEffect(() => {
    if (user) {
      setLogs([]);
      setTotal(0);
      setPage(1);
    } else {
      setFromDate('');
      setToDate('');
      setError(null);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user) {
      loadLogs(1, false);
    }
  }, [user, fromDate, toDate, loadLogs]);

  const auditLogsLink = user
    ? `/settings/audit?actorId=${encodeURIComponent(user.id)}&actor=${encodeURIComponent(user.username)}`
    : '/settings/audit';

  const hasMore = logs.length < total;

  return (
    <Drawer
      isOpen={Boolean(user)}
      onClose={onClose}
      width="lg"
      bodyClassName="px-6 py-5 max-sm:px-4"
      title={user ? `Activity: ${user.fullName}` : 'Activity'}
      subtitle={user ? `@${user.username} • ${user.email}` : undefined}
      headerRight={
        user ? (
          <Link
            to={auditLogsLink}
            onClick={onClose}
            className="inline-flex items-center gap-1.5 h-8 px-2.5 mr-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-subtle)] text-[11px] font-semibold text-[var(--brand)] whitespace-nowrap shrink-0 transition-colors shadow-[var(--shadow-xs)]"
          >
            <span>Open in Audit Logs</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        ) : null
      }
      footer={
        <div className="flex items-center justify-between w-full text-xs">
          <span className="text-[var(--text-muted)] tabular-nums">
            Showing {logs.length} of {total} events
          </span>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Date Filter Controls */}
        <div className="p-3.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border)] space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Filter by date
            </span>
            {(fromDate || toDate) && (
              <button
                type="button"
                onClick={() => {
                  setFromDate('');
                  setToDate('');
                }}
                className="text-[11px] font-medium text-[var(--brand)] hover:underline cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <DatePicker
              label={<span className="text-[11px] font-medium text-[var(--text-muted)]">From date</span>}
              aria-label="From date"
              size="sm"
              variant="bordered"
              value={fromDate}
              onChange={(_, dateStr) => setFromDate(dateStr)}
              maxDate={toDate || undefined}
              placeholder="mm / dd / yyyy"
              showFooter
            />
            <DatePicker
              label={<span className="text-[11px] font-medium text-[var(--text-muted)]">To date</span>}
              aria-label="To date"
              size="sm"
              variant="bordered"
              value={toDate}
              onChange={(_, dateStr) => setToDate(dateStr)}
              minDate={fromDate || undefined}
              placeholder="mm / dd / yyyy"
              showFooter
            />
          </div>
        </div>

        {/* Event List */}
        {loading ? (
          <div className="space-y-2.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-28 rounded-full" />
                  <Skeleton className="h-3.5 w-24 rounded" />
                </div>
                <Skeleton className="h-3.5 w-3/4 rounded" />
                <Skeleton className="h-3 w-1/2 rounded" />
              </div>
            ))}
          </div>
        ) : error ? (
          <EmptyState
            variant="error"
            title="Failed to load activity"
            description={error}
            primaryAction={{
              label: 'Retry',
              onClick: () => loadLogs(1, false),
              icon: <RotateCcw className="w-3.5 h-3.5" />,
            }}
          />
        ) : logs.length === 0 ? (
          <EmptyState
            variant="no-data"
            icon={<History className="w-6 h-6" />}
            title="No activity yet"
            description={
              fromDate || toDate
                ? 'No audit events match the selected date range.'
                : 'No audit events have been recorded for this user yet.'
            }
          />
        ) : (
          <div className="space-y-2.5">
            {logs.map((log) => {
              const summary = formatDetailsSummary(log.details);
              const eventDate = new Date(log.time || log.timestamp || log.createdAt);
              const ipAddr = log.ip || log.ipAddress;
              return (
                <div
                  key={log.id}
                  className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)] shadow-[var(--shadow-xs)] transition-colors space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 min-w-0">
                      <Chip size="sm" variant="flat" color={getActionChipColor(log.action)}>
                        {log.action}
                      </Chip>
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--text-secondary)]">
                        <Shield className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
                        <span>{log.resource}</span>
                      </span>
                    </div>

                    <Tooltip content={eventDate.toLocaleString()}>
                      <span className="inline-flex items-center gap-1 text-[11px] text-[var(--text-muted)] tabular-nums shrink-0">
                        <Clock className="w-3 h-3 shrink-0" />
                        <span>{formatDistanceToNow(eventDate, { addSuffix: true })}</span>
                      </span>
                    </Tooltip>
                  </div>

                  {summary && (
                    <p className="text-[12px] text-[var(--text)] leading-relaxed break-words">
                      {summary}
                    </p>
                  )}

                  {(log.actor || ipAddr) && (
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--border-subtle)] text-[11px] text-[var(--text-muted)]">
                      {log.actor ? (
                        <span className="inline-flex items-center gap-1.5 min-w-0 truncate">
                          <User className="w-3 h-3 shrink-0" />
                          <span className="truncate">
                            Actor: <span className="font-medium text-[var(--text-secondary)]">{log.actor}</span>
                          </span>
                        </span>
                      ) : (
                        <span />
                      )}
                      {ipAddr && (
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] tabular-nums shrink-0 px-1.5 py-0.5 rounded bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
                          <Globe className="w-3 h-3 shrink-0" />
                          <span>{ipAddr}</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {hasMore && (
              <div className="pt-2 flex justify-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  isLoading={loadingMore}
                  onClick={() => loadLogs(page + 1, true)}
                >
                  Load more ({total - logs.length} remaining)
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </Drawer>
  );
};
