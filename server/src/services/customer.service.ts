import { dbStore, prisma, isUsingPostgres } from '../db/store.js';
import { MikroTikService } from './mikrotik.service.js';

export class CustomerService {
  // 1. List Customers with filters & pagination
  static listCustomers(filters: any = {}) {
    if (isUsingPostgres()) {
      return (async () => {
        const customers = await prisma.customer.findMany({
          include: {
            addresses: true,
            subscriptions: {
              include: {
                package: true,
                pppoeAccount: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        });

        let result = customers.map((c) => {
          const primaryAddr = c.addresses.find((a) => a.isPrimary) || c.addresses[0];
          const sub = c.subscriptions[0];
          return {
            id: c.id,
            code: c.code,
            type: c.type,
            status: c.status,
            fullName: c.fullName,
            email: c.email,
            phone: c.phone,
            address: primaryAddr?.addressLine || 'N/A',
            city: primaryAddr?.city || 'Phnom Penh',
            balanceDue: Number(c.balanceDue),
            rating: Number(c.rating),
            planId: sub?.packageId || 'pkg-2',
            planName: sub?.package?.name || 'Fiber Ultra 300M',
            monthlyPrice: Number(sub?.monthlyFee || sub?.package?.monthlyPrice || 55.0),
            connectionType: sub?.technology || 'FIBER',
            ipAddress: sub?.pppoeAccount?.ipAddress || '10.20.1.42',
            macAddress: sub?.pppoeAccount?.macAddress || '48:8F:5A:12:44:01',
            pppoeUsername: sub?.pppoeAccount?.username || '',
            registrationDate: c.registrationDate?.toISOString() || c.createdAt.toISOString(),
          };
        });

        if (filters.status && filters.status.length > 0) {
          const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
          result = result.filter((c) => statuses.map((s: string) => s.toUpperCase()).includes(c.status.toUpperCase()));
        }

        if (filters.plan && filters.plan.length > 0) {
          const plans = Array.isArray(filters.plan) ? filters.plan : [filters.plan];
          result = result.filter((c) => plans.includes(c.planName));
        }

        if (filters.city && filters.city.length > 0) {
          const cities = Array.isArray(filters.city) ? filters.city : [filters.city];
          result = result.filter((c) => cities.includes(c.city));
        }

        if (filters.connectionType && filters.connectionType.length > 0) {
          const types = Array.isArray(filters.connectionType) ? filters.connectionType : [filters.connectionType];
          result = result.filter((c) => types.map((t: string) => t.toUpperCase()).includes(c.connectionType.toUpperCase()));
        }

        if (filters.searchQuery) {
          const q = filters.searchQuery.toLowerCase();
          result = result.filter(
            (c) =>
              c.fullName.toLowerCase().includes(q) ||
              c.code.toLowerCase().includes(q) ||
              c.email.toLowerCase().includes(q) ||
              c.phone.toLowerCase().includes(q) ||
              (c.ipAddress && c.ipAddress.includes(q)) ||
              (c.macAddress && c.macAddress.toLowerCase().includes(q))
          );
        }

        return result;
      })();
    }

    let result = [...dbStore.customers];

    if (filters.status && filters.status.length > 0) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      result = result.filter((c) => statuses.map((s: string) => s.toUpperCase()).includes(c.status.toUpperCase()));
    }

    if (filters.plan && filters.plan.length > 0) {
      const plans = Array.isArray(filters.plan) ? filters.plan : [filters.plan];
      result = result.filter((c) => plans.includes(c.planName));
    }

    if (filters.city && filters.city.length > 0) {
      const cities = Array.isArray(filters.city) ? filters.city : [filters.city];
      result = result.filter((c) => cities.includes(c.city));
    }

    if (filters.connectionType && filters.connectionType.length > 0) {
      const types = Array.isArray(filters.connectionType) ? filters.connectionType : [filters.connectionType];
      result = result.filter((c) => types.map((t: string) => t.toUpperCase()).includes(c.connectionType.toUpperCase()));
    }

    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.fullName.toLowerCase().includes(q) ||
          c.code.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q) ||
          (c.ipAddress && c.ipAddress.includes(q)) ||
          (c.macAddress && c.macAddress.toLowerCase().includes(q))
      );
    }

    return result;
  }

  // 2. Get Full Customer 360 Profile
  static getCustomerProfile(id: string) {
    if (isUsingPostgres()) {
      return (async () => {
        const customer = await prisma.customer.findFirst({
          where: {
            OR: [{ id }, { code: id }],
          },
          include: {
            addresses: true,
            subscriptions: {
              include: {
                package: true,
                pppoeAccount: true,
              },
            },
            invoices: true,
            payments: true,
            tickets: true,
            installations: true,
            assignedEquipments: true,
          },
        });

        if (!customer) throw new Error('Customer not found');

        const primaryAddr = customer.addresses.find((a) => a.isPrimary) || customer.addresses[0];
        const sub = customer.subscriptions[0];
        const formattedCust = {
          id: customer.id,
          code: customer.code,
          type: customer.type,
          status: customer.status,
          fullName: customer.fullName,
          email: customer.email,
          phone: customer.phone,
          address: primaryAddr?.addressLine || 'N/A',
          city: primaryAddr?.city || 'Phnom Penh',
          balanceDue: Number(customer.balanceDue),
          rating: Number(customer.rating),
          planId: sub?.packageId || 'pkg-2',
          planName: sub?.package?.name || 'Fiber Ultra 300M',
          monthlyPrice: Number(sub?.monthlyFee || sub?.package?.monthlyPrice || 55.0),
          connectionType: sub?.technology || 'FIBER',
          ipAddress: sub?.pppoeAccount?.ipAddress || '10.20.1.42',
          macAddress: sub?.pppoeAccount?.macAddress || '48:8F:5A:12:44:01',
          pppoeUsername: sub?.pppoeAccount?.username || '',
          registrationDate: customer.registrationDate?.toISOString() || customer.createdAt.toISOString(),
        };

        const networkInfo = {
          connectionType: formattedCust.connectionType,
          pppoeUsername: formattedCust.pppoeUsername || `${formattedCust.fullName.toLowerCase().replace(/\s+/g, '_')}_pppoe`,
          assignedRouter: 'Core-CCR2004-East (Phnom Penh POP)',
          routerId: 'rtr-core-1',
          vlanId: formattedCust.connectionType === 'WIRELESS' ? 30 : 20,
          vlanName: formattedCust.connectionType === 'WIRELESS' ? 'VLAN30_WISP_Subscribers' : 'VLAN20_Fiber_PP_Residential',
          ipAddress: formattedCust.ipAddress || '10.20.1.42',
          ipPool: formattedCust.connectionType === 'WIRELESS' ? 'pool-wireless-subscribers' : 'pool-fiber-residential',
          macAddress: formattedCust.macAddress || '48:8F:5A:12:44:01',
          connectionStatus: formattedCust.status === 'ACTIVE' ? 'Online' : 'Offline',
          lastLogin: '2026-11-22T08:14:00Z',
          assignedSpeed: formattedCust.planName,
          opticalPowerDbm: -19.4,
        };

        return {
          customer: formattedCust,
          networkInfo,
          invoices: customer.invoices,
          payments: customer.payments,
          tickets: customer.tickets,
          installations: customer.installations,
          equipments: customer.assignedEquipments,
        };
      })();
    }

    const customer = dbStore.customers.find((c) => c.id === id || c.code === id);
    if (!customer) throw new Error('Customer not found');

    const invoices = dbStore.invoices.filter((i) => i.customerId === customer.id);
    const payments = dbStore.payments.filter((p) => p.customerId === customer.id);
    const tickets = dbStore.tickets.filter((t) => t.customerId === customer.id);
    const installations = dbStore.installations.filter((i) => i.customerId === customer.id);
    const equipments = dbStore.serialNumbers.filter((s) => s.customerId === customer.id);

    // Network Information
    const networkInfo = {
      connectionType: customer.connectionType,
      pppoeUsername: customer.pppoeUsername || `${customer.fullName.toLowerCase().replace(/\s+/g, '_')}_pppoe`,
      assignedRouter: 'Core-CCR2004-East (Phnom Penh POP)',
      routerId: 'rtr-core-1',
      vlanId: customer.connectionType === 'WIRELESS' ? 30 : 20,
      vlanName: customer.connectionType === 'WIRELESS' ? 'VLAN30_WISP_Subscribers' : 'VLAN20_Fiber_PP_Residential',
      ipAddress: customer.ipAddress || '10.20.1.42',
      ipPool: customer.connectionType === 'WIRELESS' ? 'pool-wireless-subscribers' : 'pool-fiber-residential',
      macAddress: customer.macAddress || '48:8F:5A:12:44:01',
      connectionStatus: customer.status === 'ACTIVE' ? 'Online' : 'Offline',
      lastLogin: '2026-11-22T08:14:00Z',
      assignedSpeed: customer.planName,
      opticalPowerDbm: -19.4,
    };

    return {
      customer,
      networkInfo,
      invoices,
      payments,
      tickets,
      installations,
      equipments,
    };
  }

  // 3. Create Customer
  static createCustomer(data: any) {
    const nextCode = `CUST-${(dbStore.customers.length + 1001).toString()}`;
    const newCustomer = {
      id: `cust-${Date.now()}`,
      code: nextCode,
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      address: data.address,
      city: data.city || 'Phnom Penh',
      type: data.type || 'RESIDENTIAL',
      status: (data.status || 'PENDING').toUpperCase(),
      rating: 5.0,
      balanceDue: 0.0,
      planId: data.planId || 'pkg-2',
      planName: data.planName || 'Fiber Ultra 300M',
      monthlyPrice: Number(data.monthlyPrice) || 55.0,
      connectionType: (data.connectionType || 'FIBER').toUpperCase(),
      ipAddress: data.ipAddress || `10.20.1.${Math.floor(Math.random() * 200) + 10}`,
      macAddress: data.macAddress || '48:8F:5A:12:44:' + Math.floor(Math.random() * 90 + 10),
      pppoeUsername: `${data.fullName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_pppoe`,
      routerModel: data.routerModel || 'Huawei HG8245H5 ONT',
      registrationDate: new Date().toISOString(),
    };

    dbStore.customers.unshift(newCustomer);
    dbStore.logAudit('CREATE_CUSTOMER', 'Customer', newCustomer.code, `Registered customer ${newCustomer.fullName}`);

    if (isUsingPostgres()) {
      return (async () => {
        try {
          await prisma.customer.create({
            data: {
              id: newCustomer.id,
              code: newCustomer.code,
              fullName: newCustomer.fullName,
              email: newCustomer.email,
              phone: newCustomer.phone,
              type: (newCustomer.type as any) || 'RESIDENTIAL',
              status: (newCustomer.status as any) || 'PENDING',
              addresses: {
                create: {
                  addressLine: newCustomer.address,
                  city: newCustomer.city,
                  isPrimary: true,
                },
              },
              subscriptions: {
                create: {
                  subscriptionNumber: `SUB-${Date.now()}`,
                  packageId: newCustomer.planId,
                  technology: (newCustomer.connectionType as any) || 'FIBER',
                  monthlyFee: newCustomer.monthlyPrice,
                },
              },
            },
          });
        } catch (e) {
          console.error('Error creating customer in Postgres:', e);
        }
        return newCustomer;
      })();
    }

    return newCustomer;
  }

  // 4. Update Customer
  static updateCustomer(id: string, updates: any) {
    const cust = dbStore.customers.find((c) => c.id === id);
    if (!cust && !isUsingPostgres()) throw new Error('Customer not found');

    if (cust) {
      Object.assign(cust, updates);
      dbStore.logAudit('UPDATE_CUSTOMER', 'Customer', cust.code, `Updated customer ${cust.fullName}`);
    }

    if (isUsingPostgres()) {
      return (async () => {
        try {
          const prismaData: any = {};
          if (updates.fullName) prismaData.fullName = updates.fullName;
          if (updates.email) prismaData.email = updates.email;
          if (updates.phone) prismaData.phone = updates.phone;
          if (updates.status) prismaData.status = updates.status.toUpperCase();
          if (Object.keys(prismaData).length > 0) {
            await prisma.customer.updateMany({
              where: { OR: [{ id }, { code: id }] },
              data: prismaData,
            });
          }
        } catch (e) {
          console.error('Error updating customer in Postgres:', e);
        }
        return cust || updates;
      })();
    }

    return cust;
  }

  // 5. Delete Customer
  static deleteCustomer(id: string) {
    const idx = dbStore.customers.findIndex((c) => c.id === id);
    let deleted = null;
    if (idx !== -1) {
      [deleted] = dbStore.customers.splice(idx, 1);
      dbStore.logAudit('DELETE_CUSTOMER', 'Customer', deleted.code, `Deleted customer ${deleted.fullName}`);
    }

    if (isUsingPostgres()) {
      return (async () => {
        try {
          await prisma.customer.deleteMany({
            where: { OR: [{ id }, { code: id }] },
          });
        } catch (e) {
          console.error('Error deleting customer in Postgres:', e);
        }
        return deleted || { id };
      })();
    }

    if (!deleted) throw new Error('Customer not found');
    return deleted;
  }

  // 6. Set Customer Status (Triggers Network Suspension / Reconnection)
  static async setStatus(id: string, status: string, reason?: string) {
    const cust = dbStore.customers.find((c) => c.id === id);
    const prevStatus = cust?.status || 'UNKNOWN';
    if (cust) {
      cust.status = status as any;
    }

    if (cust?.pppoeUsername) {
      if (status.toUpperCase() === 'SUSPENDED' || status.toUpperCase() === 'DISCONNECTED') {
        await MikroTikService.suspendSubscriber('rtr-core-1', cust.pppoeUsername, reason || 'Administrative suspension');
      } else if (status.toUpperCase() === 'ACTIVE' && (prevStatus === 'SUSPENDED' || prevStatus === 'DISCONNECTED')) {
        await MikroTikService.reconnectSubscriber('rtr-core-1', cust.pppoeUsername);
      }
    }

    if (isUsingPostgres()) {
      try {
        await prisma.customer.updateMany({
          where: { OR: [{ id }, { code: id }] },
          data: { status: status.toUpperCase() as any },
        });
      } catch (e) {
        console.error('Error updating customer status in Postgres:', e);
      }
    }

    dbStore.logAudit(
      'STATUS_CHANGE',
      'Customer',
      cust?.code || id,
      `Changed status from ${prevStatus} to ${status}. Reason: ${reason || 'N/A'}`
    );

    return cust || { id, status };
  }

  // 7. Diagnostic Speed Test
  static runSpeedTest(customerId: string) {
    const cust = dbStore.customers.find((c) => c.id === customerId);
    if (!cust) throw new Error('Customer not found');

    let targetDown = 100;
    let targetUp = 50;

    if (cust.planName.includes('300M')) {
      targetDown = 300;
      targetUp = 150;
    } else if (cust.planName.includes('1G')) {
      targetDown = 980;
      targetUp = 490;
    } else if (cust.planName.includes('50M')) {
      targetDown = 50;
      targetUp = 25;
    }

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
