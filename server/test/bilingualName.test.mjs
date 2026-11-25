import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeNameInput,
  resolveCustomerNamesForCreate,
  resolveCustomerNamesForUpdate,
} from '../../dist-server/utils/bilingualName.js';

test('normalizeNameInput trims whitespace and normalizes Unicode to NFC', () => {
  // Decomposed e + combining acute accent -> NFC U+00E9
  const nfd = 'Andre\u0301   Srun';
  assert.equal(normalizeNameInput(`  ${nfd}  `), 'Andr\u00e9   Srun');
  assert.equal(normalizeNameInput('   '), null);
  assert.equal(normalizeNameInput(null), null);
});

test('resolveCustomerNamesForCreate accepts Khmer-only, Latin-only, or both', () => {
  const kmOnly = resolveCustomerNamesForCreate({ nameKm: 'សុខា ចាន់', nameEn: '' });
  assert.deepEqual(kmOnly, {
    nameKm: 'សុខា ចាន់',
    nameEn: null,
    fullName: 'សុខា ចាន់',
  });

  const enOnly = resolveCustomerNamesForCreate({ nameKm: null, nameEn: 'Sokha Chan' });
  assert.deepEqual(enOnly, {
    nameKm: null,
    nameEn: 'Sokha Chan',
    fullName: 'Sokha Chan',
  });

  const both = resolveCustomerNamesForCreate({ nameKm: 'សុខា ចាន់', nameEn: 'Sokha Chan' });
  assert.deepEqual(both, {
    nameKm: 'សុខា ចាន់',
    nameEn: 'Sokha Chan',
    fullName: 'Sokha Chan',
  });
});

test('resolveCustomerNamesForCreate falls back safely for legacy fullName payloads and rejects empty', () => {
  const legacyKm = resolveCustomerNamesForCreate({ fullName: 'បុប្ផា កែវ' });
  assert.deepEqual(legacyKm, {
    nameKm: 'បុប្ផា កែវ',
    nameEn: null,
    fullName: 'បុប្ផា កែវ',
  });

  const legacyEn = resolveCustomerNamesForCreate({ fullName: 'Bopha Keo' });
  assert.deepEqual(legacyEn, {
    nameKm: null,
    nameEn: 'Bopha Keo',
    fullName: 'Bopha Keo',
  });

  assert.throws(() => resolveCustomerNamesForCreate({ nameKm: '   ', nameEn: '' }), /required/i);
});

test('resolveCustomerNamesForUpdate rejects clearing both names and recalculates fullName', () => {
  const existing = { nameKm: 'សុខា', nameEn: 'Sokha', fullName: 'Sokha' };
  const clearedEn = resolveCustomerNamesForUpdate({ nameEn: '   ' }, existing);
  assert.deepEqual(clearedEn, {
    nameKm: 'សុខា',
    nameEn: null,
    fullName: 'សុខា',
  });

  assert.throws(
    () => resolveCustomerNamesForUpdate({ nameKm: '', nameEn: null }, existing),
    /required/i
  );
});
