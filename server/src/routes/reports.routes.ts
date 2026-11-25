import { Router } from 'express';
import { ReportService } from '../services/report.service.js';

const router = Router();

// GET /api/v1/reports/dashboard
router.get('/dashboard', (_req, res) => {
  res.json(ReportService.getDashboardMetrics());
});

// GET /api/v1/reports/detailed
router.get('/detailed', (_req, res) => {
  res.json(ReportService.getDetailedReports());
});

// GET /api/v1/reports/export
router.get('/export', (req, res) => {
  const type = (req.query.type as any) || 'customers';
  const csv = ReportService.exportCsv(type);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="nsmisp-${type}-${Date.now()}.csv"`);
  res.send(csv);
});

export default router;
