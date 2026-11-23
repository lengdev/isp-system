import { Router } from 'express';
import { dbStore } from '../db/store.js';
import { CustomerService } from '../services/customer.service.js';
import { PaymentService } from '../services/payment.service.js';
import { OperationsService } from '../services/operations.service.js';

const router = Router();

// Customer Portal Authentication
router.post('/login', (req, res) => {
  const { codeOrEmail } = req.body;
  if (!codeOrEmail) return res.status(400).json({ error: 'Customer code or email is required' });

  const cust = dbStore.customers.find(
    (c) =>
      c.code.toLowerCase() === codeOrEmail.toLowerCase() ||
      c.email.toLowerCase() === codeOrEmail.toLowerCase()
  );

  if (!cust) return res.status(404).json({ error: 'Subscriber account not found' });

  res.json({
    token: `cust-token-${cust.id}`,
    customer: {
      id: cust.id,
      code: cust.code,
      fullName: cust.fullName,
      email: cust.email,
      phone: cust.phone,
      planName: cust.planName,
      status: cust.status,
      balanceDue: cust.balanceDue,
    },
  });
});

// Customer Portal Dashboard
router.get('/dashboard/:customerId', (req, res) => {
  try {
    const profile = CustomerService.getCustomerProfile(req.params.customerId);
    res.json(profile);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

// Customer Portal Pay Invoice via KHQR
router.post('/pay-khqr', (req, res) => {
  try {
    const { customerId, amount } = req.body;
    const khqr = PaymentService.generateKHQRPayload(customerId, Number(amount));
    res.json(khqr);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Customer Portal Submit Support Ticket
router.post('/tickets', (req, res) => {
  try {
    const ticket = OperationsService.createTicket(req.body);
    res.status(201).json(ticket);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
