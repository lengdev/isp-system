import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SPRING_SOFT,
  SPRING_SNAPPY,
  DURATION_FAST,
  DURATION_NORMAL,
  DURATION_SLOW,
  modalVariants,
  drawerVariants,
  tabContentVariants,
} from '../lib/motion';
import { Button } from '../components/ui/Button';
import { Chip } from '../components/ui/Chip';
import { useStore } from '../store/useStore';
import { Check, Play, RefreshCw, X } from 'lucide-react';

export const DevMotionPage: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('one');
  const [replayKey, setReplayKey] = useState(0);

  const animations = useStore((s) => s.animations);
  const setAnimations = useStore((s) => s.setAnimations);
  const sidebarCollapsed = useStore((s) => s.sidebarCollapsed);
  const toggleSidebarCollapsed = useStore((s) => s.toggleSidebarCollapsed);

  const tabs = [
    { id: 'one', label: 'Tab Alpha' },
    { id: 'two', label: 'Tab Beta' },
    { id: 'three', label: 'Tab Gamma' },
  ];

  return (
    <div className="space-y-8 max-w-4xl pb-16" data-testid="dev-motion-page">
      <div>
        <h2 className="text-[24px] font-semibold text-[var(--text)] tracking-tight">
          Motion & Animation Dev Inspector
        </h2>
        <p className="text-[13px] text-[var(--text-muted)] mt-1">
          Verify and sample spring transitions, sliding layout indicators, drawers, modals, and reduced motion overrides.
        </p>
      </div>

      {/* Control panel */}
      <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-card)] space-y-4">
        <h3 className="text-sm font-semibold text-[var(--text)]">Motion Token Controls</h3>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setReplayKey((k) => k + 1)}
            className="gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Replay Staggers</span>
          </Button>

          <Button
            size="sm"
            variant="secondary"
            onClick={toggleSidebarCollapsed}
            data-testid="toggle-sidebar-motion-btn"
          >
            Toggle Sidebar ({sidebarCollapsed ? 'Collapsed' : 'Expanded'})
          </Button>

          <Button
            size="sm"
            variant="primary"
            onClick={() => setModalOpen(true)}
            data-testid="open-motion-modal-btn"
          >
            Open Test Modal
          </Button>

          <Button
            size="sm"
            variant="secondary"
            onClick={() => setDrawerOpen(true)}
            data-testid="open-motion-drawer-btn"
          >
            Open Test Drawer
          </Button>
        </div>

        <div className="flex items-center gap-3 pt-2 text-[12px]">
          <span className="text-[var(--text-muted)] font-medium">Override data-motion:</span>
          {(['system', 'on', 'reduced'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setAnimations(mode)}
              className={`px-3 py-1 rounded-[8px] border text-[12px] font-medium transition-colors ${
                animations === mode
                  ? 'border-[var(--selected-border)] bg-[var(--selected-bg)] text-[var(--selected-text)]'
                  : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* HeroUI Chip Components Showcase (Matches HeroUI spec and uploaded screenshot) */}
      <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-card)] space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text)]">HeroUI Chips</h3>
          <p className="text-[12px] text-[var(--text-muted)] mt-0.5">
            Flat pill chips matching HeroUI specification and dark mode styling.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Chip color="default">Default</Chip>
          <Chip color="accent">Accent</Chip>
          <Chip color="success">Success</Chip>
          <Chip color="warning">Warning</Chip>
          <Chip color="danger">Danger</Chip>
        </div>
      </div>

      {/* Sliding Layout Indicator Test */}
      <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-card)] space-y-4">
        <h3 className="text-sm font-semibold text-[var(--text)]">Sliding Layout Indicator (`layoutId`)</h3>
        <div className="flex items-center gap-2 p-1 bg-[var(--surface-subtle)] rounded-lg w-fit" role="tablist">
          {tabs.map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isSelected}
                data-testid={`motion-tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-4 py-1.5 text-[12px] font-medium rounded-md transition-colors ${
                  isSelected ? 'text-[var(--text)]' : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                {isSelected && (
                  <motion.div
                    layoutId="dev-motion-pill"
                    data-testid="motion-tab-active-indicator"
                    className="absolute inset-0 bg-[var(--surface)] rounded-md shadow-xs border border-[var(--border)]"
                    transition={SPRING_SNAPPY}
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            variants={tabContentVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="p-4 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border)] text-[13px] text-[var(--text-secondary)]"
          >
            Active tab panel content for <strong>{activeTab}</strong>. Transition uses 4px subtle slide + crossfade.
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Staggered cards test */}
      <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-card)] space-y-4" key={replayKey}>
        <h3 className="text-sm font-semibold text-[var(--text)]">Stagger Animation (120ms Fast)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((item, idx) => (
            <motion.div
              key={item}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08, duration: DURATION_NORMAL, ease: [0.22, 1, 0.36, 1] }}
              className="p-4 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border)]"
            >
              <div className="text-[12px] text-[var(--text-muted)] font-medium">Card #{item}</div>
              <div className="text-[20px] font-semibold text-[var(--text)] mt-1 tabular-nums">1,240 GB</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Test Modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-[var(--backdrop)] backdrop-blur-sm"
              onClick={() => setModalOpen(false)}
            />
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              data-testid="motion-modal-content"
              className="relative w-full max-w-md bg-[var(--surface-raised)] border border-[var(--border)] rounded-2xl shadow-[var(--shadow-modal)] p-6 space-y-4 z-10"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-[18px] font-semibold text-[var(--text)]">Modal Animation Spec</h4>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-subtle)]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-[13px] text-[var(--text-muted)] leading-relaxed">
                Scale 0.96 &rarr; 1 with spring soft (380/34), exit fast (120ms ease-out).
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <Button size="sm" variant="secondary" onClick={() => setModalOpen(false)}>
                  Close
                </Button>
                <Button size="sm" variant="primary" onClick={() => setModalOpen(false)}>
                  Confirm
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Test Drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-[var(--backdrop)] backdrop-blur-sm"
              onClick={() => setDrawerOpen(false)}
            />
            <motion.div
              variants={drawerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              data-testid="motion-drawer-content"
              className="relative w-full max-w-sm h-full bg-[var(--surface-raised)] border-l border-[var(--border)] shadow-[var(--shadow-modal)] p-6 z-10"
            >
              <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
                <h4 className="text-[18px] font-semibold text-[var(--text)]">Drawer Animation Spec</h4>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-[13px] text-[var(--text-muted)] mt-4">
                Slide 100% &rarr; 0 with spring soft (380/34), exit 200ms ease-out.
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
export default DevMotionPage;
