import test from 'node:test';
import assert from 'node:assert/strict';

test('--- DYNAMIC PERMISSIONS & FEATURES LOGIC TESTS ---', async (t) => {
  // Test permissions evaluator logic
  function evaluateAccess({ userRole, userPermissions, userFeatures, targetKey }) {
    if (!targetKey) return true;
    if (userRole === 'SUPER_ADMIN') return true;
    if (userPermissions.includes('*') || userFeatures.includes('*')) return true;

    // Feature key check
    if (userFeatures.includes(targetKey)) return true;

    // Permission key check
    if (userPermissions.includes(targetKey)) return true;

    // Module wildcard check
    const parts = targetKey.split('.');
    if (parts.length > 1 && userPermissions.includes(`${parts[0]}.*`)) {
      return true;
    }

    return false;
  }

  // Feature permission mode evaluation
  function evaluateFeatureMode({ mode, featurePermissions, userEffectivePerms }) {
    if (featurePermissions.length === 0) return true; // public to authenticated
    if (userEffectivePerms.has('*')) return true;

    if (mode === 'ALL') {
      return featurePermissions.every((p) => userEffectivePerms.has(p));
    }
    // Default ANY
    return featurePermissions.some((p) => userEffectivePerms.has(p));
  }

  await t.test('1. Super Admin bypasses all checks', () => {
    const res = evaluateAccess({
      userRole: 'SUPER_ADMIN',
      userPermissions: [],
      userFeatures: [],
      targetKey: 'page.network',
    });
    assert.equal(res, true);
  });

  await t.test('2. can(key) matches feature key directly', () => {
    const res = evaluateAccess({
      userRole: 'FIELD_TECHNICIAN',
      userPermissions: ['operations.view'],
      userFeatures: ['page.installations', 'page.technicians'],
      targetKey: 'page.installations',
    });
    assert.equal(res, true);

    const denied = evaluateAccess({
      userRole: 'FIELD_TECHNICIAN',
      userPermissions: ['operations.view'],
      userFeatures: ['page.installations', 'page.technicians'],
      targetKey: 'page.network',
    });
    assert.equal(denied, false);
  });

  await t.test('3. can(key) matches direct permission key', () => {
    const res = evaluateAccess({
      userRole: 'SUPPORT_AGENT',
      userPermissions: ['customers.view', 'tickets.view'],
      userFeatures: [],
      targetKey: 'customers.view',
    });
    assert.equal(res, true);
  });

  await t.test('4. can(key) respects module wildcards', () => {
    const res = evaluateAccess({
      userRole: 'ACCOUNTANT',
      userPermissions: ['billing.*'],
      userFeatures: [],
      targetKey: 'billing.invoices',
    });
    assert.equal(res, true);
  });

  await t.test('5. ANY mode grants access when user has at least 1 permission', () => {
    const allowed = evaluateFeatureMode({
      mode: 'ANY',
      featurePermissions: ['billing.view', 'payments.view'],
      userEffectivePerms: new Set(['payments.view']),
    });
    assert.equal(allowed, true);

    const denied = evaluateFeatureMode({
      mode: 'ANY',
      featurePermissions: ['billing.view', 'payments.view'],
      userEffectivePerms: new Set(['network.view']),
    });
    assert.equal(denied, false);
  });

  await t.test('6. ALL mode requires user to hold every mapped permission', () => {
    const partial = evaluateFeatureMode({
      mode: 'ALL',
      featurePermissions: ['billing.view', 'accounting.view'],
      userEffectivePerms: new Set(['billing.view']),
    });
    assert.equal(partial, false);

    const full = evaluateFeatureMode({
      mode: 'ALL',
      featurePermissions: ['billing.view', 'accounting.view'],
      userEffectivePerms: new Set(['billing.view', 'accounting.view']),
    });
    assert.equal(full, true);
  });

  await t.test('7. Features with zero permissions are accessible to all authenticated users', () => {
    const publicFeature = evaluateFeatureMode({
      mode: 'ANY',
      featurePermissions: [],
      userEffectivePerms: new Set([]),
    });
    assert.equal(publicFeature, true);
  });
});
