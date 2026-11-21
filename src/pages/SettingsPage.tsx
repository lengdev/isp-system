import React, { useState } from 'react';
import { RotateCcw, Moon, Sun, Save } from 'lucide-react';
import { useStore } from '../store/useStore';
import { Button } from '../components/ui/Button';
import { Combobox, ComboboxOption } from '../components/ui/Combobox';

export const SettingsPage: React.FC = () => {
  const darkMode = useStore((s) => s.darkMode);
  const toggleDarkMode = useStore((s) => s.toggleDarkMode);
  const currency = useStore((s) => s.currency);
  const setCurrency = useStore((s) => s.setCurrency);
  const resetDemoData = useStore((s) => s.resetDemoData);
  const addToast = useStore((s) => s.addToast);

  const [companyName, setCompanyName] = useState('NetPulse High-Speed Broadband LLC');
  const [supportPhone, setSupportPhone] = useState('+1 (800) 555-PULSE');
  const [supportEmail, setSupportEmail] = useState('support@netpulse.net');

  const currencyOptions: ComboboxOption[] = [
    { value: '$', label: '$ (USD — US Dollar)' },
    { value: '€', label: '€ (EUR — Euro)' },
    { value: '£', label: '£ (GBP — British Pound)' },
    { value: '₹', label: '₹ (INR — Indian Rupee)' },
  ];

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    addToast({
      type: 'success',
      title: 'Settings Saved',
      message: 'ISP configuration parameters updated successfully.',
    });
  };

  return (
    <div className="space-y-6 pb-12 select-none max-w-3xl">
      <div>
        <h2 className="text-[28px] leading-tight font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
          System & ISP Settings
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          Organization profile, currency display, theme preference, and demo data control
        </p>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6 text-xs">
        {/* Organization Info */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#1C1C1F] border border-gray-200/80 dark:border-gray-800 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">ISP Business Profile</h3>

          <div>
            <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">
              Company Name
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full h-10 px-3 rounded-[10px] border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#18181B] text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#F26B3A]/30 focus:border-[#F26B3A]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                Support Helpline Phone
              </label>
              <input
                type="text"
                value={supportPhone}
                onChange={(e) => setSupportPhone(e.target.value)}
                className="w-full h-10 px-3 rounded-[10px] border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#18181B] text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#F26B3A]/30 focus:border-[#F26B3A]"
              />
            </div>
            <div>
              <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                Support Email
              </label>
              <input
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                className="w-full h-10 px-3 rounded-[10px] border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#18181B] text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#F26B3A]/30 focus:border-[#F26B3A]"
              />
            </div>
          </div>
        </div>

        {/* Currency & Appearance */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#1C1C1F] border border-gray-200/80 dark:border-gray-800 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
            Regional & Preferences
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                Billing Currency Symbol
              </label>
              <Combobox
                options={currencyOptions}
                value={currency}
                onChange={(val) => setCurrency(val as string)}
                searchable={false}
                clearable={false}
                size="lg"
              />
            </div>

            <div>
              <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                Theme Mode
              </label>
              <button
                type="button"
                onClick={toggleDarkMode}
                className="flex items-center justify-between w-full h-10 px-3 rounded-[10px] border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#18181B] text-gray-800 dark:text-gray-200"
              >
                <span>{darkMode ? 'Dark Theme' : 'Light Theme (Warm)'}</span>
                {darkMode ? <Moon className="w-4 h-4 text-amber-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <Button size="sm" variant="primary" type="submit" className="h-9 px-4 font-semibold">
              <Save className="w-3.5 h-3.5" />
              <span>Save Preferences</span>
            </Button>
          </div>
        </div>

        {/* Danger Zone: Demo Data Reset */}
        <div className="p-5 rounded-2xl bg-red-50/60 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 space-y-3">
          <h3 className="text-sm font-bold text-red-600">Demo Data Management</h3>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Need to restore the initial state? Resetting will reseed the catalog with 240 sample subscribers, initial plans, invoices, and network devices.
          </p>

          <Button
            size="sm"
            variant="danger"
            type="button"
            onClick={() => {
              if (window.confirm('Reset all subscribers and restore seeded demo data?')) {
                resetDemoData();
              }
            }}
            className="h-9 px-4 font-semibold"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo Data (200+ Subscribers)</span>
          </Button>
        </div>
      </form>
    </div>
  );
};
