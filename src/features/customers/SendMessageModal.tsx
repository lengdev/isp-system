import React, { useState } from 'react';
import { Mail, MessageSquare, Send, Check } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';

export const SendMessageModal: React.FC = () => {
  const modalState = useStore((s) => s.modalState.sendMessage);
  const closeModal = useStore((s) => s.closeModal);
  const customers = useStore((s) => s.customers);
  const selectedCustomerIds = useStore((s) => s.selectedCustomerIds);
  const addToast = useStore((s) => s.addToast);

  const [channel, setChannel] = useState<'sms' | 'email'>('sms');
  const [template, setTemplate] = useState('reminder');
  const [subject, setSubject] = useState('NetPulse ISP: Monthly Invoice Reminder');
  const [message, setMessage] = useState(
    'Hi {Customer_Name}, your NetPulse monthly internet invoice is ready. Please review your balance to avoid service interruption.'
  );
  const [isSending, setIsSending] = useState(false);

  const { customerId, isBulk } = modalState;
  const targetCustomer = customerId ? customers.find((c) => c.id === customerId) : null;
  const recipientCount = isBulk ? selectedCustomerIds.length : 1;

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
    setIsSending(true);
    await new Promise((resolve) => setTimeout(resolve, 600));
    setIsSending(false);
    addToast({
      type: 'success',
      title: `${channel === 'sms' ? 'SMS' : 'Email'} Dispatched`,
      message: `Sent to ${recipientCount} recipient(s) via NetPulse Gateway.`,
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
          <span>Send Customer Notification</span>
        </div>
      }
      subtitle={`Recipient: ${
        isBulk
          ? `${recipientCount} selected subscribers`
          : targetCustomer
          ? `${targetCustomer.fullName} (${targetCustomer.phone})`
          : 'Subscriber'
      }`}
      size="md"
    >
      <form onSubmit={handleSend} className="space-y-4 text-xs">
        {/* Channel selector */}
        <div className="flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1">
          <button
            type="button"
            onClick={() => setChannel('sms')}
            className={`flex-1 py-1.5 rounded-lg font-bold text-center transition-colors flex items-center justify-center gap-1.5 ${
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
            className={`flex-1 py-1.5 rounded-lg font-bold text-center transition-colors flex items-center justify-center gap-1.5 ${
              channel === 'email'
                ? 'bg-white dark:bg-[#1E1E22] text-[#F26B3A] shadow-xs'
                : 'text-gray-500'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Email Broadcast</span>
          </button>
        </div>

        {/* Template Selector */}
        <div>
          <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">
            Message Template
          </label>
          <select
            value={template}
            onChange={(e) => handleTemplateChange(e.target.value)}
            className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#18181B] text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-[#F26B3A]"
          >
            <option value="reminder">Payment / Overdue Reminder</option>
            <option value="maintenance">Scheduled Maintenance Alert</option>
            <option value="welcome">New Subscriber Welcome</option>
            <option value="upgrade">Bandwidth Upgrade Promotion</option>
          </select>
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
              className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#18181B] text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#F26B3A]"
            />
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="font-semibold text-gray-700 dark:text-gray-300">Message Content</label>
            {channel === 'sms' && (
              <span className="text-[10px] text-gray-400">
                {message.length} / 160 chars ({Math.ceil(message.length / 160)} SMS)
              </span>
            )}
          </div>
          <textarea
            rows={4}
            required
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#18181B] text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#F26B3A]"
          />
          <p className="text-[10px] text-gray-400 mt-1">
            Supported tags: <code className="font-mono text-[#F26B3A]">{"{Customer_Name}"}</code>,{' '}
            <code className="font-mono text-[#F26B3A]">{"{Balance}"}</code>
          </p>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-100 dark:border-gray-800">
          <Button size="sm" variant="outline" type="button" onClick={() => closeModal('sendMessage')}>
            Cancel
          </Button>
          <Button size="sm" variant="primary" type="submit" isLoading={isSending}>
            <Send className="w-3.5 h-3.5" />
            <span>Send Now ({recipientCount})</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
};
