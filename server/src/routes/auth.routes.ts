import { Router } from 'express';
import { AuthService, ROLE_PERMISSIONS } from '../services/auth.service.js';
import { RbacService } from '../services/rbac.service.js';
import {
  authenticate,
  authorize,
  requireRole,
  validateBody,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from '../middleware/auth.middleware.js';

const router = Router();

// Helper to get client IP
function getClientIp(req: any): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || '127.0.0.1';
}

// Cookie configuration helper
function setRefreshCookie(res: any, refreshToken: string, expiresAt: Date, rememberMe: boolean = false) {
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieOptions: any = {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    path: '/api/v1/auth',
    maxAge: Math.max(0, expiresAt.getTime() - Date.now()),
  };

  res.cookie('refresh_token', refreshToken, cookieOptions);
}

// POST /api/v1/auth/login
router.post('/login', validateBody(loginSchema), async (req, res) => {
  try {
    const { username, password, rememberMe } = req.body;
    const ip = getClientIp(req);
    const userAgent = req.headers['user-agent'] || '';

    const result = await AuthService.login(username, password, rememberMe, ip, userAgent);

    // Set HTTP-Only Refresh Cookie
    setRefreshCookie(res, result.refreshToken, result.refreshTokenExpires, rememberMe);

    res.json({
      accessToken: result.accessToken,
      token: result.accessToken, // Backward compatibility
      user: result.user,
    });
  } catch (err: any) {
    const isLocked = err.message && (err.message.includes('locked') || err.message.includes('Too many attempts'));
    res.status(isLocked ? 429 : 401).json({ error: err.message });
  }
});

// POST /api/v1/auth/refresh
router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies?.refresh_token || req.cookies?.refreshToken || req.body?.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ error: 'No refresh token provided' });
    }

    const ip = getClientIp(req);
    const userAgent = req.headers['user-agent'] || '';

    const result = await AuthService.refresh(refreshToken, ip, userAgent);

    // Set rotated refresh cookie (preserve rememberMe if session lifetime indicates extended duration)
    const isRemembered = result.refreshTokenExpires.getTime() - Date.now() > 8 * 24 * 60 * 60 * 1000;
    setRefreshCookie(res, result.refreshToken, result.refreshTokenExpires, isRemembered);

    res.json({
      accessToken: result.accessToken,
      token: result.accessToken,
      user: result.user,
    });
  } catch (err: any) {
    // Clear cookie on refresh failure
    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/v1/auth',
    });
    res.status(401).json({ error: err.message });
  }
});

// POST /api/v1/auth/logout
router.post('/logout', async (req, res) => {
  try {
    const refreshToken = req.cookies?.refresh_token || req.cookies?.refreshToken || req.body?.refreshToken;
    const ip = getClientIp(req);
    let actorId: string | undefined;

    // Try extracting user from bearer token if present
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const payload = AuthService.verifyToken(authHeader.split(' ')[1]);
        actorId = payload.userId;
      } catch {
        // Ignore token error during logout
      }
    }

    await AuthService.logout(refreshToken, ip, actorId);

    // Clear refresh cookie
    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/v1/auth',
    });
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });

    res.json({ message: 'Logged out successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/auth/navigation -> Dynamic menu tree for current user
router.get('/navigation', authenticate, async (req, res) => {
  try {
    const user = req.user!;
    const identifiers = (user.roleIds && user.roleIds.length > 0)
      ? user.roleIds
      : (user.roles && user.roles.length > 0 ? user.roles : [user.role]);
    const effective = await RbacService.getUserEffectivePermissions(user.userId, identifiers);
    const navigation = await RbacService.getNavigationTree(effective);
    res.json({ navigation });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/auth/me
router.get('/me', authenticate, async (req, res) => {
  const user = req.user!;
  const identifiers = (user.roleIds && user.roleIds.length > 0)
    ? user.roleIds
    : (user.roles && user.roles.length > 0 ? user.roles : [user.role]);
  const effectivePermissions = await RbacService.getUserEffectivePermissions(user.userId, identifiers);
  const features = await RbacService.getAllowedFeatureKeys(effectivePermissions);

  res.json({
    user: {
      id: user.userId,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      roles: user.roles || [user.role],
      roleIds: user.roleIds || [],
      permissions: Array.from(effectivePermissions),
      features,
    },
  });
});

// POST /api/v1/auth/forgot-password
router.post('/forgot-password', validateBody(forgotPasswordSchema), async (req, res) => {
  try {
    const { emailOrUsername } = req.body;
    const ip = getClientIp(req);
    const result = await AuthService.forgotPassword(emailOrUsername, ip);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/v1/auth/reset-password
router.post('/reset-password', validateBody(resetPasswordSchema), async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const ip = getClientIp(req);
    const result = await AuthService.resetPassword(token, newPassword, ip);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/v1/auth/change-password
router.post('/change-password', authenticate, validateBody(changePasswordSchema), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const ip = getClientIp(req);
    const result = await AuthService.changePassword(req.user!.userId, currentPassword, newPassword, ip);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Helper to parse multi-value query params (?role=A,B or ?role=A&role=B)
function parseMultiQuery(val: any): string[] {
  if (!val) return [];
  const raw = Array.isArray(val) ? val : [val];
  return raw
    .flatMap((v) => String(v).split(','))
    .map((s) => s.trim())
    .filter(Boolean);
}

// GET /api/v1/auth/users -> Paginated, sorted, searchable, filterable list { items, total }
router.get('/users', authenticate, authorize('users.view'), async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize || req.query.limit) || 10;
    const search = typeof req.query.search === 'string' ? req.query.search : '';
    const roles = parseMultiQuery(req.query.role ?? req.query.roles);
    const status = parseMultiQuery(req.query.status);

    let sortBy = typeof req.query.sortBy === 'string' ? req.query.sortBy : 'createdAt';
    let sortDir: 'asc' | 'desc' = req.query.sortDir === 'desc' ? 'desc' : 'asc';
    if (typeof req.query.sort === 'string' && req.query.sort.includes(':')) {
      const [col, dir] = req.query.sort.split(':');
      if (col) sortBy = col;
      if (dir === 'desc' || dir === 'asc') sortDir = dir;
    }

    const result = await RbacService.listUsers({
      page,
      pageSize,
      search,
      roles,
      status,
      sortBy,
      sortDir,
    });
    res.json(result);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// POST /api/v1/auth/users
router.post('/users', authenticate, authorize('users.manage'), async (req, res) => {
  try {
    const actor = {
      id: req.user!.userId,
      username: req.user!.username,
      role: req.user!.role,
      roles: req.user!.roles,
      ip: getClientIp(req),
    };
    const user = await AuthService.createUser(req.body, actor);
    res.status(201).json(user);
  } catch (err: any) {
    res.status(err.status || 400).json({ error: err.message });
  }
});

// PATCH /api/v1/auth/users/:id -> Edit fullName, email, phone, roles, isActive
router.patch('/users/:id', authenticate, authorize('users.manage'), async (req, res) => {
  try {
    const id = String(req.params.id);
    const actor = {
      id: req.user!.userId,
      username: req.user!.username,
      role: req.user!.role,
      roles: req.user!.roles,
      ip: getClientIp(req),
    };
    const updated = await RbacService.updateUser(id, req.body || {}, actor);
    res.json(updated);
  } catch (err: any) {
    res.status(err.status || 400).json({ error: err.message });
  }
});

// POST /api/v1/auth/users/:id/reset-password -> Generate/send reset link reusing forgot-password flow
router.post('/users/:id/reset-password', authenticate, authorize('users.manage'), async (req, res) => {
  try {
    const id = String(req.params.id);
    const actor = {
      id: req.user!.userId,
      username: req.user!.username,
      ip: getClientIp(req),
    };
    const result = await AuthService.adminResetPassword(id, actor);
    res.json(result);
  } catch (err: any) {
    res.status(err.status || 400).json({ error: err.message });
  }
});

// DELETE /api/v1/auth/users/:id -> Delete (hard-delete or soft-delete with audit history)
router.delete('/users/:id', authenticate, authorize('users.manage'), async (req, res) => {
  try {
    const id = String(req.params.id);
    const actor = {
      id: req.user!.userId,
      username: req.user!.username,
      role: req.user!.role,
      roles: req.user!.roles,
      ip: getClientIp(req),
    };
    const result = await RbacService.deleteUser(id, actor);
    res.json(result);
  } catch (err: any) {
    res.status(err.status || 400).json({ error: err.message });
  }
});

// GET /api/v1/auth/users/:id/logs -> Paginated audit events for user with date range filter
router.get('/users/:id/logs', authenticate, authorize('audit.view'), async (req, res) => {
  try {
    const id = String(req.params.id);
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize || req.query.limit) || 20;
    const from = typeof req.query.from === 'string' ? req.query.from : undefined;
    const to = typeof req.query.to === 'string' ? req.query.to : undefined;
    const result = await RbacService.getUserAuditLogs(id, { page, pageSize, from, to });
    res.json(result);
  } catch (err: any) {
    res.status(err.status || 400).json({ error: err.message });
  }
});

// PATCH /api/v1/auth/users/:id/roles
router.patch('/users/:id/roles', authenticate, authorize('roles.manage'), async (req, res) => {
  try {
    const id = String(req.params.id);
    const roles = Array.isArray(req.body.roles)
      ? req.body.roles
      : req.body.role
      ? [req.body.role]
      : req.body.roleId
      ? [req.body.roleId]
      : [];
    const actor = {
      id: req.user!.userId,
      username: req.user!.username,
      role: req.user!.role,
      roles: req.user!.roles,
      ip: getClientIp(req),
    };
    const result = await RbacService.updateUserRoles(id, roles, actor);
    res.json(result);
  } catch (err: any) {
    res.status(err.status || 400).json({ error: err.message });
  }
});

// GET /api/v1/auth/users/:id/permissions -> User baseline role perms, per-user GRANT/DENY overrides, and effective perms
router.get('/users/:id/permissions', authenticate, authorize('roles.manage'), async (req, res) => {
  try {
    const id = String(req.params.id);
    const detail = await RbacService.getUserPermissionsDetail(id);
    res.json(detail);
  } catch (err: any) {
    res.status(err.status || 400).json({ error: err.message });
  }
});

// PUT /api/v1/auth/users/:id/permissions -> Replace per-user GRANT/DENY overrides
router.put('/users/:id/permissions', authenticate, authorize('roles.manage'), async (req, res) => {
  try {
    const id = String(req.params.id);
    const grants = Array.isArray(req.body?.grants) ? req.body.grants : [];
    const denies = Array.isArray(req.body?.denies) ? req.body.denies : [];
    const actor = {
      id: req.user!.userId,
      username: req.user!.username,
      ip: getClientIp(req),
    };
    const updated = await RbacService.updateUserPermissions(id, { grants, denies }, actor);
    res.json(updated);
  } catch (err: any) {
    res.status(err.status || 400).json({ error: err.message });
  }
});

// GET /api/v1/auth/roles -> { roles, permissions, matrix }
router.get('/roles', authenticate, authorize('users.view', 'users.manage', 'roles.manage'), async (_req, res) => {
  try {
    const data = await RbacService.getRolesMatrix();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/auth/roles -> create (name, description, copyFromRoleId optional)
router.post('/roles', authenticate, authorize('roles.manage'), async (req, res) => {
  try {
    const { name, description, copyFromRoleId } = req.body;
    const actor = {
      id: req.user!.userId,
      username: req.user!.username,
      ip: getClientIp(req),
    };
    const role = await RbacService.createRole({ name, description, copyFromRoleId }, actor);
    res.status(201).json(role);
  } catch (err: any) {
    res.status(err.status || 400).json({ error: err.message });
  }
});

// PATCH /api/v1/auth/roles/:id -> rename / description (not for SUPER_ADMIN)
router.patch('/roles/:id', authenticate, authorize('roles.manage'), async (req, res) => {
  try {
    const id = String(req.params.id);
    const { name, description } = req.body;
    const actor = {
      id: req.user!.userId,
      username: req.user!.username,
      ip: getClientIp(req),
    };
    const role = await RbacService.updateRole(id, { name, description }, actor);
    res.json(role);
  } catch (err: any) {
    res.status(err.status || 400).json({ error: err.message });
  }
});

// PUT /api/v1/auth/roles/:id/permissions -> body { add:[keys], remove:[keys], expectedUpdatedAt }
router.put('/roles/:id/permissions', authenticate, authorize('roles.manage'), async (req, res) => {
  try {
    const id = String(req.params.id);
    const { add, remove, expectedUpdatedAt } = req.body;
    const actor = {
      id: req.user!.userId,
      username: req.user!.username,
      ip: getClientIp(req),
    };
    const result = await RbacService.updateRolePermissions(id, { add, remove, expectedUpdatedAt }, actor);
    res.json(result);
  } catch (err: any) {
    res.status(err.status || 400).json({ error: err.message, code: err.code });
  }
});

// DELETE /api/v1/auth/roles/:id -> only if not isSystem and userCount === 0
router.delete('/roles/:id', authenticate, authorize('roles.manage'), async (req, res) => {
  try {
    const id = String(req.params.id);
    const actor = {
      id: req.user!.userId,
      username: req.user!.username,
      ip: getClientIp(req),
    };
    const result = await RbacService.deleteRole(id, actor);
    res.json(result);
  } catch (err: any) {
    res.status(err.status || 400).json({ error: err.message });
  }
});

// POST /api/v1/auth/roles/:id/duplicate
router.post('/roles/:id/duplicate', authenticate, authorize('roles.manage'), async (req, res) => {
  try {
    const id = String(req.params.id);
    const actor = {
      id: req.user!.userId,
      username: req.user!.username,
      ip: getClientIp(req),
    };
    const role = await RbacService.duplicateRole(id, actor);
    res.status(201).json(role);
  } catch (err: any) {
    res.status(err.status || 400).json({ error: err.message });
  }
});

// GET /api/v1/auth/features -> All features with mapped permission keys
router.get('/features', authenticate, authorize('roles.manage'), async (_req, res) => {
  try {
    const features = await RbacService.listFeaturesAdmin();
    res.json({ features });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/auth/features -> Create new feature (e.g. custom menu item)
router.post('/features', authenticate, authorize('roles.manage'), async (req, res) => {
  try {
    const actor = {
      id: req.user!.userId,
      username: req.user!.username,
      ip: getClientIp(req),
    };
    const feature = await RbacService.createFeature(req.body, actor);
    res.status(201).json({ feature });
  } catch (err: any) {
    res.status(err.status || 400).json({ error: err.message });
  }
});

// PATCH /api/v1/auth/features/:id -> Update feature config (permissions, mode, label, etc.)
router.patch('/features/:id', authenticate, authorize('roles.manage'), async (req, res) => {
  try {
    const id = String(req.params.id);
    const actor = {
      id: req.user!.userId,
      username: req.user!.username,
      ip: getClientIp(req),
    };
    const feature = await RbacService.updateFeature(id, req.body, actor);
    res.json({ feature });
  } catch (err: any) {
    res.status(err.status || 400).json({ error: err.message });
  }
});

// GET /api/v1/auth/permissions -> All system permissions catalog with metadata
router.get('/permissions', authenticate, authorize('roles.manage'), async (_req, res) => {
  try {
    const permissions = await RbacService.listPermissionsAdmin();
    res.json({ permissions });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/v1/auth/permissions/:id -> Update permission metadata
router.patch('/permissions/:id', authenticate, authorize('roles.manage'), async (req, res) => {
  try {
    const id = String(req.params.id);
    const actor = {
      id: req.user!.userId,
      username: req.user!.username,
      ip: getClientIp(req),
    };
    const permission = await RbacService.updatePermission(id, req.body, actor);
    res.json({ permission });
  } catch (err: any) {
    res.status(err.status || 400).json({ error: err.message });
  }
});

export default router;
