import { Router } from 'express';
import { NetworkService } from '../services/network.service.js';
import { MikroTikService } from '../services/mikrotik.service.js';

const router = Router();

// GET /api/v1/routers
router.get('/routers', async (_req, res) => {
  try {
    res.json(await NetworkService.listRouters());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/routers/:id/metrics
router.get('/routers/:id/metrics', async (req, res) => {
  try {
    const metrics = await MikroTikService.getRouterMetrics(String(req.params.id));
    res.json(metrics);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

// POST /api/v1/routers/:id/test
router.post('/routers/:id/test', async (req, res) => {
  try {
    const test = await MikroTikService.testConnection(String(req.params.id));
    res.json(test);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/v1/routers/:id/reboot
router.post('/routers/:id/reboot', async (req, res) => {
  try {
    const result = await MikroTikService.rebootRouter(String(req.params.id));
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/v1/network/pppoe
router.get('/pppoe', async (_req, res) => {
  try {
    res.json(await NetworkService.listPPPoEAccounts());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/network/vlans
router.get('/vlans', async (_req, res) => {
  try {
    res.json(await NetworkService.listVlans());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/network/vlans
router.post('/vlans', async (req, res) => {
  try {
    const vlan = await NetworkService.createVlan(req.body);
    res.status(201).json(vlan);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/v1/network/ipam/pools
router.get('/ipam/pools', async (_req, res) => {
  try {
    res.json(await NetworkService.listIpPools());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/network/ipam/allocate
router.post('/ipam/allocate', async (req, res) => {
  try {
    const { poolId, customerId, isStatic } = req.body;
    const result = await NetworkService.allocateIpAddress(poolId, customerId, isStatic);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
