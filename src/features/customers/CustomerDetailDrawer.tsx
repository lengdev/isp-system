import React, { useState } from 'react';
import {
  X,
  CreditCard,
  Power,
  Edit2,
  Mail,
  Zap,
  Activity,
  Calendar,
  MapPin,
  Wifi,
  HardDrive,
  Clock,
  Shield,
  LifeBuoy,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Save,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useStore } from '../../store/useStore';
import { Drawer } from '../../components/ui/Drawer';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { StatusChangePopover } from './StatusChangePopover';
import { formatCurrency, formatDate } from '../../lib/utils';

export const CustomerDetailDrawer: React.FC = () => {
  const isDrawerOpen = useStore((s) => s.isDrawerOpen);
  const closeDrawer = useStore((s) => s.closeDrawer);
  const activeCustomerId = useStore((s) => s.activeCustomerId);
  const activeDrawerTab = useStore((s) => s.activeDrawerTab);
  const setDrawerTab = useStore((s) => s.setDrawerTab);
  const customers = useStore((s) => s.customers);
  const invoices = useStore((s) => s.invoices);
  const tickets = useStore((s) => s.tickets);
  const activities = useStore((s) => s.activities);
  const updateCustomer = useStore((s) => s.updateCustomer);
  const openModal = useStore((s) => s.openModal);
  const currency = useStore((s) => s.currency);

  const customer = customers.find((c) => c.id === activeCustomerId);

  const [notesText, setNotesText] = useState(customer?.notes || '');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // Update notes state when customer changes
  React.useEffect(() => {
    if (customer) {
      setNotesText(customer.notes || '');
    }
  }, [customer]);

  if (!customer) return null;

  const customerInvoices = invoices.filter((inv) => inv.customerId === customer.id);
  const customerTickets = tickets.filter((t) => t.customerId === customer.id);
  const customerActivities = activities.filter((act) => act.customerId === customer.id);

  // Generate 14-day realistic usage data for chart
  const usageChartData = [
    { day: 'Sep 04', download: 18.2, upload: 4.1 },
    { day: 'Sep 05', download: 24.5, upload: 5.6 },
    { day: 'Sep 06', download: 31.0, upload: 8.2 },
    { day: 'Sep 07', download: 28.4, upload: 6.9 },
    { day: 'Sep 08', download: 19.8, upload: 4.5 },
    { day: 'Sep 09', download: 22.1, upload: 5.1 },
    { day: 'Sep 10', download: 35.6, upload: 9.4 },
    { day: 'Sep 11', download: 41.2, upload: 11.0 },
    { day: 'Sep 12', download: 38.0, upload: 9.8 },
    { day: 'Sep 13', download: 29.5, upload: 7.2 },
    { day: 'Sep 14', download: 33.2, upload: 8.5 },
    { day: 'Sep 15', download: 44.1, upload: 12.3 },
    { day: 'Sep 16', download: 36.8, upload: 9.1 },
    { day: 'Sep 17', download: 27.5, upload: 6.8 },
  ];

  const handleSaveNotes = async () => {
    setIsSavingNotes(true);
    await updateCustomer(customer.id, { notes: notesText });
    setIsSavingNotes(false);
  };

  const tabs: { id: typeof activeDrawerTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'billing', label: `Billing (${customerInvoices.length})` },
    { id: 'usage', label: 'Traffic & Usage' },
    { id: 'tickets', label: `Tickets (${customerTickets.length})` },
    { id: 'activity', label: 'Activity Log' },
    { id: 'notes', label: 'Notes' },
  ];

  return (
    <Drawer
      isOpen={isDrawerOpen}
      onClose={closeDrawer}
      width="xl"
      title={
        <div className="flex items-center gap-3">
          <Avatar name={customer.fullName} size="md" online={customer.onlineStatus === 'online'} />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-900 dark:text-gray-100">{customer.fullName}</span>
              <StatusChangePopover currentStatus={customer.status} customerId={customer.id} />
            </div>
            <p className="text-[11px] text-gray-400">
              {customer.code} • {customer.planName}
            </p>
          </div>
        </div>
      }
    >
      <div className="p-6 space-y-6">
        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <Button
            size="sm"
            variant="softOrange"
            onClick={() => openModal('addEditCustomer', { customerId: customer.id })}
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit Profile</span>
          </Button>

          <Button
            size="sm"
            variant="secondary"
            onClick={() => openModal('recordPayment', { customerId: customer.id })}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Record Payment</span>
          </Button>

          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              openModal('statusConfirmation', {
                customerIds: [customer.id],
                targetStatus: customer.status === 'Suspended' ? 'Active' : 'Suspended',
              })
            }
          >
            <Power className="w-3.5 h-3.5" />
            <span>{customer.status === 'Suspended' ? 'Activate' : 'Suspend'}</span>
          </Button>

          <Button
            size="sm"
            variant="secondary"
            onClick={() => openModal('sendMessage', { customerId: customer.id, isBulk: false })}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Send Message</span>
          </Button>

          <Button
            size="sm"
            variant="secondary"
            onClick={() => openModal('speedTest', { customerId: customer.id })}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Speed Test</span>
          </Button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center border-b border-gray-200 dark:border-gray-800 gap-1 overflow-x-auto scrollbar-none">
          {tabs.map((tab) => {
            const isActive = activeDrawerTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setDrawerTab(tab.id)}
                className={`px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-colors border-b-2 -mb-[2px] ${
                  isActive
                    ? 'border-[#F26B3A] text-[#F26B3A]'
                    : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeDrawerTab === 'overview' && (
          <div className="space-y-5 text-xs">
            {/* Balance banner */}
            <div
              className={`p-4 rounded-2xl flex items-center justify-between ${
                customer.balanceDue > 0
                  ? 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50'
                  : 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50'
              }`}
            >
              <div>
                <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 block">
                  Account Balance Due
                </span>
                <span
                  className={`text-2xl font-black ${
                    customer.balanceDue > 0 ? 'text-red-600' : 'text-emerald-600'
                  }`}
                >
                  {currency}{customer.balanceDue.toFixed(2)}
                </span>
              </div>
              {customer.balanceDue > 0 ? (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => openModal('recordPayment', { customerId: customer.id })}
                >
                  Pay Balance
                </Button>
              ) : (
                <div className="flex items-center gap-1.5 text-emerald-600 font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Account Current</span>
                </div>
              )}
            </div>

            {/* Technical Specifications */}
            <div className="p-4.5 rounded-2xl bg-gray-50/70 dark:bg-[#1E1E22] border border-gray-200/80 dark:border-gray-800 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Network & Connection
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-gray-400 block text-[11px]">IP Address</span>
                  <span className="font-mono font-semibold text-gray-800 dark:text-gray-200">
                    {customer.ipAddress}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[11px]">MAC Address</span>
                  <span className="font-mono font-semibold text-gray-800 dark:text-gray-200">
                    {customer.macAddress}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[11px]">Connection Type</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {customer.connectionType}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[11px]">Line Latency</span>
                  <span className="font-semibold text-emerald-600">
                    {customer.lastPingMs} ms (Healthy)
                  </span>
                </div>
              </div>
            </div>

            {/* Account Info */}
            <div className="p-4.5 rounded-2xl bg-gray-50/70 dark:bg-[#1E1E22] border border-gray-200/80 dark:border-gray-800 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Contact & Address
              </h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Email:</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">{customer.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Phone:</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">{customer.phone}</span>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <span className="text-gray-400">Address:</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200 text-right">
                    {customer.address}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Installation Date:</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {formatDate(customer.installationDate)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: BILLING */}
        {activeDrawerTab === 'billing' && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-gray-900 dark:text-gray-100">Invoices & Charges</h4>
              <Button
                size="sm"
                variant="primary"
                onClick={() => openModal('recordPayment', { customerId: customer.id })}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Record Payment</span>
              </Button>
            </div>

            {customerInvoices.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                No past invoices on file for this account.
              </div>
            ) : (
              <div className="space-y-2.5">
                {customerInvoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-3.5 rounded-xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-[#1E1E22] flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-gray-900 dark:text-gray-100">{inv.invoiceNumber}</div>
                      <div className="text-[11px] text-gray-400">
                        Date: {formatDate(inv.date)} • Due: {formatDate(inv.dueDate)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-sm text-gray-900 dark:text-gray-100">
                        {currency}{inv.amount.toFixed(2)}
                      </div>
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          inv.status === 'Paid'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60'
                            : 'bg-red-100 text-red-700 dark:bg-red-950/60'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: USAGE CHART */}
        {activeDrawerTab === 'usage' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  14-Day Traffic Consumption
                </h4>
                <p className="text-xs text-gray-400">Daily aggregate Download vs Upload in GB</p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1 text-[#F26B3A] font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#F26B3A]" /> Download
                </span>
                <span className="flex items-center gap-1 text-blue-500 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Upload
                </span>
              </div>
            </div>

            <div className="h-64 w-full bg-gray-50/50 dark:bg-[#1E1E22] p-2 rounded-2xl border border-gray-200/80 dark:border-gray-800">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={usageChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="downloadGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F26B3A" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#F26B3A" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="uploadGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
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
                    dataKey="download"
                    stroke="#F26B3A"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#downloadGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="upload"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#uploadGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#1E1E22] border border-gray-200/60 dark:border-gray-800">
                <span className="text-[10px] text-gray-400 block">Current Month</span>
                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  {customer.dataUsageGB} GB
                </span>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#1E1E22] border border-gray-200/60 dark:border-gray-800">
                <span className="text-[10px] text-gray-400 block">Peak Speed</span>
                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  482 Mbps
                </span>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#1E1E22] border border-gray-200/60 dark:border-gray-800">
                <span className="text-[10px] text-gray-400 block">Bandwidth Cap</span>
                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  {customer.dataCapGB ? `${customer.dataCapGB} GB` : 'Unlimited'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: TICKETS */}
        {activeDrawerTab === 'tickets' && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-gray-900 dark:text-gray-100">Support Requests</h4>
              <Button
                size="sm"
                variant="primary"
                onClick={() => openModal('createTicket', { customerId: customer.id })}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Open Ticket</span>
              </Button>
            </div>

            {customerTickets.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                No support tickets found for this subscriber.
              </div>
            ) : (
              <div className="space-y-2.5">
                {customerTickets.map((t) => (
                  <div
                    key={t.id}
                    className="p-3.5 rounded-xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-[#1E1E22] space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-900 dark:text-gray-100">{t.ticketNumber}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
                        {t.status}
                      </span>
                    </div>
                    <div className="font-semibold text-gray-800 dark:text-gray-200">{t.title}</div>
                    <p className="text-[11px] text-gray-500 line-clamp-2">{t.description}</p>
                    <div className="text-[10px] text-gray-400 pt-1">
                      Assigned: {t.assignedTechnician || 'Unassigned'} • Priority: {t.priority}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: ACTIVITY LOG */}
        {activeDrawerTab === 'activity' && (
          <div className="space-y-3 text-xs">
            <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-2">Audit History</h4>
            {customerActivities.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                No recent activity records for this subscriber.
              </div>
            ) : (
              <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200 dark:before:bg-gray-800">
                {customerActivities.map((act) => (
                  <div key={act.id} className="relative">
                    <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-[#F26B3A] ring-4 ring-white dark:ring-[#1A1A1D]" />
                    <div className="font-bold text-gray-900 dark:text-gray-100">{act.action}</div>
                    <p className="text-[11px] text-gray-500">{act.details}</p>
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      {act.actor} • {act.timestamp}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 6: NOTES */}
        {activeDrawerTab === 'notes' && (
          <div className="space-y-3 text-xs">
            <h4 className="font-bold text-gray-900 dark:text-gray-100">Internal Operational Notes</h4>
            <p className="text-[11px] text-gray-400">
              Only visible to technicians and network administrators.
            </p>
            <textarea
              rows={6}
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              placeholder="Add technician handover notes, fiber optic color code, special access codes..."
              className="w-full p-3 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#18181B] text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#F26B3A]"
            />
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="primary"
                isLoading={isSavingNotes}
                onClick={handleSaveNotes}
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Notes</span>
              </Button>
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
};
