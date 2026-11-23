import { Router } from 'express';
import { PaymentService } from '../services/payment.service.js';

const router = Router();

// GET /api/v1/payments
router.get('/', (req, res) => {
  const { customerId } = req.query;
  res.json(PaymentService.listPayments(customerId as string));
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
router.post('/khqr', (req, res) => {
  try {
    const { customerId, amount } = req.body;
    if (!customerId || !amount) {
      return res.status(400).json({ error: 'customerId and amount are required' });
    }
    const khqr = PaymentService.generateKHQRPayload(customerId, Number(amount));
    res.json(khqr);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
