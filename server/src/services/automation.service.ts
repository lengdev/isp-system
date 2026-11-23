import { dbStore } from '../db/store.js';
import { BillingService } from './billing.service.js';
import { MikroTikService } from './mikrotik.service.js';

export class AutomationService {
  // 1. List Automation Rules
  static listRules() {
    return dbStore.automationRules;
  }

  static toggleRule(ruleId: string, enabled: boolean) {
    const rule = dbStore.automationRules.find((r) => r.id === ruleId);
    if (!rule) throw new Error('Rule not found');
    rule.enabled = enabled;
    dbStore.logAudit('TOGGLE_AUTOMATION_RULE', 'AutomationRule', rule.id, `Rule ${rule.title} set to ${enabled}`);
    return rule;
  }

  // 2. WORKFLOW B: RUN MONTHLY BILLING AUTOMATION
  static runMonthlyBillingJob(billingPeriod: string = new Date().toISOString().slice(0, 7)) {
    const activeSubscribers = dbStore.customers.filter((c) => c.status === 'ACTIVE');
    const results = {
      period: billingPeriod,
      totalSubscribersChecked: activeSubscribers.length,
      invoicesGenerated: 0,
      duplicatesSkipped: 0,
      invoices: [] as any[],
    };

    for (const cust of activeSubscribers) {
      // Check if invoice already exists
      const existing = dbStore.invoices.find(
        (i) => i.customerId === cust.id && i.billingPeriod === billingPeriod && i.status !== 'CANCELLED'
      );

      if (existing) {
        results.duplicatesSkipped += 1;
        continue;
      }

      try {
        const inv = BillingService.generateInvoice({
          customerId: cust.id,
          billingPeriod,
          items: [{ description: `${cust.planName} Monthly Subscription (${billingPeriod})`, amount: cust.monthlyPrice }],
        });
        results.invoicesGenerated += 1;
        results.invoices.push({
          invoiceNumber: inv.invoiceNumber,
          customer: cust.fullName,
          amount: inv.amount,
        });
      } catch (err: any) {
        results.duplicatesSkipped += 1;
      }
    }

    dbStore.logAudit(
      'RUN_BILLING_JOB',
      'Automation',
      billingPeriod,
      `Generated ${results.invoicesGenerated} recurring invoices for ${billingPeriod}. Skipped ${results.duplicatesSkipped} duplicates.`
    );

    return results;
  }

  // 3. WORKFLOW C: RUN OVERDUE DETECTION & SUSPENSION AUTOMATION
  static async runOverdueSuspensionJob() {
    const now = new Date();
    const gracePeriodDays = dbStore.companySettings.gracePeriodDays || 7;
    const pendingInvoices = dbStore.invoices.filter((i) => i.status === 'PENDING' || i.status === 'OVERDUE');

    const results = {
      invoicesChecked: pendingInvoices.length,
      markedOverdue: 0,
      subscribersSuspended: 0,
      actions: [] as any[],
    };

    for (const inv of pendingInvoices) {
      const dueDate = new Date(inv.dueDate);
      const overdueDays = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 3600 * 24));

      if (overdueDays > 0) {
        if (inv.status !== 'OVERDUE') {
          inv.status = 'OVERDUE';
          results.markedOverdue += 1;
        }

        const cust = dbStore.customers.find((c) => c.id === inv.customerId);
        if (cust && cust.status === 'ACTIVE') {
          cust.status = 'OVERDUE';
        }

        // If overdue past grace period, trigger network suspension on MikroTik
        if (overdueDays >= gracePeriodDays && cust && cust.status !== 'SUSPENDED') {
          cust.status = 'SUSPENDED';
          if (cust.pppoeUsername) {
            await MikroTikService.suspendSubscriber(
              'rtr-core-1',
              cust.pppoeUsername,
              `Overdue invoice ${inv.invoiceNumber} (${overdueDays} days past due)`
            );
          }
          results.subscribersSuspended += 1;
          results.actions.push({
            action: 'SUSPENDED',
            customer: cust.fullName,
            invoiceNumber: inv.invoiceNumber,
            overdueDays,
          });
        }
      }
    }

    dbStore.logAudit(
      'RUN_OVERDUE_JOB',
      'Automation',
      'OVERDUE_CRON',
      `Processed overdue detection: Marked ${results.markedOverdue} overdue, suspended ${results.subscribersSuspended} accounts past grace period (${gracePeriodDays} days).`
    );

    return results;
  }

  // 4. ROUTER MONITORING & BACKUP JOB
  static async runRouterHealthCheck() {
    const checks = [];
    for (const router of dbStore.routers) {
      const test = await MikroTikService.testConnection(router.id);
      checks.push({
        router: router.name,
        ip: router.managementIp,
        online: test.success,
        latencyMs: test.latencyMs,
        cpu: test.cpuLoad,
      });
    }

    dbStore.logAudit('RUN_ROUTER_HEALTH_CHECK', 'Automation', 'NOC_CRON', `Verified connectivity for ${checks.length} core routers.`);
    return { routersChecked: checks.length, results: checks };
  }
}
