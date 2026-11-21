import React, { useState } from 'react';
import { LifeBuoy, Check } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';

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
    }
  }, [modalState.isOpen, modalState.customerId, customers, technicians]);

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
            Subscriber Account *
          </label>
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#18181B] text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#F26B3A]"
          >
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.fullName} ({c.code}) — {c.address}
              </option>
            ))}
          </select>
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
            className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#18181B] text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#F26B3A]"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">
              Priority Level
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#18181B] text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#F26B3A]"
            >
              <option value="Low">Low (Billing inquiry / Minor)</option>
              <option value="Medium">Medium (Speed test discrepancy)</option>
              <option value="High">High (Total line drop)</option>
              <option value="Critical">Critical (Severed optical drop)</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">
              Assign Field Technician
            </label>
            <select
              value={assignedTechnician}
              onChange={(e) => setAssignedTechnician(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#18181B] text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#F26B3A]"
            >
              {technicians.map((tech) => (
                <option key={tech.id} value={tech.name}>
                  {tech.name} ({tech.zone} — {tech.status})
                </option>
              ))}
            </select>
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
            className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#18181B] text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#F26B3A]"
          />
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-100 dark:border-gray-800">
          <Button size="sm" variant="outline" type="button" onClick={() => closeModal('createTicket')}>
            Cancel
          </Button>
          <Button size="sm" variant="primary" type="submit">
            <Check className="w-3.5 h-3.5" />
            <span>Open Ticket</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
};
