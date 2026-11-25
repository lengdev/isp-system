#!/usr/bin/env node
import { PrismaClient, Prisma, UserRoleType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { RbacService } from '../dist-server/services/rbac.service.js';

dotenv.config();

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

const BCRYPT_SALT_ROUNDS = 12;

const BASE_ROUTERS = [
  {
    id: 'rtr-core-1',
    name: 'Core-CCR2004-East',
    managementIp: '192.168.88.1',
    apiPort: 8728,
    username: 'admin',
    encryptedSecret: 'nsmisp123',
    model: 'MikroTik CCR2004-16G-2S+',
    osVersion: 'RouterOS v7.14.2',
    location: 'Phnom Penh Central POP',
    status: 'ONLINE' as const,
    cpuUsage: 14,
    memoryUsage: 32,
    uptimeSeconds: 1548000,
  },
  {
    id: 'rtr-core-2',
    name: 'Core-CCR2116-West',
    managementIp: '192.168.88.2',
    apiPort: 8728,
    username: 'admin',
    encryptedSecret: 'nsmisp123',
    model: 'MikroTik CCR2116-12G-4S+',
    osVersion: 'RouterOS v7.14.2',
    location: 'Siem Reap Regional POP',
    status: 'ONLINE' as const,
    cpuUsage: 22,
    memoryUsage: 45,
    uptimeSeconds: 980000,
  },
  {
    id: 'rtr-wireless-1',
    name: 'WISP-CCR1009-TowerNorth',
    managementIp: '192.168.88.3',
    apiPort: 8728,
    username: 'admin',
    encryptedSecret: 'nsmisp123',
    model: 'MikroTik CCR1009-7G-1C-1S+',
    osVersion: 'RouterOS v7.13.5',
    location: 'Tower Site 04 - Toul Kork',
    status: 'ONLINE' as const,
    cpuUsage: 19,
    memoryUsage: 38,
    uptimeSeconds: 432000,
  },
];

const BASE_PACKAGES = [
  {
    id: 'pkg-1',
    name: 'Fiber Starter 100M',
    technology: 'FIBER' as const,
    downloadSpeed: 100,
    uploadSpeed: 50,
    monthlyPrice: new Prisma.Decimal(35.0),
    installationFee: new Prisma.Decimal(25.0),
    dataAllowanceGB: null,
    pppoeProfileName: 'profile-fiber-100m',
    description: 'Perfect for small households and regular streaming',
    isPopular: false,
    isActive: true,
  },
  {
    id: 'pkg-2',
    name: 'Fiber Ultra 300M',
    technology: 'FIBER' as const,
    downloadSpeed: 300,
    uploadSpeed: 150,
    monthlyPrice: new Prisma.Decimal(55.0),
    installationFee: new Prisma.Decimal(0.0),
    dataAllowanceGB: null,
    pppoeProfileName: 'profile-fiber-300m',
    description: 'High-speed broadband for multi-device smart homes',
    isPopular: true,
    isActive: true,
  },
  {
    id: 'pkg-3',
    name: 'Fiber Gig Pro 1G',
    technology: 'FIBER' as const,
    downloadSpeed: 1000,
    uploadSpeed: 500,
    monthlyPrice: new Prisma.Decimal(89.0),
    installationFee: new Prisma.Decimal(0.0),
    dataAllowanceGB: null,
    pppoeProfileName: 'profile-fiber-1g',
    description: 'Ultra-low latency symmetrical fiber for power users & creators',
    isPopular: false,
    isActive: true,
  },
  {
    id: 'pkg-4',
    name: 'Wireless FastPoint 50M',
    technology: 'WIRELESS' as const,
    downloadSpeed: 50,
    uploadSpeed: 25,
    monthlyPrice: new Prisma.Decimal(40.0),
    installationFee: new Prisma.Decimal(50.0),
    dataAllowanceGB: null,
    pppoeProfileName: 'profile-wisp-50m',
    description: 'Point-to-Multipoint wireless connection for suburban areas',
    isPopular: false,
    isActive: true,
  },
  {
    id: 'pkg-5',
    name: 'Business Dedicated 500M',
    technology: 'FIBER' as const,
    downloadSpeed: 500,
    uploadSpeed: 500,
    monthlyPrice: new Prisma.Decimal(199.0),
    installationFee: new Prisma.Decimal(0.0),
    dataAllowanceGB: null,
    pppoeProfileName: 'profile-biz-500m',
    description: 'SLA guaranteed 99.9% uptime with static public IPv4',
    isPopular: false,
    isActive: true,
  },
];

const CHART_OF_ACCOUNTS = [
  { code: '1010', name: 'Petty Cash', type: 'ASSET' as const, description: 'Cash on hand in main office cashier drawer' },
  { code: '1020', name: 'Operating Bank Account (ABA Bank)', type: 'ASSET' as const, description: 'Primary corporate checking and disbursement account' },
  { code: '1030', name: 'Bakong / KHQR Settlement Account', type: 'ASSET' as const, description: 'Digital merchant settlement wallet' },
  { code: '1100', name: 'Accounts Receivable - Subscribers', type: 'ASSET' as const, description: 'Outstanding balances owed by active/overdue subscribers' },
  { code: '1200', name: 'Inventory Asset - Hardware & Fiber', type: 'ASSET' as const, description: 'Total on-hand valuation of ONUs, CPEs, cables, and routers' },
  { code: '1500', name: 'Fixed Assets - Core Network Equipment', type: 'ASSET' as const, description: 'CCR Routers, OLT chasses, switches, and towers' },
  { code: '1590', name: 'Accumulated Depreciation - Network Gear', type: 'ASSET' as const, description: 'Contra-asset for cumulative equipment depreciation' },
  { code: '2010', name: 'Accounts Payable - Suppliers', type: 'LIABILITY' as const, description: 'Bills owed to hardware vendors and upstream transit carriers' },
  { code: '2100', name: 'Deferred Subscription Revenue', type: 'LIABILITY' as const, description: 'Unearned customer advance prepayments' },
  { code: '2200', name: 'VAT / Tax Payable (10%)', type: 'LIABILITY' as const, description: 'Sales and value-added tax collected on behalf of GDT' },
  { code: '3010', name: 'Owner Invested Capital', type: 'EQUITY' as const, description: 'Initial paid-in equity capital' },
  { code: '3020', name: 'Retained Earnings', type: 'EQUITY' as const, description: 'Cumulative net operating income reinvested in the business' },
  { code: '4010', name: 'Fiber Internet Subscription Revenue', type: 'REVENUE' as const, description: 'Recurring monthly revenue from FTTH customers' },
  { code: '4020', name: 'Wireless Broadband Revenue', type: 'REVENUE' as const, description: 'Recurring monthly revenue from WISP subscribers' },
  { code: '4030', name: 'Installation & Setup Fees', type: 'REVENUE' as const, description: 'One-time initial customer drop and provisioning fees' },
  { code: '4040', name: 'Customer Equipment Sales', type: 'REVENUE' as const, description: 'Sale of Wi-Fi routers and accessories' },
  { code: '5010', name: 'Upstream Transit & Bandwidth Cost', type: 'EXPENSE' as const, description: 'IP transit, IXP peering, and international submarine fiber links' },
  { code: '5020', name: 'Cost of Goods Sold (CPE/ONTs)', type: 'EXPENSE' as const, description: 'Hardware cost consumed during customer installations' },
  { code: '5100', name: 'Network Infrastructure Maintenance', type: 'EXPENSE' as const, description: 'Fiber splicing, drop cable repairs, tower climbing repairs' },
  { code: '5200', name: 'Staff Salaries & Field Engineers', type: 'EXPENSE' as const, description: 'Payroll for technicians, NOC engineers, and administration' },
  { code: '5300', name: 'Tower & POP Electricity', type: 'EXPENSE' as const, description: 'Power utility bills for regional distribution points' },
  { code: '5400', name: 'Tower Site & Colocation Rent', type: 'EXPENSE' as const, description: 'Monthly lease fees for rooftop and telecom tower leases' },
  { code: '5500', name: 'Depreciation Expense', type: 'EXPENSE' as const, description: 'Monthly depreciation of routers and telecom equipment' },
];

export async function seed() {
  console.log('🌱 Starting NSMISP Prisma database seed...');

  try {
    await prisma.$connect();

    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@nsmisp.net';
    const adminPassword = process.env.ADMIN_PASSWORD || 'StrongSuperAdminPassword2026!';
    const adminFullName = process.env.ADMIN_FULLNAME || 'David Vance';

    const adminHash = await bcrypt.hash(adminPassword, BCRYPT_SALT_ROUNDS);

    const superAdmin = await prisma.user.upsert({
      where: { username: adminUsername },
      update: {
        email: adminEmail,
        fullName: adminFullName,
        passwordHash: adminHash,
        role: UserRoleType.SUPER_ADMIN,
        isActive: true,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
      create: {
        username: adminUsername,
        email: adminEmail,
        fullName: adminFullName,
        passwordHash: adminHash,
        role: UserRoleType.SUPER_ADMIN,
        isActive: true,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    console.log(`✓ Super Admin user ensured: ${superAdmin.username} (${superAdmin.email})`);

    if (process.env.NODE_ENV !== 'production') {
      const demoUsers = [
        {
          username: 'engineer',
          email: 'noc@nsmisp.net',
          fullName: 'Vireak Chan',
          role: UserRoleType.NETWORK_ENGINEER,
          password: 'Password123!',
        },
        {
          username: 'cashier',
          email: 'cashier@nsmisp.net',
          fullName: 'Bopha Pich',
          role: UserRoleType.BILLING_CASHIER,
          password: 'Password123!',
        },
        {
          username: 'tech',
          email: 'tech@nsmisp.net',
          fullName: 'Marcus Vance',
          role: UserRoleType.FIELD_TECHNICIAN,
          password: 'Password123!',
        },
        {
          username: 'support',
          email: 'support@nsmisp.net',
          fullName: 'Sokunthea Keo',
          role: UserRoleType.SUPPORT_AGENT,
          password: 'Password123!',
        },
        {
          username: 'accountant',
          email: 'finance@nsmisp.net',
          fullName: 'Sophea Pich',
          role: UserRoleType.ACCOUNTANT,
          password: 'Password123!',
        },
      ];

      for (const du of demoUsers) {
        const hash = await bcrypt.hash(du.password, BCRYPT_SALT_ROUNDS);
        await prisma.user.upsert({
          where: { username: du.username },
          update: {
            email: du.email,
            fullName: du.fullName,
            passwordHash: hash,
            role: du.role,
            isActive: true,
            failedLoginAttempts: 0,
            lockedUntil: null,
          },
          create: {
            username: du.username,
            email: du.email,
            fullName: du.fullName,
            passwordHash: hash,
            role: du.role,
            isActive: true,
            failedLoginAttempts: 0,
            lockedUntil: null,
          },
        });
        console.log(`  - Demo user ensured: ${du.username} [${du.role}]`);
      }
    }

    // Company settings
    const existingCompanySetting = await prisma.companySetting.findFirst();
    if (!existingCompanySetting) {
      await prisma.companySetting.create({
        data: {
          companyName: 'NSMISP High-Speed Broadband LLC',
          supportEmail: 'support@nsmisp.net',
        },
      });
    } else if (
      existingCompanySetting.companyName.includes('NetPulse') ||
      existingCompanySetting.supportEmail === 'support@netpulse.net'
    ) {
      await prisma.companySetting.update({
        where: { id: existingCompanySetting.id },
        data: {
          companyName: existingCompanySetting.companyName.replace(/NetPulse/gi, 'NSMISP'),
          supportEmail:
            existingCompanySetting.supportEmail === 'support@netpulse.net'
              ? 'support@nsmisp.net'
              : existingCompanySetting.supportEmail,
        },
      });
    }

    // RBAC matrix
    console.log('🌱 Seeding RBAC Permissions and Roles matrix...');
    await RbacService.seedRbac();
    console.log('✓ RBAC Permissions and Roles matrix seeded successfully.');

    // Network routers (create if missing)
    const routerIdsByKey: Record<string, string> = {};
    for (const r of BASE_ROUTERS) {
      const found = await prisma.router.findFirst({
        where: { OR: [{ id: r.id }, { managementIp: r.managementIp }, { name: r.name }] },
      });
      if (found) {
        routerIdsByKey[r.id] = found.id;
      } else {
        const created = await prisma.router.create({ data: r });
        routerIdsByKey[r.id] = created.id;
      }
    }

    // VLANs
    const baseVlans = [
      { id: 'vlan-10', vlanId: 10, name: 'VLAN10_Mgmt', description: 'Core Infrastructure Management', purpose: 'MANAGEMENT' as const, routerKey: 'rtr-core-1', interface: 'sfp-sfpplus1', tagged: true, subnet: '10.10.0.0/24', gateway: '10.10.0.1', status: 'Active' },
      { id: 'vlan-20', vlanId: 20, name: 'VLAN20_Fiber_PP_Residential', description: 'Residential FTTH PPPoE Subscribers', purpose: 'FIBER_INTERNET' as const, routerKey: 'rtr-core-1', interface: 'sfp-sfpplus1', tagged: true, subnet: '10.20.0.0/20', gateway: '10.20.0.1', status: 'Active' },
      { id: 'vlan-30', vlanId: 30, name: 'VLAN30_WISP_Subscribers', description: 'Wireless Broadband Subscribers', purpose: 'WIRELESS_INTERNET' as const, routerKey: 'rtr-wireless-1', interface: 'ether1', tagged: true, subnet: '10.30.0.0/22', gateway: '10.30.0.1', status: 'Active' },
      { id: 'vlan-50', vlanId: 50, name: 'VLAN50_Corporate_DIA', description: 'Dedicated Corporate Internet & Metro-E', purpose: 'CORPORATE' as const, routerKey: 'rtr-core-1', interface: 'sfp-sfpplus2', tagged: true, subnet: '192.168.50.0/24', gateway: '192.168.50.1', status: 'Active' },
    ];
    for (const v of baseVlans) {
      const targetRouterId = routerIdsByKey[v.routerKey];
      if (!targetRouterId) continue;
      const existing = await prisma.vLAN.findFirst({
        where: { OR: [{ id: v.id }, { vlanId: v.vlanId, routerId: targetRouterId, interface: v.interface }] },
      });
      if (!existing) {
        const { routerKey: _rk, ...vlanData } = v;
        await prisma.vLAN.create({ data: { ...vlanData, routerId: targetRouterId } });
      }
    }

    // IP Pools
    const basePools = [
      { id: 'pool-fiber-1', name: 'pool-fiber-residential', routerKey: 'rtr-core-1', startIp: '10.20.1.1', endIp: '10.20.7.254', totalIps: 1792, usedIps: 420, gateway: '10.20.0.1', dnsPrimary: '1.1.1.1', dnsSecondary: '8.8.8.8' },
      { id: 'pool-wisp-1', name: 'pool-wireless-subscribers', routerKey: 'rtr-wireless-1', startIp: '10.30.1.1', endIp: '10.30.3.254', totalIps: 768, usedIps: 115, gateway: '10.30.0.1', dnsPrimary: '1.1.1.1', dnsSecondary: '8.8.8.8' },
    ];
    for (const pool of basePools) {
      const targetRouterId = routerIdsByKey[pool.routerKey];
      if (!targetRouterId) continue;
      const existing = await prisma.iPPool.findFirst({
        where: { OR: [{ id: pool.id }, { name: pool.name }] },
      });
      if (!existing) {
        const { routerKey: _rk, ...poolData } = pool;
        await prisma.iPPool.create({ data: { ...poolData, routerId: targetRouterId } });
      }
    }

    // Packages
    const packageIdsByKey: Record<string, string> = {};
    for (const pkg of BASE_PACKAGES) {
      const existing = await prisma.package.findFirst({
        where: { OR: [{ id: pkg.id }, { name: pkg.name }] },
      });
      if (existing) {
        packageIdsByKey[pkg.id] = existing.id;
      } else {
        const created = await prisma.package.create({ data: pkg });
        packageIdsByKey[pkg.id] = created.id;
      }
    }

    // Baseline Customers (only created if absent so custom user edits stay intact)
    const baseCustomers = [
      { id: 'cust-1001', code: 'CUST-1001', type: 'RESIDENTIAL' as const, status: 'ACTIVE' as const, fullName: 'Sarah Chen', email: 'sarah.c@gmail.com', phone: '+855 12 345 678', address: 'Apt 4B, St. 310, BKK1', city: 'Phnom Penh', balanceDue: 0.0, rating: 5.0, pkgKey: 'pkg-2', monthlyPrice: 55.0, ipAddress: '10.20.1.42', macAddress: '48:8F:5A:12:44:01', pppoeUsername: 'chen_sarah_pppoe' },
      { id: 'cust-1002', code: 'CUST-1002', type: 'RESIDENTIAL' as const, status: 'ACTIVE' as const, fullName: 'Michael Torres', email: 'm.torres@yahoo.com', phone: '+855 12 987 654', address: 'Villa 18, Borey Peng Huoth', city: 'Phnom Penh', balanceDue: 0.0, rating: 4.8, pkgKey: 'pkg-3', monthlyPrice: 89.0, ipAddress: '10.20.1.43', macAddress: '48:8F:5A:12:44:02', pppoeUsername: 'torres_m_pppoe' },
      { id: 'cust-1003', code: 'CUST-1003', type: 'BUSINESS' as const, status: 'OVERDUE' as const, fullName: 'Apex Digital Studio', companyName: 'Apex Digital Co., Ltd.', taxNumber: 'K001-99887766', email: 'billing@apexdigital.kh', phone: '+855 23 999 123', address: 'Floor 5, Vattanac Tower', city: 'Phnom Penh', balanceDue: 199.0, rating: 4.2, pkgKey: 'pkg-5', monthlyPrice: 199.0, ipAddress: '10.20.1.10', macAddress: '00:1E:67:8A:9B:10', pppoeUsername: 'apex_biz_dia' },
      { id: 'cust-1004', code: 'CUST-1004', type: 'RESIDENTIAL' as const, status: 'SUSPENDED' as const, fullName: 'David Nguyen', email: 'dnguyen@gmail.com', phone: '+855 98 111 222', address: 'House 88, St. 2004', city: 'Phnom Penh', balanceDue: 110.0, rating: 3.5, pkgKey: 'pkg-2', monthlyPrice: 55.0, ipAddress: '10.20.1.55', macAddress: '48:8F:5A:12:44:04', pppoeUsername: 'nguyen_d_pppoe' },
      { id: 'cust-1005', code: 'CUST-1005', type: 'RESIDENTIAL' as const, status: 'PENDING' as const, fullName: 'Kimleng Sok', email: 'kimleng.sok@gmail.com', phone: '+855 89 555 777', address: 'St. 598, Russey Keo', city: 'Phnom Penh', balanceDue: 60.0, rating: 5.0, pkgKey: 'pkg-1', monthlyPrice: 35.0, ipAddress: '10.20.1.80', macAddress: '48:8F:5A:12:44:05', pppoeUsername: 'sok_kimleng_pppoe' },
    ];
    const customerIdsByKey: Record<string, string> = {};
    for (const c of baseCustomers) {
      const existing = await prisma.customer.findFirst({
        where: { OR: [{ id: c.id }, { code: c.code }, { email: c.email }] },
      });
      if (existing) {
        customerIdsByKey[c.id] = existing.id;
      } else {
        const created = await prisma.customer.create({
          data: {
            id: c.id,
            code: c.code,
            type: c.type,
            status: c.status,
            nameKm: /[\u1780-\u17FF]/.test(c.fullName) ? c.fullName : null,
            nameEn: !/[\u1780-\u17FF]/.test(c.fullName) ? c.fullName : null,
            fullName: c.fullName,
            companyName: c.companyName || null,
            taxNumber: c.taxNumber || null,
            email: c.email,
            phone: c.phone,
            balanceDue: new Prisma.Decimal(c.balanceDue),
            rating: new Prisma.Decimal(c.rating),
            addresses: {
              create: {
                addressLine: c.address,
                city: c.city,
                isPrimary: true,
              },
            },
            subscriptions: {
              create: {
                subscriptionNumber: `SUB-${c.code}`,
                packageId: packageIdsByKey[c.pkgKey] || packageIdsByKey['pkg-2'],
                routerId: routerIdsByKey['rtr-core-1'],
                technology: 'FIBER',
                status: c.status === 'ACTIVE' ? 'ACTIVE' : c.status === 'SUSPENDED' ? 'SUSPENDED' : 'PENDING',
                monthlyFee: new Prisma.Decimal(c.monthlyPrice),
                pppoeAccount: {
                  create: {
                    username: c.pppoeUsername,
                    passwordHash: 'seeded_pppoe_hash',
                    routerId: routerIdsByKey['rtr-core-1'],
                    ipAddress: c.ipAddress,
                    macAddress: c.macAddress,
                    isActive: c.status !== 'SUSPENDED',
                    isOnline: c.status === 'ACTIVE',
                  },
                },
              },
            },
          },
        });
        customerIdsByKey[c.id] = created.id;
      }
    }

    // Chart of Accounts
    for (const acc of CHART_OF_ACCOUNTS) {
      await prisma.account.upsert({
        where: { code: acc.code },
        update: {},
        create: {
          code: acc.code,
          name: acc.name,
          type: acc.type,
          description: acc.description,
          balance: new Prisma.Decimal(0.0),
        },
      });
    }

    // Initial Accounting Period & Opening Balance Journal (only if none exist yet)
    const journalCount = await prisma.journalEntry.count();
    if (journalCount === 0) {
      const period = await prisma.accountingPeriod.upsert({
        where: { name: '2026-11' },
        update: {},
        create: {
          name: '2026-11',
          startDate: new Date('2026-11-01T00:00:00Z'),
          endDate: new Date('2026-11-30T23:59:59Z'),
        },
      });

      const openingLines = [
        { code: '1020', debit: 25000.0, credit: 0.0, desc: 'Operating Bank Account (ABA Bank)' },
        { code: '1200', debit: 8500.0, credit: 0.0, desc: 'Hardware Inventory on Hand' },
        { code: '1500', debit: 12000.0, credit: 0.0, desc: 'Core Network Equipment' },
        { code: '3010', debit: 0.0, credit: 45500.0, desc: 'Owner Invested Capital' },
      ];

      const accountsByCode = new Map(
        (await prisma.account.findMany()).map((a) => [a.code, a])
      );

      await prisma.$transaction(async (tx) => {
        const je = await tx.journalEntry.create({
          data: {
            entryNumber: 'JE-2026-00001',
            periodId: period.id,
            entryDate: new Date('2026-11-01T00:00:00Z'),
            description: 'Opening balance: Operating bank capital and equipment assets',
            reference: 'INIT-CAPITAL',
            isPosted: true,
            isReversed: false,
            createdBy: 'David Vance',
          },
        });

        for (const l of openingLines) {
          const acc = accountsByCode.get(l.code);
          if (!acc) continue;
          await tx.journalEntryLine.create({
            data: {
              journalEntryId: je.id,
              accountId: acc.id,
              debit: new Prisma.Decimal(l.debit),
              credit: new Prisma.Decimal(l.credit),
              description: l.desc,
            },
          });
          const delta = acc.type === 'ASSET' || acc.type === 'EXPENSE' ? l.debit - l.credit : l.credit - l.debit;
          await tx.account.update({
            where: { id: acc.id },
            data: { balance: { increment: new Prisma.Decimal(delta) } },
          });
        }
      });
    }

    // Warehouses
    const baseWarehouses = [
      { id: 'wh-1', code: 'WH-01', name: 'Main Warehouse Phnom Penh', address: 'Borey Vimean Phnom Penh, St. 598', managerName: 'Sok Vichea', phone: '+855 12 777 001', isDefault: true },
      { id: 'wh-2', code: 'WH-02', name: 'Siem Reap Branch Warehouse', address: 'National Road 6, Svay Dangkum', managerName: 'Kosal Heng', phone: '+855 12 777 002', isDefault: false },
      { id: 'wh-3', code: 'WH-03', name: 'Mobile Technician Van Stock (Van #1)', address: 'Field Operations Vehicle', managerName: 'Marcus Vance', phone: '+855 98 444 101', isDefault: false },
    ];
    const whIdsByKey: Record<string, string> = {};
    for (const wh of baseWarehouses) {
      const existing = await prisma.warehouse.findFirst({ where: { OR: [{ id: wh.id }, { code: wh.code }] } });
      if (existing) whIdsByKey[wh.id] = existing.id;
      else {
        const created = await prisma.warehouse.create({ data: wh });
        whIdsByKey[wh.id] = created.id;
      }
    }

    // Suppliers
    const baseSuppliers = [
      { id: 'sup-1', code: 'SUP-001', name: 'Huawei Enterprise Cambodia', contactPerson: 'Mr. Zhang Wei', email: 'sales@huawei.kh', phone: '+855 23 888 111', balancePayable: new Prisma.Decimal(12500.0) },
      { id: 'sup-2', code: 'SUP-002', name: 'MikroTik Official SEA Partner', contactPerson: 'Alexandre Meyer', email: 'orders@mikrotik-sea.com', phone: '+65 6789 0123', balancePayable: new Prisma.Decimal(4200.0) },
      { id: 'sup-3', code: 'SUP-003', name: 'FiberOptics Distribution Ltd', contactPerson: 'Chea Dara', email: 'dara@fiberoptics.com.kh', phone: '+855 12 333 444', balancePayable: new Prisma.Decimal(1850.0) },
    ];
    for (const sup of baseSuppliers) {
      const existing = await prisma.supplier.findFirst({ where: { OR: [{ id: sup.id }, { code: sup.code }] } });
      if (!existing) await prisma.supplier.create({ data: sup });
    }

    // Products
    const baseProducts = [
      { id: 'prod-1', sku: 'ONT-HG8245H5', name: 'Huawei EchoLife HG8245H5 GPON ONT', categoryName: 'ONU/ONT', quantity: 145, minStockAlert: 20, costPrice: new Prisma.Decimal(28.0), unitPrice: new Prisma.Decimal(45.0), status: 'IN_STOCK' as const, supplier: 'Huawei Enterprise Cambodia', location: 'Aisle 2 - Shelf B', description: '4 GE ports, 2 POTS ports, 1 USB port and 2.4G WiFi' },
      { id: 'prod-2', sku: 'RTR-RB5009', name: 'MikroTik RB5009UG+S+IN Heavy Duty Router', categoryName: 'MikroTik Routers', quantity: 18, minStockAlert: 5, costPrice: new Prisma.Decimal(165.0), unitPrice: new Prisma.Decimal(220.0), status: 'IN_STOCK' as const, supplier: 'MikroTik Official SEA Partner', location: 'Aisle 1 - Secure Cabinet A', description: 'Gigabit router with 2.5G port and 10G SFP+ cage' },
      { id: 'prod-3', sku: 'CBL-DROP-1KM', name: 'FTTH Figure-8 Drop Cable 1-Core 1000m Drum', categoryName: 'Drop Cables', quantity: 42, minStockAlert: 10, costPrice: new Prisma.Decimal(65.0), unitPrice: new Prisma.Decimal(95.0), status: 'IN_STOCK' as const, supplier: 'FiberOptics Distribution Ltd', location: 'Warehouse Floor Zone C', description: 'Self-supporting steel messenger wire outdoor drop cable' },
      { id: 'prod-4', sku: 'CPE-LBE-5AC', name: 'Ubiquiti LiteBeam 5AC Gen2 Wireless CPE', categoryName: 'Wireless CPE', quantity: 28, minStockAlert: 8, costPrice: new Prisma.Decimal(52.0), unitPrice: new Prisma.Decimal(75.0), status: 'IN_STOCK' as const, supplier: 'MikroTik Official SEA Partner', location: 'Aisle 3 - Shelf D', description: '23 dBi 5GHz airMAX ac directional CPE bridge' },
      { id: 'prod-5', sku: 'SFP-10G-LR', name: '10G SFP+ LR Single Mode 1310nm 10km Module', categoryName: 'SFP Modules', quantity: 6, minStockAlert: 10, costPrice: new Prisma.Decimal(22.0), unitPrice: new Prisma.Decimal(40.0), status: 'LOW_STOCK' as const, supplier: 'FiberOptics Distribution Ltd', location: 'Aisle 1 - Tray 4', description: 'Standard single-mode duplex 10G optical transceiver' },
    ];
    const prodIdsByKey: Record<string, string> = {};
    for (const p of baseProducts) {
      const existing = await prisma.product.findFirst({ where: { OR: [{ id: p.id }, { sku: p.sku }] } });
      if (existing) prodIdsByKey[p.id] = existing.id;
      else {
        const created = await prisma.product.create({ data: p });
        prodIdsByKey[p.id] = created.id;
      }
    }

    // Serial Numbers
    const baseSerials = [
      { id: 'sn-1', serialNumber: 'SN-HW-2026-0001', macAddress: '48:8F:5A:12:44:01', prodKey: 'prod-1', custKey: 'cust-1001', status: 'INSTALLED' as const, installedAt: new Date('2025-01-15T10:00:00Z') },
      { id: 'sn-2', serialNumber: 'SN-HW-2026-0002', macAddress: '48:8F:5A:12:44:02', prodKey: 'prod-1', custKey: 'cust-1002', status: 'INSTALLED' as const, installedAt: new Date('2025-02-01T11:30:00Z') },
      { id: 'sn-3', serialNumber: 'SN-MT-2026-0003', macAddress: '00:1E:67:8A:9B:10', prodKey: 'prod-2', custKey: 'cust-1003', status: 'INSTALLED' as const, installedAt: new Date('2024-11-10T12:00:00Z') },
      { id: 'sn-4', serialNumber: 'SN-HW-2026-0004', macAddress: '48:8F:5A:12:44:04', prodKey: 'prod-1', custKey: 'cust-1004', status: 'INSTALLED' as const, installedAt: new Date('2024-09-01T15:00:00Z') },
      { id: 'sn-5', serialNumber: 'SN-HW-2026-0005', macAddress: '48:8F:5A:12:44:05', prodKey: 'prod-1', custKey: 'cust-1005', status: 'RESERVED' as const },
      { id: 'sn-6', serialNumber: 'SN-HW-2026-0006', macAddress: '48:8F:5A:12:44:06', prodKey: 'prod-1', whKey: 'wh-1', status: 'IN_STOCK' as const },
      { id: 'sn-7', serialNumber: 'SN-HW-2026-0007', macAddress: '48:8F:5A:12:44:07', prodKey: 'prod-1', whKey: 'wh-1', status: 'IN_STOCK' as const },
    ];
    for (const sn of baseSerials) {
      const existing = await prisma.serialNumber.findFirst({ where: { OR: [{ id: sn.id }, { serialNumber: sn.serialNumber }] } });
      if (!existing && prodIdsByKey[sn.prodKey]) {
        await prisma.serialNumber.create({
          data: {
            id: sn.id,
            serialNumber: sn.serialNumber,
            macAddress: sn.macAddress,
            productId: prodIdsByKey[sn.prodKey],
            customerId: sn.custKey ? customerIdsByKey[sn.custKey] || null : null,
            warehouseId: sn.whKey ? whIdsByKey[sn.whKey] || null : null,
            status: sn.status,
            installedAt: sn.installedAt || null,
          },
        });
      }
    }

    // Technicians
    const techUser = await prisma.user.findUnique({ where: { username: 'tech' } });
    const baseTechs = [
      { id: 'tech-1', userId: techUser?.id || null, name: 'Marcus Vance', phone: '+855 98 444 101', email: 'marcus@nsmisp.net', zone: 'North Zone / Toul Kork', status: 'Available', rating: new Prisma.Decimal(4.9), completedToday: 2 },
      { id: 'tech-2', name: 'Sokha Meng', phone: '+855 98 444 102', email: 'sokha@nsmisp.net', zone: 'South Zone / BKK & Chamkarmon', status: 'On Job', rating: new Prisma.Decimal(4.8), completedToday: 3 },
      { id: 'tech-3', name: 'Piseth Roeun', phone: '+855 98 444 103', email: 'piseth@nsmisp.net', zone: 'East Zone / Chbar Ampov', status: 'Available', rating: new Prisma.Decimal(4.9), completedToday: 1 },
    ];
    const techIdsByKey: Record<string, string> = {};
    for (const t of baseTechs) {
      const existing = await prisma.technician.findFirst({ where: { OR: [{ id: t.id }, { email: t.email }] } });
      if (existing) techIdsByKey[t.id] = existing.id;
      else {
        const created = await prisma.technician.create({ data: t });
        techIdsByKey[t.id] = created.id;
      }
    }

    // Installations
    const baseInstallations = [
      {
        id: 'inst-1',
        orderNumber: 'INST-2026-001',
        custKey: 'cust-1005',
        techKey: 'tech-1',
        scheduledDate: new Date('2026-11-23T09:00:00Z'),
        timeSlot: '09:00 - 11:00 AM',
        status: 'SCHEDULED' as const,
        assignedOntSn: 'SN-HW-2026-0005',
        opticalPowerDbm: new Prisma.Decimal(-19.5),
        notes: 'Customer requested ONT placed in 2nd-floor home office',
      },
      {
        id: 'inst-2',
        orderNumber: 'INST-2026-002',
        custKey: 'cust-1001',
        techKey: 'tech-1',
        scheduledDate: new Date('2025-01-15T09:00:00Z'),
        timeSlot: '10:00 - 12:00 PM',
        status: 'COMPLETED' as const,
        assignedOntSn: 'SN-HW-2026-0001',
        opticalPowerDbm: new Prisma.Decimal(-18.2),
        notes: 'Signal verified at -18.2 dBm. Customer signed completion form.',
      },
    ];
    for (const inst of baseInstallations) {
      const customerId = customerIdsByKey[inst.custKey];
      if (!customerId) continue;
      const existing = await prisma.installation.findFirst({ where: { OR: [{ id: inst.id }, { orderNumber: inst.orderNumber }] } });
      if (!existing) {
        await prisma.installation.create({
          data: {
            id: inst.id,
            orderNumber: inst.orderNumber,
            customerId,
            technicianId: techIdsByKey[inst.techKey] || null,
            scheduledDate: inst.scheduledDate,
            timeSlot: inst.timeSlot,
            status: inst.status,
            assignedOntSn: inst.assignedOntSn,
            opticalPowerDbm: inst.opticalPowerDbm,
            notes: inst.notes,
          },
        });
      }
    }

    // Invoices
    const baseInvoices = [
      {
        id: 'inv-101',
        invoiceNumber: 'INV-2026-0101',
        custKey: 'cust-1001',
        amount: 55.0,
        paidAmount: 55.0,
        balanceDue: 0.0,
        status: 'PAID' as const,
        billingPeriod: '2026-11',
        issueDate: new Date('2026-11-01T00:00:00Z'),
        dueDate: new Date('2026-11-15T00:00:00Z'),
        paidAt: new Date('2026-11-05T14:22:00Z'),
        paymentMethod: 'KHQR_BAKONG',
        items: [{ description: 'Fiber Ultra 300M (Nov 1 - Nov 30, 2026)', amount: 55.0 }],
      },
      {
        id: 'inv-102',
        invoiceNumber: 'INV-2026-0102',
        custKey: 'cust-1002',
        amount: 89.0,
        paidAmount: 89.0,
        balanceDue: 0.0,
        status: 'PAID' as const,
        billingPeriod: '2026-11',
        issueDate: new Date('2026-11-01T00:00:00Z'),
        dueDate: new Date('2026-11-15T00:00:00Z'),
        paidAt: new Date('2026-11-03T09:15:00Z'),
        paymentMethod: 'BANK_TRANSFER',
        items: [{ description: 'Fiber Gig Pro 1G (Nov 1 - Nov 30, 2026)', amount: 89.0 }],
      },
      {
        id: 'inv-103',
        invoiceNumber: 'INV-2026-0103',
        custKey: 'cust-1003',
        amount: 199.0,
        paidAmount: 0.0,
        balanceDue: 199.0,
        status: 'OVERDUE' as const,
        billingPeriod: '2026-10',
        issueDate: new Date('2026-10-01T00:00:00Z'),
        dueDate: new Date('2026-10-15T00:00:00Z'),
        paidAt: null,
        paymentMethod: null,
        items: [{ description: 'Business Dedicated 500M (Oct 1 - Oct 31, 2026)', amount: 199.0 }],
      },
      {
        id: 'inv-104',
        invoiceNumber: 'INV-2026-0104',
        custKey: 'cust-1004',
        amount: 110.0,
        paidAmount: 0.0,
        balanceDue: 110.0,
        status: 'OVERDUE' as const,
        billingPeriod: '2026-09',
        issueDate: new Date('2026-09-01T00:00:00Z'),
        dueDate: new Date('2026-09-15T00:00:00Z'),
        paidAt: null,
        paymentMethod: null,
        items: [
          { description: 'Fiber Ultra 300M (Sep 1 - Sep 30, 2026)', amount: 55.0 },
          { description: 'Fiber Ultra 300M (Oct 1 - Oct 31, 2026)', amount: 55.0 },
        ],
      },
    ];
    for (const inv of baseInvoices) {
      const customerId = customerIdsByKey[inv.custKey];
      if (!customerId) continue;
      const existing = await prisma.invoice.findFirst({ where: { OR: [{ id: inv.id }, { invoiceNumber: inv.invoiceNumber }] } });
      if (!existing) {
        await prisma.invoice.create({
          data: {
            id: inv.id,
            invoiceNumber: inv.invoiceNumber,
            customerId,
            amount: new Prisma.Decimal(inv.amount),
            paidAmount: new Prisma.Decimal(inv.paidAmount),
            balanceDue: new Prisma.Decimal(inv.balanceDue),
            status: inv.status,
            billingPeriod: inv.billingPeriod,
            issueDate: inv.issueDate,
            dueDate: inv.dueDate,
            paidAt: inv.paidAt,
            paymentMethod: inv.paymentMethod,
            items: {
              create: inv.items.map((it) => ({
                description: it.description,
                quantity: 1,
                unitPrice: new Prisma.Decimal(it.amount),
                amount: new Prisma.Decimal(it.amount),
              })),
            },
          },
        });
      }
    }

    // Support Tickets
    const baseTickets = [
      { id: 'tck-101', ticketNumber: 'TCK-1042', custKey: 'cust-1003', techKey: 'tech-1', title: 'High latency and intermittent packet drop on uplink', description: 'Our video rendering upload is buffering. Ping test to 8.8.8.8 shows 5% packet loss between 2 PM and 4 PM.', priority: 'HIGH' as const, status: 'IN_PROGRESS' as const, category: 'Slow Internet' },
      { id: 'tck-102', ticketNumber: 'TCK-1043', custKey: 'cust-1004', techKey: 'tech-2', title: 'Account suspended - Request payment verification and reconnect', description: 'We sent bank transfer receipt yesterday afternoon. Please review and restore PPPoE connection.', priority: 'MEDIUM' as const, status: 'OPEN' as const, category: 'Billing Issue' },
      { id: 'tck-103', ticketNumber: 'TCK-1040', custKey: 'cust-1001', techKey: 'tech-1', title: 'Red LOS light on Huawei ONT after heavy storm', description: 'Storm broke tree branch near telephone pole on St. 310. Fiber drop wire appears severed.', priority: 'CRITICAL' as const, status: 'RESOLVED' as const, category: 'Fiber Problem' },
    ];
    for (const tck of baseTickets) {
      const customerId = customerIdsByKey[tck.custKey];
      if (!customerId) continue;
      const existing = await prisma.supportTicket.findFirst({ where: { OR: [{ id: tck.id }, { ticketNumber: tck.ticketNumber }] } });
      if (!existing) {
        await prisma.supportTicket.create({
          data: {
            id: tck.id,
            ticketNumber: tck.ticketNumber,
            customerId,
            technicianId: techIdsByKey[tck.techKey] || null,
            title: tck.title,
            description: tck.description,
            priority: tck.priority,
            status: tck.status,
            category: tck.category,
          },
        });
      }
    }

    // Notifications (if empty)
    if ((await prisma.notification.count()) === 0) {
      await prisma.notification.createMany({
        data: [
          {
            title: 'Past-due invoice reminder sent',
            description: 'Auto-reminder dispatched to Apex Digital Studio (CUST-1003)',
            type: 'invoice',
            read: false,
          },
          {
            title: 'MikroTik Core Router health check normal',
            description: 'CPU load 14%, memory usage 32%, all PPPoE interfaces responding',
            type: 'system',
            read: true,
          },
        ],
      });
    }

    // Automation Rules (if empty)
    if ((await prisma.automationRule.count()) === 0) {
      await prisma.automationRule.createMany({
        data: [
          {
            title: 'Automated Past Due Suspension',
            description: 'Automatically restrict bandwidth and suspend accounts when balance is 14 days overdue.',
            triggerType: 'OVERDUE_SUSPENSION',
            enabled: true,
          },
          {
            title: 'Auto-Invoice Generation',
            description: 'Generate monthly invoices and send PDF to customer email 7 days before billing due date.',
            triggerType: 'AUTO_INVOICE',
            enabled: true,
          },
          {
            title: 'Optical Signal Degradation Alert',
            description: 'Trigger support ticket when customer ONT optical power drops below -27 dBm.',
            triggerType: 'SIGNAL_DEGRADATION',
            enabled: true,
          },
          {
            title: 'Daily Core Router Backup Snapshot',
            description: 'Export RouterOS configuration binary (.backup) to secure offsite storage nightly at 03:00.',
            triggerType: 'ROUTER_BACKUP',
            enabled: true,
          },
        ],
      });
    }

    console.log('✓ NSMISP Database seeding completed successfully.');
  } catch (err: any) {
    console.error('❌ Seeding failed:', err.message || err);
    throw err;
  } finally {
    await prisma.$disconnect();
  }
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
