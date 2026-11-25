import { Router } from 'express';
import { ProcurementService } from '../services/procurement.service.js';

const router = Router();

// GET /api/v1/purchasing/suppliers
router.get('/suppliers', async (_req, res) => {
  try {
    res.json(await ProcurementService.listSuppliers());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/purchasing/suppliers
router.post('/suppliers', async (req, res) => {
  try {
    const supplier = await ProcurementService.createSupplier(req.body);
    res.status(201).json(supplier);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/v1/purchasing/orders
router.get('/orders', async (_req, res) => {
  try {
    res.json(await ProcurementService.listPurchaseOrders());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/purchasing/orders
router.post('/orders', async (req, res) => {
  try {
    const po = await ProcurementService.createPurchaseOrder(req.body);
    res.status(201).json(po);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/v1/purchasing/orders/:id/receive
router.post('/orders/:id/receive', async (req, res) => {
  try {
    const { receivedBy } = req.body;
    const result = await ProcurementService.receiveGoods(String(req.params.id), receivedBy);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/v1/purchasing/suppliers/:id/pay
router.post('/suppliers/:id/pay', async (req, res) => {
  try {
    const { amount, paymentMethod, actor } = req.body;
    const result = await ProcurementService.paySupplier(String(req.params.id), Number(amount), paymentMethod, actor);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
