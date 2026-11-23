import { Router } from 'express';
import { dbStore } from '../db/store.js';

const router = Router();

// GET /api/v1/packages
router.get('/', (_req, res) => {
  const packagesWithSubCount = dbStore.packages.map((pkg) => {
    const subscribersCount = dbStore.customers.filter((c) => c.planName === pkg.name).length;
    return {
      ...pkg,
      subscribersCount,
      speedMbps: pkg.downloadSpeed,
      uploadMbps: pkg.uploadSpeed,
      dataCapGB: pkg.dataAllowanceGB,
      type: pkg.technology === 'FIBER' ? 'Fiber' : pkg.technology === 'WIRELESS' ? 'Wireless' : 'DSL',
    };
  });
  res.json(packagesWithSubCount);
});

// POST /api/v1/packages
router.post('/', (req, res) => {
  try {
    const data = req.body;
    const newPkg = {
      id: `pkg-${Date.now()}`,
      name: data.name,
      technology: (data.technology || data.type || 'FIBER').toUpperCase(),
      downloadSpeed: Number(data.downloadSpeed || data.speedMbps) || 100,
      uploadSpeed: Number(data.uploadSpeed || data.uploadMbps) || 50,
      monthlyPrice: Number(data.monthlyPrice) || 35.0,
      installationFee: Number(data.installationFee) || 0.0,
      dataAllowanceGB: data.dataCapGB || null,
      pppoeProfileName: `profile-${data.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      description: data.description || '',
      isPopular: Boolean(data.isPopular),
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    dbStore.packages.push(newPkg as any);
    dbStore.logAudit('CREATE_PACKAGE', 'Package', newPkg.id, `Created package ${newPkg.name}`);
    res.status(201).json(newPkg);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/v1/packages/:id
router.put('/:id', (req, res) => {
  const pkg = dbStore.packages.find((p) => p.id === req.params.id);
  if (!pkg) return res.status(404).json({ error: 'Package not found' });

  Object.assign(pkg, req.body);
  (pkg as any).updatedAt = new Date().toISOString();
  dbStore.logAudit('UPDATE_PACKAGE', 'Package', pkg.id, `Updated package ${pkg.name}`);
  res.json(pkg);
});

// DELETE /api/v1/packages/:id
router.delete('/:id', (req, res) => {
  const idx = dbStore.packages.findIndex((p) => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Package not found' });

  const [deleted] = dbStore.packages.splice(idx, 1);
  dbStore.logAudit('DELETE_PACKAGE', 'Package', deleted.id, `Archived package ${deleted.name}`);
  res.json({ message: 'Package archived successfully', package: deleted });
});

export default router;
