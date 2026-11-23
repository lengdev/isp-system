import { Router } from 'express';
import { AccountingService } from '../services/accounting.service.js';

const router = Router();

// GET /api/v1/accounting/dashboard
router.get('/dashboard', (_req, res) => {
  res.json(AccountingService.getAccountingDashboard());
});

// GET /api/v1/accounting/accounts
router.get('/accounts', (_req, res) => {
  res.json(AccountingService.getChartOfAccounts());
});

// POST /api/v1/accounting/journal
router.post('/journal', (req, res) => {
  try {
    const result = AccountingService.postJournalEntry(req.body);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/v1/accounting/journal/:entryNumber/reverse
router.post('/journal/:entryNumber/reverse', (req, res) => {
  try {
    const { reason, actor } = req.body;
    if (!reason) return res.status(400).json({ error: 'Reversal reason is required.' });
    const result = AccountingService.reverseJournalEntry(req.params.entryNumber, reason, actor);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/v1/accounting/ledger
router.get('/ledger', (req, res) => {
  res.json(AccountingService.getGeneralLedger(req.query as any));
});

// GET /api/v1/accounting/trial-balance
router.get('/trial-balance', (_req, res) => {
  res.json(AccountingService.getTrialBalance());
});

// GET /api/v1/accounting/pnl
router.get('/pnl', (_req, res) => {
  res.json(AccountingService.getProfitAndLoss());
});

// GET /api/v1/accounting/balance-sheet
router.get('/balance-sheet', (_req, res) => {
  res.json(AccountingService.getBalanceSheet());
});

// GET /api/v1/accounting/ar-aging
router.get('/ar-aging', (_req, res) => {
  res.json(AccountingService.getArAging());
});

export default router;
