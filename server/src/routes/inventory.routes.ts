import { Router } from 'express';
import { InventoryService } from '../services/inventory.service.js';

const router = Router();

// GET /api/v1/inventory/products
router.get('/products', async (req, res) => {
  try {
    const { category } = req.query;
    res.json(await InventoryService.listProducts(category as string));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/inventory/products
router.post('/products', async (req, res) => {
  try {
    const product = await InventoryService.createProduct(req.body);
    res.status(201).json(product);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/v1/inventory/products/:id
router.put('/products/:id', async (req, res) => {
  try {
    const updated = await InventoryService.updateProduct(String(req.params.id), req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/v1/inventory/warehouses
router.get('/warehouses', async (_req, res) => {
  try {
    res.json(await InventoryService.listWarehouses());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/inventory/movements
router.post('/movements', async (req, res) => {
  try {
    const result = await InventoryService.recordMovement(req.body);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/v1/inventory/serials
router.get('/serials', async (req, res) => {
  try {
    res.json(await InventoryService.listSerialNumbers(req.query as any));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/inventory/serials/assign
router.post('/serials/assign', async (req, res) => {
  try {
    const { serialNumber, customerId } = req.body;
    if (!serialNumber || !customerId) {
      return res.status(400).json({ error: 'serialNumber and customerId are required' });
    }
    const sn = await InventoryService.assignSerialToCustomer(serialNumber, customerId);
    res.json(sn);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
