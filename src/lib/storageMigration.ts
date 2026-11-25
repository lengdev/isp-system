export const STORAGE_PREFIX = 'nsmisp';
export const REFRESH_TOKEN_KEY = `${STORAGE_PREFIX}_refresh_token`;
export const STORE_PERSIST_KEY = `${STORAGE_PREFIX}_isp_store_v1`;
export const LEGACY_STORAGE_FLAG_KEY = 'netpulse-storage';
export const STORAGE_SHELL_KEY = `${STORAGE_PREFIX}-storage`;

const LEGACY_PREFIX = 'netpulse';

function migrateStorageArea(storage: Storage): void {
  const keys: string[] = [];
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i);
    if (key) keys.push(key);
  }

  for (const oldKey of keys) {
    if (oldKey === LEGACY_STORAGE_FLAG_KEY) {
      const value = storage.getItem(oldKey);
      if (value !== null && storage.getItem(STORAGE_SHELL_KEY) === null) {
        storage.setItem(STORAGE_SHELL_KEY, value);
      }
      storage.removeItem(oldKey);
      continue;
    }

    if (oldKey.startsWith(`${LEGACY_PREFIX}_`)) {
      const suffix = oldKey.slice(LEGACY_PREFIX.length);
      const newKey = `${STORAGE_PREFIX}${suffix}`;
      const value = storage.getItem(oldKey);
      if (value !== null && storage.getItem(newKey) === null) {
        storage.setItem(newKey, value);
      }
      storage.removeItem(oldKey);
    }
  }
}

/**
 * One-time browser storage migration from netpulse_* / netpulse-storage to nsmisp_* keys.
 * Preserves saved DataTable views, density, theme settings, and remembered sessions.
 */
export function migrateLegacyStorage(): void {
  if (typeof window === 'undefined') return;

  try {
    if (window.localStorage) {
      migrateStorageArea(window.localStorage);
    }
  } catch {
    // Ignore storage access errors in restricted browser contexts
  }

  try {
    if (window.sessionStorage) {
      migrateStorageArea(window.sessionStorage);
    }
  } catch {
    // Ignore storage access errors in restricted browser contexts
  }
}
