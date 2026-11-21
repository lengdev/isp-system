import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';

export interface PopoverProps {
  trigger: React.ReactNode;
  content: React.ReactNode | ((props: { close: () => void }) => React.ReactNode);
  align?: 'left' | 'right' | 'center';
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  popoverClassName?: string;
  width?: string;
}

export const Popover: React.FC<PopoverProps> = ({
  trigger,
  content,
  align = 'right',
  isOpen: controlledIsOpen,
  onOpenChange,
  className,
  popoverClassName,
  width,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const toggle = () => {
    const next = !isOpen;
    if (!isControlled) setInternalIsOpen(next);
    onOpenChange?.(next);
  };

  const close = useCallback(() => {
    if (!isControlled) setInternalIsOpen(false);
    onOpenChange?.(false);
  }, [isControlled, onOpenChange]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      // Check if target is inside a combobox portal
      const isComboboxPortal = (target as HTMLElement)?.closest?.('[data-combobox-portal]');
      if (isComboboxPortal) return;

      if (containerRef.current && !containerRef.current.contains(target)) {
        close();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, close]);

  const aligns = {
    left: 'left-0 origin-top-left',
    right: 'right-0 origin-top-right',
    center: 'left-1/2 -translate-x-1/2 origin-top',
  };

  return (
    <div ref={containerRef} className={cn('relative inline-block', className)}>
      <div onClick={toggle} className="cursor-pointer">
        {trigger}
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={popoverRef}
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -4 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            style={{ width: width || undefined }}
            className={cn(
              'absolute z-40 mt-1.5 rounded-2xl bg-white dark:bg-[#1E1E22] border border-gray-200/90 dark:border-gray-800 shadow-[0_16px_36px_-6px_rgba(16,24,40,0.18)] focus:outline-none overflow-hidden max-w-[calc(100vw-32px)]',
              aligns[align],
              popoverClassName
            )}
          >
            {typeof content === 'function' ? content({ close }) : content}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
