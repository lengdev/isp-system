import React from 'react';
import { BarChart3, TrendingUp, Download, PieChart, Users, HardDrive } from 'lucide-react';
import {
  BarChart,
  Bar,
  PieChart as RePieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useStore } from '../store/useStore';
import { Button } from '../components/ui/Button';

export const ReportsPage: React.FC = () => {
  const customers = useStore((s) => s.customers);
  const plans = useStore((s) => s.plans);
  const addToast = useStore((s) => s.addToast);
  const currency = useStore((s) => s.currency);

  const planDistribution = plans.map((p) => ({
    name: p.name,
    count: customers.filter((c) => c.planName === p.name).length,
  }));

  const COLORS = ['#F26B3A', '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899', '#6366F1'];

  const handleExportReport = () => {
    addToast({
      type: 'success',
      title: 'Report Compiled',
      message: 'Monthly executive summary report generated.',
    });
  };

  return (
    <div className="space-y-6 pb-12 select-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tight">
            Analytics & Reports
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Subscriber acquisition, churn analytics, and plan saturation metrics
          </p>
        </div>
        <Button variant="primary" size="md" onClick={handleExportReport} className="text-xs font-bold">
          <Download className="w-4 h-4" />
          <span>Export Summary Report</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Plan Saturation */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#1C1C1F] border border-gray-200/80 dark:border-gray-800 shadow-soft space-y-4">
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
            Subscribers by Internet Tier
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={planDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="name" angle={-25} textAnchor="end" tick={{ fontSize: 9 }} interval={0} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1E1E22',
                    borderColor: '#333',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" fill="#F26B3A" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Churn & Retention breakdown */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#1C1C1F] border border-gray-200/80 dark:border-gray-800 shadow-soft space-y-4">
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
            Subscriber Health & Churn Risk
          </h3>
          <div className="space-y-3 text-xs pt-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30">
              <span className="font-semibold text-emerald-800 dark:text-emerald-300">Active Loyal Base (6+ mos)</span>
              <span className="font-bold text-emerald-600">88.4%</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30">
              <span className="font-semibold text-amber-800 dark:text-amber-300">Overdue Risk (15+ days)</span>
              <span className="font-bold text-amber-600">5.8%</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-red-50 dark:bg-red-950/30">
              <span className="font-semibold text-red-800 dark:text-red-300">Suspended / Churn Imminent</span>
              <span className="font-bold text-red-600">4.2%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
