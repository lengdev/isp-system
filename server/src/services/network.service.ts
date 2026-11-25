import { prisma, logAudit } from '../db/store.js';

export class NetworkService {
  // 1. Routers
  static async listRouters() {
    const [routers, activeSubscribers] = await Promise.all([
      prisma.router.findMany({ orderBy: { name: 'asc' } }),
      prisma.customer.count({ where: { status: 'ACTIVE' } }),
    ]);

    return routers.map((r) => ({
      ...r,
      lastSeenAt: r.lastSeenAt.toISOString(),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      activeSubscribers,
    }));
  }

  static async getRouterById(id: string) {
    const router = await prisma.router.findFirst({
      where: { OR: [{ id }, { name: id }] },
    });
    if (!router) throw new Error('Router not found');
    return router;
  }

  private static formatPPPoERecord(acc: any) {
    const cust = acc.subscription.customer;
    const pkg = acc.subscription.package;
    const planName = pkg?.name || 'Fiber Ultra 300M';
    return {
      id: acc.id,
      username: acc.username,
      customerId: cust.id,
      customerName: cust.nameEn || cust.nameKm || cust.fullName,
      customerCode: cust.code,
      ipAddress: acc.ipAddress || '',
      macAddress: acc.macAddress || '',
      profile: planName,
      status: acc.isOnline && cust.status === 'ACTIVE' ? 'Online' : 'Disabled',
      router: acc.router?.name || 'Core-CCR2004-East',
      uptime: acc.isOnline && cust.status === 'ACTIVE' ? '2d 6h 15m' : '0s',
      rateLimit: pkg
        ? `${pkg.downloadSpeed}M/${pkg.uploadSpeed}M`
        : planName.includes('1G')
          ? '1000M/500M'
          : planName.includes('300M')
            ? '300M/150M'
            : '100M/50M',
    };
  }

  // 2. PPPoE Accounts
  static async listPPPoEAccounts() {
    const accounts = await prisma.pPPoEAccount.findMany({
      include: {
        router: true,
        subscription: {
          include: {
            customer: true,
            package: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return accounts.map(NetworkService.formatPPPoERecord);
  }

  static async listPPPoEAccountsPaged(filters: {
    page?: number | string;
    limit?: number | string;
    search?: string;
    status?: string;
    sortBy?: string;
    sortDir?: string;
  } = {}) {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 25));
    const skip = (page - 1) * limit;

    const where: any = {};
    const search = typeof filters.search === 'string' ? filters.search.trim().normalize('NFC') : '';
    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { ipAddress: { contains: search, mode: 'insensitive' } },
        { macAddress: { contains: search, mode: 'insensitive' } },
        { subscription: { customer: { fullName: { contains: search, mode: 'insensitive' } } } },
        { subscription: { customer: { nameEn: { contains: search, mode: 'insensitive' } } } },
        { subscription: { customer: { nameKm: { contains: search, mode: 'insensitive' } } } },
        { subscription: { customer: { code: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    if (filters.status) {
      const st = String(filters.status).toUpperCase();
      if (st === 'ONLINE') {
        where.isOnline = true;
        where.subscription = { ...(where.subscription || {}), customer: { status: 'ACTIVE' } };
      } else if (st === 'DISABLED' || st === 'OFFLINE') {
        where.OR = [
          ...(where.OR ? [{ AND: [{ OR: where.OR }, { OR: [{ isOnline: false }, { subscription: { customer: { status: { not: 'ACTIVE' } } } }] }] }] : [
            { isOnline: false },
            { subscription: { customer: { status: { not: 'ACTIVE' } } } },
          ]),
        ];
      }
    }

    const sortDir = filters.sortDir === 'asc' ? 'asc' : 'desc';
    let orderBy: any = { createdAt: 'desc' };
    if (filters.sortBy === 'username') orderBy = { username: sortDir };
    else if (filters.sortBy === 'ipAddress') orderBy = { ipAddress: sortDir };
    else if (filters.sortBy === 'status') orderBy = { isOnline: sortDir };
    else if (filters.sortBy === 'customerName') {
      orderBy = { subscription: { customer: { fullName: sortDir } } };
    }

    const [total, accounts] = await prisma.$transaction([
      prisma.pPPoEAccount.count({ where }),
      prisma.pPPoEAccount.findMany({
        where,
        include: {
          router: true,
          subscription: {
            include: {
              customer: true,
              package: true,
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
    ]);

    return {
      items: accounts.map(NetworkService.formatPPPoERecord),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  // 3. VLAN Management
  static async listVlans() {
    const [vlans, fiberCount, wirelessCount] = await Promise.all([
      prisma.vLAN.findMany({
        include: { router: true },
        orderBy: { vlanId: 'asc' },
      }),
      prisma.subscription.count({ where: { technology: 'FIBER' } }),
      prisma.subscription.count({ where: { technology: 'WIRELESS' } }),
    ]);

    return vlans.map((v) => ({
      ...v,
      routerName: v.router?.name || v.routerId,
      subscribersCount:
        v.purpose === 'FIBER_INTERNET'
          ? fiberCount
          : v.purpose === 'WIRELESS_INTERNET'
            ? wirelessCount
            : 0,
      createdAt: v.createdAt.toISOString(),
      updatedAt: v.updatedAt.toISOString(),
    }));
  }

  static async createVlan(data: {
    vlanId: number;
    name: string;
    description?: string;
    purpose: string;
    routerId: string;
    interface: string;
    tagged?: boolean;
    subnet?: string;
    gateway?: string;
  }) {
    const vlanNumber = Number(data.vlanId);
    const router = await prisma.router.findFirst({
      where: { OR: [{ id: data.routerId }, { name: data.routerId }] },
    });
    if (!router) throw new Error(`Router ${data.routerId} not found`);

    const duplicate = await prisma.vLAN.findFirst({
      where: {
        vlanId: vlanNumber,
        routerId: router.id,
        interface: data.interface,
      },
    });
    if (duplicate) {
      throw new Error(
        `VLAN conflict! VLAN ID ${vlanNumber} is already assigned on router ${data.routerId} interface ${data.interface}.`
      );
    }

    const newVlan = await prisma.vLAN.create({
      data: {
        vlanId: vlanNumber,
        name: data.name,
        description: data.description || '',
        purpose: (data.purpose || 'FIBER_INTERNET') as any,
        routerId: router.id,
        interface: data.interface,
        tagged: data.tagged !== undefined ? data.tagged : true,
        subnet: data.subnet || null,
        gateway: data.gateway || null,
        status: 'Active',
      },
    });

    await logAudit(
      'CREATE_VLAN',
      'VLAN',
      `${newVlan.vlanId}`,
      `Created VLAN ${newVlan.name} (VID: ${newVlan.vlanId}) on ${newVlan.interface}`
    );

    return {
      ...newVlan,
      createdAt: newVlan.createdAt.toISOString(),
      updatedAt: newVlan.updatedAt.toISOString(),
    };
  }

  // 4. IPAM (IP Address Management)
  static async listIpPools() {
    const pools = await prisma.iPPool.findMany({
      include: { router: true },
      orderBy: { name: 'asc' },
    });

    return pools.map((pool) => ({
      ...pool,
      routerName: pool.router?.name || pool.routerId,
      utilizationPercent: pool.totalIps > 0 ? Math.round((pool.usedIps / pool.totalIps) * 100) : 0,
      availableIps: pool.totalIps - pool.usedIps,
      createdAt: pool.createdAt.toISOString(),
      updatedAt: pool.updatedAt.toISOString(),
    }));
  }

  static async allocateIpAddress(poolId: string, customerId: string, isStatic: boolean = false) {
    const allocated = await prisma.$transaction(async (tx) => {
      const pool = await tx.iPPool.findFirst({
        where: { OR: [{ id: poolId }, { name: poolId }] },
      });
      if (!pool) throw new Error('IP Pool not found');
      if (pool.usedIps >= pool.totalIps) {
        throw new Error(`IP Pool ${pool.name} is fully exhausted!`);
      }

      const prefixMatch = pool.startIp.match(/^(\d+\.\d+)\./);
      const basePrefix = prefixMatch ? prefixMatch[1] : '10.20';

      let nextUsed = pool.usedIps + 1;
      let candidateIp = `${basePrefix}.${Math.floor(nextUsed / 254) + 1}.${(nextUsed % 254) + 1}`;
      while (await tx.iPAddress.findUnique({ where: { ipAddress: candidateIp } })) {
        nextUsed++;
        candidateIp = `${basePrefix}.${Math.floor(nextUsed / 254) + 1}.${(nextUsed % 254) + 1}`;
      }

      await tx.iPPool.update({
        where: { id: pool.id },
        data: { usedIps: nextUsed },
      });

      await tx.iPAddress.create({
        data: {
          poolId: pool.id,
          ipAddress: candidateIp,
          isStatic: Boolean(isStatic),
          isAssigned: true,
          assignedTo: customerId,
          assignedAt: new Date(),
        },
      });

      return {
        ipAddress: candidateIp,
        poolName: pool.name,
        gateway: pool.gateway,
        dnsPrimary: pool.dnsPrimary,
        dnsSecondary: pool.dnsSecondary,
        isStatic: Boolean(isStatic),
      };
    });

    await logAudit(
      'ALLOCATE_IP',
      'IPAM',
      allocated.ipAddress,
      `Allocated IP ${allocated.ipAddress} to customer ${customerId} from pool ${allocated.poolName}`
    );
    return allocated;
  }
}
