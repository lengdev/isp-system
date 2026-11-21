import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface DropdownItem {
  id?: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
  divider?: boolean;
  disabled?: boolean;
  selected?: boolean;
}

interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  align?: 'left' | 'right';
  className?: string;
  menuClassName?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  items,
  align = 'right',
  className,
  menuClassName,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className={cn('relative inline-block text-left', className)}>
      <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.12 }}
            className={cn(
              'absolute z-40 mt-1.5 w-48 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] shadow-[var(--shadow-popover)] p-1.5 flex flex-col gap-[2px] focus:outline-none overflow-hidden select-none',
              align === 'right' ? 'right-0' : 'left-0',
              menuClassName
            )}
          >
            {items.map((item, index) => {
              if (item.divider) {
                return (
                  <div
                    key={`div-${index}`}
                    className="my-1 border-t border-[var(--border-subtle)]"
                  />
                );
              }

              return (
                <button
                  key={item.id || index}
                  disabled={item.disabled}
                  onClick={(e) => {
                    e.stopPropagation();
                    item.onClick?.();
                    setIsOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-[8px] transition-colors duration-[120ms] text-left select-none border',
                    item.disabled && 'opacity-50 pointer-events-none border-transparent',
                    item.danger
                      ? 'text-[#B42318] hover:bg-[#FDECEA] dark:hover:bg-[rgba(180,35,24,0.14)] border-transparent'
                      : item.selected
                      ? 'bg-[var(--option-selected-bg)] text-[var(--option-selected-text)] border-[var(--option-selected-border)] hover:bg-[var(--option-selected-hover-bg)]'
                      : 'border-transparent text-[var(--text-secondary)] hover:bg-[var(--option-hover-bg)] hover:text-[var(--text)]'
                  )}
                >
                  {item.icon && <span className="shrink-0 text-current">{item.icon}</span>}
                  <span className="truncate flex-1">{item.label}</span>
                  {item.selected && (
                    <div className="w-4 h-4 ml-auto shrink-0 flex items-center justify-center">
                      <Check className="w-4 h-4 text-[var(--option-selected-icon)] stroke-[2]" />
                    </div>
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
