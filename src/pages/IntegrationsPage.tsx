import React, { useState } from 'react';
import { Layers, CheckCircle2, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/Button';
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
    <div className="space-y-6 pb-12 select-none">
      <div>
        <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tight">
          System Integrations
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          Connect your billing gateways, hardware APIs, and authentication servers
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {integrations.map((item) => (
          <div
            key={item.id}
            className="p-5 rounded-2xl bg-white dark:bg-[#1C1C1F] border border-gray-200/80 dark:border-gray-800 shadow-soft flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  {item.category}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    item.connected
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-800'
                  }`}
                >
                  {item.connected ? `Connected (${item.ping})` : 'Disconnected'}
                </span>
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
