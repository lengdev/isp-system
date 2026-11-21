import React, { useState } from 'react';
import { LifeBuoy, Plus, CheckCircle, Clock, AlertTriangle, User } from 'lucide-react';
import { useStore } from '../store/useStore';
import { Button } from '../components/ui/Button';
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

  return (
    <div className="space-y-6 pb-12 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tight">
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
          className="text-xs font-bold"
        >
          <Plus className="w-4 h-4" />
          <span>+ Open Support Ticket</span>
        </Button>
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {(['All', 'Open', 'In Progress', 'Resolved'] as const).map((st) => (
          <button
            key={st}
            onClick={() => setFilter(st)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              filter === st
                ? 'bg-[#FFF1EA] dark:bg-[#F26B3A]/20 text-[#F26B3A] border border-[#F26B3A]'
                : 'bg-white dark:bg-[#1C1C1F] text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-800'
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
            className="p-5 rounded-2xl bg-white dark:bg-[#1C1C1F] border border-gray-200/80 dark:border-gray-800 shadow-soft hover:border-[#F26B3A]/40 transition-colors space-y-3"
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

              {/* Status Change Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Status:</span>
                <select
                  value={ticket.status}
                  onChange={(e) => updateTicketStatus(ticket.id, e.target.value as any)}
                  className="p-1 px-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#18181B] text-xs font-bold text-gray-800 dark:text-gray-200"
                >
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </select>
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
                  onClick={() => openDrawer(ticket.customerId, 'tickets')}
                  className="font-bold text-gray-800 dark:text-gray-200 hover:text-[#F26B3A]"
                >
                  {ticket.customerName}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-gray-400">Technician:</span>
                <select
                  value={ticket.assignedTechnician || ''}
                  onChange={(e) => assignTicketTechnician(ticket.id, e.target.value)}
                  className="bg-transparent border-b border-gray-300 dark:border-gray-700 text-xs font-semibold text-[#F26B3A]"
                >
                  {technicians.map((tech) => (
                    <option key={tech.id} value={tech.name}>
                      {tech.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>

      <CreateTicketModal />
    </div>
  );
};
