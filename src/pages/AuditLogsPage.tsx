import React, { useState, useEffect } from 'react';
import { ShieldCheck, RefreshCw, Search, Download, Clock, User, Filter } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Chip } from '../components/ui/Chip';
import { Field, Input } from '../components/ui/Field';
import { useStore } from '../store/useStore';
import { api } from '../lib/api';

export const AuditLogsPage: React.FC = () => {
  const addToast = useStore((s) => s.addToast);
  const [logs, setLogs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await api.settings.getAuditLogs();
      setLogs(data);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed to load audit logs', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filtered = logs.filter(
    (l) =>
      l.action?.toLowerCase().includes(search.toLowerCase()) ||
      l.resource?.toLowerCase().includes(search.toLowerCase()) ||
      l.actor?.toLowerCase().includes(search.toLowerCase()) ||
      l.details?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12 select-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-[24px] leading-tight font-semibold text-[var(--text)] tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-[var(--brand)]" /> System Audit Trail & Compliance Logs
          </h2>
          <p className="text-[13px] text-[var(--text-muted)] mt-0.5">
            Tamper-evident activity logs tracking sensitive financial, subscriber, and network provisioning operations
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="outline" size="sm" onClick={loadLogs} disabled={loading}>
            <RefreshCw className={loading ? 'animate-spin w-4 h-4' : 'w-4 h-4'} />
            <span>Refresh Logs</span>
          </Button>
        </div>
      </div>

      <div className="p-5 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-card)] space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="w-full max-w-sm">
            <Input
              placeholder="Search action, resource, actor, or details..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <span className="text-xs font-mono text-[var(--text-muted)]">{filtered.length} audit records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--text-muted)]">
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Actor</th>
                <th className="py-2.5 px-3">Operation / Action</th>
                <th className="py-2.5 px-3">Entity Resource</th>
                <th className="py-2.5 px-3">Resource Ref</th>
                <th className="py-2.5 px-3">Audit Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filtered.map((log) => (
                <tr key={log.id} className="hover:bg-[var(--surface-hover)]">
                  <td className="py-3 px-3 text-[var(--text-muted)]">{new Date(log.timestamp).toLocaleString()}</td>
                  <td className="py-3 px-3 font-sans font-semibold text-[var(--text)]">{log.actor}</td>
                  <td className="py-3 px-3">
                    <Chip
                      size="sm"
                      color={
                        log.action?.includes('DELETE') || log.action?.includes('SUSPEND')
                          ? 'danger'
                          : log.action?.includes('CREATE') || log.action?.includes('PAYMENT') || log.action?.includes('COMPLETE')
                          ? 'success'
                          : 'secondary'
                      }
                    >
                      {log.action}
                    </Chip>
                  </td>
                  <td className="py-3 px-3 font-sans text-[var(--text-secondary)]">{log.resource}</td>
                  <td className="py-3 px-3 font-bold text-[var(--brand)]">{log.resourceId || '-'}</td>
                  <td className="py-3 px-3 font-sans text-[var(--text-secondary)] max-w-md truncate">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
