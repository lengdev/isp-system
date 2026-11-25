import test from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from '../../dist-server/routes/auth.routes.js';
import customerRoutes from '../../dist-server/routes/customer.routes.js';
import { AuthService } from '../../dist-server/services/auth.service.js';
import { RbacService } from '../../dist-server/services/rbac.service.js';
import { prisma } from '../../dist-server/db/store.js';

// Setup ephemeral server for test suite
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/customers', customerRoutes);

let server;
let baseUrl = '';

async function startServer() {
  return new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}/api/v1/auth`;
      resolve();
    });
  });
}

async function stopServer() {
  return new Promise((resolve) => {
    if (server) server.close(resolve);
    else resolve();
  });
}

test('--- RBAC BACKEND & PERMISSIONS MATRIX TEST SUITE ---', async (t) => {
  await startServer();

  let adminToken = '';
  let techToken = '';
  let testRoleId = '';
  let testRoleUpdatedAt = '';
  let techUserId = '';

  await t.test('1. Setup & Tokens: Login as Super Admin and Tech User', async () => {
    const adminLogin = await AuthService.login('admin', 'StrongSuperAdminPassword2026!');
    adminToken = adminLogin.accessToken;
    assert.ok(adminToken, 'Admin token generated');

    const techLogin = await AuthService.login('tech', 'Password123!');
    techToken = techLogin.accessToken;
    techUserId = techLogin.user.id;
    assert.ok(techToken, 'Tech token generated');
  });

  await t.test('2. 403 Forbidden for Non-Admin accessing /roles', async () => {
    const res = await fetch(`${baseUrl}/roles`, {
      headers: { Authorization: `Bearer ${techToken}` },
    });
    assert.strictEqual(res.status, 403, 'Non-admin receives 403 Forbidden');
    const data = await res.json();
    assert.match(data.error, /insufficient permissions/i);
  });

  await t.test('3. 200 OK for Super Admin accessing GET /roles', async () => {
    const res = await fetch(`${baseUrl}/roles`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(res.status, 200, 'Super admin receives 200 OK');
    const data = await res.json();
    assert.ok(Array.isArray(data.roles), 'roles array returned');
    assert.ok(Array.isArray(data.permissions), 'permissions array returned');
    assert.ok(typeof data.matrix === 'object', 'matrix mapping returned');
    assert.ok(data.permissions.length >= 60, 'at least 60 permissions returned');
  });

  await t.test('4. POST /roles - Create a new custom role', async () => {
    const res = await fetch(`${baseUrl}/roles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'TEST_QA_ROLE',
        description: 'Quality assurance test role',
      }),
    });
    assert.strictEqual(res.status, 201, 'Role created with 201');
    const data = await res.json();
    testRoleId = data.id;
    testRoleUpdatedAt = data.updatedAt;
    assert.strictEqual(data.name, 'TEST_QA_ROLE');
    assert.strictEqual(data.isSystem, false);
    assert.strictEqual(data.userCount, 0);
  });

  await t.test('5. PUT /roles/:id/permissions - Dependency Rule (reject without view)', async () => {
    // Attempting to add customers.create without customers.view
    const res = await fetch(`${baseUrl}/roles/${testRoleId}/permissions`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        add: ['customers.create'],
        remove: [],
        expectedUpdatedAt: testRoleUpdatedAt,
      }),
    });
    assert.strictEqual(res.status, 400, 'Fails with 400 when dependent view permission missing');
    const data = await res.json();
    assert.match(data.error, /requires "customers\.view"/i);
  });

  await t.test('6. PUT /roles/:id/permissions - Add and Remove permissions successfully', async () => {
    const res = await fetch(`${baseUrl}/roles/${testRoleId}/permissions`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        add: ['customers.view', 'customers.create'],
        remove: [],
        expectedUpdatedAt: testRoleUpdatedAt,
      }),
    });
    assert.strictEqual(res.status, 200, 'Permissions updated with 200');
    const data = await res.json();
    assert.ok(data.permissionKeys.includes('customers.view'));
    assert.ok(data.permissionKeys.includes('customers.create'));
    testRoleUpdatedAt = data.updatedAt;

    // Check that cache works and permission check reflects changes
    const hasPerm = await RbacService.checkPermission('TEST_QA_ROLE', 'customers.create');
    assert.strictEqual(hasPerm, true, 'Role now has customers.create in cache/DB');
  });

  await t.test('7. PUT /roles/:id/permissions - 409 Conflict on Stale updatedAt', async () => {
    const res = await fetch(`${baseUrl}/roles/${testRoleId}/permissions`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        add: ['packages.view'],
        remove: [],
        expectedUpdatedAt: '2020-01-01T00:00:00.000Z', // Stale timestamp
      }),
    });
    assert.strictEqual(res.status, 409, 'Returns 409 Conflict on stale update');
    const data = await res.json();
    assert.strictEqual(data.code, 'STALE_UPDATE');
  });

  await t.test('8. DELETE /roles/:id - Blocked when users are assigned', async () => {
    // 1. Assign test role to tech user
    const assignRes = await fetch(`${baseUrl}/users/${techUserId}/roles`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        roles: [testRoleId, 'FIELD_TECHNICIAN'],
      }),
    });
    assert.strictEqual(assignRes.status, 200, 'User assigned to test role');

    // 2. Try to delete role
    const delRes = await fetch(`${baseUrl}/roles/${testRoleId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(delRes.status, 400, 'Delete blocked with 400 when user assigned');
    const delData = await delRes.json();
    assert.match(delData.error, /currently assigned/i);

    // 3. Reassign user back to FIELD_TECHNICIAN
    await fetch(`${baseUrl}/users/${techUserId}/roles`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        roles: ['FIELD_TECHNICIAN'],
      }),
    });

    // 4. Now delete role
    const delSuccess = await fetch(`${baseUrl}/roles/${testRoleId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(delSuccess.status, 200, 'Delete succeeds once users removed');
  });

  await t.test('9. Prevent removal of last SUPER_ADMIN and self-demotion', async () => {
    const adminUser = await prisma.user.findFirst({ where: { username: 'admin' } });
    const res = await fetch(`${baseUrl}/users/${adminUser.id}/roles`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        roles: ['SUPPORT_AGENT'],
      }),
    });
    assert.strictEqual(res.status, 400, 'Blocked self-demotion / removing last SUPER_ADMIN');
    const data = await res.json();
    assert.match(data.error, /SUPER_ADMIN/i);
  });

  await t.test('10. Audit Log written for role operations', async () => {
    const logs = await prisma.auditLog.findMany({
      where: {
        action: { in: ['ROLE_CREATE', 'ROLE_PERMISSIONS_UPDATE', 'ROLE_DELETE'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    assert.ok(logs.length >= 2, 'Audit logs recorded for role lifecycle events');
  });

  await t.test('11. seedRbac does NOT re-grant permissions removed by admin', async () => {
    // 1. Get current BILLING_CASHIER permissions
    const cashierRole = await prisma.role.findUnique({
      where: { name: 'BILLING_CASHIER' },
      include: { permissions: { include: { permission: true } } },
    });
    assert.ok(cashierRole, 'BILLING_CASHIER role found');

    const permToDelete = cashierRole.permissions.find((p) => p.permission.key === 'billing.delete');
    assert.ok(permToDelete, 'billing.delete found on BILLING_CASHIER');

    // 2. Remove billing.delete
    await prisma.rolePermission.delete({
      where: {
        roleId_permissionId: {
          roleId: cashierRole.id,
          permissionId: permToDelete.permissionId,
        },
      },
    });
    RbacService.invalidateCache();

    // Verify it is gone
    const check1 = await RbacService.checkPermission('BILLING_CASHIER', 'billing.delete');
    assert.strictEqual(check1, false, 'billing.delete is removed');

    // 3. Re-run seedRbac()
    await RbacService.seedRbac();

    // 4. Verify billing.delete was NOT re-granted!
    const check2 = await RbacService.checkPermission('BILLING_CASHIER', 'billing.delete');
    assert.strictEqual(check2, false, 'seedRbac did NOT re-grant removed billing.delete');

    // Restore for other tests
    await prisma.rolePermission.create({
      data: {
        roleId: cashierRole.id,
        permissionId: permToDelete.permissionId,
      },
    });
    RbacService.invalidateCache();
  });

  await t.test('12. updateRolePermissions rejects unknown permission keys with 400', async () => {
    const cashierRole = await prisma.role.findUnique({ where: { name: 'BILLING_CASHIER' } });
    const res = await fetch(`${baseUrl}/roles/${cashierRole.id}/permissions`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        add: ['totally.bogus.permission.key'],
      }),
    });
    assert.strictEqual(res.status, 400, 'Rejects unknown permission key with 400');
    const data = await res.json();
    assert.match(data.error, /Unknown permission key/i);
  });

  await t.test('13. Multi-role effective permissions UNION across custom roles', async () => {
    // Create two custom roles
    const roleA = await prisma.role.create({
      data: { name: 'TEST_CUSTOM_A', description: 'Test role A' },
    });
    const roleB = await prisma.role.create({
      data: { name: 'TEST_CUSTOM_B', description: 'Test role B' },
    });

    const permCustView = await prisma.permission.findUnique({ where: { key: 'customers.view' } });
    const permBillView = await prisma.permission.findUnique({ where: { key: 'billing.view' } });

    await prisma.rolePermission.create({
      data: { roleId: roleA.id, permissionId: permCustView.id },
    });
    await prisma.rolePermission.create({
      data: { roleId: roleB.id, permissionId: permBillView.id },
    });
    RbacService.invalidateCache();

    // Union calculation
    const unionPerms = await RbacService.getUserEffectivePermissions('dummy-user', [roleA.id, roleB.id]);
    assert.strictEqual(unionPerms.has('customers.view'), true, 'Union has customers.view from role A');
    assert.strictEqual(unionPerms.has('billing.view'), true, 'Union has billing.view from role B');
    assert.strictEqual(unionPerms.has('customers.delete'), false, 'Union does NOT have ungranted permissions');

    // Cleanup
    await prisma.rolePermission.deleteMany({ where: { roleId: { in: [roleA.id, roleB.id] } } });
    await prisma.role.deleteMany({ where: { id: { in: [roleA.id, roleB.id] } } });
    RbacService.invalidateCache();
  });

  await t.test('14. GET /navigation and GET /me return dynamic navigation tree and features array', async () => {
    // 1. Navigation for Super Admin
    const navRes = await fetch(`${baseUrl}/navigation`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(navRes.status, 200);
    const navData = await navRes.json();
    assert.ok(Array.isArray(navData.navigation), 'Navigation returns array');
    const hasCustomersMenu = navData.navigation.some((item) => item.key === 'nav.customers');
    assert.strictEqual(hasCustomersMenu, true, 'Customers menu present for admin');

    // 2. /me contains features
    const meRes = await fetch(`${baseUrl}/me`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(meRes.status, 200);
    const meData = await meRes.json();
    assert.ok(Array.isArray(meData.user.features), 'user.features is an array');
    assert.ok(meData.user.features.includes('nav.customers'), 'Contains nav.customers');
    assert.ok(meData.user.features.includes('nav.dashboard'), 'Contains nav.dashboard');
  });

  await t.test('15. Feature admin: GET /features, PATCH /features/:id, and locked protection', async () => {
    // 1. List features
    const listRes = await fetch(`${baseUrl}/features`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(listRes.status, 200);
    const listData = await listRes.json();
    assert.ok(Array.isArray(listData.features), 'Returns features list');

    // 2. Verify locked feature protection (page.roles)
    const rolesPageFeature = listData.features.find((f) => f.key === 'page.roles');
    assert.ok(rolesPageFeature, 'page.roles feature found');
    assert.strictEqual(rolesPageFeature.locked, true, 'page.roles is locked');

    const lockRejectRes = await fetch(`${baseUrl}/features/${rolesPageFeature.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        permissionKeys: ['customers.view'], // attempting to remap locked feature
      }),
    });
    assert.strictEqual(lockRejectRes.status, 400, 'Locked feature rejects permission remapping');
    const lockRejectData = await lockRejectRes.json();
    assert.match(lockRejectData.error, /locked/i);

    // 3. Remap an unlocked feature (e.g. customers.btn.create)
    const btnFeature = listData.features.find((f) => f.key === 'customers.btn.create');
    assert.ok(btnFeature, 'customers.btn.create found');

    const remapRes = await fetch(`${baseUrl}/features/${btnFeature.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        permissionKeys: ['customers.create', 'customers.edit'],
        permissionMode: 'ALL',
      }),
    });
    assert.strictEqual(remapRes.status, 200, 'Remap succeeds on unlocked feature');
    const remapData = await remapRes.json();
    assert.strictEqual(remapData.feature.permissionMode, 'ALL');
    assert.deepStrictEqual(remapData.feature.permissionKeys.sort(), ['customers.create', 'customers.edit']);

    // Restore original mapping
    await fetch(`${baseUrl}/features/${btnFeature.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        permissionKeys: ['customers.create'],
        permissionMode: 'ANY',
      }),
    });
  });

  await t.test('16. Permission admin: GET /permissions and PATCH /permissions/:id', async () => {
    const listRes = await fetch(`${baseUrl}/permissions`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(listRes.status, 200);
    const listData = await listRes.json();
    assert.ok(Array.isArray(listData.permissions), 'Returns permissions array');

    const custView = listData.permissions.find((p) => p.key === 'customers.view');
    assert.ok(custView, 'customers.view found');

    const patchRes = await fetch(`${baseUrl}/permissions/${custView.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        description: 'Updated description for customer view test',
      }),
    });
    assert.strictEqual(patchRes.status, 200);
    const patchData = await patchRes.json();
    assert.strictEqual(patchData.permission.description, 'Updated description for customer view test');

    // Restore
    await fetch(`${baseUrl}/permissions/${custView.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        description: custView.description,
      }),
    });
  });

  await t.test('17. requireFeature middleware enforces dynamic permissions on API routes', async () => {
    // 1. Tech user (FIELD_TECHNICIAN) has no customers.create permission
    const custBaseUrl = baseUrl.replace('/auth', '/customers');
    const techCreateRes = await fetch(custBaseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${techToken}`,
        'x-enforce-auth': 'true',
      },
      body: JSON.stringify({
        fullName: 'Unauthorized Customer',
        email: 'unauth@test.com',
      }),
    });
    assert.strictEqual(techCreateRes.status, 403, 'Tech user blocked from creating customer by requireFeature');
    const techData = await techCreateRes.json();
    assert.match(techData.error, /insufficient permissions for feature/i);

    // 2. Admin user has full access
    const uniqueAuthEmail = `auth_${Date.now()}@test.com`;
    const adminCreateRes = await fetch(custBaseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        fullName: 'Authorized Customer',
        email: uniqueAuthEmail,
        phone: '+855 12 333 444',
        address: 'St 123',
        city: 'Phnom Penh',
        planName: 'Fiber 50M',
        monthlyPrice: 30,
        connectionType: 'FIBER',
      }),
    });
    assert.strictEqual(adminCreateRes.status, 201, 'Admin user can create customer');
    const createdAdminCust = await adminCreateRes.json();
    if (createdAdminCust?.id) {
      await prisma.customer.delete({ where: { id: createdAdminCust.id } }).catch(() => {});
    }
  });

  await t.test('18. Per-user GRANT & DENY overrides isolate two users sharing the same role', async () => {
    const suffix = Date.now();
    const roleName = `OVERRIDE_ROLE_${suffix}`;
    const userAName = `override_a_${suffix}`;
    const userBName = `override_b_${suffix}`;
    const custBaseUrl = baseUrl.replace('/auth', '/customers');

    const customersViewPerm = await prisma.permission.findUnique({ where: { key: 'customers.view' } });
    assert.ok(customersViewPerm, 'customers.view permission exists');

    const sharedRole = await prisma.role.create({
      data: {
        name: roleName,
        description: 'Shared test role for per-user override isolation',
        isSystem: false,
        permissions: {
          create: [{ permissionId: customersViewPerm.id }],
        },
      },
    });

    const passwordHash = '$2a$10$7EqJtq98hPqEX7fNZaFWoO.8/9nS85w93Q1oF/Keq7GZzB/6Xq2ma';
    const userA = await prisma.user.create({
      data: {
        username: userAName,
        email: `${userAName}@nsmisp.net`,
        passwordHash,
        fullName: 'Override User A',
        role: 'TECHNICIAN',
        isActive: true,
        userRoles: { create: [{ roleId: sharedRole.id }] },
      },
    });
    const userB = await prisma.user.create({
      data: {
        username: userBName,
        email: `${userBName}@nsmisp.net`,
        passwordHash,
        fullName: 'Override User B',
        role: 'TECHNICIAN',
        isActive: true,
        userRoles: { create: [{ roleId: sharedRole.id }] },
      },
    });

    let createdCustId = null;
    try {
      const tokenA = (await AuthService.login(userAName, 'Password123!')).accessToken;
      const tokenB = (await AuthService.login(userBName, 'Password123!')).accessToken;

      // Baseline: both users can read customers (via shared role), neither can create
      const baseGetA = await fetch(custBaseUrl, { headers: { Authorization: `Bearer ${tokenA}`, 'x-enforce-auth': 'true' } });
      const baseGetB = await fetch(custBaseUrl, { headers: { Authorization: `Bearer ${tokenB}`, 'x-enforce-auth': 'true' } });
      assert.strictEqual(baseGetA.status, 200);
      assert.strictEqual(baseGetB.status, 200);

      // 1. Grant customers.create ONLY to userA
      const grantRes = await fetch(`${baseUrl}/users/${userA.id}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ grants: ['customers.create'], denies: [] }),
      });
      assert.strictEqual(grantRes.status, 200);
      const grantData = await grantRes.json();
      assert.deepStrictEqual(grantData.grants, ['customers.create']);
      assert.ok(grantData.effectivePermissions.includes('customers.create'));

      // userA can create; userB with identical role remains blocked (403)
      const createA = await fetch(custBaseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}`, 'x-enforce-auth': 'true' },
        body: JSON.stringify({
          fullName: 'Override Granted Customer',
          email: `override_${suffix}@test.com`,
          phone: '+855 12 444 555',
          address: 'St 200',
          city: 'Phnom Penh',
          planName: 'Fiber 50M',
          monthlyPrice: 30,
          connectionType: 'FIBER',
        }),
      });
      assert.strictEqual(createA.status, 201, 'User with GRANT override can create customer');
      const createdJson = await createA.json().catch(() => null);
      createdCustId = createdJson?.id || null;

      const createB = await fetch(custBaseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenB}`, 'x-enforce-auth': 'true' },
        body: JSON.stringify({ fullName: 'Peer Blocked Customer', email: `peer_${suffix}@test.com` }),
      });
      assert.strictEqual(createB.status, 403, 'Peer sharing same role remains blocked without GRANT');

      const meA = await (await fetch(`${baseUrl}/me`, { headers: { Authorization: `Bearer ${tokenA}` } })).json();
      const meB = await (await fetch(`${baseUrl}/me`, { headers: { Authorization: `Bearer ${tokenB}` } })).json();
      assert.ok(meA.user.features.includes('customers.btn.create'));
      assert.strictEqual(meB.user.features.includes('customers.btn.create'), false);

      // 2. Deny customers.view ONLY on userA; userB retains access
      const denyRes = await fetch(`${baseUrl}/users/${userA.id}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ grants: [], denies: ['customers.view'] }),
      });
      assert.strictEqual(denyRes.status, 200);

      const getABlocked = await fetch(custBaseUrl, { headers: { Authorization: `Bearer ${tokenA}`, 'x-enforce-auth': 'true' } });
      const getBAllowed = await fetch(custBaseUrl, { headers: { Authorization: `Bearer ${tokenB}`, 'x-enforce-auth': 'true' } });
      assert.strictEqual(getABlocked.status, 403, 'Denied user loses customers.view');
      assert.strictEqual(getBAllowed.status, 200, 'Peer with same role keeps customers.view');

      const navA = await (await fetch(`${baseUrl}/navigation`, { headers: { Authorization: `Bearer ${tokenA}` } })).json();
      const navB = await (await fetch(`${baseUrl}/navigation`, { headers: { Authorization: `Bearer ${tokenB}` } })).json();
      assert.strictEqual(navA.navigation.some((n) => n.key === 'nav.customers'), false);
      assert.strictEqual(navB.navigation.some((n) => n.key === 'nav.customers'), true);

      // 3. Safeguard & conflict validation checks
      const conflictRes = await fetch(`${baseUrl}/users/${userA.id}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ grants: ['customers.view'], denies: ['customers.view'] }),
      });
      assert.strictEqual(conflictRes.status, 400);

      const adminUserRow = await prisma.user.findUnique({ where: { username: 'admin' } });
      const superAdminRes = await fetch(`${baseUrl}/users/${adminUserRow.id}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ grants: [], denies: ['customers.view'] }),
      });
      assert.strictEqual(superAdminRes.status, 400);
    } finally {
      if (createdCustId) {
        await prisma.customer.delete({ where: { id: createdCustId } }).catch(() => {});
      }
      await prisma.user.deleteMany({ where: { id: { in: [userA.id, userB.id] } } }).catch(() => {});
      await prisma.role.delete({ where: { id: sharedRole.id } }).catch(() => {});
    }
  });

  await t.test('19. ACCOUNTANT role reads /api/v1/customers (200) and per-user DENY customers.create hides feature & blocks POST (403)', async () => {
    const suffix = Date.now();
    const custBaseUrl = baseUrl.replace('/auth', '/customers');
    const accountantRole = await prisma.role.findUnique({ where: { name: 'ACCOUNTANT' } });
    assert.ok(accountantRole, 'ACCOUNTANT role exists in DB');

    const acctUser = await prisma.user.create({
      data: {
        username: `acct_deny_${suffix}`,
        email: `acct_deny_${suffix}@nsmisp.net`,
        passwordHash: '$2a$10$7EqJtq98hPqEX7fNZaFWoO.8/9nS85w93Q1oF/Keq7GZzB/6Xq2ma',
        fullName: 'Accountant Deny Test',
        role: 'ACCOUNTANT',
        isActive: true,
        userRoles: { create: [{ roleId: accountantRole.id }] },
      },
    });

    try {
      const denyRes = await fetch(`${baseUrl}/users/${acctUser.id}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ grants: [], denies: ['customers.create'] }),
      });
      assert.strictEqual(denyRes.status, 200);

      const loginData = await AuthService.login(acctUser.username, 'Password123!');
      const acctToken = loginData.accessToken;
      assert.strictEqual(loginData.user.features.includes('page.customers'), true);
      assert.strictEqual(loginData.user.features.includes('customers.btn.create'), false);

      const getRes = await fetch(custBaseUrl, {
        headers: { Authorization: `Bearer ${acctToken}`, 'x-enforce-auth': 'true' },
      });
      assert.strictEqual(getRes.status, 200, 'ACCOUNTANT should not receive 403 role not authorized on GET /customers');

      const postRes = await fetch(custBaseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${acctToken}`,
          'x-enforce-auth': 'true',
        },
        body: JSON.stringify({ fullName: 'Blocked Create', email: `blocked_${suffix}@nsmisp.net` }),
      });
      assert.strictEqual(postRes.status, 403, 'Denied customers.create blocks POST /customers');
    } finally {
      await prisma.user.delete({ where: { id: acctUser.id } }).catch(() => {});
    }
  });

  await t.test('20. POST /users supports custom DB roles via UserRole link and SHA-256 client password pre-hash', async () => {
    const suffix = Date.now();
    const customRoleName = `CUSTOM_NOC_${suffix}`;
    const cryptoMod = await import('crypto');

    const roleRes = await fetch(`${baseUrl}/roles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ name: customRoleName, description: 'Custom NOC staff test role' }),
    });
    assert.strictEqual(roleRes.status, 201);
    const createdRole = await roleRes.json();

    const custView = await prisma.permission.findUnique({ where: { key: 'customers.view' } });
    assert.ok(custView, 'customers.view permission exists');
    await prisma.rolePermission.create({
      data: { roleId: createdRole.id, permissionId: custView.id },
    });

    const plainPassword = 'CustomStaffPass!2026';
    const sha256Password = cryptoMod.createHash('sha256').update(plainPassword).digest('hex');

    let createdUserId = null;
    try {
      const createRes = await fetch(`${baseUrl}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          username: `custom_staff_${suffix}`,
          email: `custom_staff_${suffix}@nsmisp.net`,
          fullName: 'Custom Role Staff',
          role: customRoleName,
          password: sha256Password,
        }),
      });
      assert.strictEqual(createRes.status, 201, 'Custom DB role user created cleanly');
      const createdUser = await createRes.json();
      createdUserId = createdUser.id;
      assert.strictEqual(createdUser.role, customRoleName);
      assert.deepStrictEqual(createdUser.roles, [customRoleName]);

      // Login using client-style SHA-256 hash succeeds and exposes custom role + permissions
      const loginData = await AuthService.login(`custom_staff_${suffix}`, sha256Password);
      assert.strictEqual(loginData.user.role, customRoleName);
      assert.deepStrictEqual(loginData.user.roles, [customRoleName]);
      assert.ok(loginData.user.features.includes('page.customers'));

      // Plaintext login also works seamlessly
      const plainLogin = await AuthService.login(`custom_staff_${suffix}`, plainPassword);
      assert.strictEqual(plainLogin.user.role, customRoleName);

      const custUrl = baseUrl.replace('/auth', '/customers');
      const custRes = await fetch(custUrl, {
        headers: { Authorization: `Bearer ${loginData.accessToken}`, 'x-enforce-auth': 'true' },
      });
      assert.strictEqual(custRes.status, 200, 'Custom role with customers.view passes dynamic permission check');
    } finally {
      if (createdUserId) {
        await prisma.user.delete({ where: { id: createdUserId } }).catch(() => {});
      }
      await prisma.role.delete({ where: { id: createdRole.id } }).catch(() => {});
    }
  });

  await stopServer();
  await prisma.$disconnect();
});
