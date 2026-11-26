import React, { useState, useEffect, useMemo } from 'react';
import {
  Wrench,
  Calendar,
  CheckCircle2,
  Clock,
  Plus,
  RefreshCw,
  Signal,
  Check,
  User,
  MapPin,
  Barcode,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Chip } from '../components/ui/Chip';
import { DatePicker, formatToISODate } from '../components/ui/DatePicker';
import { Field, Input } from '../components/ui/Field';
import { Modal } from '../components/ui/Modal';
import { Combobox, ComboboxOption } from '../components/ui/Combobox';
import { TableStateBody } from '../components/ui/TableState';
import { Can, useCan } from '../lib/permissions';
import { useStore } from '../store/useStore';
import { api } from '../lib/api';

const TIME_SLOT_OPTIONS: ComboboxOption[] = [
  { value: '09:00 - 11:00 AM', label: '09:00 - 11:00 AM' },
  { value: '11:00 - 01:00 PM', label: '11:00 - 01:00 PM' },
  { value: '02:00 - 04:00 PM', label: '02:00 - 04:00 PM' },
  { value: '04:00 - 06:00 PM', label: '04:00 - 06:00 PM' },
];

export const InstallationsPage: React.FC = () => {
  const addToast = useStore((s) => s.addToast);
  const canManageInstallations = useCan('installations.manage');
  const [installations, setInstallations] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // New Work Order Modal
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedTech, setSelectedTech] = useState('tech-1');
  const [schedDate, setSchedDate] = useState(() => formatToISODate(new Date()));
  const [timeSlot, setTimeSlot] = useState('09:00 - 11:00 AM');
  const [instNotes, setInstNotes] = useState('');

  // Complete Installation Modal
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [activeInstId, setActiveInstId] = useState('');
  const [ontSerial, setOntSerial] = useState('SN-HW-2026-0005');
  const [opticalPower, setOpticalPower] = useState(-19.5);
  const [completionNotes, setCompletionNotes] = useState('');

  const customerOptions: ComboboxOption[] = useMemo(
    () => customers.map((c) => ({ value: c.id, label: `${c.code} - ${c.fullName} (${c.planName})` })),
    [customers]
  );

  const technicianOptions: ComboboxOption[] = useMemo(
    () => technicians.map((t) => ({ value: t.id, label: `${t.name} (${t.zone})` })),
    [technicians]
  );

  const loadData = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [instRes, custRes, techRes] = await Promise.all([
        api.operations.getInstallations(),
        api.customers.listPaged({ page: 1, limit: 100 }).then((r) => r.items || []).catch(() => []),
        api.operations.getTechnicians().catch(() => []),
      ]);
      setInstallations(Array.isArray(instRes) ? instRes : []);
      setCustomers(Array.isArray(custRes) ? custRes : []);
      setTechnicians(Array.isArray(techRes) ? techRes : []);
      if (custRes.length > 0 && !selectedCustomer) setSelectedCustomer(custRes[0].id);
    } catch (err: any) {
      setLoadError('Unable to load installation work orders.');
      addToast({ type: 'error', title: 'Failed to load installations', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateOrder = async () => {
    try {
      await api.operations.createInstallation({
        customerId: selectedCustomer,
        technicianId: selectedTech,
        scheduledDate: schedDate,
        timeSlot,
        notes: instNotes,
      });
      addToast({ type: 'success', title: 'Work Order Dispatched', message: 'Installation order scheduled.' });
      setIsNewModalOpen(false);
      loadData();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Dispatch Failed', message: err.message });
    }
  };

  const handleCompleteOrder = async () => {
    try {
      await api.operations.completeInstallation(activeInstId, {
        assignedOntSn: ontSerial,
        opticalPowerDbm: Number(opticalPower),
        notes: completionNotes,
        actor: 'Marcus Vance',
      });
      addToast({
        type: 'success',
        title: 'Installation Activated!',
        message: 'ONT assigned, PPPoE provisioned on MikroTik, subscriber activated, first invoice generated.',
      });
      setIsCompleteModalOpen(false);
      loadData();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Activation Failed', message: err.message });
    }
  };

  return (
    <div className="space-y-6 pb-12 select-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-[24px] leading-tight font-semibold text-[var(--text)] tracking-tight">
            Installation Work Orders & Dispatch
          </h2>
          <p className="text-[13px] text-[var(--text-muted)] mt-0.5">
            End-to-end optical fiber drops, field technician dispatch, and MikroTik automated provisioning
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className={loading ? 'animate-spin w-4 h-4' : 'w-4 h-4'} />
            <span>Refresh</span>
          </Button>
          <Can permission="installations.manage">
            <Button variant="primary" size="sm" onClick={() => setIsNewModalOpen(true)}>
              <Plus className="w-4 h-4" />
              <span>Schedule Work Order</span>
            </Button>
          </Can>
        </div>
      </div>

      <div className="p-5 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-card)]">
        <h3 className="text-sm font-bold text-[var(--text)] uppercase tracking-wider mb-4">Installation Orders Queue</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--text-muted)]">
                <th className="py-2.5 px-3">Order #</th>
                <th className="py-2.5 px-3">Customer & Address</th>
                <th className="py-2.5 px-3">Technician</th>
                <th className="py-2.5 px-3">Schedule</th>
                <th className="py-2.5 px-3">Optical Signal</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              <TableStateBody
                colSpan={7}
                loading={loading}
                hasData={installations.length > 0}
                error={loadError}
                onRetry={loadData}
                emptyTitle="No installation work orders"
                emptyDescription="Schedule a subscriber drop or ONT activation work order to get started."
                primaryAction={
                  canManageInstallations
                    ? {
                        label: 'Schedule Work Order',
                        onClick: () => setIsNewModalOpen(true),
                        permission: 'installations.manage',
                      }
                    : undefined
                }
              >
                {installations.map((inst) => (
                  <tr key={inst.id} className="hover:bg-[var(--surface-hover)]">
                    <td className="py-3 px-3 font-bold text-[var(--brand)]">{inst.orderNumber}</td>
                    <td className="py-3 px-3 font-sans">
                      <div className="font-semibold text-[var(--text)]">{inst.customerName}</div>
                      <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" /> {inst.customerAddress}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-sans text-[var(--text)] font-medium">
                      {inst.technicianName}
                    </td>
                    <td className="py-3 px-3">
                      <div>{new Date(inst.scheduledDate).toLocaleDateString()}</div>
                      <div className="text-[11px] text-[var(--text-muted)]">{inst.timeSlot}</div>
                    </td>
                    <td className="py-3 px-3">
                      {inst.opticalPowerDbm ? (
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {inst.opticalPowerDbm} dBm
                        </span>
                      ) : (
                        <span className="text-[var(--text-muted)]">Pending measure</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <Chip size="sm" color={inst.status === 'COMPLETED' ? 'success' : 'secondary'}>
                        {inst.status}
                      </Chip>
                    </td>
                    <td className="py-3 px-3 text-right">
                      {inst.status !== 'COMPLETED' && canManageInstallations && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            setActiveInstId(inst.id);
                            setIsCompleteModalOpen(true);
                          }}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Complete & Activate</span>
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </TableStateBody>
            </tbody>
          </table>
        </div>
      </div>

      {/* SCHEDULE WORK ORDER MODAL */}
      <Modal isOpen={isNewModalOpen} onClose={() => setIsNewModalOpen(false)} title="Schedule Installation Work Order">
        <div className="space-y-4 text-xs">
          <Field label="Customer Subscriber">
            <Combobox
              options={customerOptions}
              value={selectedCustomer}
              onChange={(val) => setSelectedCustomer(val)}
              searchable={customerOptions.length > 6}
              clearable={false}
              placeholder="Select customer..."
              size="md"
            />
          </Field>

          <Field label="Assign Field Engineer">
            <Combobox
              options={technicianOptions}
              value={selectedTech}
              onChange={(val) => setSelectedTech(val)}
              searchable={technicianOptions.length > 6}
              clearable={false}
              placeholder="Select technician..."
              size="md"
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <DatePicker
              label="Installation Date"
              aria-label="Installation Date"
              value={schedDate}
              onChange={(_, dateStr) => setSchedDate(dateStr)}
              size="md"
              isClearable={false}
              showFooter
            />

            <Field label="Time Window">
              <Combobox
                options={TIME_SLOT_OPTIONS}
                value={timeSlot}
                onChange={(val) => setTimeSlot(val)}
                searchable={TIME_SLOT_OPTIONS.length > 6}
                clearable={false}
                size="md"
              />
            </Field>
          </div>

          <Field label="Field Notes / Instructions">
            <Input
              placeholder="e.g. 2nd-floor home office, needs 30m drop cable"
              value={instNotes}
              onChange={(e) => setInstNotes(e.target.value)}
            />
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsNewModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreateOrder}>Schedule Order</Button>
          </div>
        </div>
      </Modal>

      {/* COMPLETE INSTALLATION MODAL */}
      <Modal isOpen={isCompleteModalOpen} onClose={() => setIsCompleteModalOpen(false)} title="Complete Installation & Activate PPPoE">
        <div className="space-y-4 text-xs">
          <Field label="Assigned ONT / CPE Serial Number">
            <Input
              placeholder="e.g. SN-HW-2026-0005"
              value={ontSerial}
              onChange={(e) => setOntSerial(e.target.value)}
            />
          </Field>

          <Field label="Measured Optical Rx Power (dBm)">
            <Input
              type="number"
              step="0.1"
              placeholder="-19.5"
              value={opticalPower}
              onChange={(e) => setOpticalPower(parseFloat(e.target.value) || -19.5)}
            />
          </Field>

          <div className="p-3 rounded-lg bg-[var(--surface-hover)] border border-[var(--border)] text-[11px] text-[var(--text-secondary)] space-y-1">
            <div className="font-bold text-[var(--text)] flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600" /> Automated Workflow Execution:
            </div>
            <div>• Reserves & locks serial number to subscriber</div>
            <div>• Provisions PPPoE secret on MikroTik Core Router</div>
            <div>• Sets subscriber status to ACTIVE</div>
            <div>• Generates 1st month recurring invoice & posts revenue journal</div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsCompleteModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCompleteOrder}>Complete & Activate</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
