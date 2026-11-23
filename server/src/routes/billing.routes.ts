import { Router } from 'express';
import { BillingService } from '../services/billing.service.js';

const router = Router();

// GET /api/v1/invoices
router.get('/', (req, res) => {
  try {
    const invoices = BillingService.listInvoices(req.query as any);
    res.json(invoices);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/invoices
router.post('/', (req, res) => {
  try {
    const invoice = BillingService.generateInvoice(req.body);
    res.status(201).json(invoice);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/v1/invoices/:id/pay
router.put('/:id/pay', (req, res) => {
  try {
    const { paymentMethod } = req.body;
    const inv = BillingService.markAsPaid(req.params.id, paymentMethod || 'CASH');
    res.json(inv);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
