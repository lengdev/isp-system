import { Router } from 'express';
import { z } from 'zod';
import { CustomerService } from '../services/customer.service.js';
import { authenticate, requireFeature, validateBody } from '../middleware/auth.middleware.js';
import { normalizeNameInput } from '../utils/bilingualName.js';

const router = Router();

const nullableNormalizedName = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((val) => (val === undefined ? undefined : normalizeNameInput(val)));

const createCustomerSchema = z
  .object({
    nameKm: nullableNormalizedName,
    nameEn: nullableNormalizedName,
    fullName: nullableNormalizedName,
    email: z.string().trim().email('Please enter a valid email address'),
    phone: z.string().trim().optional(),
  })
  .passthrough()
  .superRefine((data, ctx) => {
    const hasName = Boolean(data.nameKm || data.nameEn || data.fullName);
    if (!hasName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least one customer name (Khmer name or Latin name) is required.',
        path: ['nameEn'],
      });
    }
  });

const updateCustomerSchema = z
  .object({
    nameKm: nullableNormalizedName,
    nameEn: nullableNormalizedName,
    fullName: nullableNormalizedName,
    email: z.string().trim().email('Please enter a valid email address').optional(),
  })
  .passthrough()
  .superRefine((data, ctx) => {
    const touchedBoth = data.nameKm !== undefined && data.nameEn !== undefined;
    if (touchedBoth && !data.nameKm && !data.nameEn && !data.fullName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least one customer name (Khmer name or Latin name) is required.',
        path: ['nameEn'],
      });
    }
  });

// GET /api/v1/customers
router.get('/', authenticate, requireFeature('page.customers'), async (req, res) => {
  try {
    const filters = req.query;
    const customers = await CustomerService.listCustomers(filters);
    res.json(customers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/customers/:id
router.get('/:id', authenticate, requireFeature('page.customers'), async (req, res) => {
  try {
    const profile = await CustomerService.getCustomerProfile(String(req.params.id));
    res.json(profile);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

// POST /api/v1/customers
router.post('/', authenticate, requireFeature('customers.btn.create'), validateBody(createCustomerSchema), async (req, res) => {
  try {
    const customer = await CustomerService.createCustomer(req.body);
    res.status(201).json(customer);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/v1/customers/:id
router.put('/:id', authenticate, requireFeature('customers.btn.edit'), validateBody(updateCustomerSchema), async (req, res) => {
  try {
    const updated = await CustomerService.updateCustomer(String(req.params.id), req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/v1/customers/:id
router.delete('/:id', authenticate, requireFeature('customers.btn.delete'), async (req, res) => {
  try {
    const deleted = await CustomerService.deleteCustomer(String(req.params.id));
    res.json({ message: 'Customer archived/deleted successfully', customer: deleted });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/v1/customers/:id/status
router.post('/:id/status', authenticate, requireFeature('customers.btn.edit'), async (req, res) => {
  try {
    const { status, reason } = req.body;
    if (!status) return res.status(400).json({ error: 'Status is required' });
    const result = await CustomerService.setStatus(String(req.params.id), status, reason);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/v1/customers/:id/speedtest
router.post('/:id/speedtest', authenticate, requireFeature('page.customers'), async (req, res) => {
  try {
    const result = await CustomerService.runSpeedTest(String(req.params.id));
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
