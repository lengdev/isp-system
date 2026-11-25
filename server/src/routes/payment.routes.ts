import { Router } from 'express';
import { PaymentService } from '../services/payment.service.js';

const router = Router();

// GET /api/v1/payments
router.get('/', async (req, res) => {
  try {
    if (req.query.paged === '1' || req.query.paged === 'true') {
      res.json(await PaymentService.listPaymentsPaged(req.query as any));
      return;
    }
    const { customerId } = req.query;
    res.json(await PaymentService.listPayments(customerId as string));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/payments/record
router.post('/record', async (req, res) => {
  try {
    const result = await PaymentService.recordPayment(req.body);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/v1/payments/khqr
router.post('/khqr', async (req, res) => {
  try {
    const { customerId, amount } = req.body;
    if (!customerId || !amount) {
      return res.status(400).json({ error: 'customerId and amount are required' });
    }
    const khqr = await PaymentService.generateKHQRPayload(customerId, Number(amount));
    res.json(khqr);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
