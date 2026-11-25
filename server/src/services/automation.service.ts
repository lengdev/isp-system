import { prisma, logAudit } from '../db/store.js';
import { BillingService } from './billing.service.js';
import { MikroTikService } from './mikrotik.service.js';

export class AutomationService {
  // 1. List Automation Rules
  static async listRules() {
    return prisma.automationRule.findMany({ orderBy: { createdAt: 'asc' } });
  }

  static async toggleRule(ruleId: string, enabled: boolean) {
    const rule = await prisma.automationRule.findUnique({ where: { id: ruleId } });
    if (!rule) throw new Error('Rule not found');

    const updated = await prisma.automationRule.update({
      where: { id: rule.id },
      data: { enabled },
    });

    await logAudit('TOGGLE_AUTOMATION_RULE', 'AutomationRule', rule.id, `Rule ${rule.title} set to ${enabled}`);
    return updated;
  }

  // 2. WORKFLOW B: RUN MONTHLY BILLING AUTOMATION
  static async runMonthlyBillingJob(billingPeriod: string = new Date().toISOString().slice(0, 7)) {
    const activeSubscribers = await prisma.customer.findMany({
      where: { status: 'ACTIVE' },
      include: { subscriptions: { include: { package: true } } },
    });

    const results = {
      period: billingPeriod,
      totalSubscribersChecked: activeSubscribers.length,
      invoicesGenerated: 0,
      duplicatesSkipped: 0,
      invoices: [] as any[],
    };

    for (const cust of activeSubscribers) {
      const existing = await prisma.invoice.findFirst({
        where: {
          customerId: cust.id,
          billingPeriod,
          status: { not: 'CANCELLED' },
        },
      });

      if (existing) {
        results.duplicatesSkipped += 1;
        continue;
      }

      const sub = cust.subscriptions[0];
      const planName = sub?.package?.name || 'Fiber Ultra 300M';
      const monthlyPrice = Number(sub?.monthlyFee || sub?.package?.monthlyPrice || 55.0);

      try {
        const inv = await BillingService.generateInvoice({
          customerId: cust.id,
          subscriptionId: sub?.id,
          billingPeriod,
          items: [{ description: `${planName} Monthly Subscription (${billingPeriod})`, amount: monthlyPrice }],
        });
        results.invoicesGenerated += 1;
        results.invoices.push({
          invoiceNumber: inv.invoiceNumber,
          customer: cust.fullName,
          amount: inv.amount,
        });
      } catch {
        results.duplicatesSkipped += 1;
      }
    }

    await logAudit(
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
    const companySetting = await prisma.companySetting.findFirst();
    const gracePeriodDays = companySetting?.gracePeriodDays || 7;

    const pendingInvoices = await prisma.invoice.findMany({
      where: { status: { in: ['PENDING', 'OVERDUE'] } },
      include: {
        customer: {
          include: {
            subscriptions: { include: { pppoeAccount: true } },
          },
        },
      },
    });

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
          await prisma.invoice.update({
            where: { id: inv.id },
            data: { status: 'OVERDUE' },
          });
          results.markedOverdue += 1;
        }

        const cust = inv.customer;
        if (cust && cust.status === 'ACTIVE') {
          await prisma.customer.update({
            where: { id: cust.id },
            data: { status: 'OVERDUE' },
          });
        }

        if (overdueDays >= gracePeriodDays && cust && cust.status !== 'SUSPENDED') {
          await prisma.customer.update({
            where: { id: cust.id },
            data: { status: 'SUSPENDED' },
          });

          const sub = cust.subscriptions[0];
          const pppoeUsername = sub?.pppoeAccount?.username;
          if (pppoeUsername) {
            await MikroTikService.suspendSubscriber(
              sub?.routerId || 'rtr-core-1',
              pppoeUsername,
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

    await logAudit(
      'RUN_OVERDUE_JOB',
      'Automation',
      'OVERDUE_CRON',
      `Processed overdue detection: Marked ${results.markedOverdue} overdue, suspended ${results.subscribersSuspended} accounts past grace period (${gracePeriodDays} days).`
    );

    return results;
  }

  // 4. ROUTER MONITORING & BACKUP JOB
  static async runRouterHealthCheck() {
    const routers = await prisma.router.findMany();
    const checks = [];
    for (const router of routers) {
      const test = await MikroTikService.testConnection(router.id);
      checks.push({
        router: router.name,
        ip: router.managementIp,
        online: test.success,
        latencyMs: test.latencyMs,
        cpu: test.cpuLoad,
      });
    }

    await logAudit(
      'RUN_ROUTER_HEALTH_CHECK',
      'Automation',
      'NOC_CRON',
      `Verified connectivity for ${checks.length} core routers.`
    );
    return { routersChecked: checks.length, results: checks };
  }
}
