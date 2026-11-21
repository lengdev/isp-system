import React, { useState, useMemo } from 'react';
import { LifeBuoy, Check } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Combobox, ComboboxOption } from '../../components/ui/Combobox';

export const CreateTicketModal: React.FC = () => {
  const modalState = useStore((s) => s.modalState.createTicket);
  const closeModal = useStore((s) => s.closeModal);
  const customers = useStore((s) => s.customers);
  const technicians = useStore((s) => s.technicians);
  const createTicket = useStore((s) => s.createTicket);

  const [customerId, setCustomerId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High' | 'Critical'>('Medium');
  const [assignedTechnician, setAssignedTechnician] = useState('');
  const [category, setCategory] = useState('Optical Signal');
  const [labels, setLabels] = useState<string[]>(['Home Visit']);

  React.useEffect(() => {
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
    }
  }, [modalState.isOpen, modalState.customerId, customers, technicians]);

  const customerOptions: ComboboxOption[] = useMemo(() => {
    return customers.map((c) => ({
      value: c.id,
      label: `${c.fullName} (${c.code})`,
      description: `${c.address} • ${c.planName}`,
    }));
  }, [customers]);

  const priorityOptions: ComboboxOption[] = [
    { value: 'Low', label: 'Low (Billing / Inquiry)' },
    { value: 'Medium', label: 'Medium (Intermittent / Speed)' },
    { value: 'High', label: 'High (Complete Outage)' },
    { value: 'Critical', label: 'Critical (Severed Fiber Line)' },
  ];

  const categoryOptions: ComboboxOption[] = [
    { value: 'Optical Signal', label: 'Optical Signal Degradation' },
    { value: 'Hardware / ONT', label: 'ONT / Router Hardware Failure' },
    { value: 'Billing', label: 'Billing / Invoice Dispute' },
    { value: 'Provisioning', label: 'New Speed Provisioning' },
    { value: 'Physical Cut', label: 'Physical Cable Severed' },
  ];

  const technicianOptions: ComboboxOption[] = technicians.map((tech) => ({
    value: tech.name,
    label: tech.name,
    description: `${tech.zone} (${tech.status})`,
  }));

  const labelOptions: ComboboxOption[] = [
    { value: 'Home Visit', label: 'Home Visit Required' },
    { value: 'Urgent', label: 'Urgent SLA' },
    { value: 'Splicing Crew', label: 'Splicing Crew' },
    { value: 'Hardware Swap', label: 'Hardware Swap' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const customer = customers.find((c) => c.id === customerId);
    if (!customer || !title.trim()) return;

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

    closeModal('createTicket');
  };

  return (
    <Modal
      isOpen={modalState.isOpen}
      onClose={() => closeModal('createTicket')}
      title={
        <div className="flex items-center gap-2">
          <LifeBuoy className="w-5 h-5 text-[#F26B3A]" />
          <span>Create Support Ticket</span>
        </div>
      }
      subtitle="Dispatch field technician or escalate network incident"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div>
          <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">
            Subscriber Account (Searchable) *
          </label>
          <Combobox
            options={customerOptions}
            value={customerId}
            onChange={(val) => setCustomerId(val as string)}
            placeholder="Search customer name..."
            size="lg"
          />
        </div>

        <div>
          <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">
            Issue Title *
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Red optical light on ONT, packet loss in evening"
            className="w-full h-10 px-3 rounded-[10px] border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#18181B] text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#F26B3A]/30 focus:border-[#F26B3A]"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">
              Priority Level
            </label>
            <Combobox
              options={priorityOptions}
              value={priority}
              onChange={(val) => setPriority(val as any)}
              searchable={false}
              clearable={false}
              size="lg"
            />
          </div>

          <div>
            <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">
              Issue Category
            </label>
            <Combobox
              options={categoryOptions}
              value={category}
              onChange={(val) => setCategory(val as string)}
              creatable={true}
              size="lg"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">
              Assign Field Technician
            </label>
            <Combobox
              options={technicianOptions}
              value={assignedTechnician}
              onChange={(val) => setAssignedTechnician(val as string)}
              placeholder="Assign technician..."
              size="lg"
            />
          </div>

          <div>
            <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">
              Labels / Tags (Multi)
            </label>
            <Combobox
              options={labelOptions}
              value={labels}
              onChange={(val) => setLabels(val as string[])}
              multiple={true}
              creatable={true}
              placeholder="Labels..."
              size="lg"
            />
          </div>
        </div>

        <div>
          <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">
            Problem Description & Diagnostics
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Include optical power reading (dBm), error codes, or customer availability for home visit..."
            className="w-full p-2.5 rounded-[10px] border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#18181B] text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#F26B3A]/30 focus:border-[#F26B3A]"
          />
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-100 dark:border-gray-800">
          <Button
            size="sm"
            variant="outline"
            type="button"
            onClick={() => closeModal('createTicket')}
            className="h-9 px-3.5"
          >
            Cancel
          </Button>
          <Button size="sm" variant="primary" type="submit" className="h-9 px-4 font-semibold">
            <Check className="w-3.5 h-3.5" />
            <span>Open Ticket</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
};
