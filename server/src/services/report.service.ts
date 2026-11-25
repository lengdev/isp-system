import { prisma } from '../db/store.js';
import { AccountingService } from './accounting.service.js';

export class ReportService {
  // 1. Dashboard Executive Overview
  static async getDashboardMetrics() {
    const [customers, overdueInvoices, routers, auditLogs] = await Promise.all([
      prisma.customer.findMany({
        include: { subscriptions: { include: { package: true } } },
      }),
      prisma.invoice.findMany({ where: { status: 'OVERDUE' } }),
      prisma.router.findMany({ orderBy: { name: 'asc' } }),
      prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 10 }),
    ]);

    const totalSubscribers = customers.length;
    const activeSubscribers = customers.filter((c) => c.status === 'ACTIVE').length;
    const suspendedSubscribers = customers.filter((c) => c.status === 'SUSPENDED').length;
    const overdueSubscribers = customers.filter((c) => c.status === 'OVERDUE').length;

    const mrr = customers
      .filter((c) => c.status === 'ACTIVE')
      .reduce((sum, c) => {
        const sub = c.subscriptions[0];
        return sum + Number(sub?.monthlyFee || sub?.package?.monthlyPrice || 0);
      }, 0);

    const totalOverdueBalance = overdueInvoices.reduce(
      (sum, i) => sum + (Number(i.balanceDue) || 0),
      0
    );

    const fiberCount = customers.filter(
      (c) => (c.subscriptions[0]?.technology || 'FIBER') === 'FIBER'
    ).length;
    const wirelessCount = customers.filter(
      (c) => c.subscriptions[0]?.technology === 'WIRELESS'
    ).length;

    const trafficHourly = [
      { time: '00:00', download: 180, upload: 90 },
      { time: '04:00', download: 120, upload: 60 },
      { time: '08:00', download: 450, upload: 220 },
      { time: '12:00', download: 680, upload: 310 },
      { time: '16:00', download: 820, upload: 410 },
      { time: '20:00', download: 1250, upload: 620 },
      { time: '22:00', download: 1100, upload: 540 },
    ];

    const revenueMonthly = [
      { month: 'Jun', mrr: 12400, collected: 12100 },
      { month: 'Jul', mrr: 14200, collected: 13900 },
      { month: 'Aug', mrr: 16800, collected: 16200 },
      { month: 'Sep', mrr: 18900, collected: 18100 },
      { month: 'Oct', mrr: 21500, collected: 20800 },
      { month: 'Nov', mrr: 24200, collected: 23600 },
    ];

    return {
      kpi: {
        totalSubscribers,
        activeSubscribers,
        suspendedSubscribers,
        overdueSubscribers,
        activeRatioPercent: totalSubscribers ? Math.round((activeSubscribers / totalSubscribers) * 100) : 0,
        mrr: Math.round(mrr * 100) / 100,
        totalOverdueBalance: Math.round(totalOverdueBalance * 100) / 100,
        fiberCount,
        wirelessCount,
      },
      traffic: trafficHourly,
      revenueTrends: revenueMonthly,
      devicesHealth: routers.map((r) => ({
        id: r.id,
        name: r.name,
        ip: r.managementIp,
        model: r.model,
        status: r.status,
        cpu: r.cpuUsage,
        memory: r.memoryUsage,
        uptimeHours: Math.floor(r.uptimeSeconds / 3600),
      })),
      recentActivities: auditLogs.map((log) => ({
        ...log,
        actor: log.userEmail || 'system',
        performedBy: log.userEmail || 'system',
        timestamp: log.createdAt.toISOString(),
        createdAt: log.createdAt.toISOString(),
      })),
    };
  }

  // 2. Comprehensive Reports
  static async getDetailedReports() {
    const [pnl, balanceSheet, arAging, packages, products, tickets] = await Promise.all([
      AccountingService.getProfitAndLoss(),
      AccountingService.getBalanceSheet(),
      AccountingService.getArAging(),
      prisma.package.findMany({ include: { subscriptions: true } }),
      prisma.product.findMany(),
      prisma.supportTicket.findMany(),
    ]);

    const planBreakdown = packages.map((pkg) => ({
      packageName: pkg.name,
      technology: pkg.technology,
      monthlyPrice: Number(pkg.monthlyPrice),
      subscribersCount: pkg.subscriptions.length,
      totalMonthlyRevenue: pkg.subscriptions.length * Number(pkg.monthlyPrice),
    }));

    const inventoryValuation = products.reduce(
      (sum, p) => sum + (p.quantity * Number(p.costPrice) || 0),
      0
    );

    return {
      financials: {
        profitAndLoss: pnl,
        balanceSheet,
        arAging,
      },
      plans: planBreakdown,
      inventory: {
        totalProducts: products.length,
        totalUnits: products.reduce((sum, p) => sum + p.quantity, 0),
        totalValuation: Math.round(inventoryValuation * 100) / 100,
        lowStockItems: products
          .filter((p) => p.status === 'LOW_STOCK' || p.status === 'OUT_OF_STOCK')
          .map((p) => ({
            ...p,
            costPrice: Number(p.costPrice),
            unitPrice: Number(p.unitPrice),
          })),
      },
      support: {
        openTickets: tickets.filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length,
        resolvedTickets: tickets.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED').length,
      },
    };
  }

  // 3. Export to CSV string
  static async exportCsv(type: 'customers' | 'invoices' | 'inventory' | 'journals') {
    if (type === 'customers') {
      const customers = await prisma.customer.findMany({
        include: { subscriptions: { include: { package: true } } },
        orderBy: { code: 'asc' },
      });
      const headers = ['Code', 'Name', 'Email', 'Phone', 'Plan', 'Type', 'Status', 'Balance Due'];
      const rows = customers.map((c) => {
        const sub = c.subscriptions[0];
        return [
          c.code,
          `"${c.fullName}"`,
          c.email,
          c.phone,
          `"${sub?.package?.name || 'N/A'}"`,
          sub?.technology || 'FIBER',
          c.status,
          Number(c.balanceDue),
        ];
      });
      return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    }

    if (type === 'invoices') {
      const invoices = await prisma.invoice.findMany({ orderBy: { issueDate: 'desc' } });
      const headers = ['Invoice Number', 'Customer ID', 'Amount', 'Status', 'Period', 'Due Date'];
      const rows = invoices.map((i) => [
        i.invoiceNumber,
        i.customerId,
        Number(i.amount),
        i.status,
        i.billingPeriod || '',
        i.dueDate.toISOString(),
      ]);
      return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    }

    if (type === 'inventory') {
      const products = await prisma.product.findMany({ orderBy: { sku: 'asc' } });
      const headers = ['SKU', 'Name', 'Category', 'Quantity', 'Cost Price', 'Unit Price', 'Status'];
      const rows = products.map((p) => [
        p.sku,
        `"${p.name}"`,
        `"${p.categoryName || ''}"`,
        p.quantity,
        Number(p.costPrice),
        Number(p.unitPrice),
        p.status,
      ]);
      return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    }

    const entries = await prisma.journalEntry.findMany({ orderBy: { entryDate: 'desc' } });
    const headers = ['Entry Number', 'Date', 'Description', 'Reference', 'Is Posted'];
    const rows = entries.map((j) => [
      j.entryNumber,
      j.entryDate.toISOString(),
      `"${j.description}"`,
      j.reference || '',
      j.isPosted,
    ]);
    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }
}
