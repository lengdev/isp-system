import {
  Customer,
  Plan,
  Invoice,
  SupportTicket,
  NetworkDevice,
  Technician,
  InstallationSchedule,
  ActivityLog,
  NotificationItem,
  ColumnSetting,
  Product,
  ProductLog,
} from '../types';

export const INITIAL_PLANS: Plan[] = [
  {
    id: 'plan-1',
    name: 'Fiber Starter 100M',
    speedMbps: 100,
    uploadMbps: 50,
    monthlyPrice: 39.99,
    dataCapGB: 500,
    type: 'Fiber',
    description: 'Reliable fiber internet for small apartments and basic browsing.',
    isPopular: false,
    subscribersCount: 42,
  },
  {
    id: 'plan-2',
    name: 'Fiber Turbo 300M',
    speedMbps: 300,
    uploadMbps: 150,
    monthlyPrice: 54.99,
    dataCapGB: null,
    type: 'Fiber',
    description: 'Great for streaming 4K, video calls, and multi-device homes.',
    isPopular: true,
    subscribersCount: 88,
  },
  {
    id: 'plan-3',
    name: 'Fiber Ultra 500M',
    speedMbps: 500,
    uploadMbps: 250,
    monthlyPrice: 69.99,
    dataCapGB: null,
    type: 'Fiber',
    description: 'Blazing fast speed for gaming, creators, and heavy downloads.',
    isPopular: false,
    subscribersCount: 64,
  },
  {
    id: 'plan-4',
    name: 'Fiber Gig Pro 1G',
    speedMbps: 1000,
    uploadMbps: 500,
    monthlyPrice: 89.99,
    dataCapGB: null,
    type: 'Fiber',
    description: 'Full Gigabit symmetrical capability for smart homes & power users.',
    isPopular: false,
    subscribersCount: 35,
  },
  {
    id: 'plan-5',
    name: 'Fiber Enterprise 2G',
    speedMbps: 2000,
    uploadMbps: 1000,
    monthlyPrice: 149.99,
    dataCapGB: null,
    type: 'Fiber',
    description: 'Multi-gig symmetrical fiber with dedicated SLA & static IP.',
    isPopular: false,
    subscribersCount: 12,
  },
  {
    id: 'plan-6',
    name: 'Wireless Rural Beam',
    speedMbps: 50,
    uploadMbps: 20,
    monthlyPrice: 44.99,
    dataCapGB: 350,
    type: 'Wireless',
    description: 'Long-range fixed wireless connection for rural estates.',
    isPopular: false,
    subscribersCount: 15,
  },
  {
    id: 'plan-7',
    name: 'Wireless FastPoint',
    speedMbps: 150,
    uploadMbps: 50,
    monthlyPrice: 64.99,
    dataCapGB: 600,
    type: 'Wireless',
    description: 'Microwave point-to-point wireless for suburban areas.',
    isPopular: false,
    subscribersCount: 18,
  },
  {
    id: 'plan-8',
    name: 'Legacy DSL Plus',
    speedMbps: 25,
    uploadMbps: 5,
    monthlyPrice: 29.99,
    dataCapGB: 200,
    type: 'DSL',
    description: 'Traditional copper broadband for light utility needs.',
    isPopular: false,
    subscribersCount: 6,
  },
];

export const INITIAL_COLUMNS: ColumnSetting[] = [
  { id: 'select', label: 'Select', visible: true, order: 0 },
  { id: 'customer', label: 'Customer', visible: true, order: 1 },
  { id: 'plan', label: 'Plan', visible: true, order: 2 },
  { id: 'price', label: 'Price', visible: true, order: 3 },
  { id: 'usage', label: 'Usage', visible: true, order: 4 },
  { id: 'dueAmount', label: 'Due Amount', visible: true, order: 5 },
  { id: 'status', label: 'Status', visible: true, order: 6 },
  { id: 'rating', label: 'Rating', visible: true, order: 7 },
  { id: 'action', label: 'Action', visible: true, order: 8 },
  // Optional columns that can be toggled in Customize View
  { id: 'ipAddress', label: 'IP Address', visible: false, order: 9 },
  { id: 'macAddress', label: 'MAC Address', visible: false, order: 10 },
  { id: 'city', label: 'City', visible: false, order: 11 },
  { id: 'connectionType', label: 'Connection Type', visible: false, order: 12 },
  { id: 'installationDate', label: 'Install Date', visible: false, order: 13 },
];

const FIRST_NAMES = [
  'James', 'Olivia', 'Liam', 'Emma', 'Noah', 'Amelia', 'Oliver', 'Sophia', 'Elijah', 'Isabella',
  'Lucas', 'Ava', 'Mason', 'Mia', 'Ethan', 'Harper', 'Alexander', 'Evelyn', 'Henry', 'Abigail',
  'Sebastian', 'Emily', 'Jack', 'Ella', 'Daniel', 'Elizabeth', 'Matthew', 'Camila', 'Samuel', 'Luna',
  'David', 'Sofia', 'Joseph', 'Avery', 'Carter', 'Mila', 'Owen', 'Aria', 'Wyatt', 'Scarlett',
  'John', 'Penelope', 'Luke', 'Layla', 'Asher', 'Chloe', 'Leo', 'Victoria', 'Julian', 'Madison',
  'Grace', 'Benjamin', 'Nora', 'Marcus', 'Elena', 'Nathan', 'Hannah', 'Aaron', 'Zoe', 'Caleb'
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
  'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
  'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
  'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts'
];

const CITIES = [
  'Austin, TX', 'Seattle, WA', 'Denver, CO', 'Portland, OR', 'San Jose, CA',
  'Raleigh, NC', 'Phoenix, AZ', 'Boston, MA', 'Atlanta, GA', 'Chicago, IL'
];

const STREETS = [
  'Oak Avenue', 'Maple Drive', 'Pine Boulevard', 'Cedar Lane', 'Elm Street',
  'Highland Way', 'Sunset Parkway', 'Lakeview Terrace', 'Spring Court', 'Hillside Road'
];

export function generateSeedCustomers(): Customer[] {
  const customers: Customer[] = [];
  const total = 240;

  for (let i = 1; i <= total; i++) {
    const fn = FIRST_NAMES[(i * 7) % FIRST_NAMES.length];
    const ln = LAST_NAMES[(i * 13) % LAST_NAMES.length];
    const fullName = `${fn} ${ln}`;
    const initials = `${fn[0]}${ln[0]}`;
    const email = `${fn.toLowerCase()}.${ln.toLowerCase()}${i % 5 === 0 ? i : ''}@example.com`;
    const streetNum = 100 + ((i * 37) % 8900);
    const street = STREETS[i % STREETS.length];
    const city = CITIES[i % CITIES.length];
    const address = `${streetNum} ${street}, ${city}`;

    // Select plan
    const planIndex = (i * 3) % INITIAL_PLANS.length;
    const plan = INITIAL_PLANS[planIndex];

    // Status distribution: ~75% Active, ~10% Suspended, ~7% Overdue, ~5% Pending, ~3% Disconnected
    let status: Customer['status'] = 'Active';
    const statusRand = (i * 19) % 100;
    if (statusRand < 74) {
      status = 'Active';
    } else if (statusRand < 84) {
      status = 'Suspended';
    } else if (statusRand < 92) {
      status = 'Overdue';
    } else if (statusRand < 97) {
      status = 'Pending';
    } else {
      status = 'Disconnected';
    }

    // IP & MAC
    const subnet = 10 + (i % 80);
    const host = 2 + (i % 250);
    const ipAddress = `192.168.${subnet}.${host}`;
    const macPart = (num: number) => num.toString(16).padStart(2, '0').toUpperCase();
    const macAddress = `F4:5C:89:${macPart(i % 256)}:${macPart((i * 3) % 256)}:${macPart((i * 7) % 256)}`;

    // Usage
    const cap = plan.dataCapGB || 1200;
    const usageGB = Math.floor(45 + ((i * 47) % (cap * 0.95)));

    // Balance
    let balanceDue = 0;
    if (status === 'Overdue') {
      balanceDue = Number((plan.monthlyPrice * (1 + (i % 3))).toFixed(2));
    } else if (status === 'Suspended') {
      balanceDue = Number((plan.monthlyPrice * 2).toFixed(2));
    } else if (i % 7 === 0) {
      balanceDue = plan.monthlyPrice;
    }

    // Rating
    const ratingValues = [4.0, 4.2, 4.5, 4.7, 4.8, 4.9, 5.0, 3.8, 4.3];
    const rating = ratingValues[i % ratingValues.length];

    // Dates
    const year = 2023 + (i % 3);
    const month = String(1 + (i % 12)).padStart(2, '0');
    const day = String(1 + (i % 28)).padStart(2, '0');
    const installationDate = `${year}-${month}-${day}`;
    const dueDay = String(5 + (i % 20)).padStart(2, '0');
    const dueDate = `2025-10-${dueDay}`;

    const onlineStatus = status === 'Active' ? ((i % 8 === 0) ? 'offline' : 'online') : 'offline';
    const lastPingMs = onlineStatus === 'online' ? 8 + (i % 24) : 999;

    customers.push({
      id: `cust-${i}`,
      code: `CUST-${1000 + i}`,
      initials,
      fullName,
      email,
      phone: `+1 (${200 + (i % 700)}) ${300 + (i % 600)}-${1000 + (i % 8999)}`,
      address,
      city,
      planId: plan.id,
      planName: plan.name,
      monthlyPrice: plan.monthlyPrice,
      connectionType: plan.type,
      ipAddress,
      macAddress,
      installationDate,
      dueDate,
      dataUsageGB: usageGB,
      dataCapGB: plan.dataCapGB,
      balanceDue,
      status,
      rating,
      notes: i % 4 === 0 ? 'High-priority VIP account with static IP assignment.' : undefined,
      onlineStatus,
      lastPingMs,
    });
  }

  return customers;
}

export const INITIAL_INVOICES: Invoice[] = [
  {
    id: 'inv-101',
    invoiceNumber: 'INV-2025-0891',
    customerId: 'cust-1',
    customerName: 'James Smith',
    customerEmail: 'james.smith@example.com',
    amount: 69.99,
    date: '2025-09-01',
    dueDate: '2025-09-15',
    status: 'Paid',
    items: [{ description: 'Fiber Ultra 500M - Sep 2025', amount: 69.99 }],
    paidAt: '2025-09-04',
    paymentMethod: 'Credit Card (Visa ···· 4242)',
  },
  {
    id: 'inv-102',
    invoiceNumber: 'INV-2025-0892',
    customerId: 'cust-2',
    customerName: 'Olivia Johnson',
    customerEmail: 'olivia.johnson@example.com',
    amount: 54.99,
    date: '2025-09-01',
    dueDate: '2025-09-15',
    status: 'Paid',
    items: [{ description: 'Fiber Turbo 300M - Sep 2025', amount: 54.99 }],
    paidAt: '2025-09-05',
    paymentMethod: 'Bank Transfer (ACH)',
  },
  {
    id: 'inv-103',
    invoiceNumber: 'INV-2025-0893',
    customerId: 'cust-5',
    customerName: 'Noah Martinez',
    customerEmail: 'noah.martinez5@example.com',
    amount: 89.99,
    date: '2025-08-15',
    dueDate: '2025-08-30',
    status: 'Overdue',
    items: [{ description: 'Fiber Gig Pro 1G - Aug 2025', amount: 89.99 }],
  },
  {
    id: 'inv-104',
    invoiceNumber: 'INV-2025-0894',
    customerId: 'cust-7',
    customerName: 'Oliver Wilson',
    customerEmail: 'oliver.wilson@example.com',
    amount: 39.99,
    date: '2025-09-10',
    dueDate: '2025-09-25',
    status: 'Pending',
    items: [{ description: 'Fiber Starter 100M - Sep 2025', amount: 39.99 }],
  },
  {
    id: 'inv-105',
    invoiceNumber: 'INV-2025-0895',
    customerId: 'cust-10',
    customerName: 'Isabella Taylor',
    customerEmail: 'isabella.taylor10@example.com',
    amount: 149.99,
    date: '2025-09-01',
    dueDate: '2025-09-15',
    status: 'Paid',
    items: [{ description: 'Fiber Enterprise 2G - Sep 2025', amount: 149.99 }],
    paidAt: '2025-09-02',
    paymentMethod: 'AutoPay (MasterCard ···· 8821)',
  },
];

export const INITIAL_TICKETS: SupportTicket[] = [
  {
    id: 'tkt-1',
    ticketNumber: 'TKT-4890',
    customerId: 'cust-2',
    customerName: 'Olivia Johnson',
    title: 'Intermittent ONT optical signal drop',
    description: 'Customer reports optical light blinking red during peak evening hours.',
    priority: 'High',
    status: 'In Progress',
    assignedTechnician: 'Carlos Ramos',
    createdAt: '2025-09-16T14:30:00Z',
    updatedAt: '2025-09-17T09:15:00Z',
  },
  {
    id: 'tkt-2',
    ticketNumber: 'TKT-4891',
    customerId: 'cust-5',
    customerName: 'Noah Martinez',
    title: 'Billing question about static IP addon',
    description: 'Inquired about upgrading to a /29 subnet for home lab.',
    priority: 'Medium',
    status: 'Open',
    assignedTechnician: 'Sarah Jenkins',
    createdAt: '2025-09-17T08:00:00Z',
    updatedAt: '2025-09-17T08:00:00Z',
  },
  {
    id: 'tkt-3',
    ticketNumber: 'TKT-4888',
    customerId: 'cust-12',
    customerName: 'Ava Hernandez',
    title: 'Router reboot resolved slow speeds',
    description: 'Speed test was showing 45Mbps instead of 500Mbps, ONT power cycle fixed.',
    priority: 'Low',
    status: 'Resolved',
    assignedTechnician: 'Carlos Ramos',
    createdAt: '2025-09-15T11:20:00Z',
    updatedAt: '2025-09-16T16:00:00Z',
  },
  {
    id: 'tkt-4',
    ticketNumber: 'TKT-4885',
    customerId: 'cust-15',
    customerName: 'Ethan Perez',
    title: 'Physical fiber line severed by garden landscaping',
    description: 'Drop cable severed near property fence. Splicing crew needed on site.',
    priority: 'Critical',
    status: 'In Progress',
    assignedTechnician: 'Marcus Vance',
    createdAt: '2025-09-16T17:45:00Z',
    updatedAt: '2025-09-17T10:00:00Z',
  },
];

export const INITIAL_DEVICES: NetworkDevice[] = [
  {
    id: 'dev-1',
    name: 'OLT-Central-Downtown-01',
    type: 'OLT',
    ipAddress: '10.0.1.10',
    location: 'Central CO - Rack 4',
    status: 'Online',
    uptimeDays: 142,
    cpuLoadPercent: 24,
    connectedClients: 840,
    firmwareVersion: 'v4.1.8-LTS',
    lastPingMs: 2,
  },
  {
    id: 'dev-2',
    name: 'Edge-Router-BGP-Core',
    type: 'Core Router',
    ipAddress: '10.0.0.1',
    location: 'Datacenter North Gate',
    status: 'Online',
    uptimeDays: 289,
    cpuLoadPercent: 42,
    connectedClients: 2480,
    firmwareVersion: 'RouterOS 7.12',
    lastPingMs: 1,
  },
  {
    id: 'dev-3',
    name: 'OLT-South-Suburbs-02',
    type: 'OLT',
    ipAddress: '10.0.2.10',
    location: 'Substation South 3',
    status: 'Warning',
    uptimeDays: 45,
    cpuLoadPercent: 78,
    connectedClients: 610,
    firmwareVersion: 'v4.0.2',
    lastPingMs: 14,
  },
  {
    id: 'dev-4',
    name: 'Tower-Wireless-Hilltop-AP4',
    type: 'Access Point',
    ipAddress: '10.0.5.24',
    location: 'Hilltop Radio Tower East',
    status: 'Online',
    uptimeDays: 61,
    cpuLoadPercent: 31,
    connectedClients: 64,
    firmwareVersion: 'airOS 8.7.1',
    lastPingMs: 9,
  },
];

export const INITIAL_TECHNICIANS: Technician[] = [
  {
    id: 'tech-1',
    name: 'Carlos Ramos',
    avatar: 'CR',
    phone: '+1 (512) 555-0192',
    email: 'carlos.r@netpulse.net',
    zone: 'Downtown & Central',
    activeJobs: 2,
    completedToday: 3,
    rating: 4.9,
    status: 'On Job',
  },
  {
    id: 'tech-2',
    name: 'Sarah Jenkins',
    avatar: 'SJ',
    phone: '+1 (512) 555-0144',
    email: 'sarah.j@netpulse.net',
    zone: 'North District',
    activeJobs: 1,
    completedToday: 4,
    rating: 5.0,
    status: 'Available',
  },
  {
    id: 'tech-3',
    name: 'Marcus Vance',
    avatar: 'MV',
    phone: '+1 (512) 555-0187',
    email: 'marcus.v@netpulse.net',
    zone: 'West Hill & Rural',
    activeJobs: 1,
    completedToday: 2,
    rating: 4.8,
    status: 'On Job',
  },
];

export const INITIAL_SCHEDULES: InstallationSchedule[] = [
  {
    id: 'sch-1',
    customerId: 'cust-4',
    customerName: 'Emma Wilson',
    customerPhone: '+1 (512) 555-4421',
    address: '842 Lakeview Terrace, Austin, TX',
    scheduledDate: '2025-09-17',
    timeSlot: '13:00 - 15:00',
    technicianId: 'tech-1',
    technicianName: 'Carlos Ramos',
    planName: 'Fiber Gig Pro 1G',
    status: 'In Progress',
  },
  {
    id: 'sch-2',
    customerId: 'cust-9',
    customerName: 'Elijah Davis',
    customerPhone: '+1 (512) 555-7790',
    address: '1240 Oak Avenue, Austin, TX',
    scheduledDate: '2025-09-17',
    timeSlot: '15:30 - 17:30',
    technicianId: 'tech-2',
    technicianName: 'Sarah Jenkins',
    planName: 'Fiber Turbo 300M',
    status: 'Scheduled',
  },
  {
    id: 'sch-3',
    customerId: 'cust-18',
    customerName: 'Henry Jackson',
    customerPhone: '+1 (512) 555-3312',
    address: '562 Sunset Parkway, Austin, TX',
    scheduledDate: '2025-09-18',
    timeSlot: '09:00 - 11:00',
    technicianId: 'tech-3',
    technicianName: 'Marcus Vance',
    planName: 'Wireless Rural Beam',
    status: 'Scheduled',
  },
];

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    title: 'High Bandwidth Alert',
    description: 'Substation South 3 reached 88% capacity during evening peak.',
    timestamp: '10 min ago',
    read: false,
    type: 'alert',
  },
  {
    id: 'notif-2',
    title: 'Payment Received',
    description: '$149.99 auto-paid by Isabella Taylor for Fiber Enterprise 2G.',
    timestamp: '45 min ago',
    read: false,
    type: 'invoice',
  },
  {
    id: 'notif-3',
    title: 'New Critical Ticket #4885',
    description: 'Severed drop cable reported at West Ridge sector.',
    timestamp: '2 hours ago',
    read: false,
    type: 'ticket',
  },
  {
    id: 'notif-4',
    title: 'Automated Backup Completed',
    description: 'Network device configuration snapshots saved successfully.',
    timestamp: '5 hours ago',
    read: true,
    type: 'system',
  },
];

export const INITIAL_ACTIVITIES: ActivityLog[] = [
  {
    id: 'act-1',
    customerId: 'cust-1',
    action: 'Payment Processed',
    details: 'Received $69.99 via Visa ending in 4242',
    actor: 'AutoPay System',
    timestamp: 'Today at 09:12 AM',
    type: 'billing',
  },
  {
    id: 'act-2',
    customerId: 'cust-15',
    action: 'Status Changed',
    details: 'Status updated from Active to Suspended (Fiber line severed)',
    actor: 'Marcus Vance',
    timestamp: 'Today at 08:30 AM',
    type: 'status',
  },
  {
    id: 'act-3',
    customerId: 'cust-4',
    action: 'Installation Started',
    details: 'Technician Carlos Ramos dispatched for ONT provisioning',
    actor: 'System Dispatch',
    timestamp: 'Today at 08:00 AM',
    type: 'network',
  },
  {
    id: 'act-4',
    action: 'Firmware Upgraded',
    details: 'OLT-Central-Downtown-01 updated to v4.1.8-LTS without downtime',
    actor: 'Admin (Hariharan B)',
    timestamp: 'Yesterday at 11:45 PM',
    type: 'network',
  },
];

// ==========================================
// INITIAL INVENTORY PRODUCTS & LOGS
// ==========================================

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    sku: 'ONT-HW-EG8145V5',
    name: 'Huawei EchoLife EG8145V5 Dual-Band GPON ONT',
    category: 'ONT / Modem',
    quantity: 48,
    minStockAlert: 15,
    unitPrice: 65.0,
    costPrice: 42.5,
    status: 'In Stock',
    supplier: 'Huawei Telecommunications Corp',
    location: 'Warehouse A - Rack 02',
    description: 'Routing-type ONT in Huawei optical access solution with 4 GE ports and Wi-Fi 5.',
    createdAt: '2025-08-10',
    updatedAt: '2025-10-14',
  },
  {
    id: 'prod-2',
    sku: 'ONT-ZTE-F670L',
    name: 'ZTE ZXHN F670L AC1200 Gigabit GPON Terminal',
    category: 'ONT / Modem',
    quantity: 26,
    minStockAlert: 10,
    unitPrice: 59.99,
    costPrice: 38.0,
    status: 'In Stock',
    supplier: 'ZTE Global Direct',
    location: 'Warehouse A - Rack 03',
    description: 'GPON Optical Network Terminal with 4 Gigabit Ethernet and dual band Wi-Fi.',
    createdAt: '2025-08-15',
    updatedAt: '2025-10-12',
  },
  {
    id: 'prod-3',
    sku: 'RTR-TPL-AX55',
    name: 'TP-Link Archer AX55 Dual-Band Wi-Fi 6 Router',
    category: 'Wi-Fi Router',
    quantity: 34,
    minStockAlert: 12,
    unitPrice: 89.99,
    costPrice: 62.0,
    status: 'In Stock',
    supplier: 'TP-Link Wholesale Logistics',
    location: 'Warehouse B - Shelf 01',
    description: 'Next-Gen Gigabit Wi-Fi 6 speed up to 2402 Mbps on 5 GHz and 574 Mbps on 2.4 GHz.',
    createdAt: '2025-07-20',
    updatedAt: '2025-10-18',
  },
  {
    id: 'prod-4',
    sku: 'RTR-MTK-HEX-S',
    name: 'MikroTik hEX S 5-Port Gigabit Router (RB760iGS)',
    category: 'Wi-Fi Router',
    quantity: 8,
    minStockAlert: 10,
    unitPrice: 75.0,
    costPrice: 52.0,
    status: 'Low Stock',
    supplier: 'MikroTik Baltic Distribution',
    location: 'Warehouse B - Shelf 02',
    description: '5-port Gigabit Ethernet router with SFP cage and PoE out capability on port 5.',
    createdAt: '2025-06-11',
    updatedAt: '2025-10-20',
  },
  {
    id: 'prod-5',
    sku: 'CAB-SM-DROP-1KM',
    name: 'Single-Mode G.657A1 Flat Drop Cable (1000m Reel)',
    category: 'Fiber Cable',
    quantity: 14,
    minStockAlert: 5,
    unitPrice: 135.0,
    costPrice: 95.0,
    status: 'In Stock',
    supplier: 'Prysmian Group Telecom',
    location: 'Central Depot - Yard Bay 04',
    description: 'Self-supporting steel messenger wire aerial outdoor flat drop optic fiber cable.',
    createdAt: '2025-05-18',
    updatedAt: '2025-09-30',
  },
  {
    id: 'prod-6',
    sku: 'SPL-PLC-1X8-SC',
    name: 'PLC Optical Splitter 1x8 Mini Steel Tube SC/APC',
    category: 'Splitter',
    quantity: 75,
    minStockAlert: 20,
    unitPrice: 7.5,
    costPrice: 3.8,
    status: 'In Stock',
    supplier: 'FiberTech Components Ltd',
    location: 'Warehouse A - Bin 14',
    description: 'High uniformity micro steel tube PLC splitter with 0.9mm loose tube SC/APC connectors.',
    createdAt: '2025-08-01',
    updatedAt: '2025-10-05',
  },
  {
    id: 'prod-7',
    sku: 'SPL-PLC-1X16-SC',
    name: 'PLC Optical Splitter 1x16 Blockless SC/APC',
    category: 'Splitter',
    quantity: 4,
    minStockAlert: 15,
    unitPrice: 14.25,
    costPrice: 7.9,
    status: 'Low Stock',
    supplier: 'FiberTech Components Ltd',
    location: 'Warehouse A - Bin 15',
    description: '1x16 Planar Lightwave Circuit Splitter with SC/APC input/output pigtails.',
    createdAt: '2025-08-01',
    updatedAt: '2025-10-19',
  },
  {
    id: 'prod-8',
    sku: 'CON-SC-APC-FAST',
    name: 'SC/APC Pre-embedded Fast Field Connector (100-pack)',
    category: 'Connector',
    quantity: 22,
    minStockAlert: 8,
    unitPrice: 42.0,
    costPrice: 24.0,
    status: 'In Stock',
    supplier: 'OptiFast Network Supplies',
    location: 'Warehouse A - Drawer 08',
    description: 'Reusable field assembly optical connector for FTTH drop line quick termination.',
    createdAt: '2025-07-14',
    updatedAt: '2025-10-15',
  },
  {
    id: 'prod-9',
    sku: 'SFP-10G-BIDI-20',
    name: '10G SFP+ BiDi Transceiver 1270/1330nm 20km LC',
    category: 'SFP Transceiver',
    quantity: 0,
    minStockAlert: 6,
    unitPrice: 95.0,
    costPrice: 65.0,
    status: 'Out of Stock',
    supplier: 'FS.com Enterprise Optical',
    location: 'Warehouse C - Secure Cage',
    description: 'Single-mode simplex LC WDM 10Gbps transceiver for backbone distribution links.',
    createdAt: '2025-06-25',
    updatedAt: '2025-10-21',
  },
  {
    id: 'prod-10',
    sku: 'SFP-GPON-OLT-C3',
    name: 'GPON OLT SFP Transceiver Module Class C+++',
    category: 'SFP Transceiver',
    quantity: 6,
    minStockAlert: 8,
    unitPrice: 85.0,
    costPrice: 55.0,
    status: 'Low Stock',
    supplier: 'FS.com Enterprise Optical',
    location: 'Warehouse C - Secure Cage',
    description: 'Tx 1490nm 2.488Gbps / Rx 1310nm 1.244Gbps pluggable module with SC receptacle.',
    createdAt: '2025-06-25',
    updatedAt: '2025-10-11',
  },
  {
    id: 'prod-11',
    sku: 'TOL-OPM-VFL-PRO',
    name: 'Optical Power Meter & 30mW Visual Fault Locator 2-in-1',
    category: 'Tool & Equipment',
    quantity: 12,
    minStockAlert: 4,
    unitPrice: 49.99,
    costPrice: 29.0,
    status: 'In Stock',
    supplier: 'Precision Optic Tools US',
    location: 'Tech Depot - Tool Locker 2',
    description: 'Field diagnostic tester measuring -70dBm to +10dBm with red laser fault beacon.',
    createdAt: '2025-05-10',
    updatedAt: '2025-09-15',
  },
  {
    id: 'prod-12',
    sku: 'TOL-FIBER-CLEAVER',
    name: 'High-Precision Optical Fiber Cleaver FC-6S',
    category: 'Tool & Equipment',
    quantity: 3,
    minStockAlert: 5,
    unitPrice: 78.5,
    costPrice: 48.0,
    status: 'Low Stock',
    supplier: 'Precision Optic Tools US',
    location: 'Tech Depot - Tool Locker 1',
    description: '16-surface rotating tungsten blade cleaver for 250um and 900um fiber splicing.',
    createdAt: '2025-05-10',
    updatedAt: '2025-10-17',
  },
  {
    id: 'prod-13',
    sku: 'AP-UBNT-U6-PRO',
    name: 'Ubiquiti UniFi U6-Pro Ceiling-Mount Wi-Fi 6 AP',
    category: 'Access Point',
    quantity: 19,
    minStockAlert: 6,
    unitPrice: 159.0,
    costPrice: 119.0,
    status: 'In Stock',
    supplier: 'Ubiquiti Inc. Direct Wholesale',
    location: 'Warehouse B - Shelf 03',
    description: 'High-performance Wi-Fi 6 indoor/outdoor access point with 5.3 Gbps aggregate throughput.',
    createdAt: '2025-07-02',
    updatedAt: '2025-10-16',
  },
  {
    id: 'prod-14',
    sku: 'ENC-OUTDOOR-FDB-16',
    name: '16-Core Fiber Distribution Box IP65 Waterproof',
    category: 'Tool & Equipment',
    quantity: 32,
    minStockAlert: 10,
    unitPrice: 28.0,
    costPrice: 16.5,
    status: 'In Stock',
    supplier: 'FiberTech Components Ltd',
    location: 'Central Depot - Bay 02',
    description: 'Outdoor pole and wall-mounted optical termination enclosure for subscriber drops.',
    createdAt: '2025-07-28',
    updatedAt: '2025-10-14',
  },
  {
    id: 'prod-15',
    sku: 'ONT-NOKIA-G140W',
    name: 'Nokia G-140W-ME GPON Home Gateway Terminal',
    category: 'ONT / Modem',
    quantity: 0,
    minStockAlert: 8,
    unitPrice: 72.0,
    costPrice: 46.0,
    status: 'Out of Stock',
    supplier: 'Nokia Solutions and Networks',
    location: 'Warehouse A - Rack 01',
    description: 'Discontinued gateway unit retained for legacy warranty replacements and servicing.',
    createdAt: '2025-04-12',
    updatedAt: '2025-10-02',
  },
];

export const INITIAL_PRODUCT_LOGS: ProductLog[] = [
  {
    id: 'plog-1',
    productId: 'prod-1',
    productName: 'Huawei EchoLife EG8145V5 Dual-Band GPON ONT',
    sku: 'ONT-HW-EG8145V5',
    action: 'Stock In',
    change: '+20 units',
    previousQuantity: 28,
    newQuantity: 48,
    actor: 'Marcus Vance',
    reason: 'Restock shipment PO-2025-882 received from manufacturer',
    timestamp: 'Today at 10:15 AM',
  },
  {
    id: 'plog-2',
    productId: 'prod-4',
    productName: 'MikroTik hEX S 5-Port Gigabit Router (RB760iGS)',
    sku: 'RTR-MTK-HEX-S',
    action: 'Stock Out',
    change: '-2 units',
    previousQuantity: 10,
    newQuantity: 8,
    actor: 'Carlos Ramos',
    reason: 'Dispatched for Customer CUST-1004 Enterprise installation',
    timestamp: 'Today at 09:30 AM',
  },
  {
    id: 'plog-3',
    productId: 'prod-9',
    productName: '10G SFP+ BiDi Transceiver 1270/1330nm 20km LC',
    sku: 'SFP-10G-BIDI-20',
    action: 'Status Changed',
    change: 'Depleted to 0 units',
    previousQuantity: 3,
    newQuantity: 0,
    actor: 'Hariharan B',
    reason: 'Used for Substation East ring upgrade. Emergency reorder placed.',
    timestamp: 'Yesterday at 04:45 PM',
  },
  {
    id: 'plog-4',
    productId: 'prod-3',
    productName: 'TP-Link Archer AX55 Dual-Band Wi-Fi 6 Router',
    sku: 'RTR-TPL-AX55',
    action: 'Price Changed',
    change: '$84.99 -> $89.99',
    previousQuantity: 34,
    newQuantity: 34,
    actor: 'Hariharan B',
    reason: 'Supplier cost adjustment passed through to retail catalog',
    timestamp: '2 days ago',
  },
  {
    id: 'plog-5',
    productId: 'prod-13',
    productName: 'Ubiquiti UniFi U6-Pro Ceiling-Mount Wi-Fi 6 AP',
    sku: 'AP-UBNT-U6-PRO',
    action: 'Created',
    change: 'Initial batch 25 units',
    previousQuantity: 0,
    newQuantity: 25,
    actor: 'Sarah Jenkins',
    reason: 'New product line onboarded for SME commercial subscriptions',
    timestamp: '5 days ago',
  },
];

