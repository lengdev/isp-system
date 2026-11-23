import { Router } from 'express';
import { ProcurementService } from '../services/procurement.service.js';

const router = Router();

// GET /api/v1/purchasing/suppliers
router.get('/suppliers', (_req, res) => {
  res.json(ProcurementService.listSuppliers());
});

// POST /api/v1/purchasing/suppliers
router.post('/suppliers', (req, res) => {
  try {
    const supplier = ProcurementService.createSupplier(req.body);
    res.status(201).json(supplier);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/v1/purchasing/orders
router.get('/orders', (_req, res) => {
  res.json(ProcurementService.listPurchaseOrders());
});

// POST /api/v1/purchasing/orders
router.post('/orders', (req, res) => {
  try {
    const po = ProcurementService.createPurchaseOrder(req.body);
    res.status(201).json(po);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/v1/purchasing/orders/:id/receive
router.post('/orders/:id/receive', (req, res) => {
  try {
    const { receivedBy } = req.body;
    const result = ProcurementService.receiveGoods(req.params.id, receivedBy);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/v1/purchasing/suppliers/:id/pay
router.post('/suppliers/:id/pay', (req, res) => {
  try {
    const { amount, paymentMethod, actor } = req.body;
    const result = ProcurementService.paySupplier(req.params.id, Number(amount), paymentMethod, actor);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
