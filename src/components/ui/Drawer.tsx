import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Tooltip } from './Tooltip';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: 'md' | 'lg' | 'xl' | '2xl' | 'customer';
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  // Prev / Next list navigation
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  counterLabel?: string; // e.g. "3 of 240"
  showPrevNext?: boolean;
  // Custom header override (if caller needs full control of header structure)
  customHeader?: React.ReactNode;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  headerRight,
  children,
  footer,
  width = 'customer',
  className,
  headerClassName,
  bodyClassName,
  footerClassName,
  ariaLabel,
  ariaLabelledBy,
  onPrev,
  onNext,
  hasPrev = false,
  hasNext = false,
  counterLabel,
  showPrevNext = false,
  customHeader,
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const drawerRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  // Detect mobile & prefers-reduced-motion
  useEffect(() => {
    const mobileQuery = window.matchMedia('(max-width: 639px)');
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    setIsMobile(mobileQuery.matches);
    setPrefersReducedMotion(motionQuery.matches);

    const handleMobileChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    const handleMotionChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);

    mobileQuery.addEventListener('change', handleMobileChange);
    motionQuery.addEventListener('change', handleMotionChange);

    return () => {
      mobileQuery.removeEventListener('change', handleMobileChange);
      motionQuery.removeEventListener('change', handleMotionChange);
    };
  }, []);

  // Save active element when opening and restore on close
  useEffect(() => {
    if (isOpen) {
      previousActiveElementRef.current = document.activeElement as HTMLElement | null;
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      if (previousActiveElementRef.current) {
        // Return focus to previously clicked row or trigger
        previousActiveElementRef.current.focus?.();
      }
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Focus trap & keyboard navigation (Esc, J, K)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;

      // Close on Escape
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      // Check if user is typing inside an input, textarea, or contentEditable
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable;

      // J / K for next / prev customer (only when not typing)
      if (!isInput) {
        if ((e.key === 'j' || e.key === 'J') && onNext && hasNext) {
          e.preventDefault();
          onNext();
          return;
        }
        if ((e.key === 'k' || e.key === 'K') && onPrev && hasPrev) {
          e.preventDefault();
          onPrev();
          return;
        }
      }

      // Focus trap
      if (e.key === 'Tab' && drawerRef.current) {
        const focusableElements = drawerRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href]:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])'
        );

        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    },
    [isOpen, onClose, onNext, onPrev, hasNext, hasPrev]
  );

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  const handleBodyScroll = useCallback(() => {
    if (bodyRef.current) {
      const scrolled = bodyRef.current.scrollTop > 4;
      setIsScrolled(scrolled);
    }
  }, []);

  const widthClasses = {
    md: 'sm:w-[420px] sm:max-w-[420px]',
    lg: 'sm:w-[480px] sm:max-w-[480px]',
    xl: 'sm:w-[560px] sm:max-w-[560px]',
    '2xl': 'sm:w-[680px] sm:max-w-[680px]',
    customer: 'sm:w-[min(560px,100vw)] sm:max-w-[560px]',
  };

  // Motion variants
  const desktopSpring = {
    type: 'spring' as const,
    stiffness: 380,
    damping: 34,
  };

  const desktopExit = {
    duration: 0.16,
    ease: [0.4, 0, 1, 1] as const,
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 overflow-hidden"
          role="dialog"
          aria-modal="true"
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          aria-live="polite"
        >
          {/* Backdrop: bg-black/40 backdrop-blur-sm */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            aria-hidden="true"
          />

          {/* Drawer container: right-aligned on desktop, slide-up sheet on mobile */}
          <div className="fixed inset-0 sm:left-auto sm:right-0 flex flex-col justify-end sm:justify-start pointer-events-none z-50">
            <motion.div
              ref={drawerRef}
              initial={
                prefersReducedMotion
                  ? { opacity: 0 }
                  : isMobile
                  ? { y: '100%', opacity: 1 }
                  : { x: 24, opacity: 0 }
              }
              animate={
                prefersReducedMotion
                  ? { opacity: 1 }
                  : isMobile
                  ? { y: 0, opacity: 1 }
                  : { x: 0, opacity: 1 }
              }
              exit={
                prefersReducedMotion
                  ? { opacity: 0 }
                  : isMobile
                  ? { y: '100%', opacity: 1 }
                  : { x: 24, opacity: 0 }
              }
              transition={
                prefersReducedMotion
                  ? { duration: 0 }
                  : isMobile
                  ? desktopSpring
                  : {
                      x: desktopSpring,
                      opacity: { duration: 0.18, ease: 'easeOut' },
                    }
              }
              className={cn(
                'pointer-events-auto flex flex-col w-full h-[92dvh] sm:h-dvh max-h-[100dvh]',
                'bg-[var(--surface)] text-[var(--text)]',
                'border-t sm:border-t-0 sm:border-l border-[var(--border)] dark:border-[rgba(255,255,255,0.08)]',
                'rounded-t-[20px] sm:rounded-none',
                'shadow-[-24px_0_64px_-16px_rgba(0,0,0,0.35)]',
                widthClasses[width],
                className
              )}
            >
              {/* Header: sticky, bottom border fades in only after scrolling */}
              {customHeader ? (
                <div
                  className={cn(
                    'sticky top-0 z-30 shrink-0 bg-[var(--surface)] transition-colors duration-200 border-b',
                    isScrolled
                      ? 'border-[var(--border)] dark:border-[rgba(255,255,255,0.08)] shadow-xs'
                      : 'border-transparent',
                    headerClassName
                  )}
                >
                  {customHeader}
                </div>
              ) : (
                <div
                  className={cn(
                    'sticky top-0 z-30 shrink-0 bg-[var(--surface)] px-6 pt-5 pb-4 transition-colors duration-200 border-b',
                    isScrolled
                      ? 'border-[var(--border)] dark:border-[rgba(255,255,255,0.08)] shadow-xs'
                      : 'border-transparent',
                    headerClassName
                  )}
                >
                  {/* Default Header Row */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      {typeof title === 'string' ? (
                        <h2 className="text-[18px] font-semibold tracking-tight text-[var(--text)] truncate">
                          {title}
                        </h2>
                      ) : (
                        title
                      )}
                      {subtitle && (
                        <div className="text-[13px] text-[var(--text-muted)] dark:text-[#8B92A0] mt-0.5 truncate">
                          {subtitle}
                        </div>
                      )}
                    </div>

                    {/* Right action group */}
                    <div className="flex items-center gap-1 shrink-0">
                      {showPrevNext && (
                        <div className="flex items-center gap-1 mr-1">
                          {counterLabel && (
                            <span className="text-[12px] font-medium text-[var(--text-muted)] px-1.5 tabular-nums">
                              {counterLabel}
                            </span>
                          )}
                          <Tooltip content="Previous (K)">
                            <button
                              type="button"
                              onClick={onPrev}
                              disabled={!hasPrev}
                              aria-label="Previous item"
                              className="w-9 h-9 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-subtle)] disabled:opacity-30 disabled:pointer-events-none transition-colors"
                            >
                              <ChevronUp className="w-4 h-4 stroke-[2]" />
                            </button>
                          </Tooltip>
                          <Tooltip content="Next (J)">
                            <button
                              type="button"
                              onClick={onNext}
                              disabled={!hasNext}
                              aria-label="Next item"
                              className="w-9 h-9 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-subtle)] disabled:opacity-30 disabled:pointer-events-none transition-colors"
                            >
                              <ChevronDown className="w-4 h-4 stroke-[2]" />
                            </button>
                          </Tooltip>
                        </div>
                      )}

                      {headerRight}

                      <Tooltip content="Close (Esc)">
                        <button
                          type="button"
                          onClick={onClose}
                          aria-label="Close drawer"
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)] transition-colors"
                        >
                          <X className="w-4 h-4 stroke-[2]" />
                        </button>
                      </Tooltip>
                    </div>
                  </div>
                </div>
              )}

              {/* Body: scrolls with thin scrollbar and scrollbar-gutter: stable */}
              <div
                ref={bodyRef}
                onScroll={handleBodyScroll}
                tabIndex={-1}
                className={cn(
                  'flex-1 overflow-y-auto outline-none [scrollbar-gutter:stable]',
                  'scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-800 hover:scrollbar-thumb-gray-300 dark:hover:scrollbar-thumb-gray-700',
                  bodyClassName
                )}
              >
                {children}
              </div>

              {/* Footer: sticky optional */}
              {footer && (
                <div
                  className={cn(
                    'sticky bottom-0 z-30 shrink-0 bg-[var(--surface)] px-6 py-3 border-t border-[var(--border)] dark:border-[rgba(255,255,255,0.08)] flex items-center justify-between text-xs text-[var(--text-muted)]',
                    footerClassName
                  )}
                >
                  {footer}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};
