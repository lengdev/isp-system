import { Router } from 'express';
import { InventoryService } from '../services/inventory.service.js';

const router = Router();

// GET /api/v1/inventory/products
router.get('/products', (req, res) => {
  const { category } = req.query;
  res.json(InventoryService.listProducts(category as string));
});

// POST /api/v1/inventory/products
router.post('/products', (req, res) => {
  try {
    const product = InventoryService.createProduct(req.body);
    res.status(201).json(product);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/v1/inventory/products/:id
router.put('/products/:id', (req, res) => {
  try {
    const updated = InventoryService.updateProduct(req.params.id, req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/v1/inventory/warehouses
router.get('/warehouses', (_req, res) => {
  res.json(InventoryService.listWarehouses());
});

// POST /api/v1/inventory/movements
router.post('/movements', (req, res) => {
  try {
    const result = InventoryService.recordMovement(req.body);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/v1/inventory/serials
router.get('/serials', (req, res) => {
  res.json(InventoryService.listSerialNumbers(req.query as any));
});

// POST /api/v1/inventory/serials/assign
router.post('/serials/assign', (req, res) => {
  try {
    const { serialNumber, customerId } = req.body;
    if (!serialNumber || !customerId) {
      return res.status(400).json({ error: 'serialNumber and customerId are required' });
    }
    const sn = InventoryService.assignSerialToCustomer(serialNumber, customerId);
    res.json(sn);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
