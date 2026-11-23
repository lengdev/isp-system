import { PrismaClient } from '@prisma/client';
import {
  SEED_USERS,
  SEED_ROUTERS,
  SEED_VLANS,
  SEED_IP_POOLS,
  SEED_PACKAGES,
  SEED_CUSTOMERS,
  SEED_CHART_OF_ACCOUNTS,
  SEED_WAREHOUSES,
  SEED_SUPPLIERS,
  SEED_PRODUCTS,
  SEED_SERIAL_NUMBERS,
  SEED_TECHNICIANS,
  SEED_INSTALLATIONS,
  SEED_INVOICES,
  SEED_TICKETS,
} from './seedData.js';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

// Database state tracker
let isPostgresConnected = false;

export async function initDatabaseConnection() {
  try {
    await prisma.$connect();
    isPostgresConnected = true;
    console.log('✓ Successfully connected to PostgreSQL via Prisma ORM');
  } catch (err: any) {
    isPostgresConnected = false;
    console.log('ℹ PostgreSQL daemon offline or sandbox restricted. Operating in high-performance memory-store mode.');
  }
}

export function isUsingPostgres(): boolean {
  return isPostgresConnected;
}

// In-Memory Enterprise ISP Repository Store
class NetPulseDataStore {
  users = [...SEED_USERS];
  routers = [...SEED_ROUTERS];
  vlans = [...SEED_VLANS];
  ipPools = [...SEED_IP_POOLS];
  packages = [...SEED_PACKAGES];
  customers = [...SEED_CUSTOMERS];
  accounts = [...SEED_CHART_OF_ACCOUNTS.map((a, idx) => ({ ...a, id: `acc-${idx + 1}`, balance: 0.0 }))];
  journalEntries: any[] = [];
  journalLines: any[] = [];
  warehouses = [...SEED_WAREHOUSES];
  suppliers = [...SEED_SUPPLIERS];
  products = [...SEED_PRODUCTS];
  serialNumbers = [...SEED_SERIAL_NUMBERS];
  stockMovements: any[] = [];
  purchaseOrders: any[] = [];
  technicians = [...SEED_TECHNICIANS];
  installations = [...SEED_INSTALLATIONS];
  invoices = [...SEED_INVOICES];
  payments: any[] = [];
  tickets = [...SEED_TICKETS];
  ticketMessages: any[] = [];
  sessions: any[] = [];
  auditLogs: any[] = [];
  notifications: any[] = [
    {
      id: 'notif-1',
      title: 'Past-due invoice reminder sent',
      description: 'Auto-reminder dispatched to Apex Digital Studio (CUST-1003)',
      type: 'invoice',
      read: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'notif-2',
      title: 'MikroTik Core Router health check normal',
      description: 'CPU load 14%, memory usage 32%, all PPPoE interfaces responding',
      type: 'system',
      read: true,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
  ];
  automationRules = [
    {
      id: 'rule-1',
      title: 'Automated Past Due Suspension',
      description: 'Automatically restrict bandwidth and suspend accounts when balance is 14 days overdue.',
      triggerType: 'OVERDUE_SUSPENSION',
      enabled: true,
    },
    {
      id: 'rule-2',
      title: 'Auto-Invoice Generation',
      description: 'Generate monthly invoices and send PDF to customer email 7 days before billing due date.',
      triggerType: 'AUTO_INVOICE',
      enabled: true,
    },
    {
      id: 'rule-3',
      title: 'Optical Signal Degradation Alert',
      description: 'Trigger support ticket when customer ONT optical power drops below -27 dBm.',
      triggerType: 'SIGNAL_DEGRADATION',
      enabled: true,
    },
    {
      id: 'rule-4',
      title: 'Daily Core Router Backup Snapshot',
      description: 'Export RouterOS configuration binary (.backup) to secure offsite storage nightly at 03:00.',
      triggerType: 'ROUTER_BACKUP',
      enabled: true,
    },
  ];
  fixedAssets = [
    {
      id: 'ast-1',
      assetNumber: 'AST-ROUTER-01',
      name: 'MikroTik CCR2004-16G-2S+ Core Gateway',
      category: 'Network Equipment',
      cost: 595.0,
      purchaseDate: '2024-01-10T00:00:00Z',
      usefulLifeMonths: 36,
      accumulatedDepr: 165.25,
      netBookValue: 429.75,
      location: 'Central Data Center POP',
      status: 'ACTIVE',
    },
    {
      id: 'ast-2',
      assetNumber: 'AST-OLT-01',
      name: 'Huawei SmartAX MA5800-X7 GPON OLT',
      category: 'Network Equipment',
      cost: 4800.0,
      purchaseDate: '2024-02-15T00:00:00Z',
      usefulLifeMonths: 60,
      accumulatedDepr: 720.0,
      netBookValue: 4080.0,
      location: 'Central Data Center POP',
      status: 'ACTIVE',
    },
  ];
  expenses = [
    {
      id: 'exp-1',
      expenseNumber: 'EXP-2026-001',
      category: 'Internet Transit',
      amount: 1450.0,
      paidTo: 'Telcotech Transit Carrier',
      approvedBy: 'David Vance',
      status: 'APPROVED',
      expenseDate: '2026-11-01T00:00:00Z',
      notes: 'Monthly 10Gbps transit commit',
    },
    {
      id: 'exp-2',
      expenseNumber: 'EXP-2026-002',
      category: 'Electricity',
      amount: 320.0,
      paidTo: 'EDC Electricite du Cambodge',
      approvedBy: 'David Vance',
      status: 'APPROVED',
      expenseDate: '2026-11-05T00:00:00Z',
      notes: 'Central POP air conditioning and UPS power',
    },
  ];
  companySettings = {
    companyName: 'NetPulse High-Speed Broadband LLC',
    companyAddress: 'Building 42, St. 214, Phnom Penh, Cambodia',
    supportPhone: '+855 23 888 999',
    supportEmail: 'support@netpulse.net',
    currency: '$',
    timezone: 'Asia/Phnom_Penh',
    invoicePrefix: 'INV',
    customerPrefix: 'CUST',
    taxRatePercent: 10.0,
    gracePeriodDays: 7,
    language: 'en',
  };

  constructor() {
    this.initInitialAccountingJournals();
  }

  private initInitialAccountingJournals() {
    // Initial opening entry: Capital Contribution
    const je1Id = 'je-init-001';
    this.journalEntries.push({
      id: je1Id,
      entryNumber: 'JE-2026-00001',
      periodId: '2026-11',
      entryDate: '2026-11-01T00:00:00Z',
      description: 'Opening balance: Operating bank capital and equipment assets',
      reference: 'INIT-CAPITAL',
      isPosted: true,
      isReversed: false,
      createdBy: 'David Vance',
      createdAt: '2026-11-01T00:00:00Z',
    });

    const lines = [
      { id: 'jel-1', journalEntryId: je1Id, accountId: 'acc-2', accountCode: '1020', debit: 25000.0, credit: 0.0, description: 'Operating Bank Account (ABA Bank)' },
      { id: 'jel-2', journalEntryId: je1Id, accountId: 'acc-5', accountCode: '1200', debit: 8500.0, credit: 0.0, description: 'Hardware Inventory on Hand' },
      { id: 'jel-3', journalEntryId: je1Id, accountId: 'acc-6', accountCode: '1500', debit: 12000.0, credit: 0.0, description: 'Core Network Equipment' },
      { id: 'jel-4', journalEntryId: je1Id, accountId: 'acc-11', accountCode: '3010', debit: 0.0, credit: 45500.0, description: 'Owner Invested Capital' },
    ];
    this.journalLines.push(...lines);

    // Update account balances
    for (const line of lines) {
      const acc = this.accounts.find((a) => a.code === line.accountCode);
      if (acc) {
        if (acc.type === 'ASSET' || acc.type === 'EXPENSE') {
          acc.balance += line.debit - line.credit;
        } else {
          acc.balance += line.credit - line.debit;
        }
      }
    }
  }

  // Audit Log helper
  logAudit(
    action: string,
    resource: string,
    resourceId: string | null,
    details: string,
    actor: string = 'admin',
    clientIp: string = '127.0.0.1'
  ) {
    const entry = {
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      action,
      resource,
      resourceId,
      details,
      actor,
      performedBy: actor,
      clientIp,
      ipAddress: clientIp,
      ip: clientIp,
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    this.auditLogs.unshift(entry);
    return entry;
  }
}

export const dbStore = new NetPulseDataStore();
