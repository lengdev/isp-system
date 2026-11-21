import React, { useState, useMemo } from 'react';
import { Mail, MessageSquare, Send } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Combobox, ComboboxOption } from '../../components/ui/Combobox';

export const SendMessageModal: React.FC = () => {
  const modalState = useStore((s) => s.modalState.sendMessage);
  const closeModal = useStore((s) => s.closeModal);
  const customers = useStore((s) => s.customers);
  const selectedCustomerIds = useStore((s) => s.selectedCustomerIds);
  const addToast = useStore((s) => s.addToast);

  const [channel, setChannel] = useState<'sms' | 'email'>('sms');
  const [template, setTemplate] = useState('reminder');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [subject, setSubject] = useState('NetPulse ISP: Monthly Invoice Reminder');
  const [message, setMessage] = useState(
    'Hi {Customer_Name}, your NetPulse monthly internet invoice is ready. Please review your balance to avoid service interruption.'
  );
  const [isSending, setIsSending] = useState(false);

  const { customerId, isBulk } = modalState;

  React.useEffect(() => {
    if (modalState.isOpen) {
      if (isBulk && selectedCustomerIds.length > 0) {
        setRecipients(selectedCustomerIds);
      } else if (customerId) {
        setRecipients([customerId]);
      } else if (customers.length > 0) {
        setRecipients([customers[0].id]);
      }
    }
  }, [modalState.isOpen, isBulk, customerId, selectedCustomerIds, customers]);

  const customerOptions: ComboboxOption[] = useMemo(() => {
    return customers.map((c) => ({
      value: c.id,
      label: c.fullName,
      description: `${c.phone} • ${c.email}`,
    }));
  }, [customers]);

  const templateOptions: ComboboxOption[] = [
    { value: 'reminder', label: 'Payment / Overdue Reminder' },
    { value: 'maintenance', label: 'Scheduled Maintenance Alert' },
    { value: 'welcome', label: 'New Subscriber Welcome' },
    { value: 'upgrade', label: 'Bandwidth Upgrade Promotion' },
  ];

  const handleTemplateChange = (tpl: string) => {
    setTemplate(tpl);
    if (tpl === 'reminder') {
      setSubject('NetPulse ISP: Monthly Invoice Reminder');
      setMessage(
        'Hi {Customer_Name}, your NetPulse monthly internet invoice is ready. Please review your balance to avoid service interruption.'
      );
    } else if (tpl === 'maintenance') {
      setSubject('Scheduled Network Maintenance Notice');
      setMessage(
        'Dear Subscriber, we will perform planned optical core network optimization on Sunday between 02:00 and 04:00 AM.'
      );
    } else if (tpl === 'welcome') {
      setSubject('Welcome to NetPulse High-Speed Fiber!');
      setMessage(
        'Welcome {Customer_Name}! Your fiber broadband installation is complete. Download our client app or visit netpulse.net for support.'
      );
    } else if (tpl === 'upgrade') {
      setSubject('Special Offer: Upgrade to Gigabit Fiber');
      setMessage(
        'Great news! Your sector now supports 1Gbps symmetrical speeds. Reply YES to upgrade your plan today with zero setup fee.'
      );
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipients.length || !message.trim()) return;
    setIsSending(true);
    await new Promise((resolve) => setTimeout(resolve, 600));
    setIsSending(false);
    addToast({
      type: 'success',
      title: `${channel === 'sms' ? 'SMS' : 'Email'} Dispatched`,
      message: `Sent to ${recipients.length} recipient(s) via NetPulse Gateway.`,
    });
    closeModal('sendMessage');
  };

  return (
    <Modal
      isOpen={modalState.isOpen}
      onClose={() => closeModal('sendMessage')}
      title={
        <div className="flex items-center gap-2">
          {channel === 'sms' ? (
            <MessageSquare className="w-5 h-5 text-[#F26B3A]" />
          ) : (
            <Mail className="w-5 h-5 text-[#F26B3A]" />
          )}
          <span>Send Subscriber Notification</span>
        </div>
      }
      subtitle="Dispatch SMS or email broadcast"
      size="md"
    >
      <form onSubmit={handleSend} className="space-y-4 text-xs">
        {/* Channel selector */}
        <div className="flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1">
          <button
            type="button"
            onClick={() => setChannel('sms')}
            className={`flex-1 py-1.5 rounded-lg font-semibold text-center transition-colors flex items-center justify-center gap-1.5 ${
              channel === 'sms'
                ? 'bg-white dark:bg-[#1E1E22] text-[#F26B3A] shadow-xs'
                : 'text-gray-500'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>SMS Message</span>
          </button>
          <button
            type="button"
            onClick={() => setChannel('email')}
            className={`flex-1 py-1.5 rounded-lg font-semibold text-center transition-colors flex items-center justify-center gap-1.5 ${
              channel === 'email'
                ? 'bg-white dark:bg-[#1E1E22] text-[#F26B3A] shadow-xs'
                : 'text-gray-500'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Email Broadcast</span>
          </button>
        </div>

        {/* Recipients Combobox (Multi-select) */}
        <div>
          <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">
            Recipients ({recipients.length} selected)
          </label>
          <Combobox
            options={customerOptions}
            value={recipients}
            onChange={(val) => setRecipients(val as string[])}
            multiple={true}
            placeholder="Search and add subscribers..."
            size="lg"
          />
        </div>

        {/* Template Combobox */}
        <div>
          <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">
            Message Template
          </label>
          <Combobox
            options={templateOptions}
            value={template}
            onChange={(val) => handleTemplateChange(val as string)}
            searchable={false}
            clearable={false}
            size="lg"
          />
        </div>

        {channel === 'email' && (
          <div>
            <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">
              Email Subject Line
            </label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full h-10 px-3 rounded-[10px] border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#18181B] text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#F26B3A]/30 focus:border-[#F26B3A]"
            />
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="font-semibold text-gray-700 dark:text-gray-300">Message Content</label>
            {channel === 'sms' && (
              <span className="text-[11px] text-gray-400">
                {message.length} / 160 chars ({Math.ceil(message.length / 160)} SMS)
              </span>
            )}
          </div>
          <textarea
            rows={4}
            required
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full p-2.5 rounded-[10px] border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#18181B] text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#F26B3A]/30 focus:border-[#F26B3A]"
          />
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-100 dark:border-gray-800">
          <Button
            size="sm"
            variant="outline"
            type="button"
            onClick={() => closeModal('sendMessage')}
            className="h-9 px-3.5"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            variant="primary"
            type="submit"
            isLoading={isSending}
            className="h-9 px-4 font-semibold"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send Notification ({recipients.length})</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
};
