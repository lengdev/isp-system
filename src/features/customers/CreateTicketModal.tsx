import React, { useState, useMemo, useEffect } from 'react';
import { LifeBuoy, AlertCircle, Check } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Modal, ModalFooter } from '../../components/ui/Modal';
import { Field, Input, Textarea } from '../../components/ui/Field';
import { Combobox, ComboboxOption } from '../../components/ui/Combobox';

export const CreateTicketModal: React.FC = () => {
  const modalState = useStore((s) => s.modalState.createTicket);
  const closeModal = useStore((s) => s.closeModal);
  const customers = useStore((s) => s.customers);
  const technicians = useStore((s) => s.technicians);
  const createTicket = useStore((s) => s.createTicket);
  const addToast = useStore((s) => s.addToast);

  const [customerId, setCustomerId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High' | 'Critical'>('Medium');
  const [assignedTechnician, setAssignedTechnician] = useState('');
  const [category, setCategory] = useState('Optical Signal');
  const [labels, setLabels] = useState<string[]>(['Home Visit']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (modalState.isOpen) {
      if (modalState.customerId) {
        setCustomerId(modalState.customerId);
      } else if (customers.length > 0) {
        setCustomerId(customers[0].id);
      }
      setTitle('');
      setDescription('');
      setPriority('Medium');
      setAssignedTechnician(technicians[0]?.name || 'Carlos Ramos');
      setCategory('Optical Signal');
      setLabels(['Home Visit']);
      setIsSubmitting(false);
      setIsSuccess(false);
    }
  }, [modalState.isOpen, modalState.customerId, customers, technicians]);

  const customerOptions: ComboboxOption[] = useMemo(() => {
    return customers.map((c) => ({
      value: c.id,
      label: c.fullName,
      description: `${c.code} • ${c.address} • ${c.planName}`,
    }));
  }, [customers]);

  // Clean split of label vs description
  const priorityOptions: ComboboxOption[] = [
    {
      value: 'Low',
      label: 'Low',
      description: 'Billing or general inquiry',
      badge: 'Normal SLA',
    },
    {
      value: 'Medium',
      label: 'Medium',
      description: 'Intermittent or slow connection speeds',
      badge: '24h SLA',
    },
    {
      value: 'High',
      label: 'High',
      description: 'Complete subscriber outage',
      badge: '4h SLA',
    },
    {
      value: 'Critical',
      label: 'Critical',
      description: 'Severed optical line or trunk outage',
      badge: '1h SLA',
    },
  ];

  const categoryOptions: ComboboxOption[] = [
    { value: 'Optical Signal', label: 'Optical Signal', description: 'Degradation, high attenuation, red LOS light' },
    { value: 'Hardware / ONT', label: 'Hardware / ONT', description: 'Router or ONT device failure, no power' },
    { value: 'Provisioning', label: 'Provisioning', description: 'Speed mismatch, VLAN or PPPoE auth issues' },
    { value: 'Physical Cut', label: 'Physical Cut', description: 'Severed drop cable on premises' },
    { value: 'Billing', label: 'Billing Dispute', description: 'Invoice discrepancy or plan charge inquiry' },
  ];

  const technicianOptions: ComboboxOption[] = useMemo(() => {
    return technicians.map((tech) => ({
      value: tech.name,
      label: tech.name,
      description: `${tech.zone} • ${tech.status}`,
    }));
  }, [technicians]);

  const labelOptions: ComboboxOption[] = [
    { value: 'Home Visit', label: 'Home Visit', description: 'Physical dispatch to customer address' },
    { value: 'Urgent SLA', label: 'Urgent SLA', description: 'Immediate escalation required' },
    { value: 'Splicing Crew', label: 'Splicing Crew', description: 'Optical fusion splicer truck needed' },
    { value: 'Hardware Swap', label: 'Hardware Swap', description: 'Replace ONT/Wi-Fi router on site' },
  ];

  const isDirty = Boolean(title.trim() || description.trim() || labels.length > 1);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const customer = customers.find((c) => c.id === customerId);
    if (!customer || !title.trim()) return;

    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    createTicket({
      customerId: customer.id,
      customerName: customer.fullName,
      title,
      description,
      priority,
      status: 'Open',
      assignedTechnician,
      category,
      labels,
    });

    setIsSubmitting(false);
    setIsSuccess(true);
    setTimeout(() => {
      addToast({
        type: 'success',
        title: 'Support Ticket Created',
        message: `Ticket opened for ${customer.fullName} and assigned to ${assignedTechnician}.`,
      });
      closeModal('createTicket');
    }, 600);
  };

  return (
    <Modal
      isOpen={modalState.isOpen}
      onClose={() => closeModal('createTicket')}
      size="lg"
      icon={<LifeBuoy className="w-5 h-5" />}
      iconColor="orange"
      title="Create Support Ticket"
      subtitle="Dispatch field technician or escalate network incident"
      isDirty={isDirty}
      footer={
        <ModalFooter
          onCancel={() => closeModal('createTicket')}
          onSubmit={handleSubmit}
          submitText="Open Ticket"
          isSubmitting={isSubmitting}
          isSuccess={isSuccess}
          submitDisabled={!title.trim() || !customerId}
        />
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Full-width: Subscriber Account */}
        <Field label="Subscriber account" required helperText="Select the subscriber reporting this incident">
          <Combobox
            options={customerOptions}
            value={customerId}
            onChange={(val) => setCustomerId(val as string)}
            placeholder="Search subscriber name or code..."
            size="md"
          />
        </Field>

        {/* Full-width: Issue Title */}
        <Field label="Issue title" required helperText="Brief summary of the incident">
          <Input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Red LOS light on ONT, intermittent packet loss"
          />
        </Field>

        {/* Two-Column Grid: Priority & Category */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Priority level">
            <Combobox
              options={priorityOptions}
              value={priority}
              onChange={(val) => setPriority(val as any)}
              searchable={false}
              clearable={false}
              size="md"
            />
          </Field>

          <Field label="Issue category">
            <Combobox
              options={categoryOptions}
              value={category}
              onChange={(val) => setCategory(val as string)}
              creatable={true}
              size="md"
            />
          </Field>
        </div>

        {/* Two-Column Grid: Field Technician & Labels */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Assigned technician">
            <Combobox
              options={technicianOptions}
              value={assignedTechnician}
              onChange={(val) => setAssignedTechnician(val as string)}
              placeholder="Assign technician..."
              size="md"
            />
          </Field>

          <Field label="Tags and flags">
            <Combobox
              options={labelOptions}
              value={labels}
              onChange={(val) => setLabels(val as string[])}
              multiple={true}
              creatable={true}
              placeholder="Add labels..."
              size="md"
            />
          </Field>
        </div>

        {/* Full-width: Description */}
        <Field label="Problem description and diagnostics" helperText="Include optical power readings (dBm) or access instructions">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Document signal reading, steps taken, or dispatch notes..."
          />
        </Field>
      </form>
    </Modal>
  );
};
