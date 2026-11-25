import test from 'node:test';
import assert from 'node:assert';
import { z } from 'zod';

// 1. Login schema validation
const loginSchema = z.object({
  username: z.string().min(1, 'Please enter your username or email'),
  password: z.string().min(1, 'Please enter your password'),
  rememberMe: z.boolean().default(false),
});

// 2. Forgot password schema validation
const forgotPasswordSchema = z.object({
  emailOrUsername: z.string().min(1, 'Please enter your email or username'),
});

// 3. Reset password schema validation
const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Must contain at least one digit')
      .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

test('--- FRONTEND AUTH & RBAC VALIDATION TEST SUITE ---', async (t) => {
  await t.test('1. Login Schema: Valid inputs succeed', () => {
    const valid = loginSchema.safeParse({
      username: 'admin',
      password: 'StrongPassword123!',
      rememberMe: true,
    });
    assert.strictEqual(valid.success, true);
    assert.strictEqual(valid.data.username, 'admin');
    assert.strictEqual(valid.data.rememberMe, true);
  });

  await t.test('2. Login Schema: Rejects empty credentials', () => {
    const emptyUser = loginSchema.safeParse({ username: '', password: '123' });
    assert.strictEqual(emptyUser.success, false);

    const emptyPass = loginSchema.safeParse({ username: 'admin', password: '' });
    assert.strictEqual(emptyPass.success, false);
  });

  await t.test('3. Forgot Password Schema: Validates input presence', () => {
    assert.strictEqual(forgotPasswordSchema.safeParse({ emailOrUsername: 'admin@nsmisp.net' }).success, true);
    assert.strictEqual(forgotPasswordSchema.safeParse({ emailOrUsername: '' }).success, false);
  });

  await t.test('4. Reset Password Schema: Enforces strong complexity rules', () => {
    // Too short
    assert.strictEqual(
      resetPasswordSchema.safeParse({ password: 'Ab1!', confirmPassword: 'Ab1!' }).success,
      false
    );

    // Missing uppercase
    assert.strictEqual(
      resetPasswordSchema.safeParse({ password: 'lowercase123!', confirmPassword: 'lowercase123!' }).success,
      false
    );

    // Missing digit
    assert.strictEqual(
      resetPasswordSchema.safeParse({ password: 'UppercaseOnly!', confirmPassword: 'UppercaseOnly!' }).success,
      false
    );

    // Missing special character
    assert.strictEqual(
      resetPasswordSchema.safeParse({ password: 'Uppercase123', confirmPassword: 'Uppercase123' }).success,
      false
    );

    // Passwords do not match
    assert.strictEqual(
      resetPasswordSchema.safeParse({ password: 'StrongPass123!', confirmPassword: 'DifferentPass123!' }).success,
      false
    );

    // Compliant strong password
    const valid = resetPasswordSchema.safeParse({
      password: 'P@ssword2026NSMISP!',
      confirmPassword: 'P@ssword2026NSMISP!',
    });
    assert.strictEqual(valid.success, true);
  });

  await t.test('5. Protected Route Logic: Encodes target URL correctly', () => {
    const pathname = '/inventory/products';
    const search = '?tab=stock&page=2';
    const targetUrl = encodeURIComponent(pathname + search);
    assert.strictEqual(targetUrl, '%2Finventory%2Fproducts%3Ftab%3Dstock%26page%3D2');

    const redirectPath = `/login?next=${targetUrl}`;
    assert.ok(redirectPath.startsWith('/login?next='));
    assert.strictEqual(decodeURIComponent(redirectPath.split('?next=')[1]), '/inventory/products?tab=stock&page=2');
  });

  await t.test('6. Zustand Store Mock: Role hierarchy and wildcard permission checks', () => {
    const checkPermission = (user, permissions, permission) => {
      if (!user) return false;
      if (user.role === 'SUPER_ADMIN' || permissions.includes('*')) return true;
      if (permissions.includes(permission)) return true;
      const [module] = permission.split(':');
      if (permissions.includes(`${module}:*`)) return true;
      return false;
    };

    const superAdmin = { role: 'SUPER_ADMIN', roles: ['SUPER_ADMIN'] };
    assert.strictEqual(checkPermission(superAdmin, ['*'], 'billing:create'), true);
    assert.strictEqual(checkPermission(superAdmin, ['*'], 'anything:arbitrary'), true);

    const engineer = { role: 'NETWORK_ENGINEER', roles: ['NETWORK_ENGINEER'] };
    const engineerPerms = ['network:*', 'router:*', 'pppoe:*'];
    assert.strictEqual(checkPermission(engineer, engineerPerms, 'network:read'), true);
    assert.strictEqual(checkPermission(engineer, engineerPerms, 'network:reboot'), true);
    assert.strictEqual(checkPermission(engineer, engineerPerms, 'billing:create'), false);

    const cashier = { role: 'BILLING_CASHIER', roles: ['BILLING_CASHIER'] };
    const cashierPerms = ['billing:*', 'payment:*'];
    assert.strictEqual(checkPermission(cashier, cashierPerms, 'billing:create'), true);
    assert.strictEqual(checkPermission(cashier, cashierPerms, 'network:reboot'), false);
  });
});
