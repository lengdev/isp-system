import { Prisma } from '@prisma/client';
import { prisma, logAudit } from '../db/store.js';
import { MikroTikService } from './mikrotik.service.js';
import { BillingService } from './billing.service.js';
import { InventoryService } from './inventory.service.js';

export class OperationsService {
  // 1. Installations
  static async listInstallations(status?: string) {
    const list = await prisma.installation.findMany({
      where: status ? { status: status.toUpperCase() as any } : undefined,
      include: {
        customer: {
          include: {
            addresses: true,
            subscriptions: { include: { package: true } },
          },
        },
        technician: true,
      },
      orderBy: { scheduledDate: 'desc' },
    });

    return list.map((inst) => {
      const addr = inst.customer?.addresses.find((a) => a.isPrimary) || inst.customer?.addresses[0];
      const pkg = inst.customer?.subscriptions[0]?.package;
      return {
        ...inst,
        opticalPowerDbm: inst.opticalPowerDbm !== null ? Number(inst.opticalPowerDbm) : null,
        scheduledDate: inst.scheduledDate.toISOString(),
        completedAt: inst.completedAt?.toISOString() || null,
        createdAt: inst.createdAt.toISOString(),
        updatedAt: inst.updatedAt.toISOString(),
        customerName: inst.customer?.fullName || 'Customer',
        customerPhone: inst.customer?.phone || '',
        customerAddress: addr?.addressLine || '',
        technicianName: inst.technician?.name || 'Unassigned',
        planName: pkg?.name || 'Fiber Broadband',
      };
    });
  }

  static async createInstallation(data: {
    customerId: string;
    technicianId?: string;
    scheduledDate: string;
    timeSlot: string;
    notes?: string;
  }) {
    const cust = await prisma.customer.findFirst({
      where: { OR: [{ id: data.customerId }, { code: data.customerId }] },
    });
    if (!cust) throw new Error('Customer not found');

    const year = new Date().getFullYear();
    const prefix = `INST-${year}-`;
    const existing = await prisma.installation.findMany({
      where: { orderNumber: { startsWith: prefix } },
      select: { orderNumber: true },
    });
    let maxSeq = 0;
    for (const row of existing) {
      const seq = parseInt(row.orderNumber.slice(prefix.length), 10);
      if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
    }
    const orderNumber = `${prefix}${(maxSeq + 1).toString().padStart(3, '0')}`;

    const newInst = await prisma.$transaction(async (tx) => {
      const inst = await tx.installation.create({
        data: {
          orderNumber,
          customerId: cust.id,
          technicianId: data.technicianId || null,
          scheduledDate: new Date(data.scheduledDate),
          timeSlot: data.timeSlot,
          status: 'SCHEDULED',
          notes: data.notes || null,
        },
      });

      await tx.customer.update({
        where: { id: cust.id },
        data: { status: 'PENDING' },
      });

      await tx.auditLog.create({
        data: {
          action: 'CREATE_INSTALLATION',
          resource: 'Installation',
          resourceId: orderNumber,
          details: `Created installation order for ${cust.fullName}`,
          ipAddress: '127.0.0.1',
          ip: '127.0.0.1',
        },
      });

      return inst;
    });

    return {
      ...newInst,
      scheduledDate: newInst.scheduledDate.toISOString(),
      completedAt: null,
      createdAt: newInst.createdAt.toISOString(),
    };
  }

  // END-TO-END WORKFLOW A: COMPLETE INSTALLATION & ACTIVATE SUBSCRIBER
  static async completeInstallation(
    installationId: string,
    data: {
      assignedOntSn: string;
      opticalPowerDbm: number;
      notes?: string;
      actor?: string;
    }
  ) {
    const inst = await prisma.installation.findFirst({
      where: { OR: [{ id: installationId }, { orderNumber: installationId }] },
      include: {
        customer: {
          include: {
            subscriptions: {
              include: { package: true, pppoeAccount: true },
            },
          },
        },
      },
    });
    if (!inst) throw new Error('Installation order not found');
    const cust = inst.customer;
    if (!cust) throw new Error('Customer not found');

    const sub = cust.subscriptions[0];
    const planName = sub?.package?.name || 'Fiber Starter 100M';
    const monthlyPrice = Number(sub?.monthlyFee || sub?.package?.monthlyPrice || 35.0);
    const pppoeUser =
      sub?.pppoeAccount?.username || `${cust.fullName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_pppoe`;
    const routerId = sub?.routerId || 'rtr-core-1';

    const updatedInst = await prisma.$transaction(async (tx) => {
      const nextNotes = data.notes
        ? (inst.notes ? `${inst.notes} | ` : '') + data.notes
        : inst.notes;

      const updated = await tx.installation.update({
        where: { id: inst.id },
        data: {
          status: 'COMPLETED',
          assignedOntSn: data.assignedOntSn,
          opticalPowerDbm: new Prisma.Decimal(data.opticalPowerDbm),
          completedAt: new Date(),
          notes: nextNotes,
        },
      });

      // 1. Assign ONT serial number to customer
      await InventoryService.assignSerialToCustomer(data.assignedOntSn, cust.id, tx);

      // 2. Consume 1 ONT hardware unit from stock (COGS accounting journal)
      const ontProduct =
        (await tx.product.findUnique({ where: { sku: 'ONT-HG8245H5' } })) ||
        (await tx.product.findFirst());
      if (ontProduct) {
        await InventoryService.recordMovement(
          {
            productId: ontProduct.id,
            type: 'INSTALLATION_CONSUME',
            quantity: 1,
            reference: inst.orderNumber,
            note: `Consumed ONT for customer ${cust.code} installation`,
            actor: data.actor || 'Technician',
          },
          tx
        );
      }

      // 3. Activate customer and subscription in PostgreSQL
      await tx.customer.update({
        where: { id: cust.id },
        data: { status: 'ACTIVE' },
      });

      if (sub) {
        await tx.subscription.update({
          where: { id: sub.id },
          data: { status: 'ACTIVE', activationDate: new Date() },
        });
      }

      return updated;
    });

    // 4. Provision PPPoE account on router
    await MikroTikService.provisionPPPoEAccount(routerId, {
      name: pppoeUser,
      password: 'pppoe_secure_password',
      service: 'pppoe',
      profile: planName.toLowerCase().replace(/\s+/g, '-'),
      remoteAddress: sub?.pppoeAccount?.ipAddress || '10.20.1.42',
      callerId: sub?.pppoeAccount?.macAddress || '48:8F:5A:12:44:01',
      disabled: false,
      comment: `Subscriber: ${cust.code} (${cust.fullName})`,
    });

    // 5. Generate first recurring invoice if none exists for current period
    const currentPeriod = new Date().toISOString().slice(0, 7);
    const existingInvoice = await prisma.invoice.findFirst({
      where: { customerId: cust.id, billingPeriod: currentPeriod, status: { not: 'CANCELLED' } },
    });

    let firstInvoice = null;
    if (!existingInvoice) {
      firstInvoice = await BillingService.generateInvoice({
        customerId: cust.id,
        subscriptionId: sub?.id,
        billingPeriod: currentPeriod,
        items: [
          { description: `${planName} (First Month Subscription)`, amount: monthlyPrice },
          { description: 'Fiber Drop Cable & Optical Activation Fee', amount: 25.0 },
        ],
      });
    }

    await logAudit(
      'COMPLETE_INSTALLATION',
      'Installation',
      inst.orderNumber,
      `Completed installation for ${cust.fullName}. ONT SN: ${data.assignedOntSn}. PPPoE: ${pppoeUser}. Activated!`,
      data.actor || 'Technician'
    );

    const refreshedCust = await prisma.customer.findUnique({ where: { id: cust.id } });

    return {
      installation: {
        ...updatedInst,
        opticalPowerDbm: updatedInst.opticalPowerDbm !== null ? Number(updatedInst.opticalPowerDbm) : null,
        scheduledDate: updatedInst.scheduledDate.toISOString(),
        completedAt: updatedInst.completedAt?.toISOString() || null,
      },
      customer: {
        ...refreshedCust,
        balanceDue: Number(refreshedCust?.balanceDue || 0),
        rating: Number(refreshedCust?.rating || 5),
      },
      invoice: firstInvoice,
      message: 'Installation completed, subscriber activated, ONT assigned, and first invoice generated.',
    };
  }

  // 2. Technicians
  static async listTechnicians() {
    const techs = await prisma.technician.findMany({
      include: {
        installations: { where: { status: { not: 'COMPLETED' } } },
      },
      orderBy: { name: 'asc' },
    });

    return techs.map((t) => ({
      ...t,
      rating: Number(t.rating),
      activeJobs: t.installations.length,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }));
  }

  // 3. Support Tickets
  static async listTickets(status?: string, priority?: string) {
    const where: any = {};
    if (status) where.status = status.toUpperCase();
    if (priority) where.priority = priority.toUpperCase();

    const tickets = await prisma.supportTicket.findMany({
      where,
      include: { customer: true, assignedTechnician: true },
      orderBy: { createdAt: 'desc' },
    });

    return tickets.map((t) => ({
      ...t,
      customerName: t.customer?.fullName || 'Customer',
      customerPhone: t.customer?.phone || '',
      assignedTechnician: t.assignedTechnician?.name || 'Unassigned',
      resolvedAt: t.resolvedAt?.toISOString() || null,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }));
  }

  static async createTicket(data: {
    customerId: string;
    title: string;
    description: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    category?: string;
    assignedTechnician?: string;
    technicianId?: string;
  }) {
    const cust = await prisma.customer.findFirst({
      where: { OR: [{ id: data.customerId }, { code: data.customerId }] },
    });
    if (!cust) throw new Error('Customer not found');

    let technicianId = data.technicianId || null;
    if (!technicianId && data.assignedTechnician) {
      const tech = await prisma.technician.findFirst({
        where: { name: { contains: data.assignedTechnician, mode: 'insensitive' } },
      });
      technicianId = tech?.id || null;
    }

    const count = await prisma.supportTicket.count();
    let seq = count + 1044;
    let ticketNumber = `TCK-${seq}`;
    while (await prisma.supportTicket.findUnique({ where: { ticketNumber } })) {
      seq++;
      ticketNumber = `TCK-${seq}`;
    }

    const newTicket = await prisma.supportTicket.create({
      data: {
        ticketNumber,
        customerId: cust.id,
        technicianId,
        title: data.title,
        description: data.description,
        priority: (data.priority || 'MEDIUM') as any,
        status: 'OPEN',
        category: data.category || 'Slow Internet',
      },
      include: { assignedTechnician: true },
    });

    await logAudit('CREATE_TICKET', 'SupportTicket', ticketNumber, `Created support ticket for ${cust.fullName}`);

    return {
      ...newTicket,
      customerName: cust.fullName,
      assignedTechnician: newTicket.assignedTechnician?.name || data.assignedTechnician || 'Unassigned',
      createdAt: newTicket.createdAt.toISOString(),
      updatedAt: newTicket.updatedAt.toISOString(),
    };
  }

  static async updateTicketStatus(ticketId: string, status: string, resolutionNotes?: string) {
    const ticket = await prisma.supportTicket.findFirst({
      where: { OR: [{ id: ticketId }, { ticketNumber: ticketId }] },
    });
    if (!ticket) throw new Error('Ticket not found');

    const upper = status.toUpperCase();
    const isFinal = upper === 'RESOLVED' || upper === 'CLOSED';
    const updated = await prisma.supportTicket.update({
      where: { id: ticket.id },
      data: {
        status: upper as any,
        ...(isFinal ? { resolvedAt: new Date() } : {}),
        ...(isFinal && resolutionNotes ? { resolutionNotes } : {}),
      },
    });

    await logAudit('UPDATE_TICKET', 'SupportTicket', ticket.ticketNumber, `Ticket status changed to ${upper}`);

    return {
      ...updated,
      resolvedAt: updated.resolvedAt?.toISOString() || null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }
}
