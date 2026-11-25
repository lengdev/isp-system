import { Router } from 'express';
import { AccountingService } from '../services/accounting.service.js';

const router = Router();

// GET /api/v1/accounting/dashboard
router.get('/dashboard', async (_req, res) => {
  try {
    res.json(await AccountingService.getAccountingDashboard());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/accounting/accounts
router.get('/accounts', async (_req, res) => {
  try {
    res.json(await AccountingService.getChartOfAccounts());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/accounting/journal
router.post('/journal', async (req, res) => {
  try {
    const result = await AccountingService.postJournalEntry(req.body);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/v1/accounting/journal/:entryNumber/reverse
router.post('/journal/:entryNumber/reverse', async (req, res) => {
  try {
    const { reason, actor } = req.body;
    if (!reason) return res.status(400).json({ error: 'Reversal reason is required.' });
    const result = await AccountingService.reverseJournalEntry(String(req.params.entryNumber), reason, actor);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/v1/accounting/ledger
router.get('/ledger', async (req, res) => {
  try {
    res.json(await AccountingService.getGeneralLedger(req.query as any));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/accounting/trial-balance
router.get('/trial-balance', async (_req, res) => {
  try {
    res.json(await AccountingService.getTrialBalance());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/accounting/pnl
router.get('/pnl', async (_req, res) => {
  try {
    res.json(await AccountingService.getProfitAndLoss());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/accounting/balance-sheet
router.get('/balance-sheet', async (_req, res) => {
  try {
    res.json(await AccountingService.getBalanceSheet());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/accounting/ar-aging
router.get('/ar-aging', async (_req, res) => {
  try {
    res.json(await AccountingService.getArAging());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
