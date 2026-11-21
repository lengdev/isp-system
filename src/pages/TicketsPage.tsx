import React, { useState } from 'react';
import { LifeBuoy, Plus, User } from 'lucide-react';
import { useStore } from '../store/useStore';
import { Button } from '../components/ui/Button';
import { Combobox, ComboboxOption } from '../components/ui/Combobox';
import { formatDate } from '../lib/utils';
import { CreateTicketModal } from '../features/customers/CreateTicketModal';

export const TicketsPage: React.FC = () => {
  const tickets = useStore((s) => s.tickets);
  const technicians = useStore((s) => s.technicians);
  const updateTicketStatus = useStore((s) => s.updateTicketStatus);
  const assignTicketTechnician = useStore((s) => s.assignTicketTechnician);
  const openModal = useStore((s) => s.openModal);
  const openDrawer = useStore((s) => s.openDrawer);

  const [filter, setFilter] = useState<'All' | 'Open' | 'In Progress' | 'Resolved'>('All');

  const filteredTickets = tickets.filter((t) => {
    if (filter !== 'All' && t.status !== filter) return false;
    return true;
  });

  const statusOptions: ComboboxOption[] = [
    { value: 'Open', label: 'Open' },
    { value: 'In Progress', label: 'In Progress' },
    { value: 'Resolved', label: 'Resolved' },
    { value: 'Closed', label: 'Closed' },
  ];

  const technicianOptions: ComboboxOption[] = technicians.map((t) => ({
    value: t.name,
    label: t.name,
    description: t.zone,
  }));

  return (
    <div className="space-y-6 pb-12 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-[28px] leading-tight font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
            Support Tickets & Dispatch
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Resolve network incidents, signal quality complaints, and dispatch field crews
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={() => openModal('createTicket')}
          className="text-xs font-semibold h-9 px-4 gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Open Support Ticket</span>
        </Button>
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {(['All', 'Open', 'In Progress', 'Resolved'] as const).map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setFilter(st)}
            className={`h-8 px-3 rounded-full text-xs font-semibold transition-colors ${
              filter === st
                ? 'bg-[#FFF1EA] dark:bg-orange-950/40 text-[#F26B3A] border border-[#F26B3A]'
                : 'bg-white dark:bg-[#1C1C1F] text-gray-600 dark:text-gray-400 border border-gray-200/90 dark:border-gray-800'
            }`}
          >
            {st} ({tickets.filter((t) => (st === 'All' ? true : t.status === st)).length})
          </button>
        ))}
      </div>

      {/* Tickets List */}
      <div className="space-y-3">
        {filteredTickets.map((ticket) => (
          <div
            key={ticket.id}
            className="p-5 rounded-2xl bg-white dark:bg-[#1C1C1F] border border-gray-200/80 dark:border-gray-800 shadow-xs hover:border-[#F26B3A]/40 transition-colors space-y-3"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-xs font-bold text-[#F26B3A]">
                  {ticket.ticketNumber}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    ticket.priority === 'Critical'
                      ? 'bg-red-100 text-red-700 dark:bg-red-950/60'
                      : ticket.priority === 'High'
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60'
                      : 'bg-blue-100 text-blue-700 dark:bg-blue-950/60'
                  }`}
                >
                  {ticket.priority} Priority
                </span>
                <span className="text-xs text-gray-400">• Opened {formatDate(ticket.createdAt)}</span>
              </div>

              {/* Status Change Combobox */}
              <div className="w-36">
                <Combobox
                  options={statusOptions}
                  value={ticket.status}
                  onChange={(val) => updateTicketStatus(ticket.id, val as any)}
                  searchable={false}
                  clearable={false}
                  size="sm"
                />
              </div>
            </div>

            <div>
              <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">{ticket.title}</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{ticket.description}</p>
            </div>

            <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-gray-400">Subscriber:</span>
                <button
                  type="button"
                  onClick={() => openDrawer(ticket.customerId, 'tickets')}
                  className="font-bold text-gray-800 dark:text-gray-200 hover:text-[#F26B3A]"
                >
                  {ticket.customerName}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-gray-400">Technician:</span>
                <div className="w-44">
                  <Combobox
                    options={technicianOptions}
                    value={ticket.assignedTechnician || ''}
                    onChange={(val) => assignTicketTechnician(ticket.id, val as string)}
                    placeholder="Assign tech..."
                    size="sm"
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <CreateTicketModal />
    </div>
  );
};
