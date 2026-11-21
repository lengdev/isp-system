import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './Button';
import { modalVariants, transitions } from '../../lib/motion';

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
        e.preventDefault();
        e.stopPropagation();
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

  // Spec sizes: sm 440 / md 560 / lg 720 / xl 880 (min(size, 100vw-32px))
  const sizeMap = {
    sm: 'sm:max-w-[440px]',
    md: 'sm:max-w-[560px]',
    lg: 'sm:max-w-[720px]',
    xl: 'sm:max-w-[880px]',
  };

  const iconColorStyles = {
    orange: 'bg-[var(--brand-soft)] text-[var(--brand)]',
    red: 'bg-[var(--danger-bg)] text-[var(--danger-text)]',
    green: 'bg-[var(--success-bg)] text-[var(--success-text)]',
    amber: 'bg-[var(--warning-bg)] text-[var(--warning-text)]',
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
            className="fixed inset-0 bg-[var(--backdrop)] backdrop-blur-[6px]"
          />

          {/* Modal Container: Bottom sheet on mobile (<640px), centered dialog on >=sm */}
          <motion.div
            ref={modalRef}
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            role="dialog"
            aria-modal="true"
            aria-describedby={ariaDescribedBy}
            className={cn(
              'relative w-full rounded-t-2xl sm:rounded-2xl bg-[var(--surface-raised)] border border-[var(--border)] shadow-[var(--shadow-modal)] z-10 overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[calc(100dvh-64px)]',
              sizeMap[size],
              className
            )}
          >
            {/* Mobile Drag Handle */}
            <div className="sm:hidden w-10 h-1 bg-[var(--border-strong)] rounded-full mx-auto my-2.5 shrink-0" />

            {/* Header: px-6 pt-5 pb-4 */}
            {(title || icon || showCloseButton) && (
              <div
                className={cn(
                  'flex items-start justify-between px-6 pt-4 sm:pt-5 pb-4 shrink-0 transition-colors',
                  canScrollUp
                    ? 'border-b border-[var(--border)] bg-[var(--surface-raised)]/95 backdrop-blur-xs'
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
                      <h3 className="text-[18px] font-semibold text-[var(--text)] tracking-tight truncate">
                        {title}
                      </h3>
                    ) : (
                      title
                    )}
                    {subtitle && (
                      <p className="text-[13px] text-[var(--text-muted)] mt-0.5 truncate">
                        {subtitle}
                      </p>
                    )}
                  </div>
                </div>

                {showCloseButton && (
                  <button
                    type="button"
                    onClick={handleAttemptClose}
                    data-testid="modal-close-btn"
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-ring)] transition-colors shrink-0 -mr-1 mt-0.5"
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

            {/* Body: px-6 py-5, gap-4 */}
            <div
              ref={bodyRef}
              onScroll={checkScroll}
              className="px-6 py-5 overflow-y-auto flex-1 scrollbar-thin scrollbar-gutter-stable space-y-4"
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
              <div className="px-6 py-3.5 sm:py-4 bg-[var(--surface-subtle)] border-t border-[var(--border)] shrink-0">
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
                  className="absolute inset-0 z-30 bg-[var(--surface-raised)]/95 backdrop-blur-xs flex items-center justify-center p-6 text-center select-none"
                >
                  <div className="max-w-xs space-y-3">
                    <div className="w-10 h-10 rounded-full bg-[var(--warning-bg)] text-[var(--warning-text)] mx-auto flex items-center justify-center">
                      <AlertCircle className="w-5 h-5 stroke-[2.2]" />
                    </div>
                    <h4 className="text-[16px] font-semibold text-[var(--text)]">
                      Discard unsaved changes?
                    </h4>
                    <p className="text-[12px] text-[var(--text-muted)]">
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
export interface ModalFooterProps {
  onCancel?: () => void;
  onSubmit?: (e?: any) => void;
  cancelText?: string;
  submitText?: string;
  submitVariant?: 'primary' | 'danger' | 'secondary' | string;
  submitIcon?: React.ReactNode;
  isSubmitting?: boolean;
  isSuccess?: boolean;
  submitDisabled?: boolean;
  leftSlot?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export const ModalFooter: React.FC<ModalFooterProps> = ({
  onCancel,
  onSubmit,
  cancelText = 'Cancel',
  submitText = 'Save Changes',
  submitVariant = 'primary',
  submitIcon,
  isSubmitting = false,
  isSuccess = false,
  submitDisabled = false,
  leftSlot,
  children,
  className,
}) => {
  if (children) {
    return (
      <div className={cn('flex items-center justify-between w-full gap-3', className)}>
        {leftSlot ? <div className="text-[12px] text-[var(--text-muted)]">{leftSlot}</div> : <div />}
        <div className="flex items-center gap-2.5">{children}</div>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center justify-between w-full gap-3', className)}>
      {leftSlot ? <div className="text-[12px] text-[var(--text-muted)]">{leftSlot}</div> : <div />}
      <div className="flex items-center gap-2.5 ml-auto">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={onCancel}
            disabled={isSubmitting}
            className="h-10 px-4 text-[13px] font-medium"
          >
            {cancelText}
          </Button>
        )}
        {onSubmit && (
          <Button
            type="button"
            variant={submitVariant as any}
            size="md"
            onClick={onSubmit}
            disabled={submitDisabled || isSubmitting}
            className={cn(
              'h-10 px-4 text-[13px] font-medium transition-all gap-1.5',
              isSuccess && 'bg-[var(--success-bg)] text-[var(--success-text)] border-[var(--success-text)]/30'
            )}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : isSuccess ? (
              <>
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>Saved</span>
              </>
            ) : (
              <>
                {submitIcon || <Check className="w-4 h-4" />}
                <span>{submitText}</span>
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};

export const ModalBody: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <div className={cn('space-y-4', className)}>{children}</div>
);

export default Modal;
