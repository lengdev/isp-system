import React from 'react';
import {
  Users,
  DollarSign,
  Wifi,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Radio,
  CheckCircle2,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useStore } from '../store/useStore';
import { StatCard } from '../components/ui/StatCard';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useNavigate } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const customers = useStore((s) => s.customers);
  const plans = useStore((s) => s.plans);
  const tickets = useStore((s) => s.tickets);
  const activities = useStore((s) => s.activities);
  const devices = useStore((s) => s.devices);
  const currency = useStore((s) => s.currency);
  const navigate = useNavigate();

  const totalSubs = customers.length;
  const activeSubs = customers.filter((c) => c.status === 'Active').length;
  const overdueSubs = customers.filter((c) => c.status === 'Overdue').length;
  const mrr = customers.reduce((acc, c) => acc + (c.status !== 'Disconnected' ? c.monthlyPrice : 0), 0);

  // Network Traffic Data (hourly Gbps)
  const trafficData = [
    { time: '00:00', downloadGbps: 4.2, uploadGbps: 1.1 },
    { time: '03:00', downloadGbps: 2.1, uploadGbps: 0.8 },
    { time: '06:00', downloadGbps: 5.8, uploadGbps: 1.9 },
    { time: '09:00', downloadGbps: 14.5, uploadGbps: 4.8 },
    { time: '12:00', downloadGbps: 18.2, uploadGbps: 5.9 },
    { time: '15:00', downloadGbps: 19.8, uploadGbps: 6.2 },
    { time: '18:00', downloadGbps: 26.4, uploadGbps: 8.5 },
    { time: '21:00', downloadGbps: 28.9, uploadGbps: 9.1 },
    { time: '23:00', downloadGbps: 15.6, uploadGbps: 4.2 },
  ];

  // Revenue trend (last 6 months)
  const revenueData = [
    { month: 'Apr', revenue: 12400 },
    { month: 'May', revenue: 13800 },
    { month: 'Jun', revenue: 14200 },
    { month: 'Jul', revenue: 15100 },
    { month: 'Aug', revenue: 15900 },
    { month: 'Sep', revenue: Math.round(mrr) },
  ];

  return (
    <div className="space-y-6 pb-12 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tight">
            Network Operations Dashboard
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Real-time subscriber metrics, bandwidth saturation, and field service status
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" onClick={() => navigate('/customers')}>
            <span>View All Subscribers</span>
          </Button>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Subscribers"
          value={totalSubs}
          changeValue="+14 subs"
          isPositive={true}
          changeLabel="vs last month"
          icon={<Users className="w-6 h-6 stroke-[2.2]" />}
          iconBgColor="bg-[#FFF1EA] dark:bg-orange-950/40"
          iconTextColor="text-[#F26B3A]"
        />

        <StatCard
          label="Monthly Recurring Revenue"
          value={Math.round(mrr)}
          prefix={currency}
          changeValue="↑ 8.4%"
          isPositive={true}
          changeLabel="vs last month"
          icon={<DollarSign className="w-6 h-6 stroke-[2.2]" />}
          iconBgColor="bg-[#EEF4FF] dark:bg-blue-950/40"
          iconTextColor="text-[#3B82F6]"
        />

        <StatCard
          label="Active Connected Lines"
          value={activeSubs}
          changeValue="95.8% up"
          isPositive={true}
          changeLabel="active ratio"
          icon={<Wifi className="w-6 h-6 stroke-[2.2]" />}
          iconBgColor="bg-[#F5EEFF] dark:bg-purple-950/40"
          iconTextColor="text-[#8B5CF6]"
        />

        <StatCard
          label="Past Due Balances"
          value={overdueSubs}
          suffix=" subs"
          changeValue="4.2% churn"
          isPositive={false}
          changeLabel="needs follow-up"
          icon={<AlertTriangle className="w-6 h-6 stroke-[2.2]" />}
          iconBgColor="bg-[#FDEEEE] dark:bg-red-950/40"
          iconTextColor="text-[#DC2626]"
        />
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bandwidth Saturation Chart (2 Cols) */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-[#1C1C1F] border border-gray-200/80 dark:border-gray-800 shadow-soft space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                Core Backbone Traffic (Gbps)
              </h3>
              <p className="text-xs text-gray-400">Aggregated transit utilization across OLT clusters</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-[#F26B3A] font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-[#F26B3A]" /> Download
              </span>
              <span className="flex items-center gap-1.5 text-blue-500 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Upload
              </span>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trafficData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="downGbps" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F26B3A" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#F26B3A" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="upGbps" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} unit="G" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1E1E22',
                    borderColor: '#333',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="downloadGbps"
                  stroke="#F26B3A"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#downGbps)"
                />
                <Area
                  type="monotone"
                  dataKey="uploadGbps"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#upGbps)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue Growth Bar Chart */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#1C1C1F] border border-gray-200/80 dark:border-gray-800 shadow-soft space-y-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
              MRR Growth Trend
            </h3>
            <p className="text-xs text-gray-400">Monthly Recurring Revenue trajectory</p>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1E1E22',
                    borderColor: '#333',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                  formatter={(val: number) => [`${currency}${val}`, 'Revenue']}
                />
                <Bar dataKey="revenue" fill="#F26B3A" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Section: Network Hardware Status & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Device Status */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#1C1C1F] border border-gray-200/80 dark:border-gray-800 shadow-soft space-y-3.5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Radio className="w-4 h-4 text-[#F26B3A]" />
              <span>Core Network Hardware Health</span>
            </h3>
            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
              4 of 4 Operational
            </span>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-800/80">
            {devices.map((dev) => (
              <div key={dev.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-gray-800 dark:text-gray-200">{dev.name}</div>
                  <div className="text-[11px] text-gray-400">
                    {dev.ipAddress} • {dev.location}
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      dev.status === 'Online'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {dev.status} ({dev.lastPingMs}ms)
                  </span>
                  <div className="text-[10px] text-gray-400 mt-0.5">CPU: {dev.cpuLoadPercent}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Audit Activities */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#1C1C1F] border border-gray-200/80 dark:border-gray-800 shadow-soft space-y-3.5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#F26B3A]" />
              <span>Recent Activity Feed</span>
            </h3>
            <span className="text-xs text-gray-400">Live events</span>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-800/80">
            {activities.slice(0, 4).map((act) => (
              <div key={act.id} className="py-2.5 flex items-start gap-3 text-xs">
                <span className="mt-1 w-2 h-2 rounded-full bg-[#F26B3A] shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-gray-800 dark:text-gray-200">{act.action}</div>
                  <p className="text-[11px] text-gray-500 truncate">{act.details}</p>
                </div>
                <span className="text-[10px] text-gray-400 shrink-0">{act.timestamp}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
