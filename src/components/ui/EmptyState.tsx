import React from 'react';
import {
  Inbox,
  SearchX,
  AlertCircle,
  Lock,
} from 'lucide-react';
import { Button } from './Button';
import { useCan } from '../../lib/permissions';
import { cn } from '../../lib/utils';

export type EmptyStateVariant = 'no-data' | 'no-results' | 'error' | 'no-permission';

export interface EmptyStateAction {
  label: string;
  onClick: () => void;
  permission?: string;
  icon?: React.ReactNode;
}

export interface EmptyStateProps {
  icon?: React.ReactNode;
  illustration?: React.ReactNode;
  title: string;
  description?: string;
  primaryAction?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  variant?: EmptyStateVariant;
  className?: string;
}

const VARIANT_CONFIG: Record<
  EmptyStateVariant,
  { tileClass: string; defaultIcon: React.ReactNode }
> = {
  'no-data': {
    tileClass: 'bg-[var(--brand-soft)] text-[var(--brand)] border border-[var(--brand)]/15',
    defaultIcon: <Inbox className="w-6 h-6" strokeWidth={1.75} />,
  },
  'no-results': {
    tileClass: 'bg-[var(--surface-subtle)] text-[var(--text-muted)] border border-[var(--border)]',
    defaultIcon: <SearchX className="w-6 h-6" strokeWidth={1.75} />,
  },
  error: {
    tileClass: 'bg-[var(--danger-bg)] text-[var(--danger-text)] border border-[var(--danger-text)]/20',
    defaultIcon: <AlertCircle className="w-6 h-6" strokeWidth={1.75} />,
  },
  'no-permission': {
    tileClass: 'bg-[var(--surface-subtle)] text-[var(--text-muted)] border border-[var(--border)]',
    defaultIcon: <Lock className="w-6 h-6" strokeWidth={1.75} />,
  },
};

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  illustration,
  title,
  description,
  primaryAction,
  secondaryAction,
  variant = 'no-data',
  className,
}) => {
  const canPrimary = useCan(primaryAction?.permission || '');
  const canSecondary = useCan(secondaryAction?.permission || '');

  const showPrimary =
    Boolean(primaryAction) &&
    variant !== 'no-permission' &&
    (!primaryAction?.permission || canPrimary);
  const showSecondary =
    Boolean(secondaryAction) && (!secondaryAction?.permission || canSecondary);

  const config = VARIANT_CONFIG[variant];
  const renderedVisual = illustration || (
    <div
      className={cn(
        'w-12 h-12 rounded-2xl flex items-center justify-center mb-3 shadow-xs',
        config.tileClass
      )}
      aria-hidden="true"
    >
      {icon || config.defaultIcon}
    </div>
  );

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'w-full flex flex-col items-center justify-center text-center py-12 px-4',
        className
      )}
    >
      {renderedVisual}

      <h3 className="text-[14px] font-semibold text-[var(--text)] leading-[1.5] max-w-sm">
        {title}
      </h3>

      {description && (
        <p className="mt-1.5 text-[12px] text-[var(--text-muted)] leading-[1.55] max-w-sm">
          {description}
        </p>
      )}

      {(showPrimary || showSecondary) && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {showSecondary && secondaryAction && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.icon}
              <span>{secondaryAction.label}</span>
            </Button>
          )}
          {showPrimary && primaryAction && (
            <Button
              type="button"
              size="sm"
              variant="primary"
              onClick={primaryAction.onClick}
            >
              {primaryAction.icon}
              <span>{primaryAction.label}</span>
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
