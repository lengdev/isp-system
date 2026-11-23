import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  const [coords, setCoords] = useState<{
    top: number;
    left?: number;
    right?: number;
    placeAbove: boolean;
  } | null>(null);

  const toggle = () => {
    const next = !isOpen;
    if (!isControlled) setInternalIsOpen(next);
    onOpenChange?.(next);
  };

  const close = useCallback(() => {
    if (!isControlled) setInternalIsOpen(false);
    onOpenChange?.(false);
  }, [isControlled, onOpenChange]);

  const updateCoords = useCallback(() => {
    if (!containerRef.current) return;
    const triggerRect = containerRef.current.getBoundingClientRect();
    const padding = 12;
    const sideOffset = 6;

    const popoverEl = popoverRef.current;
    const popoverWidth = popoverEl?.offsetWidth || (width ? parseInt(width, 10) : 280);
    const popoverHeight = popoverEl?.offsetHeight || 200;

    // Vertical placement: place below by default, or flip above if space below is insufficient
    const spaceBelow = window.innerHeight - triggerRect.bottom - padding;
    const spaceAbove = triggerRect.top - padding;
    const placeAbove = spaceBelow < popoverHeight && spaceAbove > spaceBelow;

    const top = placeAbove
      ? Math.max(padding, triggerRect.top - popoverHeight - sideOffset)
      : Math.min(window.innerHeight - popoverHeight - padding, triggerRect.bottom + sideOffset);

    let left: number | undefined;
    let right: number | undefined;

    if (align === 'right') {
      // Anchored flush with the right edge of trigger, expanding to the left
      const rightDistance = Math.max(padding, window.innerWidth - triggerRect.right);
      // If expanding leftwards would exceed viewport left edge
      if (window.innerWidth - rightDistance - popoverWidth < padding) {
        left = padding;
        right = undefined;
      } else {
        right = rightDistance;
        left = undefined;
      }
    } else if (align === 'center') {
      let l = triggerRect.left + triggerRect.width / 2 - popoverWidth / 2;
      l = Math.max(padding, Math.min(window.innerWidth - popoverWidth - padding, l));
      left = l;
      right = undefined;
    } else {
      // align === 'left'
      let l = Math.max(padding, triggerRect.left);
      if (l + popoverWidth > window.innerWidth - padding) {
        l = Math.max(padding, window.innerWidth - popoverWidth - padding);
      }
      left = l;
      right = undefined;
    }

    setCoords({ top, left, right, placeAbove });
  }, [align, width]);

  useEffect(() => {
    if (!isOpen) {
      setCoords(null);
      return;
    }
    updateCoords();
    const rafId = requestAnimationFrame(() => {
      updateCoords();
    });
    return () => cancelAnimationFrame(rafId);
  }, [isOpen, updateCoords]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;

      // Check if target is inside a combobox portal
      const isComboboxPortal = (target as HTMLElement)?.closest?.('[data-combobox-portal]');
      if (isComboboxPortal) return;

      close();
    };

    const handleScrollOrResize = (e: Event) => {
      if (popoverRef.current?.contains(e.target as Node)) return;
      updateCoords();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, close, updateCoords]);

  const originClass = coords?.placeAbove
    ? coords?.right !== undefined || align === 'right'
      ? 'origin-bottom-right'
      : align === 'left'
      ? 'origin-bottom-left'
      : 'origin-bottom'
    : coords?.right !== undefined || align === 'right'
    ? 'origin-top-right'
    : align === 'left'
    ? 'origin-top-left'
    : 'origin-top';

  return (
    <div ref={containerRef} className={cn('relative inline-block', className)}>
      <div
        onClick={(e) => {
          e.stopPropagation();
          toggle();
        }}
        className="cursor-pointer"
      >
        {trigger}
      </div>

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {isOpen && coords && (
              <motion.div
                ref={popoverRef}
                initial={{ opacity: 0, scale: 0.96, y: coords.placeAbove ? 4 : -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: coords.placeAbove ? 4 : -4 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                style={{
                  position: 'fixed',
                  top: `${coords.top}px`,
                  left: coords.left !== undefined ? `${coords.left}px` : undefined,
                  right: coords.right !== undefined ? `${coords.right}px` : undefined,
                  width: width || undefined,
                  zIndex: 9999,
                }}
                className={cn(
                  'rounded-2xl bg-white/95 dark:bg-[#18181b]/95 backdrop-blur-md border border-zinc-200/80 dark:border-white/10 shadow-[0_12px_36px_-6px_rgba(0,0,0,0.14),0_4px_12px_-2px_rgba(0,0,0,0.06)] dark:shadow-[0_12px_36px_-6px_rgba(0,0,0,0.65)] focus:outline-none overflow-hidden max-w-[calc(100vw-32px)]',
                  originClass,
                  popoverClassName
                )}
              >
                {typeof content === 'function' ? content({ close }) : content}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
};
