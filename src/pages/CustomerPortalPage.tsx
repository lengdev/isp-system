import React, { useState, useEffect } from 'react';
import {
  Wifi,
  Receipt,
  LifeBuoy,
  CreditCard,
  QrCode,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Send,
  Download,
  Lock,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Chip } from '../components/ui/Chip';
import { Field, Input } from '../components/ui/Field';
import { Modal } from '../components/ui/Modal';
import { useStore } from '../store/useStore';
import { api } from '../lib/api';
import { BRAND_NAME } from '../lib/brand';

export const CustomerPortalPage: React.FC = () => {
  const addToast = useStore((s) => s.addToast);
  const currency = useStore((s) => s.currency) || '$';

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginInput, setLoginInput] = useState('CUST-1001'); // default demo customer
  const [customer, setCustomer] = useState<any>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Ticket Modal
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [ticketTitle, setTicketTitle] = useState('');
  const [ticketDesc, setTicketDesc] = useState('');

  // KHQR Pay Modal
  const [isKhqrOpen, setIsKhqrOpen] = useState(false);
  const [khqrData, setKhqrData] = useState<any>(null);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      const res = await api.portal.login(loginInput);
      setCustomer(res.customer);
      setIsLoggedIn(true);

      const fullProfile = await api.portal.getDashboard(res.customer.id);
      setProfileData(fullProfile);
      addToast({ type: 'success', title: `Welcome, ${res.customer.fullName}!` });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Login Failed', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handlePayInvoice = async (amount: number) => {
    try {
      const data = await api.portal.payKHQR(customer.id, amount);
      setKhqrData(data);
      setIsKhqrOpen(true);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Payment Initiation Failed', message: err.message });
    }
  };

  const handleSubmitTicket = async () => {
    try {
      await api.portal.submitTicket({
        customerId: customer.id,
        title: ticketTitle,
        description: ticketDesc,
        priority: 'MEDIUM',
      });
      addToast({ type: 'success', title: 'Ticket Submitted', message: 'Our support team will respond shortly.' });
      setIsTicketModalOpen(false);
      setTicketTitle('');
      setTicketDesc('');
      const fullProfile = await api.portal.getDashboard(customer.id);
      setProfileData(fullProfile);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Submission Failed', message: err.message });
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4 select-none">
        <div className="w-full max-w-md p-8 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-xl space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 rounded-2xl bg-[var(--brand)] text-white shadow-lg shadow-orange-500/20">
              <Wifi className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-[var(--text)] tracking-tight">{BRAND_NAME} Customer Portal</h2>
            <p className="text-xs text-[var(--text-muted)]">
              Log in to view broadband speed, pay invoices via KHQR, and request technical support
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <Field label="Subscriber ID or Registered Email">
              <Input
                placeholder="e.g. CUST-1001 or sarah.c@gmail.com"
                value={loginInput}
                onChange={(e) => setLoginInput(e.target.value)}
              />
            </Field>

            <Button type="submit" variant="primary" className="w-full" disabled={loading}>
              {loading ? 'Authenticating...' : 'Access My Account'}
            </Button>
          </form>

          <div className="p-3 bg-[var(--surface-hover)] rounded-xl border border-[var(--border)] text-[11px] text-[var(--text-secondary)] text-center">
            Demo subscriber logins: <strong>CUST-1001</strong> (Sarah Chen) or <strong>CUST-1003</strong> (Apex Digital)
          </div>
        </div>
      </div>
    );
  }

  const cust = profileData?.customer || customer;
  const net = profileData?.networkInfo;
  const invoices = profileData?.invoices || [];
  const tickets = profileData?.tickets || [];

  return (
    <div className="space-y-6 pb-12 select-none max-w-5xl mx-auto">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-orange-200">Self-Service Subscriber Portal</span>
          <h2 className="text-2xl font-bold mt-1">{cust?.fullName}</h2>
          <div className="text-xs text-orange-100 mt-0.5">Account: {cust?.code} • {cust?.email}</div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="bg-white/10 text-white border-white/20 hover:bg-white/20" onClick={() => setIsLoggedIn(false)}>
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </Button>
        </div>
      </div>

      {/* Subscription & Speed Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-card)] space-y-2">
          <div className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Broadband Package</div>
          <div className="text-xl font-bold text-[var(--brand)]">{cust?.planName}</div>
          <div className="text-xs text-[var(--text-secondary)]">Technology: {cust?.connectionType} FTTH</div>
          <div className="pt-2 border-t border-[var(--border)]">
            <Chip size="sm" color={cust?.status === 'ACTIVE' ? 'success' : 'danger'}>
              Service: {cust?.status}
            </Chip>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-card)] space-y-2">
          <div className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Terminal Equipment</div>
          <div className="text-xl font-bold text-[var(--text)]">{cust?.routerModel || 'Huawei HG8245H5'}</div>
          <div className="text-xs font-mono text-[var(--text-muted)]">MAC: {net?.macAddress || '48:8F:5A:12:44:01'}</div>
          <div className="pt-2 border-t border-[var(--border)] text-xs text-emerald-600 font-semibold">
            Optical Signal: -19.4 dBm (Excellent)
          </div>
        </div>

        <div className="p-5 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-card)] space-y-2">
          <div className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Balance Due</div>
          <div className={`text-2xl font-bold ${cust?.balanceDue > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {currency}{Number(cust?.balanceDue || 0).toFixed(2)}
          </div>
          <div className="text-xs text-[var(--text-muted)]">Monthly fee: ${cust?.monthlyPrice || 55}/mo</div>
          {cust?.balanceDue > 0 && (
            <div className="pt-2">
              <Button variant="primary" size="sm" onClick={() => handlePayInvoice(cust.balanceDue)}>
                <QrCode className="w-3.5 h-3.5" />
                <span>Pay with Bakong KHQR</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Invoices List */}
      <div className="p-5 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-card)] space-y-4">
        <h3 className="text-sm font-bold text-[var(--text)] uppercase tracking-wider flex items-center gap-2">
          <Receipt className="w-4 h-4 text-[var(--brand)]" /> Invoices & Billing Statements
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--text-muted)]">
                <th className="py-2.5 px-3">Invoice #</th>
                <th className="py-2.5 px-3">Billing Period</th>
                <th className="py-2.5 px-3">Due Date</th>
                <th className="py-2.5 px-3 text-right">Amount</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Pay</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {invoices.map((inv: any) => (
                <tr key={inv.id} className="hover:bg-[var(--surface-hover)]">
                  <td className="py-3 px-3 font-bold text-[var(--brand)]">{inv.invoiceNumber}</td>
                  <td className="py-3 px-3 text-[var(--text)]">{inv.billingPeriod || 'Current'}</td>
                  <td className="py-3 px-3 text-[var(--text-muted)]">{new Date(inv.dueDate).toLocaleDateString()}</td>
                  <td className="py-3 px-3 text-right font-bold text-[var(--text)]">{currency}{Number(inv.amount).toFixed(2)}</td>
                  <td className="py-3 px-3">
                    <Chip size="sm" color={inv.status === 'PAID' ? 'success' : 'danger'}>
                      {inv.status}
                    </Chip>
                  </td>
                  <td className="py-3 px-3 text-right">
                    {inv.status !== 'PAID' ? (
                      <Button variant="outline" size="sm" onClick={() => handlePayInvoice(inv.balanceDue)}>
                        <QrCode className="w-3 h-3 text-[var(--brand)]" />
                        <span>Pay KHQR</span>
                      </Button>
                    ) : (
                      <span className="text-emerald-600 font-semibold">Settled</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Support Tickets */}
      <div className="p-5 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-card)] space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[var(--text)] uppercase tracking-wider flex items-center gap-2">
            <LifeBuoy className="w-4 h-4 text-[var(--brand)]" /> Technical Support & Helpdesk
          </h3>
          <Button variant="outline" size="sm" onClick={() => setIsTicketModalOpen(true)}>
            <Send className="w-3.5 h-3.5" />
            <span>Open Support Ticket</span>
          </Button>
        </div>

        <div className="divide-y divide-[var(--border)]">
          {tickets.length === 0 ? (
            <div className="py-6 text-center text-xs text-[var(--text-muted)]">No support requests on file.</div>
          ) : (
            tickets.map((t: any) => (
              <div key={t.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-xs text-[var(--text)]">{t.title}</div>
                  <div className="text-[11px] text-[var(--text-muted)] mt-0.5">{t.description}</div>
                </div>
                <Chip size="sm" color={t.status === 'RESOLVED' ? 'success' : 'warning'}>
                  {t.status}
                </Chip>
              </div>
            ))
          )}
        </div>
      </div>

      {/* SUBMIT TICKET MODAL */}
      <Modal isOpen={isTicketModalOpen} onClose={() => setIsTicketModalOpen(false)} title="Open Technical Support Ticket">
        <div className="space-y-4 text-xs">
          <Field label="Issue Summary">
            <Input
              placeholder="e.g. Red optical LOS light flashing on router"
              value={ticketTitle}
              onChange={(e) => setTicketTitle(e.target.value)}
            />
          </Field>

          <Field label="Problem Details">
            <textarea
              rows={4}
              className="w-full text-xs p-2.5 rounded bg-[var(--surface)] border border-[var(--border)] text-[var(--text)]"
              placeholder="Please describe when the issue started and any troubleshooting attempted..."
              value={ticketDesc}
              onChange={(e) => setTicketDesc(e.target.value)}
            />
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsTicketModalOpen(false)}>Cancel</Button>
            <Button variant="primary" disabled={!ticketTitle || !ticketDesc} onClick={handleSubmitTicket}>
              Submit Request
            </Button>
          </div>
        </div>
      </Modal>

      {/* BAKONG KHQR MODAL */}
      <Modal isOpen={isKhqrOpen} onClose={() => setIsKhqrOpen(false)} title="Pay via National Bank of Cambodia (Bakong)">
        <div className="flex flex-col items-center justify-center p-4 space-y-4 text-center">
          <div className="p-3 bg-red-600 rounded-xl text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2">
            <QrCode className="w-4 h-4" /> KHQR Instant Settlement
          </div>

          <div className="p-4 bg-white rounded-2xl border-4 border-red-500 shadow-md">
            <div className="w-48 h-48 bg-gray-900 flex flex-col items-center justify-center text-white rounded-lg p-2 font-mono text-[9px] break-all leading-tight">
              <QrCode className="w-24 h-24 text-white mb-2" />
              <span>SCAN IN ABA / WING / ACLEDA</span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-xl font-bold text-[var(--text)]">${khqrData?.amount?.toFixed(2)} USD</div>
            <div className="text-xs text-[var(--text-muted)]">{BRAND_NAME} Broadband ({khqrData?.merchantId})</div>
          </div>

          <Button variant="primary" onClick={() => setIsKhqrOpen(false)}>Close</Button>
        </div>
      </Modal>
    </div>
  );
};
