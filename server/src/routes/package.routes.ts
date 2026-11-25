import { Router } from 'express';
import { prisma } from '../db/store.js';
import { Prisma } from '@prisma/client';

const router = Router();

// GET /api/v1/packages
router.get('/', async (_req, res) => {
  try {
    const packages = await prisma.package.findMany({
      include: {
        subscriptions: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const packagesWithSubCount = packages.map((pkg) => {
      const subscribersCount = pkg.subscriptions.length;
      return {
        id: pkg.id,
        name: pkg.name,
        technology: pkg.technology,
        type: pkg.technology === 'FIBER' ? 'Fiber' : pkg.technology === 'WIRELESS' ? 'Wireless' : 'DSL',
        downloadSpeed: pkg.downloadSpeed,
        uploadSpeed: pkg.uploadSpeed,
        speedMbps: pkg.downloadSpeed,
        uploadMbps: pkg.uploadSpeed,
        monthlyPrice: Number(pkg.monthlyPrice),
        installationFee: Number(pkg.installationFee),
        dataAllowanceGB: pkg.dataAllowanceGB,
        dataCapGB: pkg.dataAllowanceGB,
        pppoeProfileName: pkg.pppoeProfileName,
        description: pkg.description || '',
        isPopular: pkg.isPopular,
        isActive: pkg.isActive,
        subscribersCount,
        createdAt: pkg.createdAt.toISOString(),
        updatedAt: pkg.updatedAt.toISOString(),
      };
    });

    res.json(packagesWithSubCount);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/packages
router.post('/', async (req, res) => {
  try {
    const data = req.body;
    const name = data.name;
    const technology = (data.technology || data.type || 'FIBER').toUpperCase();
    const downloadSpeed = Number(data.downloadSpeed || data.speedMbps) || 100;
    const uploadSpeed = Number(data.uploadSpeed || data.uploadMbps) || 50;
    const monthlyPrice = Number(data.monthlyPrice) || 35.0;
    const installationFee = Number(data.installationFee) || 0.0;
    const dataAllowanceGB = data.dataCapGB !== undefined ? data.dataCapGB : data.dataAllowanceGB || null;
    const pppoeProfileName = `profile-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    const description = data.description || '';
    const isPopular = Boolean(data.isPopular);

    const newPkg = await prisma.$transaction(async (tx) => {
      const created = await tx.package.create({
        data: {
          name,
          technology: technology as any,
          downloadSpeed,
          uploadSpeed,
          monthlyPrice: new Prisma.Decimal(monthlyPrice),
          installationFee: new Prisma.Decimal(installationFee),
          dataAllowanceGB,
          pppoeProfileName,
          description,
          isPopular,
          isActive: true,
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'CREATE_PACKAGE',
          resource: 'Package',
          resourceId: created.id,
          details: `Created package ${created.name}`,
          ipAddress: '127.0.0.1',
        },
      });

      return created;
    });

    const formatted = {
      id: newPkg.id,
      name: newPkg.name,
      technology: newPkg.technology,
      type: newPkg.technology === 'FIBER' ? 'Fiber' : newPkg.technology === 'WIRELESS' ? 'Wireless' : 'DSL',
      downloadSpeed: newPkg.downloadSpeed,
      uploadSpeed: newPkg.uploadSpeed,
      speedMbps: newPkg.downloadSpeed,
      uploadMbps: newPkg.uploadSpeed,
      monthlyPrice: Number(newPkg.monthlyPrice),
      installationFee: Number(newPkg.installationFee),
      dataAllowanceGB: newPkg.dataAllowanceGB,
      dataCapGB: newPkg.dataAllowanceGB,
      pppoeProfileName: newPkg.pppoeProfileName,
      description: newPkg.description || '',
      isPopular: newPkg.isPopular,
      isActive: newPkg.isActive,
      subscribersCount: 0,
      createdAt: newPkg.createdAt.toISOString(),
      updatedAt: newPkg.updatedAt.toISOString(),
    };

    res.status(201).json(formatted);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/v1/packages/:id
router.put('/:id', async (req, res) => {
  try {
    const data = req.body;
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.technology !== undefined || data.type !== undefined) {
      updateData.technology = (data.technology || data.type).toUpperCase();
    }
    if (data.downloadSpeed !== undefined || data.speedMbps !== undefined) {
      updateData.downloadSpeed = Number(data.downloadSpeed || data.speedMbps);
    }
    if (data.uploadSpeed !== undefined || data.uploadMbps !== undefined) {
      updateData.uploadSpeed = Number(data.uploadSpeed || data.uploadMbps);
    }
    if (data.monthlyPrice !== undefined) {
      updateData.monthlyPrice = new Prisma.Decimal(data.monthlyPrice);
    }
    if (data.installationFee !== undefined) {
      updateData.installationFee = new Prisma.Decimal(data.installationFee);
    }
    if (data.dataAllowanceGB !== undefined || data.dataCapGB !== undefined) {
      updateData.dataAllowanceGB = data.dataCapGB !== undefined ? data.dataCapGB : data.dataAllowanceGB;
    }
    if (data.description !== undefined) updateData.description = data.description;
    if (data.isPopular !== undefined) updateData.isPopular = Boolean(data.isPopular);
    if (data.isActive !== undefined) updateData.isActive = Boolean(data.isActive);

    const updated = await prisma.$transaction(async (tx) => {
      const resPkg = await tx.package.update({
        where: { id: String(req.params.id) },
        data: updateData,
      });

      await tx.auditLog.create({
        data: {
          action: 'UPDATE_PACKAGE',
          resource: 'Package',
          resourceId: resPkg.id,
          details: `Updated package ${resPkg.name}`,
          ipAddress: '127.0.0.1',
        },
      });

      return resPkg;
    });

    const formatted = {
      ...updated,
      monthlyPrice: Number(updated.monthlyPrice),
      installationFee: Number(updated.installationFee),
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };

    res.json(formatted);
  } catch (err: any) {
    res.status(404).json({ error: 'Package not found or update error: ' + err.message });
  }
});

// DELETE /api/v1/packages/:id
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await prisma.$transaction(async (tx) => {
      const resPkg = await tx.package.delete({
        where: { id: String(req.params.id) },
      });

      await tx.auditLog.create({
        data: {
          action: 'DELETE_PACKAGE',
          resource: 'Package',
          resourceId: resPkg.id,
          details: `Archived package ${resPkg.name}`,
          ipAddress: '127.0.0.1',
        },
      });

      return resPkg;
    });

    res.json({ message: 'Package archived successfully', package: deleted });
  } catch (err: any) {
    res.status(404).json({ error: 'Package not found or delete error: ' + err.message });
  }
});

export default router;
