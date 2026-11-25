import { test, expect, request as pwRequest } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

const API_BASE = 'http://127.0.0.1:5000';

const MOCK_ROLES = [
  { id: 'role-super', name: 'SUPER_ADMIN', description: 'Full system access', isSystem: true, userCount: 1, updatedAt: '2026-11-20T00:00:00.000Z' },
  { id: 'role-mgr', name: 'MANAGER', description: 'Operations manager', isSystem: true, userCount: 1, updatedAt: '2026-11-20T00:00:00.000Z' },
  { id: 'role-tech', name: 'FIELD_TECHNICIAN', description: 'Field installation & repairs', isSystem: true, userCount: 2, updatedAt: '2026-11-20T00:00:00.000Z' },
  { id: 'role-noc', name: 'NETWORK_ENGINEER', description: 'NOC & Mikrotik routers', isSystem: true, userCount: 1, updatedAt: '2026-11-20T00:00:00.000Z' },
  { id: 'role-custom', name: 'NIGHT_NOC', description: 'Custom overnight shift', isSystem: false, userCount: 1, updatedAt: '2026-11-20T00:00:00.000Z' },
];

const MOCK_USERS = [
  {
    id: 'usr-super-1',
    username: 'admin',
    email: 'admin@nsmisp.net',
    fullName: 'System Admin',
    phone: '+855 12 000 001',
    avatarUrl: null,
    role: 'SUPER_ADMIN',
    roles: ['SUPER_ADMIN'],
    roleIds: ['role-super'],
    grants: [],
    denies: [],
    grantCount: 0,
    denyCount: 0,
    isActive: true,
    hasAuditHistory: true,
    isLastSuperAdmin: true,
    isLastActiveSuperAdmin: true,
    lastLoginAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    createdAt: '2026-11-01T08:00:00.000Z',
    updatedAt: '2026-11-20T08:00:00.000Z',
  },
  {
    id: 'usr-khmer-1',
    username: 'sokha_meng',
    email: 'sokha@nsmisp.net',
    fullName: 'សុខា ម៉េង',
    phone: '+855 12 888 999',
    avatarUrl: null,
    role: 'MANAGER',
    roles: ['MANAGER', 'FIELD_TECHNICIAN', 'NIGHT_NOC'],
    roleIds: ['role-mgr', 'role-tech', 'role-custom'],
    grants: [],
    denies: [],
    grantCount: 0,
    denyCount: 0,
    isActive: true,
    hasAuditHistory: true,
    isLastSuperAdmin: false,
    isLastActiveSuperAdmin: false,
    lastLoginAt: null,
    createdAt: '2026-11-05T08:00:00.000Z',
    updatedAt: '2026-11-20T08:00:00.000Z',
  },
  {
    id: 'usr-mgr-self',
    username: 'mgr_self',
    email: 'mgr_self@nsmisp.net',
    fullName: 'Self Manager',
    phone: '+855 12 777 111',
    avatarUrl: null,
    role: 'MANAGER',
    roles: ['MANAGER'],
    roleIds: ['role-mgr'],
    grants: [],
    denies: [],
    grantCount: 0,
    denyCount: 0,
    isActive: true,
    hasAuditHistory: false,
    isLastSuperAdmin: false,
    isLastActiveSuperAdmin: false,
    lastLoginAt: '2026-11-24T10:00:00.000Z',
    createdAt: '2026-11-08T08:00:00.000Z',
    updatedAt: '2026-11-20T08:00:00.000Z',
  },
];

async function loginMockContext(browser, authUser, { onUsersRequest, onLogsRequest, onDeleteRequest } = {}) {
  // Non-Playwright UA bypasses mock auto-login so authStore uses real login flow with custom permissions
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  await page.route('**/api/v1/auth/refresh', (route) =>
    route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'No session' }) })
  );
  await page.route('**/api/v1/auth/health', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok' }) })
  );
  await page.route('**/api/v1/auth/login', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        accessToken: 'test-access-token',
        user: authUser,
      }),
    })
  );
  await page.route('**/api/v1/auth/features', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        features: [
          { key: 'page.users', type: 'PAGE', label: 'Users', path: '/settings/users', permissions: ['users.view'] },
          { key: 'page.audit', type: 'PAGE', label: 'Audit Logs', path: '/settings/audit', permissions: ['audit.view'] },
        ],
      }),
    })
  );
  await page.route('**/api/v1/auth/roles', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ roles: MOCK_ROLES }),
    })
  );
  await page.route('**/api/v1/auth/users/*/logs*', async (route) => {
    if (onLogsRequest) return onLogsRequest(route);
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [], total: 0 }),
    });
  });
  await page.route('**/api/v1/auth/users/*', async (route) => {
    if (route.request().method() === 'DELETE' && onDeleteRequest) {
      return onDeleteRequest(route);
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
  });
  await page.route('**/api/v1/auth/users?*', async (route) => {
    if (onUsersRequest) return onUsersRequest(route);
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: MOCK_USERS, total: MOCK_USERS.length }),
    });
  });

  await page.goto('/login?next=/settings/users');
  await page.locator('input[name="username"]').fill(authUser.username);
  await page.locator('input[name="password"]').fill('Password123!');
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/settings\/users/, { timeout: 15000 });

  return { context, page };
}

test.describe('Users UI Components & Permissions (Mocked)', () => {
  test('renders Users columns, Khmer full names without clipping, +N roles badge, and old route redirects', async ({ browser }) => {
    const { context, page } = await loginMockContext(browser, {
      id: 'usr-mgr-self',
      username: 'mgr_self',
      email: 'mgr_self@nsmisp.net',
      fullName: 'Self Manager',
      role: 'MANAGER',
      roles: ['MANAGER'],
      permissions: ['users.view', 'users.manage', 'audit.view'],
    });

    try {
      await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible();
      await expect(page.locator('button:has-text("Add User")')).toBeVisible();

      // Verify all expected headers
      for (const h of ['User', 'Username', 'Email', 'Roles', 'Status', 'Last login', 'Created']) {
        await expect(page.locator(`table thead th:has-text("${h}")`).first()).toBeVisible();
      }

      // Khmer name renders with lang="km" and zero vertical glyph clipping
      const khmerSpan = page.locator('table tbody [lang="km"]').first();
      await expect(khmerSpan).toContainText('សុខា ម៉េង');
      const clipCheck = await khmerSpan.evaluate((el) => {
        const st = window.getComputedStyle(el);
        const fs = parseFloat(st.fontSize);
        const lh = parseFloat(st.lineHeight);
        return {
          ok: el.scrollHeight <= el.clientHeight + 2 && lh / fs >= 1.49,
          ratio: lh / fs,
          scrollHeight: el.scrollHeight,
          clientHeight: el.clientHeight,
        };
      });
      expect(clipCheck.ok).toBe(true);

      // Roles badge count: 2 shown + "+1" pill for Sokha's 3 roles, and "Never" for null lastLoginAt
      const sokhaRow = page.locator('table tbody tr', { hasText: 'sokha_meng' });
      await expect(sokhaRow).toContainText('+1');
      await expect(sokhaRow).toContainText('Never');

      // Old route paths redirect cleanly
      await page.goto('/settings/staff');
      await expect(page).toHaveURL(/\/settings\/users$/);
      await page.goto('/staff-users');
      await expect(page).toHaveURL(/\/settings\/users$/);
    } finally {
      await context.close();
    }
  });

  test('row actions follow permissions and disable Delete on self and last SUPER_ADMIN', async ({ browser }) => {
    // Part A: Read-only viewer (users.view ONLY)
    const viewerCtx = await loginMockContext(browser, {
      id: 'viewer-1',
      username: 'viewer',
      email: 'viewer@nsmisp.net',
      fullName: 'Viewer',
      role: 'SUPPORT_AGENT',
      roles: ['SUPPORT_AGENT'],
      permissions: ['users.view'],
    });
    try {
      await expect(viewerCtx.page.locator('button:has-text("Add User")')).toHaveCount(0);
      const firstActionBtn = viewerCtx.page.locator('table tbody tr').first().locator('button[aria-label="Row actions"]');
      await firstActionBtn.click();

      await expect(viewerCtx.page.locator('button:has-text("Edit")')).toBeDisabled();
      await expect(viewerCtx.page.locator('button:has-text("View Log")')).toBeDisabled();
      await expect(viewerCtx.page.locator('button:has-text("Delete")')).toBeDisabled();
    } finally {
      await viewerCtx.context.close();
    }

    // Part B: Manager (self row + last SUPER_ADMIN row Delete disabled with tooltips)
    const mgrCtx = await loginMockContext(browser, {
      id: 'usr-mgr-self',
      username: 'mgr_self',
      email: 'mgr_self@nsmisp.net',
      fullName: 'Self Manager',
      role: 'MANAGER',
      roles: ['MANAGER'],
      permissions: ['users.view', 'users.manage', 'audit.view'],
    });
    try {
      // Self row Delete disabled
      const selfRow = mgrCtx.page.locator('table tbody tr', { hasText: 'mgr_self' });
      await selfRow.locator('button[aria-label="Row actions"]').click();
      const selfDeleteBtn = mgrCtx.page.locator('button[title="You cannot delete your own account"]');
      await expect(selfDeleteBtn).toBeDisabled();
      await mgrCtx.page.keyboard.press('Escape');
      await mgrCtx.page.locator('body').click({ position: { x: 10, y: 10 } });

      // Last SUPER_ADMIN row Delete disabled
      const superRow = mgrCtx.page.locator('table tbody tr', { hasText: 'admin@nsmisp.net' });
      await superRow.locator('button[aria-label="Row actions"]').click();
      const superDeleteBtn = mgrCtx.page.locator('button[title="Cannot delete the last SUPER_ADMIN account"]');
      await expect(superDeleteBtn).toBeDisabled();
    } finally {
      await mgrCtx.context.close();
    }
  });

  test('delete confirm modal requires typing username for privileged soft-delete and triggers refresh', async ({ browser }) => {
    let deleteCalled = false;
    const { context, page } = await loginMockContext(
      browser,
      {
        id: 'usr-mgr-self',
        username: 'mgr_self',
        email: 'mgr_self@nsmisp.net',
        fullName: 'Self Manager',
        role: 'MANAGER',
        roles: ['MANAGER'],
        permissions: ['users.view', 'users.manage', 'audit.view'],
      },
      {
        onDeleteRequest: (route) => {
          deleteCalled = true;
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              softDeleted: true,
              message: 'User "សុខា ម៉េង" has audit history and was deactivated instead of permanently deleted.',
            }),
          });
        },
      }
    );

    try {
      const sokhaRow = page.locator('table tbody tr', { hasText: 'sokha_meng' });
      await sokhaRow.locator('button[aria-label="Row actions"]').click();
      await page.locator('button:has-text("Delete")').click();

      const modal = page.locator('[role="dialog"]');
      await expect(modal).toContainText('Audit history preserved');
      const confirmSubmit = modal.locator('button:has-text("Deactivate User")');
      await expect(confirmSubmit).toBeDisabled();

      await modal.locator('input[aria-label="Confirm username"]').fill('sokha_meng');
      await expect(confirmSubmit).toBeEnabled();
      await confirmSubmit.click();

      await expect.poll(() => deleteCalled).toBe(true);
      await expect(modal).toHaveCount(0);
    } finally {
      await context.close();
    }
  });

  test('View Log drawer shows Activity, date filter, Audit Logs link, and No activity yet empty state', async ({ browser }) => {
    const { context, page } = await loginMockContext(
      browser,
      {
        id: 'usr-mgr-self',
        username: 'mgr_self',
        email: 'mgr_self@nsmisp.net',
        fullName: 'Self Manager',
        role: 'MANAGER',
        roles: ['MANAGER'],
        permissions: ['users.view', 'users.manage', 'audit.view'],
      },
      {
        onLogsRequest: (route) => {
          const url = new URL(route.request().url());
          const from = url.searchParams.get('from');
          if (from === '2099-01-01') {
            return route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({ items: [], total: 0 }),
            });
          }
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              items: [
                {
                  id: 'log-1',
                  action: 'USER_ROLE_UPDATE',
                  resource: 'User',
                  resourceId: 'usr-khmer-1',
                  details: JSON.stringify({ before: { roles: ['FIELD_TECHNICIAN'] }, after: { roles: ['MANAGER', 'FIELD_TECHNICIAN'] } }),
                  actor: 'admin',
                  ip: '127.0.0.1',
                  ipAddress: '127.0.0.1',
                  time: new Date().toISOString(),
                  timestamp: new Date().toISOString(),
                  createdAt: new Date().toISOString(),
                },
              ],
              total: 1,
            }),
          });
        },
      }
    );

    try {
      const sokhaRow = page.locator('table tbody tr', { hasText: 'sokha_meng' });
      await sokhaRow.locator('button[aria-label="Row actions"]').click();
      await page.locator('button:has-text("View Log")').click();

      await expect(page.locator('text=Activity: សុខា ម៉េង')).toBeVisible();
      await expect(page.locator('text=USER_ROLE_UPDATE')).toBeVisible();
      await expect(page.locator('text=Actor: admin')).toBeVisible();

      const auditLink = page.locator('a:has-text("Open in Audit Logs")');
      await expect(auditLink).toHaveAttribute('href', /\/settings\/audit\?actorId=usr-khmer-1/);

      // Filter to future date -> "No activity yet" empty state
      await page.locator('input[aria-label="From date"]').fill('2099-01-01');
      await expect(page.locator('text=No activity yet')).toBeVisible();
    } finally {
      await context.close();
    }
  });

  test('renders No users yet and No matching users empty states', async ({ browser }) => {
    const { context, page } = await loginMockContext(
      browser,
      {
        id: 'usr-mgr-self',
        username: 'mgr_self',
        email: 'mgr_self@nsmisp.net',
        fullName: 'Self Manager',
        role: 'MANAGER',
        roles: ['MANAGER'],
        permissions: ['users.view', 'users.manage', 'audit.view'],
      },
      {
        onUsersRequest: (route) => {
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ items: [], total: 0 }),
          });
        },
      }
    );

    try {
      await expect(page.locator('text=No users yet')).toBeVisible();
      const searchBox = page.locator('input[placeholder*="Search name"]').first();
      await searchBox.fill('nonexistent_query_xyz');
      await expect(page.locator('text=No matching users')).toBeVisible();
      await expect(page.locator('button:has-text("Clear filters")')).toBeVisible();
    } finally {
      await context.close();
    }
  });
});

test.describe('Users Live E2E Flow', () => {
  const uniqueSuffix = `${Date.now()}`;
  const username = `e2e_user_${uniqueSuffix}`;
  const fullName = `E2E Test ${uniqueSuffix}`;
  const email = `${username}@nsmisp.net`;
  const password = 'E2eUserPass2026!';

  test.afterAll(async () => {
    const prisma = new PrismaClient();
    try {
      const created = await prisma.user.findUnique({ where: { username } });
      if (created) {
        await prisma.passwordResetToken.deleteMany({ where: { userId: created.id } });
        await prisma.session.deleteMany({ where: { userId: created.id } });
        await prisma.auditLog.deleteMany({
          where: {
            OR: [{ userId: created.id }, { resourceId: created.id }, { userEmail: username }, { userEmail: email }],
          },
        });
        await prisma.user.delete({ where: { id: created.id } });
      }
    } finally {
      await prisma.$disconnect();
    }
  });

  test('create user, edit role, view activity log, deactivate user, and confirm refresh token fails (401)', async ({ page }) => {
    test.setTimeout(60000);

    await page.goto('/settings/users', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible();

    // 1. Create a user via Add User modal
    await page.locator('button:has-text("Add User")').first().click();
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toContainText('Add User');

    await modal.locator('input[placeholder*="Sokha Meng"]').fill(fullName);
    await modal.locator('input[placeholder*="sokha_tech"]').fill(username);
    await modal.locator('input[type="email"]').fill(email);
    await modal.locator('input[type="password"]').fill(password);

    await modal.locator('button:has-text("Create User")').click();
    await expect(modal).toHaveCount(0);

    // Search for newly created user in DataTable server search
    const searchInput = page.locator('input[placeholder*="Search name"]').first();
    await searchInput.fill(username);
    const userRow = page.locator('table tbody tr', { hasText: username });
    await expect(userRow).toBeVisible({ timeout: 10000 });

    // 2. Log in as newly created user in an isolated API context to hold a live refresh_token cookie
    const userApi = await pwRequest.newContext({ baseURL: API_BASE });
    try {
      const loginRes = await userApi.post('/api/v1/auth/login', {
        data: { username, password },
      });
      expect(loginRes.status()).toBe(200);

      // Verify refresh succeeds before role edit / deactivation
      const refreshBefore = await userApi.post('/api/v1/auth/refresh');
      expect(refreshBefore.status()).toBe(200);

      // 3. Edit user role in UI
      await userRow.locator('button[aria-label="Row actions"]').click();
      await page.locator('button:has-text("Edit")').click();
      const editModal = page.locator('[role="dialog"]');
      await expect(editModal).toContainText('Edit User');

      await editModal.locator('[role="combobox"]').click();
      await page.locator('[role="option"]', { hasText: 'BILLING_CASHIER' }).first().click();
      await editModal.locator('[role="combobox"]').click();
      await editModal.locator('button:has-text("Save Changes")').click();
      await expect(editModal).toHaveCount(0);
      await expect(userRow).toContainText('BILLING_CASHIER');

      // 4. View user's activity log in Drawer
      await userRow.locator('button[aria-label="Row actions"]').click();
      await page.locator('button:has-text("View Log")').click();
      await expect(page.locator(`text=Activity: ${fullName}`)).toBeVisible();
      await expect(page.locator('text=USER_CREATE')).toBeVisible();
      await expect(page.locator('text=USER_ROLE_UPDATE')).toBeVisible();
      await page.locator('button:has-text("Close")').last().click();

      // Re-login after role edit (since role change itself revoked old session), confirm refresh works (200)
      const reloginRes = await userApi.post('/api/v1/auth/login', {
        data: { username, password },
      });
      expect(reloginRes.status()).toBe(200);
      const refreshPreDeactivate = await userApi.post('/api/v1/auth/refresh');
      expect(refreshPreDeactivate.status()).toBe(200);

      // 5. Deactivate user via Edit modal
      await userRow.locator('button[aria-label="Row actions"]').click();
      await page.locator('button:has-text("Edit")').click();
      const deactivateModal = page.locator('[role="dialog"]');
      await deactivateModal.locator('[role="switch"][aria-label="Account Active"]').click();
      await deactivateModal.locator('button:has-text("Save Changes")').click();
      await expect(deactivateModal).toHaveCount(0);
      await expect(userRow).toContainText('Disabled');

      // 6. Confirm deactivated user can no longer refresh (401)
      const refreshAfterDeactivate = await userApi.post('/api/v1/auth/refresh');
      expect(refreshAfterDeactivate.status()).toBe(401);
    } finally {
      await userApi.dispose();
    }
  });
});
