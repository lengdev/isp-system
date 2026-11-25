const envBrandName =
  typeof import.meta !== 'undefined'
    ? (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_APP_NAME?.trim()
    : undefined;

export const BRAND_NAME = envBrandName || 'NSMISP';
export const BRAND_SLUG = 'nsmisp';
export const BRAND_PAGE_TITLE = `${BRAND_NAME} - ISP Customer Management & Operations`;
export const BRAND_LEGAL_NAME = `${BRAND_NAME} High-Speed Broadband LLC`;
export const BRAND_DOMAIN = 'nsmisp.net';
export const BRAND_LOCAL_DOMAIN = 'nsmisp.local';
export const BRAND_SUPPORT_EMAIL = `support@${BRAND_DOMAIN}`;
export const BRAND_ADMIN_EMAIL = `admin@${BRAND_DOMAIN}`;
