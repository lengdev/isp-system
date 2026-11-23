import { dbStore } from '../db/store.js';
import { AccountingService } from './accounting.service.js';

export class ReportService {
  // 1. Dashboard Executive Overview
  static getDashboardMetrics() {
    const totalSubscribers = dbStore.customers.length;
    const activeSubscribers = dbStore.customers.filter((c) => c.status === 'ACTIVE').length;
    const suspendedSubscribers = dbStore.customers.filter((c) => c.status === 'SUSPENDED').length;
    const overdueSubscribers = dbStore.customers.filter((c) => c.status === 'OVERDUE').length;

    // Monthly Recurring Revenue (MRR)
    const mrr = dbStore.customers
      .filter((c) => c.status === 'ACTIVE')
      .reduce((sum, c) => sum + (Number(c.monthlyPrice) || 0), 0);

    // Overdue balance
    const totalOverdueBalance = dbStore.invoices
      .filter((i) => i.status === 'OVERDUE')
      .reduce((sum, i) => sum + (Number(i.balanceDue) || 0), 0);

    const fiberCount = dbStore.customers.filter((c) => c.connectionType === 'FIBER').length;
    const wirelessCount = dbStore.customers.filter((c) => c.connectionType === 'WIRELESS').length;

    // Traffic simulation
    const trafficHourly = [
      { time: '00:00', download: 180, upload: 90 },
      { time: '04:00', download: 120, upload: 60 },
      { time: '08:00', download: 450, upload: 220 },
      { time: '12:00', download: 680, upload: 310 },
      { time: '16:00', download: 820, upload: 410 },
      { time: '20:00', download: 1250, upload: 620 },
      { time: '22:00', download: 1100, upload: 540 },
    ];

    // Revenue Monthly Trend
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
      devicesHealth: dbStore.routers.map((r) => ({
        id: r.id,
        name: r.name,
        ip: r.managementIp,
        model: r.model,
        status: r.status,
        cpu: r.cpuUsage,
        memory: r.memoryUsage,
        uptimeHours: Math.floor(r.uptimeSeconds / 3600),
      })),
      recentActivities: dbStore.auditLogs.slice(0, 10),
    };
  }

  // 2. Comprehensive Reports
  static getDetailedReports() {
    const pnl = AccountingService.getProfitAndLoss();
    const balanceSheet = AccountingService.getBalanceSheet();
    const arAging = AccountingService.getArAging();

    const planBreakdown = dbStore.packages.map((pkg) => {
      const subs = dbStore.customers.filter((c) => c.planName === pkg.name);
      return {
        packageName: pkg.name,
        technology: pkg.technology,
        monthlyPrice: pkg.monthlyPrice,
        subscribersCount: subs.length,
        totalMonthlyRevenue: subs.length * Number(pkg.monthlyPrice),
      };
    });

    const inventoryValuation = dbStore.products.reduce(
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
        totalProducts: dbStore.products.length,
        totalUnits: dbStore.products.reduce((sum, p) => sum + p.quantity, 0),
        totalValuation: Math.round(inventoryValuation * 100) / 100,
        lowStockItems: dbStore.products.filter((p) => p.status === 'LOW_STOCK' || p.status === 'OUT_OF_STOCK'),
      },
      support: {
        openTickets: dbStore.tickets.filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length,
        resolvedTickets: dbStore.tickets.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED').length,
      },
    };
  }

  // 3. Export to CSV string
  static exportCsv(type: 'customers' | 'invoices' | 'inventory' | 'journals') {
    if (type === 'customers') {
      const headers = ['Code', 'Name', 'Email', 'Phone', 'Plan', 'Type', 'Status', 'Balance Due'];
      const rows = dbStore.customers.map((c) => [
        c.code,
        `"${c.fullName}"`,
        c.email,
        c.phone,
        `"${c.planName}"`,
        c.connectionType,
        c.status,
        c.balanceDue,
      ]);
      return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    }

    if (type === 'invoices') {
      const headers = ['Invoice Number', 'Customer ID', 'Amount', 'Status', 'Period', 'Due Date'];
      const rows = dbStore.invoices.map((i) => [
        i.invoiceNumber,
        i.customerId,
        i.amount,
        i.status,
        i.billingPeriod || '',
        i.dueDate,
      ]);
      return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    }

    if (type === 'inventory') {
      const headers = ['SKU', 'Name', 'Category', 'Quantity', 'Cost Price', 'Unit Price', 'Status'];
      const rows = dbStore.products.map((p) => [
        p.sku,
        `"${p.name}"`,
        `"${p.categoryName}"`,
        p.quantity,
        p.costPrice,
        p.unitPrice,
        p.status,
      ]);
      return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    }

    // Default journals
    const headers = ['Entry Number', 'Date', 'Description', 'Reference', 'Is Posted'];
    const rows = dbStore.journalEntries.map((j) => [
      j.entryNumber,
      j.entryDate,
      `"${j.description}"`,
      j.reference || '',
      j.isPosted,
    ]);
    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }
}
