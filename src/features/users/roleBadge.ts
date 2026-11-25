import type { ChipColor } from '../../components/ui/Chip';

/**
 * Shared role badge color mapping:
 * - System roles use consistent semantic colors across table, modals, and tooltips
 * - Custom / non-system roles use the neutral 'default' badge color
 */
export const SYSTEM_ROLE_BADGE_MAP: Record<string, ChipColor> = {
  SUPER_ADMIN: 'danger',
  NETWORK_ENGINEER: 'warning',
  BILLING_CASHIER: 'secondary',
  FIELD_TECHNICIAN: 'primary',
  SUPPORT_AGENT: 'success',
};

export function getRoleBadgeColor(roleName: string): ChipColor {
  return SYSTEM_ROLE_BADGE_MAP[roleName] || 'default';
}

export function formatRoleDisplayName(roleName: string): string {
  return roleName
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}
