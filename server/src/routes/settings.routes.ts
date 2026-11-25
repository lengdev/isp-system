import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma, logAudit } from '../db/store.js';
import { authorize } from '../middleware/auth.middleware.js';

const router = Router();

function formatCompanySetting(s: any) {
  return {
    ...s,
    taxRatePercent: Number(s.taxRatePercent),
    updatedAt: s.updatedAt.toISOString(),
  };
}

// GET /api/v1/settings/company
router.get('/company', async (_req, res) => {
  try {
    let settings = await prisma.companySetting.findFirst();
    if (!settings) {
      settings = await prisma.companySetting.create({ data: {} });
    }
    res.json(formatCompanySetting(settings));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/v1/settings/company
router.put('/company', async (req, res) => {
  try {
    const body = req.body || {};
    const existing = await prisma.companySetting.findFirst();

    const updateData: any = {};
    if (body.companyName !== undefined) updateData.companyName = body.companyName;
    if (body.companyAddress !== undefined) updateData.companyAddress = body.companyAddress;
    if (body.supportPhone !== undefined) updateData.supportPhone = body.supportPhone;
    if (body.supportEmail !== undefined) updateData.supportEmail = body.supportEmail;
    if (body.currency !== undefined) updateData.currency = body.currency;
    if (body.timezone !== undefined) updateData.timezone = body.timezone;
    if (body.invoicePrefix !== undefined) updateData.invoicePrefix = body.invoicePrefix;
    if (body.customerPrefix !== undefined) updateData.customerPrefix = body.customerPrefix;
    if (body.taxRatePercent !== undefined) updateData.taxRatePercent = new Prisma.Decimal(body.taxRatePercent);
    if (body.gracePeriodDays !== undefined) updateData.gracePeriodDays = Number(body.gracePeriodDays);
    if (body.language !== undefined) updateData.language = body.language;

    const updated = existing
      ? await prisma.companySetting.update({ where: { id: existing.id }, data: updateData })
      : await prisma.companySetting.create({ data: updateData });

    await logAudit('UPDATE_SETTINGS', 'CompanySetting', updated.id, 'Updated company profile and settings');
    res.json(formatCompanySetting(updated));
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/v1/settings/audit-logs
router.get('/audit-logs', authorize('audit.view'), async (req, res) => {
  try {
    const actorId = typeof req.query.actorId === 'string' ? req.query.actorId.trim() : '';
    const actor = typeof req.query.actor === 'string' ? req.query.actor.trim() : '';
    const where: any = {};

    if (actorId) {
      const user = await prisma.user.findUnique({
        where: { id: actorId },
        select: { id: true, username: true, email: true },
      });
      if (user) {
        where.OR = [
          { userId: user.id },
          { userEmail: user.username },
          { userEmail: user.email },
          { AND: [{ resource: 'User' }, { resourceId: user.id }] },
        ];
      } else {
        where.userId = actorId;
      }
    } else if (actor) {
      where.userEmail = { equals: actor, mode: 'insensitive' };
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 250,
    });
    res.json(
      logs.map((log) => ({
        ...log,
        actor: log.userEmail || 'system',
        performedBy: log.userEmail || 'system',
        clientIp: log.ipAddress || log.ip || '127.0.0.1',
        timestamp: log.createdAt.toISOString(),
        createdAt: log.createdAt.toISOString(),
      }))
    );
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/settings/notifications
router.get('/notifications', async (_req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(
      notifications.map((n) => ({
        ...n,
        createdAt: n.createdAt.toISOString(),
      }))
    );
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/v1/settings/notifications/:id/read
router.put('/notifications/:id/read', async (req, res) => {
  try {
    await prisma.notification.update({
      where: { id: String(req.params.id) },
      data: { read: true },
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(404).json({ error: 'Notification not found' });
  }
});

export default router;
