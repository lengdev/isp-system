import React, { useState, useMemo, useEffect } from 'react';
import { Mail, MessageSquare, Send, Check } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Modal, ModalFooter } from '../../components/ui/Modal';
import { Field, Input, Textarea } from '../../components/ui/Field';
import { Combobox, ComboboxOption } from '../../components/ui/Combobox';
import { BRAND_NAME, BRAND_DOMAIN } from '../../lib/brand';

export const SendMessageModal: React.FC = () => {
  const modalState = useStore((s) => s.modalState.sendMessage);
  const closeModal = useStore((s) => s.closeModal);
  const customers = useStore((s) => s.customers);
  const selectedCustomerIds = useStore((s) => s.selectedCustomerIds);
  const addToast = useStore((s) => s.addToast);

  const [channel, setChannel] = useState<'sms' | 'email'>('sms');
  const [template, setTemplate] = useState('reminder');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [subject, setSubject] = useState(`${BRAND_NAME} ISP: Monthly Invoice Reminder`);
  const [message, setMessage] = useState(
    `Hi {Customer_Name}, your ${BRAND_NAME} monthly internet invoice is ready. Please review your balance to avoid service interruption.`
  );
  const [isSending, setIsSending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const { customerId, isBulk } = modalState;

  useEffect(() => {
    if (modalState.isOpen) {
      if (isBulk && selectedCustomerIds.length > 0) {
        setRecipients(selectedCustomerIds);
      } else if (customerId) {
        setRecipients([customerId]);
      } else if (customers.length > 0) {
        setRecipients([customers[0].id]);
      }
      setIsSending(false);
      setIsSuccess(false);
    }
  }, [modalState.isOpen, isBulk, customerId, selectedCustomerIds, customers]);

  const customerOptions: ComboboxOption[] = useMemo(() => {
    return customers.map((c) => ({
      value: c.id,
      label: c.fullName,
      description: `${c.phone} • ${c.email}`,
    }));
  }, [customers]);

  // Clean split of label vs description
  const templateOptions: ComboboxOption[] = [
    { value: 'reminder', label: 'Payment Reminder', description: 'Overdue or upcoming balance notice' },
    { value: 'maintenance', label: 'Maintenance Alert', description: 'Scheduled core network optimization window' },
    { value: 'welcome', label: 'Welcome Onboarding', description: 'Broadband connection activated message' },
    { value: 'upgrade', label: 'Speed Upgrade Offer', description: 'Promotional bandwidth tier upgrade' },
  ];

  const handleTemplateChange = (tpl: string) => {
    setTemplate(tpl);
    if (tpl === 'reminder') {
      setSubject(`${BRAND_NAME} ISP: Monthly Invoice Reminder`);
      setMessage(
        `Hi {Customer_Name}, your ${BRAND_NAME} monthly internet invoice is ready. Please review your balance to avoid service interruption.`
      );
    } else if (tpl === 'maintenance') {
      setSubject('Scheduled Network Maintenance Notice');
      setMessage(
        'Dear Subscriber, we will perform planned optical core network optimization on Sunday between 02:00 and 04:00 AM.'
      );
    } else if (tpl === 'welcome') {
      setSubject(`Welcome to ${BRAND_NAME} High-Speed Fiber!`);
      setMessage(
        `Welcome {Customer_Name}! Your fiber broadband installation is complete. Download our client app or visit ${BRAND_DOMAIN} for support.`
      );
    } else if (tpl === 'upgrade') {
      setSubject('Special Offer: Upgrade to Gigabit Fiber');
      setMessage(
        'Great news! Your sector now supports 1Gbps symmetrical speeds. Reply YES to upgrade your plan today with zero setup fee.'
      );
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!recipients.length || !message.trim()) return;

    setIsSending(true);
    await new Promise((resolve) => setTimeout(resolve, 600));
    setIsSending(false);
    setIsSuccess(true);

    setTimeout(() => {
      addToast({
        type: 'success',
        title: `${channel === 'sms' ? 'SMS Notification' : 'Email Broadcast'} Sent`,
        message: `Successfully dispatched to ${recipients.length} subscriber(s).`,
      });
      closeModal('sendMessage');
    }, 600);
  };

  const isDirty = Boolean(message.length > 0 && template !== 'reminder');

  return (
    <Modal
      isOpen={modalState.isOpen}
      onClose={() => closeModal('sendMessage')}
      size="lg"
      icon={channel === 'sms' ? <MessageSquare className="w-5 h-5" /> : <Mail className="w-5 h-5" />}
      iconColor="orange"
      title="Send Subscriber Notification"
      subtitle="Dispatch SMS or email broadcast to selected accounts"
      isDirty={isDirty}
      footer={
        <ModalFooter
          onCancel={() => closeModal('sendMessage')}
          onSubmit={handleSend}
          submitText={`Send ${channel === 'sms' ? 'SMS' : 'Email'} (${recipients.length})`}
          submitIcon={<Send className="w-4 h-4" />}
          isSubmitting={isSending}
          isSuccess={isSuccess}
          submitDisabled={recipients.length === 0 || !message.trim()}
        />
      }
    >
      <form onSubmit={handleSend} className="space-y-4">
        {/* Channel selector */}
        <div className="flex rounded-xl bg-gray-100 dark:bg-gray-800/80 p-1 select-none">
          <button
            type="button"
            onClick={() => setChannel('sms')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold text-center transition-all flex items-center justify-center gap-2 cursor-pointer ${
              channel === 'sms'
                ? 'bg-white dark:bg-[#1E1E22] text-[#F26B3A] shadow-xs'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>SMS Message</span>
          </button>
          <button
            type="button"
            onClick={() => setChannel('email')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold text-center transition-all flex items-center justify-center gap-2 cursor-pointer ${
              channel === 'email'
                ? 'bg-white dark:bg-[#1E1E22] text-[#F26B3A] shadow-xs'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>Email Broadcast</span>
          </button>
        </div>

        {/* Recipients Multi Combobox */}
        <Field
          label="Recipients"
          required
          helperText={`Selected ${recipients.length} subscriber account${recipients.length === 1 ? '' : 's'}`}
        >
          <Combobox
            options={customerOptions}
            value={recipients}
            onChange={(val) => setRecipients(val as string[])}
            multiple={true}
            placeholder="Search and add subscribers..."
            size="md"
          />
        </Field>

        {/* Template Combobox */}
        <Field label="Message template">
          <Combobox
            options={templateOptions}
            value={template}
            onChange={(val) => handleTemplateChange(val as string)}
            searchable={false}
            clearable={false}
            size="md"
          />
        </Field>

        {/* Subject input for email */}
        {channel === 'email' && (
          <Field label="Email subject line" required>
            <Input
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter email subject..."
            />
          </Field>
        )}

        {/* Message body textarea */}
        <Field
          label="Message content"
          required
          helperText={
            channel === 'sms'
              ? `${message.length} chars • ${Math.ceil(message.length / 160)} SMS segment(s)`
              : undefined
          }
        >
          <Textarea
            rows={4}
            required
            maxLength={channel === 'sms' ? 320 : 1000}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Compose message..."
          />
        </Field>
      </form>
    </Modal>
  );
};
