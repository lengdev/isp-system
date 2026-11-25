#!/usr/bin/env node
import { PrismaClient, UserRoleType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { RbacService } from '../dist-server/services/rbac.service.js';

dotenv.config();

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

const BCRYPT_SALT_ROUNDS = 12;

export async function seed() {
  console.log('🌱 Starting NSMISP Prisma database seed...');

  try {
    await prisma.$connect();

    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@nsmisp.net';
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
          email: 'noc@nsmisp.net',
          fullName: 'Vireak Chan',
          role: UserRoleType.NETWORK_ENGINEER,
          password: 'Password123!',
        },
        {
          username: 'cashier',
          email: 'cashier@nsmisp.net',
          fullName: 'Bopha Pich',
          role: UserRoleType.BILLING_CASHIER,
          password: 'Password123!',
        },
        {
          username: 'tech',
          email: 'tech@nsmisp.net',
          fullName: 'Marcus Vance',
          role: UserRoleType.FIELD_TECHNICIAN,
          password: 'Password123!',
        },
        {
          username: 'support',
          email: 'support@nsmisp.net',
          fullName: 'Sokunthea Keo',
          role: UserRoleType.SUPPORT_AGENT,
          password: 'Password123!',
        },
        {
          username: 'accountant',
          email: 'finance@nsmisp.net',
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

    // Seed or update default CompanySetting branding without overwriting custom org profiles
    const existingCompanySetting = await prisma.companySetting.findFirst();
    if (!existingCompanySetting) {
      await prisma.companySetting.create({
        data: {
          companyName: 'NSMISP High-Speed Broadband LLC',
          supportEmail: 'support@nsmisp.net',
        },
      });
    } else if (
      existingCompanySetting.companyName.includes('NetPulse') ||
      existingCompanySetting.supportEmail === 'support@netpulse.net'
    ) {
      await prisma.companySetting.update({
        where: { id: existingCompanySetting.id },
        data: {
          companyName: existingCompanySetting.companyName.replace(/NetPulse/gi, 'NSMISP'),
          supportEmail:
            existingCompanySetting.supportEmail === 'support@netpulse.net'
              ? 'support@nsmisp.net'
              : existingCompanySetting.supportEmail,
        },
      });
    }

    // Seed RBAC Permissions, Roles, and Role-Permissions Matrix
    console.log('🌱 Seeding RBAC Permissions and Roles matrix...');
    await RbacService.seedRbac();
    console.log('✓ RBAC Permissions and Roles matrix seeded successfully.');

    console.log('✓ NSMISP Database seeding completed successfully.');
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
