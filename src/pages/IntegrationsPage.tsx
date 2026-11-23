import React, { useState } from 'react';
import { Layers, CheckCircle2, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Chip } from '../components/ui/Chip';
import { useStore } from '../store/useStore';

export const IntegrationsPage: React.FC = () => {
  const addToast = useStore((s) => s.addToast);

  const [integrations, setIntegrations] = useState([
    {
      id: 'mikrotik',
      name: 'Mikrotik RouterOS API',
      category: 'Core Routing & Queues',
      desc: 'Synchronize simple queues, PPPoE secrets, and firewall address lists.',
      connected: true,
      ping: '1.2ms',
    },
    {
      id: 'ubiquiti',
      name: 'Ubiquiti UISP / UNMS',
      category: 'Wireless & Optical',
      desc: 'Monitor airMAX PtMP towers and UFiber GPON OLT optical signal levels.',
      connected: true,
      ping: '4.8ms',
    },
    {
      id: 'stripe',
      name: 'Stripe Payments',
      category: 'Billing Gateway',
      desc: 'Automatic credit card billing, recurring subscriptions, and webhook sync.',
      connected: true,
      ping: '42ms',
    },
    {
      id: 'twilio',
      name: 'Twilio SMS API',
      category: 'Messaging',
      desc: 'Send transactional payment reminders and maintenance SMS alerts.',
      connected: true,
      ping: '38ms',
    },
    {
      id: 'radius',
      name: 'FreeRADIUS Server',
      category: 'Authentication',
      desc: 'Centralized AAA authentication for subscriber PPPoE and IPoE sessions.',
      connected: false,
    },
  ]);

  const handleToggle = (id: string) => {
    setIntegrations((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const next = !item.connected;
          addToast({
            type: next ? 'success' : 'info',
            title: next ? 'Integration Connected' : 'Integration Disconnected',
            message: `${item.name} status updated.`,
          });
          return { ...item, connected: next };
        }
        return item;
      })
    );
  };

  return (
    <div className="space-y-4 pb-12 select-none">
      <div>
        <h2 className="text-[24px] leading-tight font-semibold text-[var(--text)] tracking-tight">
          System Integrations
        </h2>
        <p className="text-[13px] text-[var(--text-muted)] mt-0.5">
          Connect your billing gateways, hardware APIs, and authentication servers
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {integrations.map((item) => (
          <div
            key={item.id}
            className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-card)] flex flex-col justify-between space-y-3"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  {item.category}
                </span>
                <Chip
                  size="sm"
                  color={item.connected ? 'success' : 'default'}
                >
                  {item.connected ? `Connected (${item.ping})` : 'Disconnected'}
                </Chip>
              </div>

              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mt-2">{item.name}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{item.desc}</p>
            </div>

            <Button
              size="sm"
              variant={item.connected ? 'outline' : 'primary'}
              onClick={() => handleToggle(item.id)}
              className="w-full text-xs"
            >
              <span>{item.connected ? 'Disconnect' : 'Connect Integration'}</span>
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};
