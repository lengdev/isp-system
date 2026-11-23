import { dbStore } from '../db/store.js';
import { MikroTikService } from './mikrotik.service.js';

export class NetworkService {
  // 1. Routers
  static listRouters() {
    return dbStore.routers.map((r) => ({
      ...r,
      activeSubscribers: dbStore.customers.filter((c) => c.status === 'ACTIVE').length,
    }));
  }

  static getRouterById(id: string) {
    const router = dbStore.routers.find((r) => r.id === id);
    if (!router) throw new Error('Router not found');
    return router;
  }

  // 2. PPPoE Accounts
  static listPPPoEAccounts() {
    return dbStore.customers
      .filter((c) => c.pppoeUsername)
      .map((c) => ({
        id: `pppoe-${c.id}`,
        username: c.pppoeUsername,
        customerId: c.id,
        customerName: c.fullName,
        customerCode: c.code,
        ipAddress: c.ipAddress,
        macAddress: c.macAddress,
        profile: c.planName,
        status: c.status === 'ACTIVE' ? 'Online' : 'Disabled',
        router: 'Core-CCR2004-East',
        uptime: c.status === 'ACTIVE' ? '2d 6h 15m' : '0s',
        rateLimit: c.planName.includes('1G') ? '1000M/500M' : c.planName.includes('300M') ? '300M/150M' : '100M/50M',
      }));
  }

  // 3. VLAN Management
  static listVlans() {
    return dbStore.vlans.map((v) => {
      const router = dbStore.routers.find((r) => r.id === v.routerId);
      const subscribersCount = v.purpose === 'FIBER_INTERNET'
        ? dbStore.customers.filter((c) => c.connectionType === 'FIBER').length
        : v.purpose === 'WIRELESS_INTERNET'
        ? dbStore.customers.filter((c) => c.connectionType === 'WIRELESS').length
        : 0;
      return {
        ...v,
        routerName: router?.name || v.routerId,
        subscribersCount,
      };
    });
  }

  static createVlan(data: {
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
    // Validate duplicate VLAN ID within same router & interface scope
    const duplicate = dbStore.vlans.find(
      (v) => v.vlanId === data.vlanId && v.routerId === data.routerId && v.interface === data.interface
    );
    if (duplicate) {
      throw new Error(
        `VLAN conflict! VLAN ID ${data.vlanId} is already assigned on router ${data.routerId} interface ${data.interface}.`
      );
    }

    const newVlan = {
      id: `vlan-${Date.now()}`,
      vlanId: Number(data.vlanId),
      name: data.name,
      description: data.description || '',
      purpose: data.purpose as any,
      routerId: data.routerId,
      interface: data.interface,
      tagged: data.tagged !== undefined ? data.tagged : true,
      subnet: data.subnet || null,
      gateway: data.gateway || null,
      status: 'Active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    dbStore.vlans.push(newVlan as any);
    dbStore.logAudit('CREATE_VLAN', 'VLAN', `${newVlan.vlanId}`, `Created VLAN ${newVlan.name} (VID: ${newVlan.vlanId}) on ${newVlan.interface}`);
    return newVlan;
  }

  // 4. IPAM (IP Address Management)
  static listIpPools() {
    return dbStore.ipPools.map((pool) => {
      const router = dbStore.routers.find((r) => r.id === pool.routerId);
      const utilizationPercent = Math.round((pool.usedIps / pool.totalIps) * 100);
      return {
        ...pool,
        routerName: router?.name || pool.routerId,
        utilizationPercent,
        availableIps: pool.totalIps - pool.usedIps,
      };
    });
  }

  static allocateIpAddress(poolId: string, customerId: string, isStatic: boolean = false) {
    const pool = dbStore.ipPools.find((p) => p.id === poolId);
    if (!pool) throw new Error('IP Pool not found');

    if (pool.usedIps >= pool.totalIps) {
      throw new Error(`IP Pool ${pool.name} is fully exhausted!`);
    }

    pool.usedIps += 1;
    const ip = `10.20.${Math.floor(pool.usedIps / 254) + 1}.${(pool.usedIps % 254) + 1}`;

    dbStore.logAudit('ALLOCATE_IP', 'IPAM', ip, `Allocated IP ${ip} to customer ${customerId} from pool ${pool.name}`);
    return {
      ipAddress: ip,
      poolName: pool.name,
      gateway: pool.gateway,
      dnsPrimary: pool.dnsPrimary,
      dnsSecondary: pool.dnsSecondary,
      isStatic,
    };
  }
}
