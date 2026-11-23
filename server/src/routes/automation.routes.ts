import { Router } from 'express';
import { AutomationService } from '../services/automation.service.js';

const router = Router();

// GET /api/v1/automation/rules
router.get('/rules', (_req, res) => {
  res.json(AutomationService.listRules());
});

// POST /api/v1/automation/rules/:id/toggle
router.post('/rules/:id/toggle', (req, res) => {
  try {
    const { enabled } = req.body;
    const rule = AutomationService.toggleRule(req.params.id, Boolean(enabled));
    res.json(rule);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/v1/automation/jobs/billing
router.post('/jobs/billing', (req, res) => {
  try {
    const result = AutomationService.runMonthlyBillingJob(req.body?.billingPeriod);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/automation/jobs/overdue
router.post('/jobs/overdue', async (_req, res) => {
  try {
    const result = await AutomationService.runOverdueSuspensionJob();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/automation/jobs/routers
router.post('/jobs/routers', async (_req, res) => {
  try {
    const result = await AutomationService.runRouterHealthCheck();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
