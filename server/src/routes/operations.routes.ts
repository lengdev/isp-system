import { Router } from 'express';
import { OperationsService } from '../services/operations.service.js';

const router = Router();

// GET /api/v1/operations/installations
router.get('/installations', async (req, res) => {
  try {
    res.json(await OperationsService.listInstallations(req.query.status as string));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/operations/installations
router.post('/installations', async (req, res) => {
  try {
    const inst = await OperationsService.createInstallation(req.body);
    res.status(201).json(inst);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/v1/operations/installations/:id/complete
router.post('/installations/:id/complete', async (req, res) => {
  try {
    const result = await OperationsService.completeInstallation(String(req.params.id), req.body);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/v1/operations/technicians
router.get('/technicians', async (_req, res) => {
  try {
    res.json(await OperationsService.listTechnicians());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/operations/tickets
router.get('/tickets', async (req, res) => {
  try {
    const { status, priority } = req.query;
    res.json(await OperationsService.listTickets(status as string, priority as string));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/operations/tickets
router.post('/tickets', async (req, res) => {
  try {
    const ticket = await OperationsService.createTicket(req.body);
    res.status(201).json(ticket);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/v1/operations/tickets/:id/status
router.put('/tickets/:id/status', async (req, res) => {
  try {
    const { status, resolutionNotes } = req.body;
    const ticket = await OperationsService.updateTicketStatus(String(req.params.id), status, resolutionNotes);
    res.json(ticket);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
