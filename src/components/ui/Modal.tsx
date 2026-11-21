import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './Button';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: string;
  icon?: React.ReactNode;
  iconColor?: 'orange' | 'red' | 'green' | 'amber';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
  footer?: React.ReactNode;
  isDirty?: boolean;
  showCloseButton?: boolean;
  className?: string;
  ariaDescribedBy?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  iconColor = 'orange',
  size = 'md',
  children,
  footer,
  isDirty = false,
  showCloseButton = true,
  className,
  ariaDescribedBy,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Scroll shadows state
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  // Check scroll position to display top/bottom scroll shadow gradients
  const checkScroll = useCallback(() => {
    if (!bodyRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = bodyRef.current;
    setCanScrollUp(scrollTop > 4);
    setCanScrollDown(scrollTop + clientHeight < scrollHeight - 4);
  }, []);

  useEffect(() => {
    if (isOpen) {
      // Recheck scroll after render
      setTimeout(checkScroll, 60);
      window.addEventListener('resize', checkScroll);
      return () => window.removeEventListener('resize', checkScroll);
    }
  }, [isOpen, checkScroll]);

  // Handle Close Attempt (checks if dirty)
  const handleAttemptClose = useCallback(() => {
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  }, [isDirty, onClose]);

  // Escape key & body scroll lock
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (showDiscardConfirm) {
          setShowDiscardConfirm(false);
        } else {
          handleAttemptClose();
        }
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, showDiscardConfirm, handleAttemptClose]);

  // Strict sizes
  const sizeMap = {
    sm: 'max-w-[440px]',
    md: 'max-w-[560px]',
    lg: 'max-w-[720px]',
    xl: 'max-w-[880px]',
  };

  const iconColorStyles = {
    orange: 'bg-[#FFF1EA] dark:bg-orange-950/40 text-[#F26B3A]',
    red: 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400',
    green: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400',
    amber: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 overflow-hidden">
          {/* Backdrop with 6px blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={handleAttemptClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-[6px]"
          />

          {/* Modal Container: Bottom sheet on mobile (<640px), centered dialog on >=sm */}
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', damping: 32, stiffness: 380 }}
            role="dialog"
            aria-modal="true"
            aria-describedby={ariaDescribedBy}
            className={cn(
              'relative w-full rounded-t-2xl sm:rounded-2xl bg-white dark:bg-[#1C1C1F] border border-gray-200/90 dark:border-gray-800 shadow-[0_24px_64px_-12px_rgba(16,24,40,0.28)] z-10 overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[calc(100dvh-64px)]',
              sizeMap[size],
              className
            )}
          >
            {/* Mobile Drag Handle */}
            <div className="sm:hidden w-10 h-1 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto my-2.5 shrink-0" />

            {/* Header: px-6 pt-5 pb-4 */}
            {(title || icon || showCloseButton) && (
              <div
                className={cn(
                  'flex items-start justify-between px-6 pt-4 sm:pt-5 pb-4 shrink-0 transition-colors',
                  canScrollUp
                    ? 'border-b border-gray-100 dark:border-gray-800 bg-white/95 dark:bg-[#1C1C1F]/95 backdrop-blur-xs'
                    : 'border-b border-transparent'
                )}
              >
                <div className="flex items-center gap-3.5 min-w-0 pr-4">
                  {icon && (
                    <div
                      className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-xl font-bold',
                        iconColorStyles[iconColor]
                      )}
                    >
                      {icon}
                    </div>
                  )}
                  <div className="min-w-0">
                    {typeof title === 'string' ? (
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 tracking-tight truncate">
                        {title}
                      </h3>
                    ) : (
                      title
                    )}
                    {subtitle && (
                      <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                        {subtitle}
                      </p>
                    )}
                  </div>
                </div>

                {showCloseButton && (
                  <button
                    type="button"
                    onClick={handleAttemptClose}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-[#F26B3A]/30 transition-colors shrink-0 -mr-1 mt-0.5"
                    aria-label="Close dialog"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            {/* Top Scroll Shadow Gradient */}
            <div
              className={cn(
                'absolute left-0 right-0 top-[72px] h-4 bg-gradient-to-b from-black/5 to-transparent pointer-events-none transition-opacity duration-200 z-10',
                canScrollUp ? 'opacity-100' : 'opacity-0'
              )}
            />

            {/* Body: px-6 py-5 with gap-5 */}
            <div
              ref={bodyRef}
              onScroll={checkScroll}
              className="px-6 py-4 sm:py-5 overflow-y-auto flex-1 scrollbar-thin scrollbar-gutter-stable"
            >
              {children}
            </div>

            {/* Bottom Scroll Shadow Gradient */}
            <div
              className={cn(
                'absolute left-0 right-0 bottom-[68px] h-4 bg-gradient-to-t from-black/5 to-transparent pointer-events-none transition-opacity duration-200 z-10',
                canScrollDown ? 'opacity-100' : 'opacity-0'
              )}
            />

            {/* Footer: sticky at bottom, px-6 py-4 */}
            {footer && (
              <div className="px-6 py-3.5 sm:py-4 bg-[#FAFAFA] dark:bg-[#18181B] border-t border-gray-100 dark:border-gray-800 shrink-0">
                {footer}
              </div>
            )}

            {/* Dirty Form Discard Confirmation Overlay */}
            <AnimatePresence>
              {showDiscardConfirm && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute inset-0 z-30 bg-white/95 dark:bg-[#1C1C1F]/95 backdrop-blur-xs flex items-center justify-center p-6 text-center select-none"
                >
                  <div className="max-w-xs space-y-3">
                    <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
                      <AlertCircle className="w-5 h-5 stroke-[2.5]" />
                    </div>
                    <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                      Discard unsaved changes?
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      You have modified form values. If you leave now, your changes will be lost.
                    </p>
                    <div className="flex items-center justify-center gap-2.5 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowDiscardConfirm(false)}
                      >
                        Keep Editing
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => {
                          setShowDiscardConfirm(false);
                          onClose();
                        }}
                      >
                        Discard
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// ==========================================
// Standard Modal Footer Helper (<ModalFooter>)
// ==========================================

export interface ModalFooterProps {
  onCancel?: () => void;
  onSubmit?: () => void;
  cancelText?: string;
  submitText?: string;
  submitVariant?: 'primary' | 'danger';
  isSubmitting?: boolean;
  isSuccess?: boolean;
  submitDisabled?: boolean;
  leftSlot?: React.ReactNode;
  submitIcon?: React.ReactNode;
}

export const ModalFooter: React.FC<ModalFooterProps> = ({
  onCancel,
  onSubmit,
  cancelText = 'Cancel',
  submitText = 'Save Changes',
  submitVariant = 'primary',
  isSubmitting = false,
  isSuccess = false,
  submitDisabled = false,
  leftSlot,
  submitIcon,
}) => {
  return (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-2">{leftSlot}</div>

      <div className="flex items-center gap-3 ml-auto">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            size="md"
            disabled={isSubmitting}
            onClick={onCancel}
            className="h-10 px-4 text-sm font-medium"
          >
            {cancelText}
          </Button>
        )}

        <Button
          type={onSubmit ? 'button' : 'submit'}
          onClick={onSubmit}
          variant={submitVariant}
          size="md"
          disabled={submitDisabled || isSubmitting}
          className={cn(
            'h-10 px-5 text-sm font-medium transition-all duration-200 gap-1.5',
            isSuccess && 'bg-emerald-600 hover:bg-emerald-600 border-emerald-600 text-white'
          )}
        >
          {isSuccess ? (
            <>
              <Check className="w-4 h-4 stroke-[3] animate-in zoom-in-75 duration-200" />
              <span>Saved!</span>
            </>
          ) : isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              {submitIcon || <Check className="w-4 h-4" />}
              <span>{submitText}</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
