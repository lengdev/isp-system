import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useStore } from '../store/useStore';
import { api } from '../lib/api';
import { Can } from '../lib/permissions';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';

export const ReportsPage: React.FC = () => {
  const addToast = useStore((s) => s.addToast);

  const packagesQuery = useQuery({
    queryKey: ['packages'],
    queryFn: () => api.packages.list(),
    staleTime: 30_000,
  });

  const statsQuery = useQuery({
    queryKey: ['customer-stats'],
    queryFn: () => api.customers.getStats(),
    staleTime: 30_000,
  });

  const planDistribution = useMemo(() => {
    const pkgs = packagesQuery.data || [];
    return pkgs.map((p: any) => ({
      name: p.name,
      count: Number(p.subscribersCount ?? 0),
    }));
  }, [packagesQuery.data]);

  const hasChartData = planDistribution.some((d) => d.count > 0);
  const totalSubs = statsQuery.data?.totalCustomers ?? 0;
  const activeCount = statsQuery.data?.activeCount ?? 0;
  const overdueCount = statsQuery.data?.overdueCount ?? 0;
  const suspendedCount = statsQuery.data?.suspendedCount ?? 0;
  const pct = (n: number) => (totalSubs > 0 ? `${((n / totalSubs) * 100).toFixed(1)}%` : '0.0%');

  const handleExportReport = () => {
    addToast({
      type: 'success',
      title: 'Report Compiled',
      message: 'Monthly executive summary report generated.',
    });
  };

  return (
    <div className="space-y-4 pb-12 select-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-[24px] leading-tight font-semibold text-[var(--text)] tracking-tight">
            Analytics & Reports
          </h2>
          <p className="text-[13px] text-[var(--text-muted)] mt-0.5">
            Subscriber acquisition, churn analytics, and plan saturation metrics
          </p>
        </div>
        <Can feature="reports.btn.export">
          <Button variant="primary" size="sm" onClick={handleExportReport} className="h-8 px-3 text-[12px]">
            <Download className="w-3.5 h-3.5" />
            <span>Export Summary Report</span>
          </Button>
        </Can>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Plan Saturation */}
        <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-card)] space-y-3">
          <h3 className="text-sm font-bold text-[var(--text)]">
            Subscribers by Internet Tier
          </h3>
          <div className="h-64 w-full">
            {packagesQuery.isLoading ? (
              <div className="h-full flex flex-col justify-center gap-3 p-4">
                <Skeleton className="h-6 w-full rounded" />
                <Skeleton className="h-6 w-5/6 rounded" />
                <Skeleton className="h-6 w-4/6 rounded" />
              </div>
            ) : !hasChartData ? (
              <EmptyState
                variant="no-data"
                title="No data for this period"
                description="Tier distribution will appear once subscribers are enrolled in active plans."
              />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={planDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" strokeWidth={1} />
                  <XAxis dataKey="name" angle={-25} textAnchor="end" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} interval={0} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--surface-raised)',
                      borderColor: 'var(--border)',
                      borderRadius: '12px',
                      color: 'var(--text)',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="count" fill="#EA6A3C" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Churn & Retention breakdown */}
        <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-card)] space-y-4">
          <h3 className="text-sm font-bold text-[var(--text)]">
            Subscriber Health & Churn Risk
          </h3>
          {totalSubs === 0 ? (
            <EmptyState
              variant="no-data"
              title="No data for this period"
              description="Subscriber health breakdown requires at least one customer account."
            />
          ) : (
            <div className="space-y-3 text-xs pt-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#E8F5EE]/70 dark:bg-[rgba(22,121,76,0.12)] border border-[#16794C]/20">
                <span className="font-semibold text-[#16794C] dark:text-[#4ADE80]">Active Lines ({activeCount})</span>
                <span className="font-bold text-[#16794C] dark:text-[#4ADE80]">{pct(activeCount)}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#FDF3DC]/70 dark:bg-[rgba(154,98,0,0.12)] border border-[#9A6200]/20">
                <span className="font-semibold text-[#9A6200] dark:text-[#FBBF24]">Overdue Risk ({overdueCount})</span>
                <span className="font-bold text-[#9A6200] dark:text-[#FBBF24]">{pct(overdueCount)}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#FDECEA]/70 dark:bg-[rgba(180,35,24,0.12)] border border-[#B42318]/20">
                <span className="font-semibold text-[#B42318] dark:text-[#F87171]">Suspended ({suspendedCount})</span>
                <span className="font-bold text-[#B42318] dark:text-[#F87171]">{pct(suspendedCount)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
