import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

export function formatDate(dateString: string | Date, formatStr = 'MMM dd, yyyy'): string {
  try {
    const d = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    return format(d, formatStr);
  } catch (e) {
    return String(dateString);
  }
}

export function getInitials(name: string): string {
  const cleaned = name.trim().normalize('NFC');
  if (!cleaned) return 'CU';
  return cleaned
    .split(/\s+/)
    .map((part) => Array.from(part)[0] || '')
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function normalizeSearchText(value?: string | null): string {
  return (value || '').trim().normalize('NFC').toLowerCase();
}

export function getCustomerDisplayNames(customer: {
  nameKm?: string | null;
  nameEn?: string | null;
  fullName?: string | null;
}): {
  nameKm: string | null;
  nameEn: string | null;
  primary: string;
  secondary: string | null;
  fullName: string;
} {
  const nameKm = customer.nameKm?.trim().normalize('NFC') || null;
  const nameEn = customer.nameEn?.trim().normalize('NFC') || null;
  const fallback = customer.fullName?.trim().normalize('NFC') || 'Unknown Customer';
  const primary = nameKm || nameEn || fallback;
  const secondary = nameKm && nameEn ? nameEn : null;
  const fullName = nameEn || nameKm || fallback;
  return { nameKm, nameEn, primary, secondary, fullName };
}

function escapeCsvCell(val: string | number | null | undefined): string {
  const str = val === null || val === undefined ? '' : String(val);
  return `"${str.replace(/"/g, '""')}"`;
}

export function downloadCSV(
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][]
) {
  const csvBody = [
    headers.map((h) => escapeCsvCell(h)).join(','),
    ...rows.map((row) => row.map((val) => escapeCsvCell(val)).join(',')),
  ].join('\r\n');

  const blob = new Blob(['\uFEFF' + csvBody], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
