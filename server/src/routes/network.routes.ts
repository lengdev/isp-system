import { Router } from 'express';
import { NetworkService } from '../services/network.service.js';
import { MikroTikService } from '../services/mikrotik.service.js';

const router = Router();

// GET /api/v1/routers
router.get('/routers', (_req, res) => {
  res.json(NetworkService.listRouters());
});

// GET /api/v1/routers/:id/metrics
router.get('/routers/:id/metrics', async (req, res) => {
  try {
    const metrics = await MikroTikService.getRouterMetrics(req.params.id);
    res.json(metrics);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

// POST /api/v1/routers/:id/test
router.post('/routers/:id/test', async (req, res) => {
  try {
    const test = await MikroTikService.testConnection(req.params.id);
    res.json(test);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/v1/routers/:id/reboot
router.post('/routers/:id/reboot', async (req, res) => {
  try {
    const result = await MikroTikService.rebootRouter(req.params.id);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/v1/network/pppoe
router.get('/pppoe', (_req, res) => {
  res.json(NetworkService.listPPPoEAccounts());
});

// GET /api/v1/network/vlans
router.get('/vlans', (_req, res) => {
  res.json(NetworkService.listVlans());
});

// POST /api/v1/network/vlans
router.post('/vlans', (req, res) => {
  try {
    const vlan = NetworkService.createVlan(req.body);
    res.status(201).json(vlan);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/v1/network/ipam/pools
router.get('/ipam/pools', (_req, res) => {
  res.json(NetworkService.listIpPools());
});

// POST /api/v1/network/ipam/allocate
router.post('/ipam/allocate', (req, res) => {
  try {
    const { poolId, customerId, isStatic } = req.body;
    const result = NetworkService.allocateIpAddress(poolId, customerId, isStatic);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
