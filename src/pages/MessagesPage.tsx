import React, { useState } from 'react';
import { Mail, MessageSquare, Send, CheckCircle2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { Button } from '../components/ui/Button';

export const MessagesPage: React.FC = () => {
  const addToast = useStore((s) => s.addToast);
  const [channel, setChannel] = useState<'SMS' | 'Email'>('SMS');
  const [recipientGroup, setRecipientGroup] = useState('All Active Subscribers');
  const [subject, setSubject] = useState('NetPulse Network Notice');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const logs = [
    {
      id: 'msg-1',
      channel: 'SMS',
      recipient: '218 Active Subscribers',
      preview: 'Scheduled optical node upgrade this Sunday at 2 AM.',
      date: 'Yesterday at 3:15 PM',
      status: 'Delivered',
    },
    {
      id: 'msg-2',
      channel: 'Email',
      recipient: '14 Overdue Accounts',
      preview: 'Friendly reminder: your monthly NetPulse statement is past due.',
      date: 'Sep 15, 2025',
      status: 'Delivered',
    },
  ];

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setIsSending(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    setIsSending(false);
    setMessage('');
    addToast({
      type: 'success',
      title: 'Broadcast Dispatched',
      message: `${channel} broadcast successfully delivered to ${recipientGroup}.`,
    });
  };

  return (
    <div className="space-y-6 pb-12 select-none">
      <div>
        <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tight">
          Subscriber Messaging & Broadcast
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          Send SMS reminders, maintenance notifications, and billing alert emails
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Broadcast Composer */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#1C1C1F] border border-gray-200/80 dark:border-gray-800 shadow-soft space-y-4">
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Compose Broadcast</h3>

          <form onSubmit={handleSend} className="space-y-3.5 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                  Channel
                </label>
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#18181B] text-gray-800 dark:text-gray-200"
                >
                  <option value="SMS">SMS Gateway (Twilio)</option>
                  <option value="Email">Email (SendGrid / SMTP)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                  Target Audience
                </label>
                <select
                  value={recipientGroup}
                  onChange={(e) => setRecipientGroup(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#18181B] text-gray-800 dark:text-gray-200"
                >
                  <option value="All Active Subscribers">All Active Subscribers</option>
                  <option value="Overdue Accounts Only">Overdue Accounts Only</option>
                  <option value="Fiber Subscribers">Fiber Subscribers Only</option>
                  <option value="Wireless Subscribers">Wireless Subscribers Only</option>
                </select>
              </div>
            </div>

            {channel === 'Email' && (
              <div>
                <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                  Subject Line
                </label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#18181B] text-gray-800 dark:text-gray-200"
                />
              </div>
            )}

            <div>
              <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                Message Body
              </label>
              <textarea
                rows={4}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type notification text..."
                className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#18181B] text-gray-800 dark:text-gray-200"
              />
            </div>

            <Button size="md" variant="primary" type="submit" isLoading={isSending} className="w-full">
              <Send className="w-4 h-4" />
              <span>Broadcast Now</span>
            </Button>
          </form>
        </div>

        {/* Message Logs */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#1C1C1F] border border-gray-200/80 dark:border-gray-800 shadow-soft space-y-4">
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Recent Outgoing Logs</h3>
          <div className="divide-y divide-gray-100 dark:divide-gray-800/80 text-xs">
            {logs.map((log) => (
              <div key={log.id} className="py-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-800 dark:text-gray-200">{log.recipient}</span>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                    {log.status}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500">{log.preview}</p>
                <div className="text-[10px] text-gray-400">
                  {log.channel} • {log.date}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
