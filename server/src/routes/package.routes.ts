import { Router } from 'express';
import { prisma } from '../db/store.js';
import { Prisma } from '@prisma/client';

const router = Router();

const ACCOUNT_FIELDS = [
  'revenueAccountCode',
  'receivableAccountCode',
  'costAccountCode',
  'deferredRevenueAccountCode',
  'taxAccountCode',
] as const;

type PackageTierInput = {
  id?: string;
  label?: string;
  downloadSpeed?: number;
  speedMbps?: number;
  uploadSpeed?: number;
  uploadMbps?: number;
  price?: number;
  monthlyPrice?: number;
  costing?: number;
  cost?: number;
  durationDays?: number;
  durationLabel?: string;
  dataAllowanceGB?: number | null;
  dataCapGB?: number | null;
  description?: string | null;
  sortOrder?: number;
  isDefault?: boolean;
  isActive?: boolean;
};

function sanitizeAccountCode(val: unknown): string | null | undefined {
  if (val === undefined) return undefined;
  if (val === null) return null;
  const trimmed = String(val).trim();
  return trimmed ? trimmed : null;
}

function defaultDurationLabel(days: number): string {
  if (days === 30) return '30 Days';
  if (days === 90) return '3 Months';
  if (days === 180) return '6 Months';
  if (days === 365) return '1 Year';
  return `${days} Days`;
}

function normalizeTiersInput(
  rawTiers: PackageTierInput[] | undefined,
  fallback: {
    downloadSpeed: number;
    uploadSpeed: number;
    monthlyPrice: number;
    costing?: number;
    durationDays?: number;
    dataAllowanceGB: number | null;
    description: string;
  }
) {
  const source: PackageTierInput[] =
    Array.isArray(rawTiers) && rawTiers.length > 0
      ? rawTiers
      : [
          {
            label: `${fallback.downloadSpeed} Mbps`,
            downloadSpeed: fallback.downloadSpeed,
            uploadSpeed: fallback.uploadSpeed,
            price: fallback.monthlyPrice,
            costing: fallback.costing ?? 0,
            durationDays: fallback.durationDays ?? 30,
            dataAllowanceGB: fallback.dataAllowanceGB,
            description: fallback.description,
            isDefault: true,
            isActive: true,
          },
        ];

  const normalized = source.map((t, index) => {
    const downloadSpeed = Math.max(1, parseInt(String(t.downloadSpeed ?? t.speedMbps ?? fallback.downloadSpeed), 10) || 100);
    const uploadSpeed = Math.max(
      1,
      parseInt(String(t.uploadSpeed ?? t.uploadMbps ?? Math.max(10, Math.round(downloadSpeed / 2))), 10) || 50
    );
    const priceNum = Number(t.price ?? t.monthlyPrice ?? fallback.monthlyPrice);
    const price = Number.isFinite(priceNum) && priceNum >= 0 ? Math.round(priceNum * 100) / 100 : 0;
    const costNum = Number(t.costing ?? t.cost ?? 0);
    const costing = Number.isFinite(costNum) && costNum >= 0 ? Math.round(costNum * 100) / 100 : 0;
    const durationDays = Math.max(1, parseInt(String(t.durationDays ?? 30), 10) || 30);
    const durationLabel = String(t.durationLabel || '').trim() || defaultDurationLabel(durationDays);
    const rawCap = t.dataCapGB !== undefined ? t.dataCapGB : t.dataAllowanceGB;
    const dataAllowanceGB =
      rawCap === null || rawCap === undefined || (rawCap as any) === ''
        ? null
        : Math.max(0, parseInt(String(rawCap), 10) || 0) || null;
    const label = String(t.label || '').trim() || `${downloadSpeed} Mbps`;
    const description = String(t.description || '').trim() || null;

    return {
      id: t.id ? String(t.id) : undefined,
      label,
      downloadSpeed,
      uploadSpeed,
      price,
      costing,
      durationDays,
      durationLabel,
      dataAllowanceGB,
      description,
      sortOrder: typeof t.sortOrder === 'number' ? t.sortOrder : index,
      isDefault: Boolean(t.isDefault),
      isActive: t.isActive !== undefined ? Boolean(t.isActive) : true,
    };
  });

  if (!normalized.some((t) => t.isDefault) && normalized.length > 0) {
    normalized[0].isDefault = true;
  } else {
    let seenDefault = false;
    for (const tier of normalized) {
      if (tier.isDefault) {
        if (seenDefault) tier.isDefault = false;
        else seenDefault = true;
      }
    }
  }

  return normalized;
}

async function validateAccountCodes(tx: Prisma.TransactionClient, codes: Record<string, string | null | undefined>) {
  const uniqueCodes = Array.from(
    new Set(
      Object.values(codes).filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    )
  );
  if (uniqueCodes.length === 0) return;

  const accounts = await tx.account.findMany({
    where: { code: { in: uniqueCodes } },
    select: { code: true },
  });
  const found = new Set(accounts.map((a) => a.code));
  const missing = uniqueCodes.filter((code) => !found.has(code));
  if (missing.length > 0) {
    throw new Error(`Invalid accounting code(s): ${missing.join(', ')}`);
  }
}

function formatPackage(pkg: any) {
  const subscribersCount = pkg.subscriptions?.length ?? 0;
  const tiers = (pkg.bandwidthTiers || [])
    .slice()
    .sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.downloadSpeed - b.downloadSpeed)
    .map((t: any) => ({
      id: t.id,
      packageId: t.packageId,
      label: t.label || `${t.downloadSpeed} Mbps`,
      downloadSpeed: t.downloadSpeed,
      uploadSpeed: t.uploadSpeed,
      speedMbps: t.downloadSpeed,
      uploadMbps: t.uploadSpeed,
      price: Number(t.price),
      costing: Number(t.costing ?? 0),
      durationDays: t.durationDays ?? 30,
      durationLabel: t.durationLabel || defaultDurationLabel(t.durationDays ?? 30),
      dataAllowanceGB: t.dataAllowanceGB ?? null,
      dataCapGB: t.dataAllowanceGB ?? null,
      description: t.description || '',
      sortOrder: t.sortOrder ?? 0,
      isDefault: Boolean(t.isDefault),
      isActive: Boolean(t.isActive),
    }));

  const defaultTier = tiers.find((t: any) => t.isDefault) || tiers[0];

  return {
    id: pkg.id,
    name: pkg.name,
    technology: pkg.technology,
    type: pkg.technology === 'FIBER' ? 'Fiber' : pkg.technology === 'WIRELESS' ? 'Wireless' : 'DSL',
    downloadSpeed: defaultTier ? defaultTier.downloadSpeed : pkg.downloadSpeed,
    uploadSpeed: defaultTier ? defaultTier.uploadSpeed : pkg.uploadSpeed,
    speedMbps: defaultTier ? defaultTier.downloadSpeed : pkg.downloadSpeed,
    uploadMbps: defaultTier ? defaultTier.uploadSpeed : pkg.uploadSpeed,
    monthlyPrice: defaultTier ? defaultTier.price : Number(pkg.monthlyPrice),
    costing: defaultTier ? defaultTier.costing : 0,
    durationDays: defaultTier ? defaultTier.durationDays : 30,
    installationFee: Number(pkg.installationFee),
    dataAllowanceGB: defaultTier ? defaultTier.dataAllowanceGB : pkg.dataAllowanceGB,
    dataCapGB: defaultTier ? defaultTier.dataCapGB : pkg.dataAllowanceGB,
    pppoeProfileName: pkg.pppoeProfileName,
    description: pkg.description || '',
    isPopular: pkg.isPopular,
    isActive: pkg.isActive,
    revenueAccountCode: pkg.revenueAccountCode || null,
    receivableAccountCode: pkg.receivableAccountCode || null,
    costAccountCode: pkg.costAccountCode || null,
    deferredRevenueAccountCode: pkg.deferredRevenueAccountCode || null,
    taxAccountCode: pkg.taxAccountCode || null,
    bandwidthTiers: tiers,
    subscribersCount,
    createdAt: pkg.createdAt.toISOString(),
    updatedAt: pkg.updatedAt.toISOString(),
  };
}

// GET /api/v1/packages
router.get('/', async (_req, res) => {
  try {
    const packages = await prisma.package.findMany({
      include: {
        subscriptions: true,
        bandwidthTiers: {
          orderBy: [{ sortOrder: 'asc' }, { downloadSpeed: 'asc' }],
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json(packages.map(formatPackage));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/packages
router.post('/', async (req, res) => {
  try {
    const data = req.body || {};
    const name = String(data.name || '').trim();
    if (!name) {
      return res.status(400).json({ error: 'Package name is required.' });
    }

    const technology = String(data.technology || data.type || 'FIBER').toUpperCase();
    const fallbackDown = Number(data.downloadSpeed || data.speedMbps) || 100;
    const fallbackUp = Number(data.uploadSpeed || data.uploadMbps) || 50;
    const fallbackPrice = Number(data.monthlyPrice) || 35.0;
    const installationFee = Number(data.installationFee) || 0.0;
    const fallbackDataCap =
      data.dataCapGB !== undefined ? data.dataCapGB : data.dataAllowanceGB ?? null;
    const pppoeProfileName = `profile-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    const description = String(data.description || '').trim();
    const isPopular = Boolean(data.isPopular);

    const tiers = normalizeTiersInput(data.bandwidthTiers, {
      downloadSpeed: fallbackDown,
      uploadSpeed: fallbackUp,
      monthlyPrice: fallbackPrice,
      costing: Number(data.costing) || 0,
      durationDays: Number(data.durationDays) || 30,
      dataAllowanceGB: fallbackDataCap,
      description,
    });
    const defaultTier = tiers.find((t) => t.isDefault) || tiers[0];

    const accountCodes: Record<string, string | null | undefined> = {};
    for (const field of ACCOUNT_FIELDS) {
      const sanitized = sanitizeAccountCode(data[field]);
      if (sanitized !== undefined) accountCodes[field] = sanitized;
    }

    const defaultRevenue = technology === 'WIRELESS' ? '4020' : '4010';

    const newPkg = await prisma.$transaction(async (tx) => {
      await validateAccountCodes(tx, accountCodes);

      const created = await tx.package.create({
        data: {
          name,
          technology: technology as any,
          downloadSpeed: defaultTier.downloadSpeed,
          uploadSpeed: defaultTier.uploadSpeed,
          monthlyPrice: new Prisma.Decimal(defaultTier.price),
          installationFee: new Prisma.Decimal(installationFee),
          dataAllowanceGB: defaultTier.dataAllowanceGB,
          pppoeProfileName,
          description,
          isPopular,
          isActive: true,
          revenueAccountCode: accountCodes.revenueAccountCode ?? defaultRevenue,
          receivableAccountCode: accountCodes.receivableAccountCode ?? '1100',
          costAccountCode: accountCodes.costAccountCode ?? '5100',
          deferredRevenueAccountCode: accountCodes.deferredRevenueAccountCode ?? null,
          taxAccountCode: accountCodes.taxAccountCode ?? '2200',
          bandwidthTiers: {
            create: tiers.map((t) => ({
              label: t.label,
              downloadSpeed: t.downloadSpeed,
              uploadSpeed: t.uploadSpeed,
              price: new Prisma.Decimal(t.price),
              costing: new Prisma.Decimal(t.costing),
              durationDays: t.durationDays,
              durationLabel: t.durationLabel,
              dataAllowanceGB: t.dataAllowanceGB,
              description: t.description,
              sortOrder: t.sortOrder,
              isDefault: t.isDefault,
              isActive: t.isActive,
            })),
          },
        },
        include: {
          subscriptions: true,
          bandwidthTiers: {
            orderBy: [{ sortOrder: 'asc' }, { downloadSpeed: 'asc' }],
          },
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'CREATE_PACKAGE',
          resource: 'Package',
          resourceId: created.id,
          details: `Created package ${created.name} with ${created.bandwidthTiers.length} bandwidth tier(s)`,
          ipAddress: '127.0.0.1',
        },
      });

      return created;
    });

    res.status(201).json(formatPackage(newPkg));
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/v1/packages/:id
router.put('/:id', async (req, res) => {
  try {
    const pkgId = String(req.params.id);
    const data = req.body || {};

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.package.findUnique({
        where: { id: pkgId },
        include: { bandwidthTiers: true },
      });
      if (!existing) {
        throw new Error('Package not found');
      }

      const accountCodes: Record<string, string | null | undefined> = {};
      for (const field of ACCOUNT_FIELDS) {
        const sanitized = sanitizeAccountCode(data[field]);
        if (sanitized !== undefined) accountCodes[field] = sanitized;
      }
      await validateAccountCodes(tx, accountCodes);

      const updateData: any = {};
      if (data.name !== undefined) updateData.name = String(data.name).trim();
      if (data.technology !== undefined || data.type !== undefined) {
        updateData.technology = String(data.technology || data.type).toUpperCase();
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

      for (const field of ACCOUNT_FIELDS) {
        if (accountCodes[field] !== undefined) {
          updateData[field] = accountCodes[field];
        }
      }

      if (Array.isArray(data.bandwidthTiers) && data.bandwidthTiers.length > 0) {
        const tiers = normalizeTiersInput(data.bandwidthTiers, {
          downloadSpeed: Number(updateData.downloadSpeed ?? existing.downloadSpeed),
          uploadSpeed: Number(updateData.uploadSpeed ?? existing.uploadSpeed),
          monthlyPrice: Number(updateData.monthlyPrice ?? existing.monthlyPrice),
          dataAllowanceGB:
            updateData.dataAllowanceGB !== undefined ? updateData.dataAllowanceGB : existing.dataAllowanceGB,
          description: String(updateData.description ?? existing.description ?? ''),
        });

        const existingTierIds = new Set(existing.bandwidthTiers.map((t) => t.id));
        const keptIds: string[] = [];

        for (const t of tiers) {
          if (t.id && existingTierIds.has(t.id)) {
            keptIds.push(t.id);
            await tx.packageBandwidthTier.update({
              where: { id: t.id },
              data: {
                label: t.label,
                downloadSpeed: t.downloadSpeed,
                uploadSpeed: t.uploadSpeed,
                price: new Prisma.Decimal(t.price),
                costing: new Prisma.Decimal(t.costing),
                durationDays: t.durationDays,
                durationLabel: t.durationLabel,
                dataAllowanceGB: t.dataAllowanceGB,
                description: t.description,
                sortOrder: t.sortOrder,
                isDefault: t.isDefault,
                isActive: t.isActive,
              },
            });
          } else {
            const createdTier = await tx.packageBandwidthTier.create({
              data: {
                packageId: existing.id,
                label: t.label,
                downloadSpeed: t.downloadSpeed,
                uploadSpeed: t.uploadSpeed,
                price: new Prisma.Decimal(t.price),
                costing: new Prisma.Decimal(t.costing),
                durationDays: t.durationDays,
                durationLabel: t.durationLabel,
                dataAllowanceGB: t.dataAllowanceGB,
                description: t.description,
                sortOrder: t.sortOrder,
                isDefault: t.isDefault,
                isActive: t.isActive,
              },
            });
            keptIds.push(createdTier.id);
          }
        }

        const toDeleteIds = existing.bandwidthTiers
          .map((t) => t.id)
          .filter((id) => !keptIds.includes(id));

        if (toDeleteIds.length > 0) {
          await tx.packageBandwidthTier.deleteMany({
            where: { id: { in: toDeleteIds }, packageId: existing.id },
          });
        }

        const defaultTier = tiers.find((t) => t.isDefault) || tiers[0];
        updateData.downloadSpeed = defaultTier.downloadSpeed;
        updateData.uploadSpeed = defaultTier.uploadSpeed;
        updateData.monthlyPrice = new Prisma.Decimal(defaultTier.price);
        updateData.dataAllowanceGB = defaultTier.dataAllowanceGB;
      }

      const resPkg = await tx.package.update({
        where: { id: pkgId },
        data: updateData,
        include: {
          subscriptions: true,
          bandwidthTiers: {
            orderBy: [{ sortOrder: 'asc' }, { downloadSpeed: 'asc' }],
          },
        },
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

    res.json(formatPackage(updated));
  } catch (err: any) {
    const status = err.message === 'Package not found' ? 404 : 400;
    res.status(status).json({ error: 'Package not found or update error: ' + err.message });
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
