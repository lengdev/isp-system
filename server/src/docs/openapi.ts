export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'NSMISP ISP ERP, CRM & Network Operations REST API',
    version: '1.0.0',
    description:
      'Production-grade RESTful API specification for NSMISP: complete ISP business management, FTTH & Wireless CRM, MikroTik RouterOS PPPoE provisioning, VLAN & IPAM, double-entry General Ledger, Inventory & Warehouse, and Automation.',
    contact: {
      name: 'NSMISP Operations',
      email: 'support@nsmisp.net',
    },
  },
  servers: [
    {
      url: '/api/v1',
      description: 'Primary API Gateway',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/auth/login': {
      post: {
        summary: 'Authenticate staff user',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  username: { type: 'string', example: 'admin' },
                  password: { type: 'string', example: 'admin123!' },
                },
                required: ['username', 'password'],
              },
            },
          },
        },
        responses: {
          200: { description: 'Authenticated successfully with JWT token' },
          401: { description: 'Invalid credentials' },
        },
      },
    },
    '/customers': {
      get: {
        summary: 'List subscribers with filters and search',
        tags: ['Customers'],
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'plan', in: 'query', schema: { type: 'string' } },
          { name: 'searchQuery', in: 'query', schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'List of subscribers' } },
      },
      post: {
        summary: 'Register new customer',
        tags: ['Customers'],
        responses: { 201: { description: 'Customer created' } },
      },
    },
    '/customers/{id}': {
      get: {
        summary: 'Get 360 customer profile with network & billing details',
        tags: ['Customers'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Customer profile details' } },
      },
      put: {
        summary: 'Update customer information',
        tags: ['Customers'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Customer updated' } },
      },
      delete: {
        summary: 'Archive/delete customer',
        tags: ['Customers'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Customer archived' } },
      },
    },
    '/packages': {
      get: { summary: 'List broadband packages', tags: ['Packages'], responses: { 200: { description: 'Packages list' } } },
      post: { summary: 'Create broadband package', tags: ['Packages'], responses: { 201: { description: 'Package created' } } },
    },
    '/network/routers': {
      get: { summary: 'List MikroTik routers fleet', tags: ['Network'], responses: { 200: { description: 'Routers list' } } },
    },
    '/network/pppoe': {
      get: { summary: 'List PPPoE accounts & active sessions', tags: ['Network'], responses: { 200: { description: 'PPPoE accounts' } } },
    },
    '/network/vlans': {
      get: { summary: 'List VLAN inventory & router associations', tags: ['Network'], responses: { 200: { description: 'VLAN inventory' } } },
      post: { summary: 'Create VLAN with conflict validation', tags: ['Network'], responses: { 201: { description: 'VLAN created' } } },
    },
    '/invoices': {
      get: { summary: 'List invoices', tags: ['Billing'], responses: { 200: { description: 'Invoices list' } } },
      post: { summary: 'Generate recurring or manual invoice', tags: ['Billing'], responses: { 201: { description: 'Invoice generated' } } },
    },
    '/payments/record': {
      post: { summary: 'Record customer payment & auto-post balanced journal', tags: ['Payments'], responses: { 201: { description: 'Payment recorded' } } },
    },
    '/payments/khqr': {
      post: { summary: 'Generate Bakong / KHQR payment payload', tags: ['Payments'], responses: { 200: { description: 'KHQR string and payload' } } },
    },
    '/accounting/dashboard': {
      get: { summary: 'Accounting KPI dashboard', tags: ['Accounting'], responses: { 200: { description: 'Financial overview' } } },
    },
    '/accounting/journal': {
      post: { summary: 'Post balanced double-entry journal (Debits == Credits)', tags: ['Accounting'], responses: { 201: { description: 'Journal posted' } } },
    },
    '/accounting/trial-balance': {
      get: { summary: 'Generate Trial Balance', tags: ['Accounting'], responses: { 200: { description: 'Trial balance report' } } },
    },
    '/accounting/pnl': {
      get: { summary: 'Generate Profit and Loss (Income Statement)', tags: ['Accounting'], responses: { 200: { description: 'P&L report' } } },
    },
    '/accounting/balance-sheet': {
      get: { summary: 'Generate Balance Sheet', tags: ['Accounting'], responses: { 200: { description: 'Balance sheet report' } } },
    },
    '/inventory/products': {
      get: { summary: 'List inventory products', tags: ['Inventory'], responses: { 200: { description: 'Products list' } } },
      post: { summary: 'Create inventory product', tags: ['Inventory'], responses: { 201: { description: 'Product created' } } },
    },
    '/inventory/movements': {
      post: { summary: 'Record stock movement (In, Out, Transfer)', tags: ['Inventory'], responses: { 201: { description: 'Movement recorded' } } },
    },
    '/purchasing/orders': {
      get: { summary: 'List purchase orders', tags: ['Procurement'], responses: { 200: { description: 'POs list' } } },
      post: { summary: 'Create purchase order', tags: ['Procurement'], responses: { 201: { description: 'PO created' } } },
    },
    '/operations/installations': {
      get: { summary: 'List installation work orders', tags: ['Operations'], responses: { 200: { description: 'Installations list' } } },
      post: { summary: 'Schedule installation work order', tags: ['Operations'], responses: { 201: { description: 'Installation created' } } },
    },
    '/operations/installations/{id}/complete': {
      post: { summary: 'Complete installation, reserve ONT, provision PPPoE, activate subscriber', tags: ['Operations'], responses: { 200: { description: 'Activated' } } },
    },
    '/automation/rules': {
      get: { summary: 'List automation rules', tags: ['Automation'], responses: { 200: { description: 'Rules list' } } },
    },
    '/reports/dashboard': {
      get: { summary: 'Executive network operations dashboard metrics', tags: ['Reports'], responses: { 200: { description: 'Dashboard metrics' } } },
    },
  },
};
