import React, { forwardRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { CustomerStatus } from '../../types';

export type ChipVariant = 'flat' | 'solid' | 'bordered' | 'light' | 'faded' | 'dot';
export type ChipColor = 'default' | 'primary' | 'accent' | 'secondary' | 'success' | 'warning' | 'danger';
export type ChipSize = 'sm' | 'md' | 'lg';
export type ChipRadius = 'full' | 'lg' | 'md' | 'sm' | 'none';

export interface ChipProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Visual variant (defaults to 'flat') */
  variant?: ChipVariant;
  /** Semantic color (defaults to 'default') */
  color?: ChipColor;
  /** Size of the chip (defaults to 'md') */
  size?: ChipSize;
  /** Corner radius (defaults to 'full') */
  radius?: ChipRadius;
  /** Leading avatar element */
  avatar?: React.ReactNode;
  /** Leading icon/content */
  startContent?: React.ReactNode;
  /** Trailing icon/content */
  endContent?: React.ReactNode;
  /** Callback fired when close icon is clicked */
  onClose?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  /** Whether the chip is dismissable (shows close icon) */
  isCloseable?: boolean;
  /** Whether the chip is disabled */
  isDisabled?: boolean;
  /** CustomerStatus mapping for automatic semantic coloring */
  status?: CustomerStatus;
  children?: React.ReactNode;
}

export const Chip = forwardRef<HTMLDivElement, ChipProps>(
  (
    {
      className,
      variant = 'flat',
      color = 'default',
      size = 'md',
      radius = 'full',
      avatar,
      startContent,
      endContent,
      onClose,
      isCloseable,
      isDisabled = false,
      status,
      children,
      ...props
    },
    ref
  ) => {
    // Map CustomerStatus to color and label if passed
    let effectiveColor = color;
    let fallbackText: React.ReactNode = children;

    if (status) {
      fallbackText = children || status;
      switch (status) {
        case 'Active':
          effectiveColor = 'success';
          break;
        case 'Suspended':
          effectiveColor = 'warning';
          break;
        case 'Overdue':
          effectiveColor = 'danger';
          break;
        case 'Pending':
          effectiveColor = 'accent';
          break;
        case 'Disconnected':
          effectiveColor = 'default';
          break;
      }
    }

    // Normalize 'accent' to 'primary' for internal logic if needed
    const normalizedColor = effectiveColor === 'accent' ? 'primary' : effectiveColor;

    // Radius styles
    const radiusStyles: Record<ChipRadius, string> = {
      full: 'rounded-full',
      lg: 'rounded-xl',
      md: 'rounded-lg',
      sm: 'rounded-md',
      none: 'rounded-none',
    };

    // Size styles
    const sizeStyles: Record<ChipSize, string> = {
      sm: 'min-h-[24px] py-0.5 px-2.5 text-[11px] gap-1',
      md: 'min-h-[28px] py-0.5 px-3 text-[13px] gap-1.5',
      lg: 'min-h-[32px] py-1 px-3.5 text-[14px] gap-2',
    };

    // Dot colors for variant="dot"
    const dotColors: Record<string, string> = {
      default: 'bg-zinc-400 dark:bg-zinc-400',
      primary: 'bg-[#006FEE] dark:bg-[#60a5fa]',
      accent: 'bg-[#006FEE] dark:bg-[#60a5fa]',
      secondary: 'bg-purple-500 dark:bg-[#c084fc]',
      success: 'bg-emerald-500 dark:bg-[#4ade80]',
      warning: 'bg-amber-500 dark:bg-[#fbbf24]',
      danger: 'bg-rose-500 dark:bg-[#f87171]',
    };

    // Color variant styles matching HeroUI Chip specification & uploaded screenshot
    const variantColorStyles: Record<ChipVariant, Record<string, string>> = {
      // Flat variant (Matches user screenshot: dark grey #27272a pill with colored text in dark mode)
      flat: {
        default:
          'bg-zinc-100 text-zinc-800 dark:bg-[#27272a] dark:text-zinc-100',
        primary:
          'bg-blue-50 text-blue-600 dark:bg-[#27272a] dark:text-[#60a5fa]',
        accent:
          'bg-blue-50 text-blue-600 dark:bg-[#27272a] dark:text-[#60a5fa]',
        secondary:
          'bg-purple-50 text-purple-700 dark:bg-[#27272a] dark:text-[#c084fc]',
        success:
          'bg-emerald-50 text-emerald-700 dark:bg-[#27272a] dark:text-[#4ade80]',
        warning:
          'bg-amber-50 text-amber-700 dark:bg-[#27272a] dark:text-[#fbbf24]',
        danger:
          'bg-rose-50 text-rose-600 dark:bg-[#27272a] dark:text-[#f87171]',
      },
      // Solid variant (Solid colored background with white text)
      solid: {
        default: 'bg-zinc-700 text-white dark:bg-zinc-700 dark:text-white',
        primary: 'bg-[#006FEE] text-white dark:bg-[#006FEE] dark:text-white',
        accent: 'bg-[#006FEE] text-white dark:bg-[#006FEE] dark:text-white',
        secondary: 'bg-purple-600 text-white dark:bg-purple-600 dark:text-white',
        success: 'bg-emerald-600 text-white dark:bg-emerald-600 dark:text-white',
        warning: 'bg-amber-500 text-zinc-950 dark:bg-amber-500 dark:text-zinc-950 font-semibold',
        danger: 'bg-rose-600 text-white dark:bg-rose-600 dark:text-white',
      },
      // Bordered variant (Transparent background with colored border and text)
      bordered: {
        default:
          'bg-transparent border border-zinc-300 text-zinc-700 dark:border-zinc-700 dark:text-zinc-200',
        primary:
          'bg-transparent border border-[#006FEE]/60 text-[#006FEE] dark:border-[#60a5fa]/60 dark:text-[#60a5fa]',
        accent:
          'bg-transparent border border-[#006FEE]/60 text-[#006FEE] dark:border-[#60a5fa]/60 dark:text-[#60a5fa]',
        secondary:
          'bg-transparent border border-purple-500/60 text-purple-600 dark:border-purple-400/60 dark:text-purple-400',
        success:
          'bg-transparent border border-emerald-500/60 text-emerald-600 dark:border-emerald-400/60 dark:text-emerald-400',
        warning:
          'bg-transparent border border-amber-500/60 text-amber-600 dark:border-amber-400/60 dark:text-amber-400',
        danger:
          'bg-transparent border border-rose-500/60 text-rose-600 dark:border-rose-400/60 dark:text-rose-400',
      },
      // Light variant (Transparent background, colored text on hover/active)
      light: {
        default: 'bg-transparent text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800',
        primary: 'bg-transparent text-[#006FEE] dark:text-[#60a5fa] hover:bg-blue-50 dark:hover:bg-blue-950/30',
        accent: 'bg-transparent text-[#006FEE] dark:text-[#60a5fa] hover:bg-blue-50 dark:hover:bg-blue-950/30',
        secondary: 'bg-transparent text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30',
        success: 'bg-transparent text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30',
        warning: 'bg-transparent text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30',
        danger: 'bg-transparent text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30',
      },
      // Faded variant (Subtle border + subtle tinted background)
      faded: {
        default:
          'bg-zinc-100/80 border border-zinc-200 text-zinc-700 dark:bg-zinc-800/60 dark:border-zinc-700/60 dark:text-zinc-200',
        primary:
          'bg-blue-50/70 border border-blue-200 text-blue-700 dark:bg-blue-950/30 dark:border-blue-900/40 dark:text-blue-300',
        accent:
          'bg-blue-50/70 border border-blue-200 text-blue-700 dark:bg-blue-950/30 dark:border-blue-900/40 dark:text-blue-300',
        secondary:
          'bg-purple-50/70 border border-purple-200 text-purple-700 dark:bg-purple-950/30 dark:border-purple-900/40 dark:text-purple-300',
        success:
          'bg-emerald-50/70 border border-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-900/40 dark:text-emerald-300',
        warning:
          'bg-amber-50/70 border border-amber-200 text-amber-700 dark:bg-amber-950/30 dark:border-amber-900/40 dark:text-amber-300',
        danger:
          'bg-rose-50/70 border border-rose-200 text-rose-700 dark:bg-rose-950/30 dark:border-rose-900/40 dark:text-rose-300',
      },
      // Dot variant (Flat background + leading dot indicator)
      dot: {
        default:
          'bg-zinc-100 text-zinc-800 dark:bg-[#27272a] dark:text-zinc-100',
        primary:
          'bg-blue-50 text-blue-600 dark:bg-[#27272a] dark:text-[#60a5fa]',
        accent:
          'bg-blue-50 text-blue-600 dark:bg-[#27272a] dark:text-[#60a5fa]',
        secondary:
          'bg-purple-50 text-purple-700 dark:bg-[#27272a] dark:text-[#c084fc]',
        success:
          'bg-emerald-50 text-emerald-700 dark:bg-[#27272a] dark:text-[#4ade80]',
        warning:
          'bg-amber-50 text-amber-700 dark:bg-[#27272a] dark:text-[#fbbf24]',
        danger:
          'bg-rose-50 text-rose-600 dark:bg-[#27272a] dark:text-[#f87171]',
      },
    };

    const currentVariantStyles =
      variantColorStyles[variant]?.[normalizedColor] ||
      variantColorStyles.flat.default;

    const showClose = isCloseable || Boolean(onClose);

    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-medium select-none shrink-0 transition-colors duration-150',
          radiusStyles[radius],
          sizeStyles[size],
          currentVariantStyles,
          isDisabled && 'opacity-50 cursor-not-allowed pointer-events-none',
          className
        )}
        {...props}
      >
        {/* Dot indicator if variant="dot" */}
        {variant === 'dot' && (
          <span
            className={cn(
              'w-1.5 h-1.5 rounded-full shrink-0',
              dotColors[normalizedColor] || dotColors.default
            )}
          />
        )}

        {/* Avatar */}
        {avatar && <div className="shrink-0 -ml-1 mr-0.5">{avatar}</div>}

        {/* Start Content */}
        {startContent && <span className="shrink-0 flex items-center">{startContent}</span>}

        {/* Content */}
        <span className="truncate leading-[1.5]">{fallbackText}</span>

        {/* End Content */}
        {endContent && <span className="shrink-0 flex items-center">{endContent}</span>}

        {/* Close Button */}
        {showClose && (
          <button
            type="button"
            aria-label="Remove chip"
            onClick={onClose}
            className="shrink-0 -mr-1 p-0.5 rounded-full opacity-60 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 transition-all cursor-pointer focus:outline-none"
          >
            <X className="w-3 h-3 stroke-[2.5]" />
          </button>
        )}
      </div>
    );
  }
);

Chip.displayName = 'Chip';
