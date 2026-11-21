import React, { useState } from 'react';
import { Zap, ShieldCheck, Clock, Check, BellRing } from 'lucide-react';
import { Toggle } from '../components/ui/Toggle';
import { useStore } from '../store/useStore';

export const AutomationPage: React.FC = () => {
  const addToast = useStore((s) => s.addToast);

  const [rules, setRules] = useState([
    {
      id: 'rule-1',
      title: 'Automated Past Due Suspension',
      description: 'Automatically restrict bandwidth and suspend accounts when balance is 14 days overdue.',
      enabled: true,
    },
    {
      id: 'rule-2',
      title: 'Auto-Invoice Generation',
      description: 'Generate monthly invoices and send PDF to customer email 7 days before billing due date.',
      enabled: true,
    },
    {
      id: 'rule-3',
      title: 'Optical Signal Degradation Alert',
      description: 'Trigger support ticket when customer ONT optical power drops below -27 dBm.',
      enabled: true,
    },
    {
      id: 'rule-4',
      title: 'Daily Core Router Backup Snapshot',
      description: 'Export Mikrotik RouterOS and OLT configuration scripts to secure cloud bucket at 03:00 AM.',
      enabled: true,
    },
    {
      id: 'rule-5',
      title: 'Speed Test Discrepancy Flagging',
      description: 'Flag accounts that fail to achieve 85% of subscribed downlink rate during off-peak checks.',
      enabled: false,
    },
  ]);

  const handleToggle = (id: string) => {
    setRules((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const next = !r.enabled;
          addToast({
            type: 'info',
            title: next ? 'Automation Rule Enabled' : 'Automation Rule Paused',
            message: r.title,
          });
          return { ...r, enabled: next };
        }
        return r;
      })
    );
  };

  return (
    <div className="space-y-6 pb-12 select-none">
      <div>
        <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tight">
          ISP Automation & Cron Tasks
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          Configure unattended operational triggers, billing automations, and self-healing rules
        </p>
      </div>

      <div className="space-y-3">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className="p-5 rounded-2xl bg-white dark:bg-[#1C1C1F] border border-gray-200/80 dark:border-gray-800 shadow-soft flex items-center justify-between gap-4"
          >
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">{rule.title}</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">{rule.description}</p>
            </div>
            <Toggle checked={rule.enabled} onChange={() => handleToggle(rule.id)} />
          </div>
        ))}
      </div>
    </div>
  );
};
