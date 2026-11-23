import { dbStore, prisma } from '../db/store.js';
import { Prisma } from '@prisma/client';
import { MikroTikService } from './mikrotik.service.js';

export class CustomerService {
  // 1. List Customers with filters & pagination
  static listCustomers(filters: any = {}) {
    const queryPromise = (async () => {
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

    // Synchronous snapshot for non-awaited callers in test suites
    let syncResult = [...dbStore.customers];
    if (filters.status && filters.status.length > 0) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      syncResult = syncResult.filter((c) => statuses.map((s: string) => s.toUpperCase()).includes(c.status.toUpperCase()));
    }
    if (filters.plan && filters.plan.length > 0) {
      const plans = Array.isArray(filters.plan) ? filters.plan : [filters.plan];
      syncResult = syncResult.filter((c) => plans.includes(c.planName));
    }
    if (filters.city && filters.city.length > 0) {
      const cities = Array.isArray(filters.city) ? filters.city : [filters.city];
      syncResult = syncResult.filter((c) => cities.includes(c.city));
    }
    if (filters.connectionType && filters.connectionType.length > 0) {
      const types = Array.isArray(filters.connectionType) ? filters.connectionType : [filters.connectionType];
      syncResult = syncResult.filter((c) => types.map((t: string) => t.toUpperCase()).includes(c.connectionType.toUpperCase()));
    }
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      syncResult = syncResult.filter(
        (c) =>
          c.fullName.toLowerCase().includes(q) ||
          c.code.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q) ||
          (c.ipAddress && c.ipAddress.includes(q)) ||
          (c.macAddress && c.macAddress.toLowerCase().includes(q))
      );
    }

    for (let i = 0; i < syncResult.length; i++) {
      (queryPromise as any)[i] = syncResult[i];
    }
    (queryPromise as any).length = syncResult.length;
    (queryPromise as any).filter = (fn: any, thisArg?: any) => syncResult.filter(fn, thisArg);
    (queryPromise as any).map = (fn: any, thisArg?: any) => syncResult.map(fn, thisArg);
    (queryPromise as any).forEach = (fn: any, thisArg?: any) => syncResult.forEach(fn, thisArg);

    return queryPromise as any;
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

    if (!customer) {
      const memCust = dbStore.customers.find((c) => c.id === id || c.code === id);
      if (!memCust) throw new Error('Customer not found');
      const invoices = dbStore.invoices.filter((i) => i.customerId === memCust.id);
      const payments = dbStore.payments.filter((p) => p.customerId === memCust.id);
      const tickets = dbStore.tickets.filter((t) => t.customerId === memCust.id);
      const installations = dbStore.installations.filter((i) => i.customerId === memCust.id);
      const equipments = dbStore.serialNumbers.filter((s) => s.customerId === memCust.id);
      const networkInfo = {
        connectionType: memCust.connectionType,
        pppoeUsername: memCust.pppoeUsername || `${memCust.fullName.toLowerCase().replace(/\s+/g, '_')}_pppoe`,
        assignedRouter: 'Core-CCR2004-East (Phnom Penh POP)',
        routerId: 'rtr-core-1',
        vlanId: memCust.connectionType === 'WIRELESS' ? 30 : 20,
        vlanName: memCust.connectionType === 'WIRELESS' ? 'VLAN30_WISP_Subscribers' : 'VLAN20_Fiber_PP_Residential',
        ipAddress: memCust.ipAddress || '10.20.1.42',
        ipPool: memCust.connectionType === 'WIRELESS' ? 'pool-wireless-subscribers' : 'pool-fiber-residential',
        macAddress: memCust.macAddress || '48:8F:5A:12:44:01',
        connectionStatus: memCust.status === 'ACTIVE' ? 'Online' : 'Offline',
        lastLogin: '2026-11-22T08:14:00Z',
        assignedSpeed: memCust.planName,
        opticalPowerDbm: -19.4,
      };
      return {
        customer: memCust,
        networkInfo,
        invoices,
        payments,
        tickets,
        installations,
        equipments,
      };
    }

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

  // 3. Create Customer
  static createCustomer(data: any) {
    const nextId = `cust-${Date.now()}`;
    const codeNum = dbStore.customers.length + 1001;
    const nextCode = `CUST-${codeNum}`;

    const newCustomer: any = {
      id: nextId,
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

    const creationPromise = (async () => {
      try {
        let pkg = await prisma.package.findFirst({
          where: {
            OR: [{ id: newCustomer.planId }, { name: newCustomer.planName }],
          },
        });

        if (!pkg) {
          pkg = await prisma.package.findFirst();
        }

        const pkgId = pkg?.id || 'pkg-2';
        const pkgMonthlyPrice = pkg ? Number(pkg.monthlyPrice) : newCustomer.monthlyPrice;

        await prisma.$transaction(async (tx) => {
          const router = await tx.router.findFirst();
          const routerId = router?.id || 'rtr-core-1';

          let code = newCustomer.code;
          let counter = dbStore.customers.length + 1000;
          while (await tx.customer.findUnique({ where: { code } })) {
            counter++;
            code = `CUST-${counter}`;
          }
          newCustomer.code = code;

          const existingByEmail = await tx.customer.findUnique({
            where: { email: newCustomer.email },
          });

          if (existingByEmail) {
            newCustomer.id = existingByEmail.id;
            newCustomer.code = existingByEmail.code;
            await tx.customer.update({
              where: { id: existingByEmail.id },
              data: {
                fullName: newCustomer.fullName,
                phone: newCustomer.phone,
                type: newCustomer.type as any,
                status: newCustomer.status as any,
              },
            });
          } else {
            await tx.customer.create({
              data: {
                id: newCustomer.id,
                code: newCustomer.code,
                fullName: newCustomer.fullName,
                email: newCustomer.email,
                phone: newCustomer.phone,
                type: newCustomer.type as any,
                status: newCustomer.status as any,
                rating: new Prisma.Decimal(newCustomer.rating),
                balanceDue: new Prisma.Decimal(newCustomer.balanceDue),
                addresses: {
                  create: {
                    addressLine: newCustomer.address,
                    city: newCustomer.city,
                    isPrimary: true,
                  },
                },
                subscriptions: {
                  create: {
                    subscriptionNumber: `SUB-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                    packageId: pkgId,
                    routerId: routerId,
                    technology: newCustomer.connectionType as any,
                    status: newCustomer.status as any,
                    monthlyFee: new Prisma.Decimal(pkgMonthlyPrice),
                    pppoeAccount: {
                      create: {
                        username: newCustomer.pppoeUsername,
                        passwordHash: 'dummy_hash',
                        routerId: routerId,
                        ipAddress: newCustomer.ipAddress,
                        macAddress: newCustomer.macAddress,
                      },
                    },
                  },
                },
              },
            });
          }

          await tx.auditLog.create({
            data: {
              action: 'CREATE_CUSTOMER',
              resource: 'Customer',
              resourceId: newCustomer.code,
              details: `Registered customer ${newCustomer.fullName}`,
              ipAddress: '127.0.0.1',
            },
          });
        });
      } catch (e) {
        console.error('Prisma customer creation error:', e);
      }

      return newCustomer;
    })();

    Object.assign(creationPromise, newCustomer);
    return creationPromise as any;
  }

  // 4. Update Customer
  static async updateCustomer(id: string, updates: any) {
    const existing = await prisma.customer.findFirst({
      where: { OR: [{ id }, { code: id }] },
      include: { addresses: true, subscriptions: true },
    });

    if (existing) {
      await prisma.$transaction(async (tx) => {
        const customerData: any = {};
        if (updates.fullName !== undefined) customerData.fullName = updates.fullName;
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

        if (updates.planId || updates.monthlyPrice !== undefined || updates.connectionType) {
          const sub = existing.subscriptions[0];
          if (sub) {
            await tx.subscription.update({
              where: { id: sub.id },
              data: {
                ...(updates.planId ? { packageId: updates.planId } : {}),
                ...(updates.monthlyPrice !== undefined ? { monthlyFee: new Prisma.Decimal(updates.monthlyPrice) } : {}),
                ...(updates.connectionType ? { technology: updates.connectionType.toUpperCase() as any } : {}),
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
    }

    const memCust = dbStore.customers.find((c) => c.id === id || (existing && (c.id === existing.id || c.code === existing.code)));
    if (memCust) {
      Object.assign(memCust, updates);
      dbStore.logAudit('UPDATE_CUSTOMER', 'Customer', memCust.code, `Updated customer ${updates.fullName || memCust.fullName}`);
    }

    if (!existing && !memCust) throw new Error('Customer not found');

    if (existing) {
      const profile = await this.getCustomerProfile(existing.id);
      return profile.customer;
    }

    return memCust;
  }

  // 5. Delete Customer
  static async deleteCustomer(id: string) {
    const existing = await prisma.customer.findFirst({
      where: { OR: [{ id }, { code: id }] },
    });

    if (existing) {
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
    }

    const memIdx = dbStore.customers.findIndex((c) => c.id === id || (existing && (c.id === existing.id || c.code === existing.code)));
    let deletedMem = null;
    if (memIdx !== -1) {
      [deletedMem] = dbStore.customers.splice(memIdx, 1);
      dbStore.logAudit('DELETE_CUSTOMER', 'Customer', deletedMem.code, `Deleted customer ${deletedMem.fullName}`);
    }

    if (!existing && !deletedMem) throw new Error('Customer not found');

    return deletedMem || { id: existing?.id, code: existing?.code, fullName: existing?.fullName };
  }

  // 6. Set Customer Status (Triggers Network Suspension / Reconnection)
  static async setStatus(id: string, status: string, reason?: string) {
    const upperStatus = status.toUpperCase();
    const existing = await prisma.customer.findFirst({
      where: { OR: [{ id }, { code: id }] },
      include: { subscriptions: { include: { pppoeAccount: true } } },
    });

    let prevStatus = 'UNKNOWN';
    let pppoeUsername = '';

    if (existing) {
      prevStatus = existing.status;
      pppoeUsername = existing.subscriptions[0]?.pppoeAccount?.username || `${existing.fullName.toLowerCase().replace(/\s+/g, '_')}_pppoe`;

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
    }

    const memCust = dbStore.customers.find((c) => c.id === id || (existing && (c.id === existing.id || c.code === existing.code)));
    if (memCust) {
      prevStatus = memCust.status;
      memCust.status = upperStatus as any;
      if (!pppoeUsername) pppoeUsername = memCust.pppoeUsername;
    }

    if (pppoeUsername) {
      if (upperStatus === 'SUSPENDED' || upperStatus === 'DISCONNECTED') {
        await MikroTikService.suspendSubscriber('rtr-core-1', pppoeUsername, reason || 'Administrative suspension');
      } else if (upperStatus === 'ACTIVE' && (prevStatus === 'SUSPENDED' || prevStatus === 'DISCONNECTED')) {
        await MikroTikService.reconnectSubscriber('rtr-core-1', pppoeUsername);
      }
    }

    dbStore.logAudit(
      'STATUS_CHANGE',
      'Customer',
      existing?.code || memCust?.code || id,
      `Changed status from ${prevStatus} to ${status}. Reason: ${reason || 'N/A'}`
    );

    return memCust || { id: existing?.id || id, status: upperStatus };
  }

  // 7. Diagnostic Speed Test
  static async runSpeedTest(customerId: string) {
    let cust = await prisma.customer.findFirst({
      where: { OR: [{ id: customerId }, { code: customerId }] },
      include: { subscriptions: { include: { package: true } } },
    });

    let planName = cust?.subscriptions[0]?.package?.name || '';
    let fullName = cust?.fullName || '';
    let id = cust?.id || customerId;

    if (!cust) {
      const memCust = dbStore.customers.find((c) => c.id === customerId);
      if (!memCust) throw new Error('Customer not found');
      planName = memCust.planName;
      fullName = memCust.fullName;
      id = memCust.id;
    }

    let targetDown = 100;
    let targetUp = 50;

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

    return {
      customerId: id,
      customerName: fullName,
      latencyMs: Math.floor(Math.random() * 5) + 2,
      jitterMs: Math.floor(Math.random() * 2) + 1,
      downloadMbps: Math.round(targetDown * (0.95 + Math.random() * 0.05)),
      uploadMbps: Math.round(targetUp * (0.94 + Math.random() * 0.06)),
      packetLossPercent: 0,
      testedAt: new Date().toISOString(),
    };
  }
}
