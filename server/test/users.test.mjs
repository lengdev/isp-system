import assert from 'node:assert/strict';
import http from 'node:http';
import test, { after, before } from 'node:test';
import bcrypt from 'bcryptjs';

process.env.NODE_ENV = 'test';

const { app } = await import('../../dist-server/server.js');
const { prisma } = await import('../../dist-server/db/store.js');
const { RbacService } = await import('../../dist-server/services/rbac.service.js');
const { AuthService } = await import('../../dist-server/services/auth.service.js');

const RUN_ID = `ut_${Date.now()}`;
const TEST_PASSWORD = 'UserSuitePass2026!';

let server;
let baseUrl;
let adminActor;
let passwordHash;

const createdUserIds = [];
const createdRoleIds = [];

async function apiJson(path, { method = 'GET', token, body, cookie } = {}) {
  const headers = {
    'x-enforce-auth': 'true',
  };
  if (token) headers['authorization'] = `Bearer ${token}`;
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (cookie) headers['cookie'] = cookie;

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }

  return {
    status: res.status,
    json,
    setCookie: res.headers.get('set-cookie') || '',
  };
}

function extractCookieValue(setCookieHeader, name) {
  const match = setCookieHeader.match(new RegExp(`${name}=([^;]+)`));
  return match ? `${name}=${match[1]}` : '';
}

async function createTempUser({
  suffix,
  fullName,
  roleName,
  isActive = true,
}) {
  const username = `${RUN_ID}_${suffix}`;
  const email = `${username}@nsmisp.test`;
  const roleRecord = await prisma.role.findUnique({ where: { name: roleName } });
  const enumRoles = new Set([
    'SUPER_ADMIN',
    'ADMINISTRATOR',
    'MANAGER',
    'ACCOUNTANT',
    'CASHIER',
    'BILLING_CASHIER',
    'NETWORK_ENGINEER',
    'TECHNICIAN',
    'FIELD_TECHNICIAN',
    'SUPPORT_AGENT',
    'SALES_STAFF',
    'WAREHOUSE_MANAGER',
    'PROCUREMENT_OFFICER',
    'CUSTOMER',
  ]);
  const enumRole = enumRoles.has(roleName) ? roleName : 'SUPPORT_AGENT';

  const user = await prisma.user.create({
    data: {
      username,
      email,
      passwordHash,
      fullName,
      role: enumRole,
      isActive,
    },
  });
  createdUserIds.push(user.id);

  if (roleRecord) {
    await prisma.userRole.create({
      data: {
        userId: user.id,
        roleId: roleRecord.id,
      },
    });
  }

  RbacService.invalidateUserCache(user.id);
  return user;
}

async function loginHttp(username, password = TEST_PASSWORD) {
  const res = await apiJson('/api/v1/auth/login', {
    method: 'POST',
    body: { username, password },
  });
  assert.equal(res.status, 200, `Expected 200 logging in ${username}, got ${res.status}: ${JSON.stringify(res.json)}`);
  return {
    token: res.json.accessToken,
    user: res.json.user,
    cookie: extractCookieValue(res.setCookie, 'refresh_token'),
  };
}

before(async () => {
  await RbacService.seedRbac();
  passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address();
  baseUrl = `http://127.0.0.1:${addr.port}`;

  // Dedicated active SUPER_ADMIN actor for isolated HTTP mutations
  const superActorUser = await createTempUser({
    suffix: 'super',
    fullName: 'Suite Super Admin',
    roleName: 'SUPER_ADMIN',
  });
  adminActor = await loginHttp(superActorUser.username);
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }

  if (createdUserIds.length > 0) {
    const usersToClean = await prisma.user.findMany({
      where: { id: { in: createdUserIds } },
      select: { id: true, username: true, email: true },
    });
    const usernames = usersToClean.map((u) => u.username);
    const emails = usersToClean.map((u) => u.email);

    await prisma.passwordResetToken.deleteMany({
      where: { userId: { in: createdUserIds } },
    });
    await prisma.session.deleteMany({
      where: { userId: { in: createdUserIds } },
    });
    await prisma.auditLog.deleteMany({
      where: {
        OR: [
          { userId: { in: createdUserIds } },
          { resourceId: { in: createdUserIds } },
          { userEmail: { in: [...usernames, ...emails] } },
        ],
      },
    });
    await prisma.user.deleteMany({
      where: { id: { in: createdUserIds } },
    });
  }

  if (createdRoleIds.length > 0) {
    await prisma.role.deleteMany({
      where: { id: { in: createdRoleIds } },
    });
  }

  RbacService.invalidateCache();
  await prisma.$disconnect();
});

test('1. GET /api/v1/auth/users supports search, role & status filters, sorting, and pagination', async () => {
  const userAlpha = await createTempUser({
    suffix: 'list_alpha',
    fullName: `Sokha ${RUN_ID} Alpha`,
    roleName: 'FIELD_TECHNICIAN',
    isActive: true,
  });
  const userBeta = await createTempUser({
    suffix: 'list_beta',
    fullName: `Dara ${RUN_ID} Beta`,
    roleName: 'BILLING_CASHIER',
    isActive: false,
  });
  const userGamma = await createTempUser({
    suffix: 'list_gamma',
    fullName: `Bopha ${RUN_ID} Gamma`,
    roleName: 'FIELD_TECHNICIAN',
    isActive: true,
  });

  // Search by unique RUN_ID + paginate
  const page1 = await apiJson(
    `/api/v1/auth/users?search=${encodeURIComponent(RUN_ID)}&page=1&pageSize=2&sortBy=fullName&sortDir=asc`,
    { token: adminActor.token }
  );
  assert.equal(page1.status, 200);
  assert.equal(typeof page1.json.total, 'number');
  assert.equal(page1.json.items.length, 2);
  assert.ok(page1.json.total >= 4);

  // Verify item shape and never exposing passwordHash
  const sample = page1.json.items[0];
  for (const key of ['id', 'fullName', 'username', 'email', 'phone', 'roles', 'isActive', 'lastLoginAt', 'createdAt']) {
    assert.ok(key in sample, `Missing expected field: ${key}`);
  }
  assert.ok(!('passwordHash' in sample), 'passwordHash must never be returned');
  assert.ok(Array.isArray(sample.roles));

  // Filter by status=disabled + search
  const disabledRes = await apiJson(
    `/api/v1/auth/users?search=${encodeURIComponent(RUN_ID)}&status=disabled`,
    { token: adminActor.token }
  );
  assert.equal(disabledRes.status, 200);
  assert.equal(disabledRes.json.total, 1);
  assert.equal(disabledRes.json.items[0].id, userBeta.id);

  // Filter by role=FIELD_TECHNICIAN + search
  const techRes = await apiJson(
    `/api/v1/auth/users?search=${encodeURIComponent(RUN_ID)}&role=FIELD_TECHNICIAN&sortBy=username&sortDir=asc`,
    { token: adminActor.token }
  );
  assert.equal(techRes.status, 200);
  assert.deepEqual(
    techRes.json.items.map((u) => u.id),
    [userAlpha.id, userGamma.id]
  );

  // Search by email fragment
  const emailRes = await apiJson(
    `/api/v1/auth/users?search=${encodeURIComponent(userBeta.email)}`,
    { token: adminActor.token }
  );
  assert.equal(emailRes.status, 200);
  assert.equal(emailRes.json.total, 1);
  assert.equal(emailRes.json.items[0].id, userBeta.id);
});

test('2. RBAC 403 checks for missing users.view, users.manage, audit.view, and SUPER_ADMIN guard', async () => {
  // Custom role with ONLY users.view
  const viewOnlyRole = await prisma.role.create({
    data: { name: `${RUN_ID}_VIEWER`, description: 'Users view only', isSystem: false },
  });
  createdRoleIds.push(viewOnlyRole.id);
  const usersViewPerm = await prisma.permission.findUnique({ where: { key: 'users.view' } });
  assert.ok(usersViewPerm);
  await prisma.rolePermission.create({
    data: { roleId: viewOnlyRole.id, permissionId: usersViewPerm.id },
  });

  // Custom role with NO users.view / users.manage / audit.view
  const bareRole = await prisma.role.create({
    data: { name: `${RUN_ID}_BARE`, description: 'No user perms', isSystem: false },
  });
  createdRoleIds.push(bareRole.id);

  // Custom role with users.view + users.manage (non-SUPER_ADMIN)
  const mgrRole = await prisma.role.create({
    data: { name: `${RUN_ID}_USER_MGR`, description: 'Can manage non-super users', isSystem: false },
  });
  createdRoleIds.push(mgrRole.id);
  const usersManagePerm = await prisma.permission.findUnique({ where: { key: 'users.manage' } });
  assert.ok(usersManagePerm);
  await prisma.rolePermission.createMany({
    data: [
      { roleId: mgrRole.id, permissionId: usersViewPerm.id },
      { roleId: mgrRole.id, permissionId: usersManagePerm.id },
    ],
  });

  RbacService.invalidateCache();

  const viewerUser = await createTempUser({ suffix: 'viewer', fullName: 'View Only', roleName: viewOnlyRole.name });
  const bareUser = await createTempUser({ suffix: 'bare', fullName: 'Bare User', roleName: bareRole.name });
  const mgrUser = await createTempUser({ suffix: 'usermgr', fullName: 'User Manager', roleName: mgrRole.name });
  const targetUser = await createTempUser({ suffix: 'target403', fullName: 'Target 403', roleName: 'SUPPORT_AGENT' });

  const viewerAuth = await loginHttp(viewerUser.username);
  const bareAuth = await loginHttp(bareUser.username);
  const mgrAuth = await loginHttp(mgrUser.username);

  // Without users.view -> 403 on GET /auth/users
  const listDenied = await apiJson('/api/v1/auth/users', { token: bareAuth.token });
  assert.equal(listDenied.status, 403);

  // Viewer CAN list, CANNOT mutate or view audit logs
  const listAllowed = await apiJson('/api/v1/auth/users?pageSize=5', { token: viewerAuth.token });
  assert.equal(listAllowed.status, 200);

  const createDenied = await apiJson('/api/v1/auth/users', {
    method: 'POST',
    token: viewerAuth.token,
    body: {
      fullName: 'Should Fail',
      username: `${RUN_ID}_failcreate`,
      email: `${RUN_ID}_failcreate@nsmisp.test`,
      password: TEST_PASSWORD,
      roles: ['SUPPORT_AGENT'],
    },
  });
  assert.equal(createDenied.status, 403);

  const patchDenied = await apiJson(`/api/v1/auth/users/${targetUser.id}`, {
    method: 'PATCH',
    token: viewerAuth.token,
    body: { fullName: 'Nope' },
  });
  assert.equal(patchDenied.status, 403);

  const deleteDenied = await apiJson(`/api/v1/auth/users/${targetUser.id}`, {
    method: 'DELETE',
    token: viewerAuth.token,
  });
  assert.equal(deleteDenied.status, 403);

  const resetDenied = await apiJson(`/api/v1/auth/users/${targetUser.id}/reset-password`, {
    method: 'POST',
    token: viewerAuth.token,
  });
  assert.equal(resetDenied.status, 403);

  const logsDenied = await apiJson(`/api/v1/auth/users/${targetUser.id}/logs`, {
    token: viewerAuth.token,
  });
  assert.equal(logsDenied.status, 403);

  // Non-SUPER_ADMIN manager cannot assign SUPER_ADMIN or delete a SUPER_ADMIN
  const assignSuperDenied = await apiJson('/api/v1/auth/users', {
    method: 'POST',
    token: mgrAuth.token,
    body: {
      fullName: 'Illegal Super',
      username: `${RUN_ID}_illegalsuper`,
      email: `${RUN_ID}_illegalsuper@nsmisp.test`,
      password: TEST_PASSWORD,
      roles: ['SUPER_ADMIN'],
    },
  });
  assert.equal(assignSuperDenied.status, 403);

  const deleteSuperDenied = await apiJson(`/api/v1/auth/users/${adminActor.user.id}`, {
    method: 'DELETE',
    token: mgrAuth.token,
  });
  assert.equal(deleteSuperDenied.status, 403);
});

test('3. Delete protections: self (400), last SUPER_ADMIN (409), hard-delete vs soft-delete with audit history', async () => {
  // 3a. Cannot delete yourself (HTTP 400)
  const selfDelete = await apiJson(`/api/v1/auth/users/${adminActor.user.id}`, {
    method: 'DELETE',
    token: adminActor.token,
  });
  assert.equal(selfDelete.status, 400);
  assert.match(selfDelete.json.error, /your own account/i);

  // 3b. Hard-delete when user has NO audit history
  const cleanRes = await apiJson('/api/v1/auth/users', {
    method: 'POST',
    token: adminActor.token,
    body: {
      fullName: 'Clean Delete User',
      username: `${RUN_ID}_cleandel`,
      email: `${RUN_ID}_cleandel@nsmisp.test`,
      password: TEST_PASSWORD,
      roles: ['SUPPORT_AGENT'],
    },
  });
  assert.equal(cleanRes.status, 201);
  createdUserIds.push(cleanRes.json.id);

  // Ensure zero audit rows pointing at this clean user (USER_CREATE stores resourceId on actor; remove any matching target rows if present)
  await prisma.auditLog.deleteMany({
    where: {
      OR: [
        { userId: cleanRes.json.id },
        { userEmail: cleanRes.json.username },
        { userEmail: cleanRes.json.email },
      ],
    },
  });

  const hardDelRes = await apiJson(`/api/v1/auth/users/${cleanRes.json.id}`, {
    method: 'DELETE',
    token: adminActor.token,
  });
  assert.equal(hardDelRes.status, 200);
  assert.equal(hardDelRes.json.softDeleted, false);

  const stillThere = await prisma.user.findUnique({ where: { id: cleanRes.json.id } });
  assert.equal(stillThere, null, 'User without audit history should be hard-deleted');

  // 3c. Soft-delete when user HAS audit history (e.g., logged in once or has AuditLog row)
  const historyUser = await createTempUser({
    suffix: 'histdel',
    fullName: 'History Soft Delete',
    roleName: 'SUPPORT_AGENT',
  });
  const historyLogin = await loginHttp(historyUser.username);
  assert.ok(historyLogin.cookie);

  const softDelRes = await apiJson(`/api/v1/auth/users/${historyUser.id}`, {
    method: 'DELETE',
    token: adminActor.token,
  });
  assert.equal(softDelRes.status, 200);
  assert.equal(softDelRes.json.softDeleted, true);

  const softRecord = await prisma.user.findUnique({ where: { id: historyUser.id } });
  assert.ok(softRecord, 'User with audit history must remain in DB');
  assert.equal(softRecord.isActive, false, 'Soft-deleted user must have isActive=false');

  const refreshAfterSoftDelete = await apiJson('/api/v1/auth/refresh', {
    method: 'POST',
    cookie: historyLogin.cookie,
  });
  assert.equal(refreshAfterSoftDelete.status, 401, 'Soft-deleted user sessions must be revoked');

  // 3d. Cannot delete or deactivate the last SUPER_ADMIN (409)
  // Temporarily deactivate other SUPER_ADMINs only inside this test if needed? No — safer:
  // inspect existing active SUPER_ADMINs and test against a controlled DB state cleanly by demoting/restoring or checking single active SUPER_ADMIN:
  const activeSupersBefore = await prisma.user.findMany({
    where: {
      isActive: true,
      OR: [
        { role: 'SUPER_ADMIN' },
        { userRoles: { some: { role: { name: 'SUPER_ADMIN' } } } },
      ],
    },
    select: { id: true, username: true },
  });

  // Temporarily keep track so we restore exact isActive flags afterwards;
  // Pick the LAST active super if >1 by temporarily setting others to non-super? Even simpler:
  // Only run direct 409 check if we make adminActor the temporary sole active SUPER_ADMIN or restore immediately in finally!
  const otherActiveIds = activeSupersBefore.map((u) => u.id).filter((id) => id !== adminActor.user.id);
  try {
    if (otherActiveIds.length > 0) {
      await prisma.user.updateMany({
        where: { id: { in: otherActiveIds } },
        data: { isActive: false },
      });
    }

    await assert.rejects(
      () =>
        RbacService.updateUser(
          adminActor.user.id,
          { isActive: false },
          { id: 'external-super-actor', username: 'external_super', role: 'SUPER_ADMIN', roles: ['SUPER_ADMIN'], ip: '127.0.0.1' }
        ),
      (err) => err.status === 409 && /last active SUPER_ADMIN/i.test(err.message)
    );

    await assert.rejects(
      () =>
        RbacService.deleteUser(adminActor.user.id, {
          id: 'external-super-actor',
          username: 'external_super',
          role: 'SUPER_ADMIN',
          roles: ['SUPER_ADMIN'],
          ip: '127.0.0.1',
        }),
      (err) => err.status === 409 && /last SUPER_ADMIN/i.test(err.message)
    );
  } finally {
    if (otherActiveIds.length > 0) {
      await prisma.user.updateMany({
        where: { id: { in: otherActiveIds } },
        data: { isActive: true },
      });
    }
  }
});

test('4. Deactivate and role change revoke refresh sessions', async () => {
  const user = await createTempUser({
    suffix: 'sessions',
    fullName: 'Session Revocation User',
    roleName: 'SUPPORT_AGENT',
  });

  // Login -> verify refresh works (200)
  const session1 = await loginHttp(user.username);
  assert.ok(session1.cookie, 'Expected refresh_token cookie from login');

  const refreshOk = await apiJson('/api/v1/auth/refresh', {
    method: 'POST',
    cookie: session1.cookie,
  });
  assert.equal(refreshOk.status, 200);
  const rotatedCookie1 = extractCookieValue(refreshOk.setCookie, 'refresh_token') || session1.cookie;

  // Deactivate user via PATCH -> sessions revoked
  const deactivateRes = await apiJson(`/api/v1/auth/users/${user.id}`, {
    method: 'PATCH',
    token: adminActor.token,
    body: { isActive: false },
  });
  assert.equal(deactivateRes.status, 200);
  assert.equal(deactivateRes.json.isActive, false);

  const activeSessionsAfterDeactivate = await prisma.session.count({
    where: { userId: user.id, revokedAt: null },
  });
  assert.equal(activeSessionsAfterDeactivate, 0, 'All sessions must have revokedAt set on deactivate');

  const refreshAfterDeactivate = await apiJson('/api/v1/auth/refresh', {
    method: 'POST',
    cookie: rotatedCookie1,
  });
  assert.equal(refreshAfterDeactivate.status, 401);

  // Re-activate -> login -> change roles -> session must be revoked too
  const reactivateRes = await apiJson(`/api/v1/auth/users/${user.id}`, {
    method: 'PATCH',
    token: adminActor.token,
    body: { isActive: true },
  });
  assert.equal(reactivateRes.status, 200);

  const session2 = await loginHttp(user.username);
  const roleChangeRes = await apiJson(`/api/v1/auth/users/${user.id}`, {
    method: 'PATCH',
    token: adminActor.token,
    body: { roles: ['FIELD_TECHNICIAN'] },
  });
  assert.equal(roleChangeRes.status, 200);
  assert.deepEqual(roleChangeRes.json.roles, ['FIELD_TECHNICIAN']);

  const refreshAfterRoleChange = await apiJson('/api/v1/auth/refresh', {
    method: 'POST',
    cookie: session2.cookie,
  });
  assert.equal(refreshAfterRoleChange.status, 401);
});

test('5. Audit logs are written for user lifecycle actions without storing passwords and queryable via GET /auth/users/:id/logs', async () => {
  const secretPass = 'VerySecretLifecycle2026!';
  const createRes = await apiJson('/api/v1/auth/users', {
    method: 'POST',
    token: adminActor.token,
    body: {
      fullName: 'Audit Trail User',
      username: `${RUN_ID}_audit`,
      email: `${RUN_ID}_audit@nsmisp.test`,
      phone: '+855 12 000 111',
      password: secretPass,
      roles: ['SUPPORT_AGENT'],
    },
  });
  assert.equal(createRes.status, 201);
  const userId = createRes.json.id;
  createdUserIds.push(userId);

  // Edit profile + roles
  const updateRes = await apiJson(`/api/v1/auth/users/${userId}`, {
    method: 'PATCH',
    token: adminActor.token,
    body: {
      fullName: 'Audit Trail Updated',
      roles: ['BILLING_CASHIER'],
      isActive: false,
    },
  });
  assert.equal(updateRes.status, 200);

  // Reactivate
  const activateRes = await apiJson(`/api/v1/auth/users/${userId}`, {
    method: 'PATCH',
    token: adminActor.token,
    body: { isActive: true },
  });
  assert.equal(activateRes.status, 200);

  // Password reset link
  const resetRes = await apiJson(`/api/v1/auth/users/${userId}/reset-password`, {
    method: 'POST',
    token: adminActor.token,
  });
  assert.equal(resetRes.status, 200);

  // Delete (hard delete since target has no login row unless counted; let's check AuditLog via service/route)
  const delRes = await apiJson(`/api/v1/auth/users/${userId}`, {
    method: 'DELETE',
    token: adminActor.token,
  });
  assert.equal(delRes.status, 200);

  // Query target logs via GET /auth/users/:id/logs (note: works by resourceId=userId even after hard delete!)
  const logsPage1 = await apiJson(`/api/v1/auth/users/${userId}/logs?page=1&pageSize=3`, {
    token: adminActor.token,
  });
  assert.equal(logsPage1.status, 200);
  assert.equal(logsPage1.json.items.length, 3);
  assert.ok(logsPage1.json.total >= 6, `Expected >= 6 audit logs (create, update, role, deactivate, activate, reset, delete), got ${logsPage1.json.total}`);

  const allLogs = await apiJson(`/api/v1/auth/users/${userId}/logs?page=1&pageSize=50`, {
    token: adminActor.token,
  });
  const actions = allLogs.json.items.map((l) => l.action);
  for (const expectedAction of [
    'USER_CREATE',
    'USER_UPDATE',
    'USER_ROLE_UPDATE',
    'USER_DEACTIVATE',
    'USER_ACTIVATE',
    'USER_PASSWORD_RESET',
    'USER_DELETE',
  ]) {
    assert.ok(actions.includes(expectedAction), `Missing audit action ${expectedAction}; got ${actions.join(', ')}`);
  }

  // Verify before/after recorded and ZERO passwords stored anywhere in details
  const updateLog = allLogs.json.items.find((l) => l.action === 'USER_UPDATE');
  const parsedUpdate = JSON.parse(updateLog.details);
  assert.equal(parsedUpdate.before.fullName, 'Audit Trail User');
  assert.equal(parsedUpdate.after.fullName, 'Audit Trail Updated');

  const roleLog = allLogs.json.items.find((l) => l.action === 'USER_ROLE_UPDATE');
  const parsedRole = JSON.parse(roleLog.details);
  assert.deepEqual(parsedRole.before.roles, ['SUPPORT_AGENT']);
  assert.deepEqual(parsedRole.after.roles, ['BILLING_CASHIER']);

  for (const log of allLogs.json.items) {
    assert.ok(
      !(log.details || '').includes(secretPass),
      'Audit details must never contain plaintext passwords'
    );
    assert.ok('action' in log && 'resource' in log && 'ip' in log && 'time' in log);
  }

  // Future date filter yields 0 results cleanly
  const futureLogs = await apiJson(`/api/v1/auth/users/${userId}/logs?from=2099-01-01&to=2099-01-02`, {
    token: adminActor.token,
  });
  assert.equal(futureLogs.status, 200);
  assert.equal(futureLogs.json.total, 0);
  assert.deepEqual(futureLogs.json.items, []);
});
