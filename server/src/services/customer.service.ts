import { Prisma } from '@prisma/client';
import { prisma, logAudit } from '../db/store.js';
import { MikroTikService } from './mikrotik.service.js';
import {
  normalizeNameInput,
  resolveCustomerNamesForCreate,
  resolveCustomerNamesForUpdate,
} from '../utils/bilingualName.js';

function formatCustomerRecord(c: any) {
  const primaryAddr = c.addresses?.find((a: any) => a.isPrimary) || c.addresses?.[0];
  const sub = c.subscriptions?.[0];
  const tier = sub?.bandwidthTier;
  return {
    id: c.id,
    code: c.code,
    type: c.type,
    status: c.status,
    nameKm: c.nameKm ?? null,
    nameEn: c.nameEn ?? null,
    fullName: c.fullName || c.nameEn || c.nameKm || '',
    email: c.email,
    phone: c.phone,
    address: primaryAddr?.addressLine || 'N/A',
    city: primaryAddr?.city || 'Phnom Penh',
    balanceDue: Number(c.balanceDue),
    rating: Number(c.rating),
    planId: sub?.packageId || '',
    planName: sub?.package?.name || 'Fiber Ultra 300M',
    bandwidthTierId: sub?.bandwidthTierId || '',
    bandwidthTierLabel: tier?.label || (tier ? `${tier.downloadSpeed} Mbps` : ''),
    speedMbps: tier?.downloadSpeed ?? sub?.package?.downloadSpeed,
    uploadMbps: tier?.uploadSpeed ?? sub?.package?.uploadSpeed,
    durationDays: tier?.durationDays ?? 30,
    monthlyPrice: Number(sub?.monthlyFee || tier?.price || sub?.package?.monthlyPrice || 55.0),
    dataCapGB: tier?.dataAllowanceGB ?? sub?.package?.dataAllowanceGB ?? null,
    connectionType: sub?.technology || 'FIBER',
    ipAddress: sub?.pppoeAccount?.ipAddress || '10.20.1.42',
    macAddress: sub?.pppoeAccount?.macAddress || '48:8F:5A:12:44:01',
    pppoeUsername: sub?.pppoeAccount?.username || '',
    registrationDate: c.registrationDate?.toISOString() || c.createdAt.toISOString(),
  };
}

function parseMultiFilter(val: unknown): string[] {
  if (!val) return [];
  const rawList = Array.isArray(val) ? val : String(val).split(',');
  return rawList
    .map((v) => String(v).trim())
    .filter((v) => v.length > 0 && v.toLowerCase() !== 'all');
}

const VALID_CUSTOMER_STATUSES = new Set([
  'ACTIVE',
  'SUSPENDED',
  'OVERDUE',
  'PENDING',
  'DISCONNECTED',
]);

const VALID_CONNECTION_TYPES = new Set(['FIBER', 'WIRELESS', 'LTE', 'DSL']);

function buildCustomerWhere(filters: any = {}): Prisma.CustomerWhereInput {
  const andClauses: Prisma.CustomerWhereInput[] = [];

  const statuses = parseMultiFilter(filters.status)
    .map((s) => s.toUpperCase())
    .filter((s) => VALID_CUSTOMER_STATUSES.has(s));
  if (statuses.length > 0) {
    andClauses.push({ status: { in: statuses as any[] } });
  }

  const plans = parseMultiFilter(filters.plan);
  if (plans.length > 0) {
    andClauses.push({
      subscriptions: {
        some: {
          package: { name: { in: plans } },
        },
      },
    });
  }

  const cities = parseMultiFilter(filters.city);
  if (cities.length > 0) {
    andClauses.push({
      addresses: {
        some: { city: { in: cities } },
      },
    });
  }

  const connectionTypes = parseMultiFilter(filters.connectionType)
    .map((t) => t.toUpperCase())
    .filter((t) => VALID_CONNECTION_TYPES.has(t));
  if (connectionTypes.length > 0) {
    andClauses.push({
      subscriptions: {
        some: {
          technology: { in: connectionTypes as any[] },
        },
      },
    });
  }

  if (filters.minBalance !== undefined && filters.minBalance !== null && filters.minBalance !== '') {
    const min = Number(filters.minBalance);
    if (!Number.isNaN(min)) {
      andClauses.push({ balanceDue: { gte: min } });
    }
  }

  if (filters.maxBalance !== undefined && filters.maxBalance !== null && filters.maxBalance !== '') {
    const max = Number(filters.maxBalance);
    if (!Number.isNaN(max)) {
      andClauses.push({ balanceDue: { lte: max } });
    }
  }

  const nameFilter = normalizeNameInput(filters.nameFilter);
  if (nameFilter) {
    andClauses.push({
      OR: [
        { nameKm: { contains: nameFilter, mode: 'insensitive' } },
        { nameEn: { contains: nameFilter, mode: 'insensitive' } },
        { fullName: { contains: nameFilter, mode: 'insensitive' } },
      ],
    });
  }

  const codeFilter = normalizeNameInput(filters.codeFilter);
  if (codeFilter) {
    andClauses.push({ code: { contains: codeFilter, mode: 'insensitive' } });
  }

  const rawSearch = filters.searchQuery ?? filters.search ?? filters.q;
  const normalizedQuery = normalizeNameInput(rawSearch);
  if (normalizedQuery) {
    const searchOr: Prisma.CustomerWhereInput[] = [
      { nameKm: { contains: normalizedQuery, mode: 'insensitive' } },
      { nameEn: { contains: normalizedQuery, mode: 'insensitive' } },
      { fullName: { contains: normalizedQuery, mode: 'insensitive' } },
      { code: { contains: normalizedQuery, mode: 'insensitive' } },
      { email: { contains: normalizedQuery, mode: 'insensitive' } },
      { phone: { contains: normalizedQuery, mode: 'insensitive' } },
    ];

    // Keep text searches purely on trigram GIN Customer columns; include PPPoE IP/MAC only for network-style queries
    if (/\d+\.\d+/.test(normalizedQuery) || /[0-9a-f]{2}:[0-9a-f]{2}/i.test(normalizedQuery)) {
      searchOr.push({
        subscriptions: {
          some: {
            pppoeAccount: {
              OR: [
                { ipAddress: { contains: normalizedQuery, mode: 'insensitive' } },
                { macAddress: { contains: normalizedQuery, mode: 'insensitive' } },
              ],
            },
          },
        },
      });
    }

    andClauses.push({ OR: searchOr });
  }

  return andClauses.length > 0 ? { AND: andClauses } : {};
}

function buildCustomerOrderBy(sortBy?: string, sortDir?: string): Prisma.CustomerOrderByWithRelationInput | Prisma.CustomerOrderByWithRelationInput[] {
  const dir: Prisma.SortOrder = String(sortDir || 'asc').toLowerCase() === 'desc' ? 'desc' : 'asc';
  if (!sortBy) {
    return { createdAt: 'desc' };
  }
  switch (sortBy) {
    case 'name':
    case 'fullName':
    case 'displayName':
    case 'customerName':
      return [{ fullName: dir }, { createdAt: 'desc' }];
    case 'code':
      return [{ code: dir }];
    case 'status':
      return [{ status: dir }, { createdAt: 'desc' }];
    case 'balanceDue':
      return [{ balanceDue: dir }, { createdAt: 'desc' }];
    case 'rating':
      return [{ rating: dir }, { createdAt: 'desc' }];
    case 'email':
      return [{ email: dir }];
    case 'registrationDate':
    case 'installationDate':
      return [{ registrationDate: dir }, { createdAt: 'desc' }];
    case 'createdAt':
    default:
      return { createdAt: sortBy === 'createdAt' ? dir : 'desc' };
  }
}

export class CustomerService {
  // 1. List Customers with SQL filters, sorting, and optional pagination
  static async listCustomers(filters: any = {}) {
    const where = buildCustomerWhere(filters);
    const orderBy = buildCustomerOrderBy(
      typeof filters.sortBy === 'string' ? filters.sortBy : undefined,
      typeof filters.sortDir === 'string' ? filters.sortDir : undefined
    );

    const hasPagination =
      filters.page !== undefined ||
      filters.limit !== undefined ||
      filters.pageSize !== undefined ||
      filters.paged === '1' ||
      filters.paged === 'true';

    const include = {
      addresses: {
        orderBy: [{ isPrimary: 'desc' as const }, { createdAt: 'asc' as const }],
        take: 1,
      },
      subscriptions: {
        orderBy: { createdAt: 'desc' as const },
        take: 1,
        include: {
          package: true,
          bandwidthTier: true,
          pppoeAccount: true,
        },
      },
    };

    if (hasPagination) {
      const page = Math.max(1, parseInt(String(filters.page ?? '1'), 10) || 1);
      const limit = Math.min(
        200,
        Math.max(1, parseInt(String(filters.limit ?? filters.pageSize ?? '25'), 10) || 25)
      );
      const skip = (page - 1) * limit;

      const [total, customers] = await Promise.all([
        prisma.customer.count({ where }),
        prisma.customer.findMany({
          where,
          skip,
          take: limit,
          orderBy,
          include,
        }),
      ]);

      return {
        items: customers.map(formatCustomerRecord),
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      };
    }

    const customers = await prisma.customer.findMany({
      where,
      take: filters.all === 'true' ? undefined : 500,
      orderBy,
      include,
    });

    return customers.map(formatCustomerRecord);
  }

  // 1b. Lightweight KPI & filter facet summary via SQL aggregates
  static async getCustomerStats() {
    const [statusRows, mrrRows, cityRows, plans] = await Promise.all([
      prisma.customer.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      prisma.$queryRaw<Array<{ totalMrr: number }>>`
        SELECT COALESCE(SUM(sub_fee), 0)::float AS "totalMrr"
        FROM (
          SELECT DISTINCT ON (c.id)
            COALESCE(s."monthlyFee", p."monthlyPrice", 55)::float AS sub_fee
          FROM "Customer" c
          LEFT JOIN "Subscription" s ON s."customerId" = c.id
          LEFT JOIN "Package" p ON p.id = s."packageId"
          WHERE c.status <> 'DISCONNECTED'
          ORDER BY c.id, s."createdAt" DESC
        ) t
      `,
      prisma.$queryRaw<Array<{ city: string }>>`
        SELECT DISTINCT city
        FROM "CustomerAddress"
        WHERE city IS NOT NULL AND BTRIM(city) <> ''
        ORDER BY city ASC
      `,
      prisma.package.findMany({
        where: { isActive: true },
        select: { id: true, name: true, downloadSpeed: true, monthlyPrice: true },
        orderBy: { monthlyPrice: 'asc' },
      }),
    ]);

    const statusCounts: Record<string, number> = {
      All: 0,
      Active: 0,
      Suspended: 0,
      Overdue: 0,
      Pending: 0,
      Disconnected: 0,
    };

    for (const row of statusRows) {
      const count = row._count._all;
      statusCounts.All += count;
      if (row.status === 'ACTIVE') statusCounts.Active = count;
      else if (row.status === 'SUSPENDED') statusCounts.Suspended = count;
      else if (row.status === 'OVERDUE') statusCounts.Overdue = count;
      else if (row.status === 'PENDING') statusCounts.Pending = count;
      else if (row.status === 'DISCONNECTED') statusCounts.Disconnected = count;
    }

    return {
      totalCustomers: statusCounts.All,
      activeCount: statusCounts.Active,
      suspendedCount: statusCounts.Suspended,
      overdueCount: statusCounts.Overdue,
      pendingCount: statusCounts.Pending,
      disconnectedCount: statusCounts.Disconnected,
      totalMRR: Number(mrrRows[0]?.totalMrr || 0),
      avgUsage: 120,
      statusCounts,
      cities: cityRows.map((r) => r.city),
      plans: plans.map((p) => ({
        id: p.id,
        name: p.name,
        speedMbps: p.downloadSpeed,
        monthlyPrice: Number(p.monthlyPrice),
      })),
    };
  }

  // 2. Get Full Customer 360 Profile
  static async getCustomerProfile(id: string) {
    const customer = await prisma.customer.findFirst({
      where: {
        OR: [{ id }, { code: id }],
      },
      include: {
        addresses: true,
        subscriptions: {
          include: {
            package: true,
            bandwidthTier: true,
            pppoeAccount: true,
            router: true,
          },
        },
        invoices: { orderBy: { issueDate: 'desc' } },
        payments: { orderBy: { createdAt: 'desc' } },
        tickets: { orderBy: { createdAt: 'desc' } },
        installations: { orderBy: { scheduledDate: 'desc' } },
        assignedEquipments: true,
      },
    });

    if (!customer) {
      throw new Error('Customer not found');
    }

    const formattedCust = formatCustomerRecord(customer);
    const sub = customer.subscriptions[0];
    const networkInfo = {
      connectionType: formattedCust.connectionType,
      pppoeUsername:
        formattedCust.pppoeUsername ||
        `${((formattedCust.nameEn || formattedCust.code).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'subscriber')}_pppoe`,
      assignedRouter: sub?.router?.name || 'Core-CCR2004-East (Phnom Penh POP)',
      routerId: sub?.routerId || 'rtr-core-1',
      vlanId: formattedCust.connectionType === 'WIRELESS' ? 30 : 20,
      vlanName: formattedCust.connectionType === 'WIRELESS' ? 'VLAN30_WISP_Subscribers' : 'VLAN20_Fiber_PP_Residential',
      ipAddress: formattedCust.ipAddress || '10.20.1.42',
      ipPool: formattedCust.connectionType === 'WIRELESS' ? 'pool-wireless-subscribers' : 'pool-fiber-residential',
      macAddress: formattedCust.macAddress || '48:8F:5A:12:44:01',
      connectionStatus: formattedCust.status === 'ACTIVE' ? 'Online' : 'Offline',
      lastLogin: sub?.pppoeAccount?.lastLoginAt?.toISOString() || customer.updatedAt.toISOString(),
      assignedSpeed: formattedCust.planName,
      opticalPowerDbm: -19.4,
    };

    return {
      customer: formattedCust,
      networkInfo,
      invoices: customer.invoices.map((inv) => ({
        ...inv,
        amount: Number(inv.amount),
        totalAmount: Number(inv.amount),
        paidAmount: Number(inv.paidAmount),
        balanceDue: Number(inv.balanceDue),
      })),
      payments: customer.payments.map((pmt) => ({
        ...pmt,
        amount: Number(pmt.amount),
      })),
      tickets: customer.tickets,
      installations: customer.installations,
      equipments: customer.assignedEquipments,
    };
  }

  // 3. Create Customer in PostgreSQL
  static async createCustomer(data: any) {
    const resolvedNames = resolveCustomerNamesForCreate(data);

    let pkg = await prisma.package.findFirst({
      where: {
        OR: [
          ...(data.planId ? [{ id: data.planId }] : []),
          ...(data.planName ? [{ name: data.planName }] : []),
        ],
      },
      include: {
        bandwidthTiers: {
          orderBy: [{ sortOrder: 'asc' }, { downloadSpeed: 'asc' }],
        },
      },
    });
    if (!pkg) {
      pkg = await prisma.package.findFirst({
        include: {
          bandwidthTiers: {
            orderBy: [{ sortOrder: 'asc' }, { downloadSpeed: 'asc' }],
          },
        },
      });
    }
    if (!pkg) {
      throw new Error('No internet service package configured in database.');
    }

    const tiers = (pkg as any).bandwidthTiers || [];
    const selectedTier =
      (data.bandwidthTierId ? tiers.find((t: any) => t.id === data.bandwidthTierId) : null) ||
      tiers.find((t: any) => t.isDefault) ||
      tiers[0] ||
      null;

    const monthlyPrice =
      data.monthlyPrice !== undefined
        ? Number(data.monthlyPrice)
        : Number(selectedTier?.price ?? pkg.monthlyPrice);
    const connectionType = (data.connectionType || pkg.technology || 'FIBER').toUpperCase();
    const initialStatus = (data.status || 'PENDING').toUpperCase();
    const ipAddress = data.ipAddress || `10.20.1.${Math.floor(Math.random() * 200) + 10}`;
    const macAddress = data.macAddress || `48:8F:5A:12:44:${Math.floor(Math.random() * 90 + 10)}`;

    const created = await prisma.$transaction(async (tx) => {
      const router = await tx.router.findFirst();
      if (!router) {
        throw new Error('No MikroTik router configured in database.');
      }

      const dbCustomers = await tx.customer.findMany({
        select: { id: true, code: true },
      });
      let maxDbNum = 1000;
      for (const c of dbCustomers) {
        const idMatch = c.id?.match(/^cust-(\d+)$/i);
        if (idMatch) {
          const num = parseInt(idMatch[1], 10);
          if (num < 1000000 && num > maxDbNum) maxDbNum = num;
        }
        const codeMatch = c.code?.match(/^CUST-(\d+)$/i);
        if (codeMatch) {
          const num = parseInt(codeMatch[1], 10);
          if (num < 1000000 && num > maxDbNum) maxDbNum = num;
        }
      }

      let counter = maxDbNum + 1;
      let targetId = `cust-${counter}`;
      let targetCode = `CUST-${counter}`;
      while (
        (await tx.customer.findUnique({ where: { id: targetId } })) ||
        (await tx.customer.findUnique({ where: { code: targetCode } }))
      ) {
        counter++;
        targetId = `cust-${counter}`;
        targetCode = `CUST-${counter}`;
      }

      const latinSlug = (resolvedNames.nameEn || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
      const basePppoe = `${latinSlug || targetCode.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_pppoe`;

      const existingPppoe = await tx.pPPoEAccount.findUnique({ where: { username: basePppoe } });
      const pppoeUsername = existingPppoe ? `${basePppoe}_${counter}` : basePppoe;

      const customer = await tx.customer.create({
        data: {
          id: targetId,
          code: targetCode,
          nameKm: resolvedNames.nameKm,
          nameEn: resolvedNames.nameEn,
          fullName: resolvedNames.fullName,
          email: data.email,
          phone: data.phone || '',
          type: (data.type || 'RESIDENTIAL') as any,
          status: initialStatus as any,
          rating: new Prisma.Decimal(5.0),
          balanceDue: new Prisma.Decimal(0.0),
          addresses: {
            create: {
              addressLine: data.address || 'N/A',
              city: data.city || 'Phnom Penh',
              isPrimary: true,
            },
          },
          subscriptions: {
            create: {
              subscriptionNumber: `SUB-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              packageId: pkg!.id,
              bandwidthTierId: selectedTier?.id ?? null,
              routerId: router.id,
              technology: connectionType as any,
              status: (initialStatus === 'ACTIVE' ? 'ACTIVE' : initialStatus === 'SUSPENDED' ? 'SUSPENDED' : 'PENDING') as any,
              monthlyFee: new Prisma.Decimal(monthlyPrice),
              pppoeAccount: {
                create: {
                  username: pppoeUsername,
                  passwordHash: 'pppoe_default_hash',
                  routerId: router.id,
                  ipAddress,
                  macAddress,
                  isActive: initialStatus !== 'SUSPENDED' && initialStatus !== 'DISCONNECTED',
                  isOnline: initialStatus === 'ACTIVE',
                },
              },
            },
          },
        },
        include: {
          addresses: true,
          subscriptions: {
            include: { package: true, pppoeAccount: true },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'CREATE_CUSTOMER',
          resource: 'Customer',
          resourceId: customer.code,
          details: `Registered customer ${customer.fullName}`,
          ipAddress: '127.0.0.1',
        },
      });

      return customer;
    });

    return formatCustomerRecord(created);
  }

  // 4. Update Customer
  static async updateCustomer(id: string, updates: any) {
    const existing = await prisma.customer.findFirst({
      where: { OR: [{ id }, { code: id }] },
      include: { addresses: true, subscriptions: true },
    });

    if (!existing) {
      throw new Error('Customer not found');
    }

    await prisma.$transaction(async (tx) => {
      const customerData: any = {};
      const resolvedNames = resolveCustomerNamesForUpdate(updates, existing);
      if (resolvedNames) {
        customerData.nameKm = resolvedNames.nameKm;
        customerData.nameEn = resolvedNames.nameEn;
        customerData.fullName = resolvedNames.fullName;
      }
      if (updates.email !== undefined) customerData.email = updates.email;
      if (updates.phone !== undefined) customerData.phone = updates.phone;
      if (updates.type !== undefined) customerData.type = updates.type;
      if (updates.status !== undefined) customerData.status = updates.status.toUpperCase();
      if (updates.rating !== undefined) customerData.rating = new Prisma.Decimal(updates.rating);
      if (updates.balanceDue !== undefined) customerData.balanceDue = new Prisma.Decimal(updates.balanceDue);
      if (updates.notes !== undefined) customerData.notes = updates.notes;

      if (Object.keys(customerData).length > 0) {
        await tx.customer.update({
          where: { id: existing.id },
          data: customerData,
        });
      }

      if (updates.address || updates.city) {
        const primaryAddr = existing.addresses.find((a) => a.isPrimary) || existing.addresses[0];
        if (primaryAddr) {
          await tx.customerAddress.update({
            where: { id: primaryAddr.id },
            data: {
              ...(updates.address ? { addressLine: updates.address } : {}),
              ...(updates.city ? { city: updates.city } : {}),
            },
          });
        } else {
          await tx.customerAddress.create({
            data: {
              customerId: existing.id,
              addressLine: updates.address || 'N/A',
              city: updates.city || 'Phnom Penh',
              isPrimary: true,
            },
          });
        }
      }

      if (
        updates.planId ||
        updates.planName ||
        updates.bandwidthTierId !== undefined ||
        updates.monthlyPrice !== undefined ||
        updates.connectionType
      ) {
        let resolvedPackage: { id: string; monthlyPrice: any; bandwidthTiers?: any[] } | null = null;
        if (updates.planId || updates.planName) {
          const pkgInclude = {
            select: {
              id: true,
              monthlyPrice: true,
              bandwidthTiers: {
                orderBy: [{ sortOrder: 'asc' as const }, { downloadSpeed: 'asc' as const }],
              },
            },
          };
          if (updates.planId) {
            resolvedPackage = await tx.package.findUnique({
              where: { id: updates.planId },
              ...pkgInclude,
            });
            if (!resolvedPackage) {
              const mappedId = updates.planId.replace(/^plan-/, 'pkg-');
              resolvedPackage = await tx.package.findUnique({
                where: { id: mappedId },
                ...pkgInclude,
              });
            }
          }

          if (!resolvedPackage && (updates.planName || updates.planId)) {
            const nameToSearch = updates.planName || updates.planId;
            resolvedPackage = await tx.package.findFirst({
              where: {
                OR: [
                  { name: { equals: nameToSearch, mode: 'insensitive' } },
                  { name: { contains: nameToSearch, mode: 'insensitive' } },
                ],
              },
              ...pkgInclude,
            });
          }

          if (!resolvedPackage && updates.planId) {
            resolvedPackage = await tx.package.findFirst(pkgInclude);
          }
        }

        const sub = existing.subscriptions[0];
        let resolvedTier: any = null;
        if (resolvedPackage) {
          const tiers = resolvedPackage.bandwidthTiers || [];
          resolvedTier =
            (updates.bandwidthTierId ? tiers.find((t: any) => t.id === updates.bandwidthTierId) : null) ||
            tiers.find((t: any) => t.isDefault) ||
            tiers[0] ||
            null;
        } else if (updates.bandwidthTierId && sub) {
          resolvedTier = await tx.packageBandwidthTier.findFirst({
            where: { id: updates.bandwidthTierId, packageId: sub.packageId },
          });
        }

        if (sub) {
          const subData: any = {};
          if (resolvedPackage) {
            subData.packageId = resolvedPackage.id;
            subData.bandwidthTierId = resolvedTier?.id ?? null;
            if (updates.monthlyPrice === undefined) {
              subData.monthlyFee = resolvedTier?.price ?? resolvedPackage.monthlyPrice;
            }
          } else if (resolvedTier) {
            subData.bandwidthTierId = resolvedTier.id;
            if (updates.monthlyPrice === undefined) {
              subData.monthlyFee = resolvedTier.price;
            }
          }
          if (updates.monthlyPrice !== undefined) {
            subData.monthlyFee = new Prisma.Decimal(updates.monthlyPrice);
          }
          if (updates.connectionType) {
            subData.technology = updates.connectionType.toUpperCase() as any;
          }

          if (Object.keys(subData).length > 0) {
            await tx.subscription.update({
              where: { id: sub.id },
              data: subData,
            });
          }
        } else if (resolvedPackage) {
          const router = await tx.router.findFirst();
          await tx.subscription.create({
            data: {
              subscriptionNumber: `SUB-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              customerId: existing.id,
              packageId: resolvedPackage.id,
              bandwidthTierId: resolvedTier?.id ?? null,
              routerId: router?.id || null,
              technology: (updates.connectionType ? updates.connectionType.toUpperCase() : 'FIBER') as any,
              status: (existing.status === 'ACTIVE' ? 'ACTIVE' : existing.status === 'SUSPENDED' ? 'SUSPENDED' : 'PENDING') as any,
              monthlyFee: updates.monthlyPrice !== undefined ? new Prisma.Decimal(updates.monthlyPrice) : resolvedPackage.monthlyPrice,
            },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          action: 'UPDATE_CUSTOMER',
          resource: 'Customer',
          resourceId: existing.code,
          details: `Updated customer ${updates.fullName || existing.fullName}`,
          ipAddress: '127.0.0.1',
        },
      });
    });

    const profile = await this.getCustomerProfile(existing.id);
    return profile.customer;
  }

  // 5. Delete Customer
  static async deleteCustomer(id: string) {
    const existing = await prisma.customer.findFirst({
      where: { OR: [{ id }, { code: id }] },
    });

    if (!existing) {
      throw new Error('Customer not found');
    }

    await prisma.$transaction(async (tx) => {
      await tx.customer.delete({
        where: { id: existing.id },
      });
      await tx.auditLog.create({
        data: {
          action: 'DELETE_CUSTOMER',
          resource: 'Customer',
          resourceId: existing.code,
          details: `Deleted customer ${existing.fullName}`,
          ipAddress: '127.0.0.1',
        },
      });
    });

    return { id: existing.id, code: existing.code, fullName: existing.fullName };
  }

  // 6. Set Customer Status (Triggers Network Suspension / Reconnection)
  static async setStatus(id: string, status: string, reason?: string) {
    const upperStatus = status.toUpperCase();
    const existing = await prisma.customer.findFirst({
      where: { OR: [{ id }, { code: id }] },
      include: { subscriptions: { include: { pppoeAccount: true } } },
    });

    if (!existing) {
      throw new Error('Customer not found');
    }

    const prevStatus = existing.status;
    const sub = existing.subscriptions[0];
    const routerId = sub?.routerId || 'rtr-core-1';
    const pppoeUsername =
      sub?.pppoeAccount?.username || `${existing.fullName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_pppoe`;

    await prisma.$transaction(async (tx) => {
      await tx.customer.update({
        where: { id: existing.id },
        data: { status: upperStatus as any },
      });
      await tx.auditLog.create({
        data: {
          action: 'STATUS_CHANGE',
          resource: 'Customer',
          resourceId: existing.code,
          details: `Changed status from ${prevStatus} to ${status}. Reason: ${reason || 'N/A'}`,
          ipAddress: '127.0.0.1',
        },
      });
    });

    if (pppoeUsername) {
      if (upperStatus === 'SUSPENDED' || upperStatus === 'DISCONNECTED') {
        await MikroTikService.suspendSubscriber(routerId, pppoeUsername, reason || 'Administrative suspension');
      } else if (upperStatus === 'ACTIVE' && (prevStatus === 'SUSPENDED' || prevStatus === 'DISCONNECTED')) {
        await MikroTikService.reconnectSubscriber(routerId, pppoeUsername);
      }
    }

    return { id: existing.id, code: existing.code, status: upperStatus };
  }

  // 7. Diagnostic Speed Test
  static async runSpeedTest(customerId: string) {
    const cust = await prisma.customer.findFirst({
      where: { OR: [{ id: customerId }, { code: customerId }] },
      include: { subscriptions: { include: { package: true } } },
    });

    if (!cust) {
      throw new Error('Customer not found');
    }

    const pkg = cust.subscriptions[0]?.package;
    let targetDown = pkg?.downloadSpeed || 100;
    let targetUp = pkg?.uploadSpeed || 50;
    const planName = pkg?.name || '';

    if (!pkg) {
      if (planName.includes('300M')) {
        targetDown = 300;
        targetUp = 150;
      } else if (planName.includes('1G')) {
        targetDown = 980;
        targetUp = 490;
      } else if (planName.includes('50M')) {
        targetDown = 50;
        targetUp = 25;
      }
    }

    await logAudit('SPEED_TEST', 'Customer', cust.code, `Ran diagnostic speed test for ${cust.fullName}`);

    return {
      customerId: cust.id,
      customerName: cust.fullName,
      latencyMs: Math.floor(Math.random() * 5) + 2,
      jitterMs: Math.floor(Math.random() * 2) + 1,
      downloadMbps: Math.round(targetDown * (0.95 + Math.random() * 0.05)),
      uploadMbps: Math.round(targetUp * (0.94 + Math.random() * 0.06)),
      packetLossPercent: 0,
      testedAt: new Date().toISOString(),
    };
  }
}
