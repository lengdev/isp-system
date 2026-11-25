#!/usr/bin/env node
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();
const BCRYPT_SALT_ROUNDS = 12;

async function main() {
  console.log('\x1b[36m%s\x1b[0m', '🌱 NSMISP Database Seeding: RBAC Roles & Super Admin...');

  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@nsmisp.net';
  const adminPassword = process.env.ADMIN_PASSWORD || 'NsmispAdmin2026!';
  const adminFullName = process.env.ADMIN_FULLNAME || 'David Vance';

  const adminPasswordHash = await bcrypt.hash(adminPassword, BCRYPT_SALT_ROUNDS);

  try {
    await prisma.$connect();

    // 1. Seed or Upsert Super Admin
    const superAdmin = await prisma.user.upsert({
      where: { username: adminUsername },
      update: {
        email: adminEmail,
        fullName: adminFullName,
        passwordHash: adminPasswordHash,
        role: 'SUPER_ADMIN',
        isActive: true,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
      create: {
        username: adminUsername,
        email: adminEmail,
        fullName: adminFullName,
        passwordHash: adminPasswordHash,
        role: 'SUPER_ADMIN',
        isActive: true,
        failedLoginAttempts: 0,
      },
    });

    console.log(`✓ Super Admin user ensured: ${superAdmin.username} (${superAdmin.email})`);

    // 2. In Development, seed one demo user per role
    if (process.env.NODE_ENV !== 'production') {
      const demoUsers = [
        {
          username: 'engineer',
          email: 'noc@nsmisp.net',
          fullName: 'Vireak Chan',
          role: 'NETWORK_ENGINEER',
          password: 'Password123!',
        },
        {
          username: 'cashier',
          email: 'cashier@nsmisp.net',
          fullName: 'Bopha Pich',
          role: 'BILLING_CASHIER',
          password: 'Password123!',
        },
        {
          username: 'tech',
          email: 'tech@nsmisp.net',
          fullName: 'Marcus Vance',
          role: 'FIELD_TECHNICIAN',
          password: 'Password123!',
        },
        {
          username: 'support',
          email: 'support@nsmisp.net',
          fullName: 'Sokunthea Keo',
          role: 'SUPPORT_AGENT',
          password: 'Password123!',
        },
        {
          username: 'accountant',
          email: 'finance@nsmisp.net',
          fullName: 'Sophea Pich',
          role: 'ACCOUNTANT',
          password: 'Password123!',
        },
      ];

      for (const du of demoUsers) {
        const hash = await bcrypt.hash(du.password, BCRYPT_SALT_ROUNDS);
        await prisma.user.upsert({
          where: { username: du.username },
          update: {
            email: du.email,
            fullName: du.fullName,
            passwordHash: hash,
            role: du.role,
            isActive: true,
            failedLoginAttempts: 0,
            lockedUntil: null,
          },
          create: {
            username: du.username,
            email: du.email,
            fullName: du.fullName,
            passwordHash: hash,
            role: du.role,
            isActive: true,
          },
        });
        console.log(`  - Demo user: ${du.username} [${du.role}]`);
      }
    }

    console.log('\x1b[32m%s\x1b[0m', '✓ Seeding completed successfully.');
  } catch (err) {
    console.error('✗ Failed to seed database:', err?.message || err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
