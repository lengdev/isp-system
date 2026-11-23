import { Router } from 'express';
import { AuthService, ROLE_PERMISSIONS } from '../services/auth.service.js';
import {
  authenticate,
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
    sameSite: 'strict',
    secure: isProduction,
    path: '/api/v1/auth',
  };

  if (rememberMe) {
    cookieOptions.maxAge = Math.max(0, expiresAt.getTime() - Date.now());
  }

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
      sameSite: 'strict',
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
      sameSite: 'strict',
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

// GET /api/v1/auth/me
router.get('/me', authenticate, (req, res) => {
  const user = req.user!;
  res.json({
    user: {
      id: user.userId,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      roles: user.roles || [user.role],
      permissions: ROLE_PERMISSIONS[user.role] || [],
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

// GET /api/v1/auth/users
router.get('/users', authenticate, requireRole('SUPER_ADMIN'), async (_req, res) => {
  try {
    const users = await AuthService.listUsers();
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/auth/users
router.post('/users', authenticate, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const user = await AuthService.createUser(req.body);
    res.status(201).json(user);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
