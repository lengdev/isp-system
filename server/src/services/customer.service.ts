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
    monthlyPrice: Number(sub?.monthlyFee || sub?.package?.monthlyPrice || 55.0),
    dataCapGB: sub?.package?.dataAllowanceGB ?? null,
    connectionType: sub?.technology || 'FIBER',
    ipAddress: sub?.pppoeAccount?.ipAddress || '10.20.1.42',
    macAddress: sub?.pppoeAccount?.macAddress || '48:8F:5A:12:44:01',
    pppoeUsername: sub?.pppoeAccount?.username || '',
    registrationDate: c.registrationDate?.toISOString() || c.createdAt.toISOString(),
  };
}

export class CustomerService {
  // 1. List Customers with filters & pagination
  static async listCustomers(filters: any = {}) {
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

    let result = customers.map(formatCustomerRecord);

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

    const rawSearch = filters.searchQuery ?? filters.search ?? filters.q;
    const normalizedQuery = normalizeNameInput(rawSearch)?.toLowerCase();
    if (normalizedQuery) {
      result = result.filter(
        (c) =>
          (c.nameKm || '').normalize('NFC').toLowerCase().includes(normalizedQuery) ||
          (c.nameEn || '').normalize('NFC').toLowerCase().includes(normalizedQuery) ||
          (c.fullName || '').normalize('NFC').toLowerCase().includes(normalizedQuery) ||
          c.code.toLowerCase().includes(normalizedQuery) ||
          c.email.toLowerCase().includes(normalizedQuery) ||
          c.phone.toLowerCase().includes(normalizedQuery) ||
          (c.ipAddress && c.ipAddress.includes(normalizedQuery)) ||
          (c.macAddress && c.macAddress.toLowerCase().includes(normalizedQuery))
      );
    }

    if (
      filters.sortBy === 'name' ||
      filters.sortBy === 'fullName' ||
      filters.sortBy === 'displayName'
    ) {
      const dir = String(filters.sortDir || 'asc').toLowerCase() === 'desc' ? -1 : 1;
      result.sort((a, b) => {
        const aName = (a.nameEn || a.nameKm || a.fullName || '').normalize('NFC');
        const bName = (b.nameEn || b.nameKm || b.fullName || '').normalize('NFC');
        return aName.localeCompare(bName) * dir;
      });
    }

    return result;
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
    });
    if (!pkg) {
      pkg = await prisma.package.findFirst();
    }
    if (!pkg) {
      throw new Error('No internet service package configured in database.');
    }

    const monthlyPrice = data.monthlyPrice !== undefined ? Number(data.monthlyPrice) : Number(pkg.monthlyPrice);
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

      if (updates.planId || updates.planName || updates.monthlyPrice !== undefined || updates.connectionType) {
        let resolvedPackage: { id: string; monthlyPrice: any } | null = null;
        if (updates.planId || updates.planName) {
          if (updates.planId) {
            resolvedPackage = await tx.package.findUnique({
              where: { id: updates.planId },
              select: { id: true, monthlyPrice: true },
            });
            if (!resolvedPackage) {
              const mappedId = updates.planId.replace(/^plan-/, 'pkg-');
              resolvedPackage = await tx.package.findUnique({
                where: { id: mappedId },
                select: { id: true, monthlyPrice: true },
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
              select: { id: true, monthlyPrice: true },
            });
          }

          if (!resolvedPackage && updates.planId) {
            resolvedPackage = await tx.package.findFirst({
              select: { id: true, monthlyPrice: true },
            });
          }
        }

        const sub = existing.subscriptions[0];
        if (sub) {
          const subData: any = {};
          if (resolvedPackage) {
            subData.packageId = resolvedPackage.id;
            if (updates.monthlyPrice === undefined) {
              subData.monthlyFee = resolvedPackage.monthlyPrice;
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
