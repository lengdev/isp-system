import React from 'react';
import { Keyboard, X } from 'lucide-react';
import { Modal } from '../Modal';

interface DataTableShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DataTableShortcutsModal: React.FC<DataTableShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const shortcuts = [
    { key: '/', desc: 'Focus global search' },
    { key: '↑ / ↓ / ← / →', desc: 'Navigate grid cells' },
    { key: 'Space', desc: 'Toggle row selection' },
    { key: 'Shift + Space', desc: 'Range select rows' },
    { key: 'Enter / F2', desc: 'Inline edit cell / Open row' },
    { key: 'Esc', desc: 'Cancel edit / Clear selection & focus' },
    { key: 'Shift + F10', desc: 'Open row context menu' },
    { key: 'Home / End', desc: 'Jump to first / last column' },
    { key: 'Ctrl + Home / End', desc: 'Jump to first / last row' },
    { key: 'PageUp / PageDown', desc: 'Scroll table page up / down' },
    { key: 'Ctrl + C', desc: 'Copy selected cell or rows as TSV' },
    { key: '?', desc: 'Show keyboard shortcuts' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      title="Table Keyboard Shortcuts"
      subtitle="Full keyboard navigation for maximum operator speed"
      icon={<Keyboard className="w-5 h-5 text-[#F26B3A]" />}
    >
      <div className="space-y-2 py-1 text-xs select-none">
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {shortcuts.map((sc, i) => (
            <div key={i} className="flex items-center justify-between py-2">
              <span className="text-gray-600 dark:text-gray-400">{sc.desc}</span>
              <kbd className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-mono text-[11px] font-semibold text-gray-800 dark:text-gray-200 shadow-2xs">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
};
