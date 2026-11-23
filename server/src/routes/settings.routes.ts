import { Router } from 'express';
import { dbStore } from '../db/store.js';

const router = Router();

// GET /api/v1/settings/company
router.get('/company', (_req, res) => {
  res.json(dbStore.companySettings);
});

// PUT /api/v1/settings/company
router.put('/company', (req, res) => {
  Object.assign(dbStore.companySettings, req.body);
  dbStore.logAudit('UPDATE_SETTINGS', 'CompanySetting', 'default', 'Updated company profile and settings');
  res.json(dbStore.companySettings);
});

// GET /api/v1/settings/audit-logs
router.get('/audit-logs', (_req, res) => {
  res.json(dbStore.auditLogs);
});

// GET /api/v1/settings/notifications
router.get('/notifications', (_req, res) => {
  res.json(dbStore.notifications);
});

// PUT /api/v1/settings/notifications/:id/read
router.put('/notifications/:id/read', (req, res) => {
  const notif = dbStore.notifications.find((n) => n.id === req.params.id);
  if (notif) notif.read = true;
  res.json({ success: true });
});

export default router;
