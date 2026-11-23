import { Router } from 'express';
import { OperationsService } from '../services/operations.service.js';

const router = Router();

// GET /api/v1/operations/installations
router.get('/installations', (req, res) => {
  res.json(OperationsService.listInstallations(req.query.status as string));
});

// POST /api/v1/operations/installations
router.post('/installations', (req, res) => {
  try {
    const inst = OperationsService.createInstallation(req.body);
    res.status(201).json(inst);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/v1/operations/installations/:id/complete
router.post('/installations/:id/complete', async (req, res) => {
  try {
    const result = await OperationsService.completeInstallation(req.params.id, req.body);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/v1/operations/technicians
router.get('/technicians', (_req, res) => {
  res.json(OperationsService.listTechnicians());
});

// GET /api/v1/operations/tickets
router.get('/tickets', (req, res) => {
  const { status, priority } = req.query;
  res.json(OperationsService.listTickets(status as string, priority as string));
});

// POST /api/v1/operations/tickets
router.post('/tickets', (req, res) => {
  try {
    const ticket = OperationsService.createTicket(req.body);
    res.status(201).json(ticket);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/v1/operations/tickets/:id/status
router.put('/tickets/:id/status', (req, res) => {
  try {
    const { status, resolutionNotes } = req.body;
    const ticket = OperationsService.updateTicketStatus(req.params.id, status, resolutionNotes);
    res.json(ticket);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
