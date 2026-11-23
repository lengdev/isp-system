import { Router } from 'express';
import { CustomerService } from '../services/customer.service.js';

const router = Router();

// GET /api/v1/customers
router.get('/', async (req, res) => {
  try {
    const filters = req.query;
    const customers = await CustomerService.listCustomers(filters);
    res.json(customers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/customers/:id
router.get('/:id', async (req, res) => {
  try {
    const profile = await CustomerService.getCustomerProfile(req.params.id);
    res.json(profile);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

// POST /api/v1/customers
router.post('/', async (req, res) => {
  try {
    const customer = await CustomerService.createCustomer(req.body);
    res.status(201).json(customer);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/v1/customers/:id
router.put('/:id', async (req, res) => {
  try {
    const updated = await CustomerService.updateCustomer(req.params.id, req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/v1/customers/:id
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await CustomerService.deleteCustomer(req.params.id);
    res.json({ message: 'Customer archived/deleted successfully', customer: deleted });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/v1/customers/:id/status
router.post('/:id/status', async (req, res) => {
  try {
    const { status, reason } = req.body;
    if (!status) return res.status(400).json({ error: 'Status is required' });
    const result = await CustomerService.setStatus(req.params.id, status, reason);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/v1/customers/:id/speedtest
router.post('/:id/speedtest', async (req, res) => {
  try {
    const result = await CustomerService.runSpeedTest(req.params.id);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
