import { Router } from 'express';
import { ReportService } from '../services/report.service.js';

const router = Router();

// GET /api/v1/reports/dashboard
router.get('/dashboard', async (_req, res) => {
  try {
    res.json(await ReportService.getDashboardMetrics());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/reports/detailed
router.get('/detailed', async (_req, res) => {
  try {
    res.json(await ReportService.getDetailedReports());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/reports/export
router.get('/export', async (req, res) => {
  try {
    const type = (req.query.type as any) || 'customers';
    const csv = await ReportService.exportCsv(type);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="nsmisp-${type}-${Date.now()}.csv"`);
    res.send(csv);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
