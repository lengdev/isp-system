export const KHMER_UNICODE_REGEX = /[\u1780-\u17FF]/;

export function normalizeNameInput(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().normalize('NFC');
  return normalized.length > 0 ? normalized : null;
}

export interface BilingualNameInput {
  nameKm?: unknown;
  nameEn?: unknown;
  fullName?: unknown;
}

export interface ResolvedCustomerNames {
  nameKm: string | null;
  nameEn: string | null;
  fullName: string;
}

export function resolveCustomerNamesForCreate(
  input: BilingualNameInput
): ResolvedCustomerNames {
  let nameKm = normalizeNameInput(input.nameKm);
  let nameEn = normalizeNameInput(input.nameEn);
  const legacyFull = normalizeNameInput(input.fullName);

  if (!nameKm && !nameEn && legacyFull) {
    if (KHMER_UNICODE_REGEX.test(legacyFull)) {
      nameKm = legacyFull;
    } else {
      nameEn = legacyFull;
    }
  }

  if (!nameKm && !nameEn) {
    throw new Error('At least one customer name (Khmer name or Latin name) is required.');
  }

  return {
    nameKm,
    nameEn,
    fullName: nameEn || nameKm!,
  };
}

export function resolveCustomerNamesForUpdate(
  updates: BilingualNameInput,
  existing: { nameKm: string | null; nameEn: string | null; fullName: string }
): ResolvedCustomerNames | null {
  const hasKmUpdate = updates.nameKm !== undefined;
  const hasEnUpdate = updates.nameEn !== undefined;
  const hasFullUpdate = updates.fullName !== undefined;

  if (!hasKmUpdate && !hasEnUpdate && !hasFullUpdate) {
    return null;
  }

  let nextKm = hasKmUpdate ? normalizeNameInput(updates.nameKm) : existing.nameKm;
  let nextEn = hasEnUpdate ? normalizeNameInput(updates.nameEn) : existing.nameEn;

  if (!hasKmUpdate && !hasEnUpdate && hasFullUpdate) {
    const legacyFull = normalizeNameInput(updates.fullName);
    if (!legacyFull) {
      throw new Error('Customer name cannot be empty.');
    }
    if (KHMER_UNICODE_REGEX.test(legacyFull)) {
      nextKm = legacyFull;
    } else {
      nextEn = legacyFull;
    }
  }

  if (!nextKm && !nextEn) {
    throw new Error('At least one customer name (Khmer name or Latin name) is required.');
  }

  return {
    nameKm: nextKm,
    nameEn: nextEn,
    fullName: nextEn || nextKm!,
  };
}
