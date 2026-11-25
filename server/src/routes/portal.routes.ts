import { Router } from 'express';
import { prisma } from '../db/store.js';
import { CustomerService } from '../services/customer.service.js';
import { PaymentService } from '../services/payment.service.js';
import { OperationsService } from '../services/operations.service.js';

const router = Router();

// Customer Portal Authentication
router.post('/login', async (req, res) => {
  try {
    const { codeOrEmail } = req.body;
    if (!codeOrEmail) return res.status(400).json({ error: 'Customer code or email is required' });

    const cust = await prisma.customer.findFirst({
      where: {
        OR: [
          { code: { equals: String(codeOrEmail), mode: 'insensitive' } },
          { email: { equals: String(codeOrEmail), mode: 'insensitive' } },
        ],
      },
      include: {
        subscriptions: { include: { package: true } },
      },
    });

    if (!cust) return res.status(404).json({ error: 'Subscriber account not found' });

    res.json({
      token: `cust-token-${cust.id}`,
      customer: {
        id: cust.id,
        code: cust.code,
        fullName: cust.fullName,
        email: cust.email,
        phone: cust.phone,
        planName: cust.subscriptions[0]?.package?.name || 'Fiber Ultra 300M',
        status: cust.status,
        balanceDue: Number(cust.balanceDue),
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Customer Portal Dashboard
router.get('/dashboard/:customerId', async (req, res) => {
  try {
    const profile = await CustomerService.getCustomerProfile(String(req.params.customerId));
    res.json(profile);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

// Customer Portal Pay Invoice via KHQR
router.post('/pay-khqr', async (req, res) => {
  try {
    const { customerId, amount } = req.body;
    const khqr = await PaymentService.generateKHQRPayload(customerId, Number(amount));
    res.json(khqr);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Customer Portal Submit Support Ticket
router.post('/tickets', async (req, res) => {
  try {
    const ticket = await OperationsService.createTicket(req.body);
    res.status(201).json(ticket);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
