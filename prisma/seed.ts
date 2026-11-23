#!/usr/bin/env node
import { PrismaClient, UserRoleType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

const BCRYPT_SALT_ROUNDS = 12;

export async function seed() {
  console.log('🌱 Starting NetPulse Prisma database seed...');

  try {
    await prisma.$connect();

    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@netpulse.net';
    const adminPassword = process.env.ADMIN_PASSWORD || 'StrongSuperAdminPassword2026!';
    const adminFullName = process.env.ADMIN_FULLNAME || 'David Vance';

    const adminHash = await bcrypt.hash(adminPassword, BCRYPT_SALT_ROUNDS);

    // Upsert Super Admin
    const superAdmin = await prisma.user.upsert({
      where: { username: adminUsername },
      update: {
        email: adminEmail,
        fullName: adminFullName,
        passwordHash: adminHash,
        role: UserRoleType.SUPER_ADMIN,
        isActive: true,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
      create: {
        username: adminUsername,
        email: adminEmail,
        fullName: adminFullName,
        passwordHash: adminHash,
        role: UserRoleType.SUPER_ADMIN,
        isActive: true,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    console.log(`✓ Super Admin user ensured: ${superAdmin.username} (${superAdmin.email})`);

    // Demo Users for Development / Testing
    if (process.env.NODE_ENV !== 'production') {
      const demoUsers = [
        {
          username: 'engineer',
          email: 'noc@netpulse.net',
          fullName: 'Vireak Chan',
          role: UserRoleType.NETWORK_ENGINEER,
          password: 'Password123!',
        },
        {
          username: 'cashier',
          email: 'cashier@netpulse.net',
          fullName: 'Bopha Pich',
          role: UserRoleType.BILLING_CASHIER,
          password: 'Password123!',
        },
        {
          username: 'tech',
          email: 'tech@netpulse.net',
          fullName: 'Marcus Vance',
          role: UserRoleType.FIELD_TECHNICIAN,
          password: 'Password123!',
        },
        {
          username: 'support',
          email: 'support@netpulse.net',
          fullName: 'Sokunthea Keo',
          role: UserRoleType.SUPPORT_AGENT,
          password: 'Password123!',
        },
        {
          username: 'accountant',
          email: 'finance@netpulse.net',
          fullName: 'Sophea Pich',
          role: UserRoleType.ACCOUNTANT,
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
            failedLoginAttempts: 0,
            lockedUntil: null,
          },
        });
        console.log(`  - Demo user ensured: ${du.username} [${du.role}]`);
      }
    }

    console.log('✓ NetPulse Database seeding completed successfully.');
  } catch (err: any) {
    console.error('❌ Seeding failed:', err.message || err);
    throw err;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute directly if run as CLI script
seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
