import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

export async function initDatabaseConnection(): Promise<void> {
  await prisma.$connect();
  await prisma.$queryRaw`SELECT 1`;
  console.log('✓ Successfully connected to PostgreSQL via Prisma ORM');
}

export async function logAudit(
  action: string,
  resource: string,
  resourceId: string | null,
  details: string,
  actor: string = 'system',
  ipAddress: string = '127.0.0.1',
  userId?: string | null
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        resource,
        resourceId: resourceId ? String(resourceId) : null,
        details,
        userEmail: actor,
        userId: userId || null,
        ipAddress,
        ip: ipAddress,
      },
    });
  } catch (err: any) {
    console.error('[AuditLog Error]:', err?.message || err);
  }
}
