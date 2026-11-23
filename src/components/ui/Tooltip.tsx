import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  delay?: number;
  position?: 'top' | 'bottom' | 'left' | 'right';
  side?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  delay = 120,
  position = 'top',
  side,
  className,
}) => {
  const effectivePosition = side || position;
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<number | null>(null);

  const updateCoords = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    let top = 0;
    let left = 0;

    switch (effectivePosition) {
      case 'right':
        top = rect.top + rect.height / 2;
        left = rect.right + 8;
        break;
      case 'left':
        top = rect.top + rect.height / 2;
        left = rect.left - 8;
        break;
      case 'bottom':
        top = rect.bottom + 8;
        left = rect.left + rect.width / 2;
        break;
      case 'top':
      default:
        top = rect.top - 8;
        left = rect.left + rect.width / 2;
        break;
    }
    setCoords({ top, left });
  }, [effectivePosition]);

  const show = () => {
    timeoutRef.current = window.setTimeout(() => {
      updateCoords();
      setIsVisible(true);
    }, delay);
  };

  const hide = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  useEffect(() => {
    if (!isVisible) return;
    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    return () => {
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('resize', hide);
    };
  }, [isVisible]);

  if (!content) return <>{children}</>;

  const transformStyle =
    effectivePosition === 'right'
      ? 'translateY(-50%)'
      : effectivePosition === 'left'
      ? 'translate(-100%, -50%)'
      : effectivePosition === 'bottom'
      ? 'translateX(-50%)'
      : 'translate(-50%, -100%)';

  return (
    <div
      ref={triggerRef}
      className={cn('relative inline-flex items-center', className)}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {isVisible && coords && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.12 }}
                role="tooltip"
                style={{
                  position: 'fixed',
                  top: `${coords.top}px`,
                  left: `${coords.left}px`,
                  transform: transformStyle,
                  zIndex: 99999,
                }}
                className="pointer-events-none px-2 py-1 text-[11px] font-semibold rounded-md shadow-[var(--shadow-md)] bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 whitespace-nowrap select-none"
              >
                {content}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
};
