import { dbStore } from '../db/store.js';
import { MikroTikService } from './mikrotik.service.js';
import { BillingService } from './billing.service.js';
import { InventoryService } from './inventory.service.js';

export class OperationsService {
  // 1. Installations
  static listInstallations(status?: string) {
    let list = [...dbStore.installations];
    if (status) list = list.filter((i) => i.status === status);

    return list.map((inst) => {
      const cust = dbStore.customers.find((c) => c.id === inst.customerId);
      const tech = dbStore.technicians.find((t) => t.id === inst.technicianId);
      return {
        ...inst,
        customerName: cust?.fullName || 'Customer',
        customerPhone: cust?.phone || '',
        customerAddress: cust?.address || '',
        technicianName: tech?.name || 'Unassigned',
        planName: cust?.planName || 'Fiber Broadband',
      };
    });
  }

  static createInstallation(data: {
    customerId: string;
    technicianId?: string;
    scheduledDate: string;
    timeSlot: string;
    notes?: string;
  }) {
    const cust = dbStore.customers.find((c) => c.id === data.customerId);
    if (!cust) throw new Error('Customer not found');

    const orderNumber = `INST-2026-${(dbStore.installations.length + 1).toString().padStart(3, '0')}`;
    const newInst = {
      id: `inst-${Date.now()}`,
      orderNumber,
      customerId: cust.id,
      technicianId: data.technicianId || null,
      scheduledDate: data.scheduledDate,
      timeSlot: data.timeSlot,
      status: 'SCHEDULED',
      assignedOntSn: null,
      opticalPowerDbm: null,
      notes: data.notes || null,
      completedAt: null,
      createdAt: new Date().toISOString(),
    };

    dbStore.installations.unshift(newInst);
    cust.status = 'PENDING';

    dbStore.logAudit('CREATE_INSTALLATION', 'Installation', orderNumber, `Created installation order for ${cust.fullName}`);
    return newInst;
  }

  // END-TO-END WORKFLOW A: COMPLETE INSTALLATION & ACTIVATE SUBSCRIBER
  static async completeInstallation(installationId: string, data: {
    assignedOntSn: string;
    opticalPowerDbm: number;
    notes?: string;
    actor?: string;
  }) {
    const inst = dbStore.installations.find((i) => i.id === installationId);
    if (!inst) throw new Error('Installation order not found');

    const cust = dbStore.customers.find((c) => c.id === inst.customerId);
    if (!cust) throw new Error('Customer not found');

    inst.status = 'COMPLETED';
    inst.assignedOntSn = data.assignedOntSn;
    inst.opticalPowerDbm = data.opticalPowerDbm;
    (inst as any).completedAt = new Date().toISOString();
    if (data.notes) inst.notes = (inst.notes ? inst.notes + ' | ' : '') + data.notes;

    // 1. Assign ONT Serial Number to Customer
    InventoryService.assignSerialToCustomer(data.assignedOntSn, cust.id);

    // 2. Consume 1 ONT hardware unit from stock (COGS accounting entry)
    const ontProduct = dbStore.products.find((p) => p.sku === 'ONT-HG8245H5') || dbStore.products[0];
    if (ontProduct) {
      InventoryService.recordMovement({
        productId: ontProduct.id,
        type: 'INSTALLATION_CONSUME',
        quantity: 1,
        reference: inst.orderNumber,
        note: `Consumed ONT for customer ${cust.code} installation`,
        actor: data.actor || 'Technician',
      });
    }

    // 3. Provision PPPoE Account on MikroTik Core Router
    const pppoeUser = cust.pppoeUsername || `${cust.fullName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_pppoe`;
    cust.pppoeUsername = pppoeUser;
    cust.status = 'ACTIVE';

    await MikroTikService.provisionPPPoEAccount('rtr-core-1', {
      name: pppoeUser,
      password: 'pppoe_secure_password',
      service: 'pppoe',
      profile: cust.planName.toLowerCase().replace(/\s+/g, '-'),
      remoteAddress: cust.ipAddress,
      callerId: cust.macAddress,
      disabled: false,
      comment: `Subscriber: ${cust.code} (${cust.fullName})`,
    });

    // 4. Generate First Recurring Customer Invoice
    const currentPeriod = new Date().toISOString().slice(0, 7);
    const existingInvoice = dbStore.invoices.find(
      (i) => i.customerId === cust.id && i.billingPeriod === currentPeriod
    );

    let firstInvoice = null;
    if (!existingInvoice) {
      firstInvoice = BillingService.generateInvoice({
        customerId: cust.id,
        billingPeriod: currentPeriod,
        items: [
          { description: `${cust.planName} (First Month Subscription)`, amount: cust.monthlyPrice },
          { description: 'Fiber Drop Cable & Optical Activation Fee', amount: 25.0 },
        ],
      });
    }

    dbStore.logAudit(
      'COMPLETE_INSTALLATION',
      'Installation',
      inst.orderNumber,
      `Completed installation for ${cust.fullName}. ONT SN: ${data.assignedOntSn}. PPPoE: ${pppoeUser}. Activated!`
    );

    return {
      installation: inst,
      customer: cust,
      invoice: firstInvoice,
      message: 'Installation completed, subscriber activated, ONT assigned, and first invoice generated.',
    };
  }

  // 2. Technicians
  static listTechnicians() {
    return dbStore.technicians.map((t) => {
      const activeJobs = dbStore.installations.filter((i) => i.technicianId === t.id && i.status !== 'COMPLETED').length;
      return {
        ...t,
        activeJobs,
      };
    });
  }

  // 3. Support Tickets
  static listTickets(status?: string, priority?: string) {
    let list = [...dbStore.tickets];
    if (status) list = list.filter((t) => t.status === status);
    if (priority) list = list.filter((t) => t.priority === priority);

    return list.map((t) => {
      const cust = dbStore.customers.find((c) => c.id === t.customerId);
      return {
        ...t,
        customerName: cust?.fullName || 'Customer',
        customerPhone: cust?.phone || '',
      };
    });
  }

  static createTicket(data: {
    customerId: string;
    title: string;
    description: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    category?: string;
    assignedTechnician?: string;
  }) {
    const cust = dbStore.customers.find((c) => c.id === data.customerId);
    if (!cust) throw new Error('Customer not found');

    const ticketNumber = `TCK-${(dbStore.tickets.length + 1044).toString()}`;
    const newTicket = {
      id: `tck-${Date.now()}`,
      ticketNumber,
      customerId: cust.id,
      customerName: cust.fullName,
      title: data.title,
      description: data.description,
      priority: data.priority || 'MEDIUM',
      status: 'OPEN',
      category: data.category || 'Slow Internet',
      assignedTechnician: data.assignedTechnician || 'Marcus Vance',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    dbStore.tickets.unshift(newTicket);
    dbStore.logAudit('CREATE_TICKET', 'SupportTicket', ticketNumber, `Created support ticket for ${cust.fullName}`);
    return newTicket;
  }

  static updateTicketStatus(ticketId: string, status: string, resolutionNotes?: string) {
    const ticket = dbStore.tickets.find((t) => t.id === ticketId);
    if (!ticket) throw new Error('Ticket not found');

    ticket.status = status as any;
    ticket.updatedAt = new Date().toISOString();
    if (status === 'RESOLVED' || status === 'CLOSED') {
      (ticket as any).resolvedAt = new Date().toISOString();
      if (resolutionNotes) (ticket as any).resolutionNotes = resolutionNotes;
    }

    dbStore.logAudit('UPDATE_TICKET', 'SupportTicket', ticket.ticketNumber, `Ticket status changed to ${status}`);
    return ticket;
  }
}
