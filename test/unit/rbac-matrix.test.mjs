import test from 'node:test';
import assert from 'node:assert';
import {
  computeTriState,
  applyDependencyRules,
  computeDirtyDiff,
  countChangedCells,
} from '../../src/features/roles/utils/matrixUtils.ts';

test('--- RBAC MATRIX UNIT TESTS ---', async (t) => {
  await t.test('1. computeTriState: correctly determines tri-state status', () => {
    const group = ['customers.view', 'customers.create', 'customers.edit', 'customers.delete'];

    // None checked
    const none = new Set([]);
    assert.strictEqual(computeTriState(group, none), 'unchecked');

    // All checked
    const all = new Set(['customers.view', 'customers.create', 'customers.edit', 'customers.delete', 'other.perm']);
    assert.strictEqual(computeTriState(group, all), 'checked');

    // Some checked (partial)
    const some = new Set(['customers.view', 'customers.create']);
    assert.strictEqual(computeTriState(group, some), 'indeterminate');

    // Empty group returns unchecked
    assert.strictEqual(computeTriState([], some), 'unchecked');
  });

  await t.test('2. applyDependencyRules: auto-checks parent view when checking action', () => {
    const current = new Set(['network.view']);

    // Toggling customers.create on -> should auto-check customers.view
    const res = applyDependencyRules(current, 'customers.create', true);
    assert.strictEqual(res.nextPerms.has('customers.create'), true);
    assert.strictEqual(res.nextPerms.has('customers.view'), true);
    assert.strictEqual(res.nextPerms.has('network.view'), true);
    assert.deepStrictEqual(res.addedDependencies, ['customers.view']);
  });

  await t.test('3. applyDependencyRules: multi-level cascading dependency', () => {
    const current = new Set([]);

    // Subscriptions.create requires subscriptions.view, which in turn requires packages.view
    const res = applyDependencyRules(current, 'subscriptions.create', true);
    assert.strictEqual(res.nextPerms.has('subscriptions.create'), true);
    assert.strictEqual(res.nextPerms.has('subscriptions.view'), true);
    assert.strictEqual(res.nextPerms.has('packages.view'), true);
  });

  await t.test('4. applyDependencyRules: unchecking view cascades removal to all dependents', () => {
    const current = new Set([
      'customers.view',
      'customers.create',
      'customers.edit',
      'customers.delete',
      'billing.view',
    ]);

    // Unchecking customers.view should remove create, edit, delete
    const res = applyDependencyRules(current, 'customers.view', false);
    assert.strictEqual(res.nextPerms.has('customers.view'), false);
    assert.strictEqual(res.nextPerms.has('customers.create'), false);
    assert.strictEqual(res.nextPerms.has('customers.edit'), false);
    assert.strictEqual(res.nextPerms.has('customers.delete'), false);
    assert.strictEqual(res.nextPerms.has('billing.view'), true, 'Unrelated permissions remain intact');

    assert.strictEqual(res.removedDependents.length, 3);
    assert.ok(res.removedDependents.includes('customers.create'));
    assert.ok(res.removedDependents.includes('customers.edit'));
    assert.ok(res.removedDependents.includes('customers.delete'));
  });

  await t.test('5. computeDirtyDiff & countChangedCells: accurate diff calculation', () => {
    const roles = [
      { id: 'r-admin', name: 'SUPER_ADMIN', description: null, isSystem: true, userCount: 1, updatedAt: '2026-11-24T10:00:00.000Z' },
      { id: 'r-noc', name: 'NETWORK_ENGINEER', description: null, isSystem: true, userCount: 2, updatedAt: '2026-11-24T10:00:00.000Z' },
      { id: 'r-cashier', name: 'BILLING_CASHIER', description: null, isSystem: true, userCount: 1, updatedAt: '2026-11-24T10:00:00.000Z' },
    ];

    const initialMatrix = {
      'r-admin': ['*'],
      'r-noc': ['network.view', 'network.create', 'routers.manage'],
      'r-cashier': ['billing.view', 'billing.create'],
    };

    // No changes
    const noDiff = computeDirtyDiff(initialMatrix, initialMatrix, roles);
    assert.strictEqual(noDiff.length, 0);
    assert.strictEqual(countChangedCells(initialMatrix, initialMatrix), 0);

    // Changes on r-noc (add 'ipam.manage', remove 'routers.manage')
    const modifiedMatrix = {
      ...initialMatrix,
      'r-noc': ['network.view', 'network.create', 'ipam.manage'],
    };

    const diffs = computeDirtyDiff(initialMatrix, modifiedMatrix, roles);
    assert.strictEqual(diffs.length, 1);
    assert.strictEqual(diffs[0].roleId, 'r-noc');
    assert.deepStrictEqual(diffs[0].add, ['ipam.manage']);
    assert.deepStrictEqual(diffs[0].remove, ['routers.manage']);
    assert.strictEqual(diffs[0].expectedUpdatedAt, '2026-11-24T10:00:00.000Z');

    assert.strictEqual(countChangedCells(initialMatrix, modifiedMatrix), 2);
  });
});
