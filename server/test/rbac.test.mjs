import test from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from '../../dist-server/routes/auth.routes.js';
import { AuthService } from '../../dist-server/services/auth.service.js';
import { RbacService } from '../../dist-server/services/rbac.service.js';
import { prisma } from '../../dist-server/db/store.js';

// Setup ephemeral server for test suite
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/v1/auth', authRoutes);

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

  await stopServer();
  await prisma.$disconnect();
});
