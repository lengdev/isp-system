import React, { useState } from 'react';
import { RotateCcw, Save, Eye, Sparkles, Contrast, Sun, Moon, Laptop, Play, ZapOff, Sparkle } from 'lucide-react';
import { useStore } from '../store/useStore';
import { Button } from '../components/ui/Button';
import { Field, Input } from '../components/ui/Field';
import { Combobox, ComboboxOption } from '../components/ui/Combobox';
import { ThemeMode, ComfortMode, DensityMode, AnimationMode } from '../types';
import { cn } from '../lib/utils';

export const SettingsPage: React.FC = () => {
  const darkMode = useStore((s) => s.darkMode);
  const themeMode = useStore((s) => s.themeMode) || (darkMode ? 'dark' : 'light');
  const setThemeMode = useStore((s) => s.setThemeMode);
  const comfort = useStore((s) => s.comfort);
  const setComfort = useStore((s) => s.setComfort);
  const density = useStore((s) => s.density);
  const setDensity = useStore((s) => s.setDensity);
  const animations = useStore((s) => s.animations) || 'system';
  const setAnimations = useStore((s) => s.setAnimations);
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

  const themeOptions: ComboboxOption[] = [
    { value: 'light', label: 'Light', icon: <Sun className="w-4 h-4 text-amber-500" /> },
    { value: 'dark', label: 'Dark', icon: <Moon className="w-4 h-4 text-indigo-400" /> },
    { value: 'system', label: 'System', icon: <Laptop className="w-4 h-4 text-gray-400" /> },
  ];

  const animationOptions: ComboboxOption[] = [
    { value: 'system', label: 'System (Default)', description: 'Respect OS reduced-motion preference' },
    { value: 'on', label: 'On', description: 'Enable all spring transitions & staggers' },
    { value: 'reduced', label: 'Reduced', description: 'Keep short opacity/color fades only' },
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
        <h2 className="text-[24px] font-semibold text-[var(--text)] tracking-tight">
          System & ISP Settings
        </h2>
        <p className="text-[13px] text-[var(--text-muted)] mt-1">
          Organization profile, eye-comfort display, theme preference, and demo data control
        </p>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6 text-xs">
        {/* Organization Info */}
        <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-card)] space-y-4">
          <h3 className="text-sm font-semibold text-[var(--text)]">ISP Business Profile</h3>

          <Field label="Company Name">
            <Input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. NetPulse Broadband LLC"
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Support Helpline Phone">
              <Input
                type="text"
                value={supportPhone}
                onChange={(e) => setSupportPhone(e.target.value)}
                placeholder="+1 800 555 0199"
              />
            </Field>
            <Field label="Support Email">
              <Input
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                placeholder="support@netpulse.net"
              />
            </Field>
          </div>
        </div>

        {/* Eye Comfort & Appearance */}
        <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-card)] space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text)]">
              Appearance & Visual Comfort
            </h3>
            <p className="text-[13px] text-[var(--text-muted)] mt-0.5">
              Customize surface contrast, background warmth, theme mode, and animations.
            </p>
          </div>

          {/* Theme & Currency Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[13px] font-medium text-[var(--text-secondary)] block mb-1.5">
                Theme
              </label>
              <Combobox
                options={themeOptions}
                value={themeMode}
                onChange={(val) => setThemeMode(val as ThemeMode)}
                searchable={false}
                clearable={false}
                size="md"
              />
            </div>

            <div>
              <label className="text-[13px] font-medium text-[var(--text-secondary)] block mb-1.5">
                Billing Currency Symbol
              </label>
              <Combobox
                options={currencyOptions}
                value={currency}
                onChange={(val) => setCurrency(val as string)}
                searchable={false}
                clearable={false}
                size="md"
              />
            </div>
          </div>

          {/* Animations Combobox */}
          <div>
            <label className="text-[13px] font-medium text-[var(--text-secondary)] block mb-1.5">
              Animations
            </label>
            <Combobox
              options={animationOptions}
              value={animations}
              onChange={(val) => setAnimations(val as AnimationMode)}
              searchable={false}
              clearable={false}
              size="md"
            />
          </div>

          {/* Comfort Mode 3-Option Selector */}
          <div>
            <label className="text-[13px] font-medium text-[var(--text-secondary)] block mb-2">
              Visual Comfort Mode
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  id: 'soft' as const,
                  title: 'Soft (Default)',
                  desc: 'Warm stone page, off-white cards, reduced glare',
                  icon: <Sparkles className="w-4 h-4 text-amber-500" />,
                },
                {
                  id: 'standard' as const,
                  title: 'Standard',
                  desc: 'Neutral slate, balanced contrast, clean white cards',
                  icon: <Eye className="w-4 h-4 text-blue-500" />,
                },
                {
                  id: 'high-contrast' as const,
                  title: 'High Contrast',
                  desc: 'WCAG AAA 7:1 ratio, bold text, defined borders',
                  icon: <Contrast className="w-4 h-4 text-emerald-500" />,
                },
              ].map((opt) => {
                const isSelected = comfort === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setComfort(opt.id as ComfortMode)}
                    className={cn(
                      'p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-2',
                      isSelected
                        ? 'border-[var(--selected-border)] bg-[var(--selected-bg)] ring-2 ring-[var(--selected-indicator)]/20'
                        : 'border-[var(--border)] bg-[var(--surface-subtle)] hover:border-[var(--border-strong)]'
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2 font-semibold text-[13px] text-[var(--text)]">
                        {opt.icon}
                        <span>{opt.title}</span>
                      </div>
                      {isSelected && (
                        <span className="w-2 h-2 rounded-full bg-[var(--selected-indicator)]" />
                      )}
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                      {opt.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interface Density Selector */}
          <div>
            <label className="text-[13px] font-medium text-[var(--text-secondary)] block mb-2">
              Interface Density
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  id: 'compact' as const,
                  title: 'Compact (Default)',
                  desc: '32px toolbar controls, 48px table rows, tight rhythm for high productivity',
                },
                {
                  id: 'comfortable' as const,
                  title: 'Comfortable',
                  desc: '40px controls, 56px table rows, relaxed spacing for larger displays',
                },
              ].map((opt) => {
                const isSelected = density === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setDensity(opt.id as DensityMode)}
                    className={cn(
                      'p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-1',
                      isSelected
                        ? 'border-[var(--selected-border)] bg-[var(--selected-bg)] ring-2 ring-[var(--selected-indicator)]/20'
                        : 'border-[var(--border)] bg-[var(--surface-subtle)] hover:border-[var(--border-strong)]'
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-semibold text-[13px] text-[var(--text)]">
                        {opt.title}
                      </span>
                      {isSelected && (
                        <span className="w-2 h-2 rounded-full bg-[var(--selected-indicator)]" />
                      )}
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                      {opt.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2">
            <Button size="md" variant="primary" type="submit" className="h-10 px-4 font-semibold">
              <Save className="w-4 h-4" />
              <span>Save Preferences</span>
            </Button>
          </div>
        </div>

        {/* Demo Data Management */}
        <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-card)] space-y-3">
          <h3 className="text-sm font-semibold text-[var(--text)]">Demo Data Management</h3>
          <p className="text-[13px] text-[var(--text-muted)]">
            Resetting will reseed the catalog with 240 sample subscribers, initial plans, invoices, tickets, and network devices.
          </p>

          <Button
            size="md"
            variant="danger"
            type="button"
            onClick={() => {
              if (window.confirm('Reset all subscribers and restore seeded demo data (200+ subscribers)?')) {
                resetDemoData();
              }
            }}
            className="h-10 px-4 font-semibold"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset Demo Data</span>
          </Button>
        </div>
      </form>
    </div>
  );
};
export default SettingsPage;
