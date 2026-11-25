import React from 'react';
import { cn } from '../../lib/utils';

interface AvatarProps {
  name: string;
  avatarUrl?: string;
  initials?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  online?: boolean;
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  avatarUrl,
  initials,
  size = 'md',
  online,
  className,
}) => {
  // 36px exact standard avatar size (w-9 h-9)
  const sizeMap = {
    sm: 'w-7 h-7 text-[10px]',
    md: 'w-9 h-9 text-xs font-bold',
    lg: 'w-11 h-11 text-sm font-bold',
    xl: 'w-14 h-14 text-base font-extrabold',
  };

  const colors = [
    'bg-orange-100 text-[#F26B3A] dark:bg-orange-950/60 dark:text-[#F88560]',
    'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
    'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300',
    'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
    'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300',
  ];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colorClass = colors[Math.abs(hash) % colors.length];

  const displayInitials =
    initials ||
    name
      .trim()
      .split(/\s+/)
      .map((n) => Array.from(n)[0] || '')
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();

  return (
    <div className={cn('relative inline-flex items-center justify-center shrink-0 select-none rounded-full', sizeMap[size], className)}>
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name}
          className="w-full h-full rounded-full object-cover ring-1 ring-gray-200/80 dark:ring-gray-700"
        />
      ) : (
        <div
          className={cn(
            'w-full h-full flex items-center justify-center rounded-full transition-transform',
            colorClass
          )}
        >
          {displayInitials}
        </div>
      )}

      {online !== undefined && (
        <span
          className={cn(
            'absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-[#1C1C1F]',
            online ? 'bg-emerald-500' : 'bg-gray-400'
          )}
        />
      )}
    </div>
  );
};
