import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { initDatabaseConnection, prisma } from './db/store.js';
import { openApiSpec } from './docs/openapi.js';
import { authenticate, authorize } from './middleware/auth.middleware.js';
import { RbacService } from './services/rbac.service.js';

// Route imports
import authRoutes from './routes/auth.routes.js';
import customerRoutes from './routes/customer.routes.js';
import packageRoutes from './routes/package.routes.js';
import networkRoutes from './routes/network.routes.js';
import billingRoutes from './routes/billing.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import inventoryRoutes from './routes/inventory.routes.js';
import procurementRoutes from './routes/procurement.routes.js';
import accountingRoutes from './routes/accounting.routes.js';
import operationsRoutes from './routes/operations.routes.js';
import reportsRoutes from './routes/reports.routes.js';
import automationRoutes from './routes/automation.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import portalRoutes from './routes/portal.routes.js';

dotenv.config();

// Validate critical secrets in production
if (process.env.NODE_ENV === 'production') {
  const missingSecrets: string[] = [];
  if (!process.env.JWT_SECRET) missingSecrets.push('JWT_SECRET');
  if (!process.env.JWT_REFRESH_SECRET) missingSecrets.push('JWT_REFRESH_SECRET');
  if (process.env.COOKIE_SECURE === undefined) missingSecrets.push('COOKIE_SECURE');
  if (missingSecrets.length > 0) {
    console.error(`[FATAL] Missing required production environment variables: ${missingSecrets.join(', ')}`);
    process.exit(1);
  }
}

export const app = express();
const PORT = process.env.PORT || 5000;

// Security Headers with Helmet
app.use(
  helmet({
    contentSecurityPolicy: false, // Allows Swagger UI and interactive docs
    crossOriginEmbedderPolicy: false,
  })
);

// CORS limited to frontend origin with credentials enabled for httpOnly cookies
const FRONTEND_ORIGIN = process.env.FRONTEND_URL || 'http://localhost:5173';
app.use(
  cors({
    origin: [FRONTEND_ORIGIN, 'http://127.0.0.1:5173', 'http://localhost:5173'],
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, _res, next) => {
  if (process.env.NODE_ENV !== 'test') {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  }
  next();
});

// Public Health Check for System Operational indicator
app.get('/api/v1/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'NSMISP Operations API',
    version: '1.0.0',
  });
});

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'NSMISP ERP & CRM Engine',
    version: '1.0.0',
  });
});

// OpenAPI Spec & Interactive Docs
app.get('/api/v1/openapi.json', (_req, res) => {
  res.json(openApiSpec);
});

app.get('/api/docs', (_req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>NSMISP API Documentation</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
  <style>
    body { margin: 0; background: #FAF7F5; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    .swagger-ui .topbar { background-color: #141416; border-bottom: 2px solid #F26B3A; }
    .swagger-ui .topbar a { max-width: 300px; font-weight: bold; color: #F26B3A; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
  <script>
    window.onload = () => {
      window.ui = SwaggerUIBundle({
        url: '/api/v1/openapi.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis],
      });
    };
  </script>
</body>
</html>
  `);
});

// Mount V1 API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/portal', portalRoutes);

// Protected routes with dynamic RBAC permission & user-override authorization
app.use(
  '/api/v1/billing',
  authenticate,
  authorize('billing.view', 'billing.create', 'billing.edit', 'billing.delete', 'payments.view', 'payments.record', 'payments.khqr', 'payments.delete'),
  billingRoutes
);
app.use(
  '/api/v1/invoices',
  authenticate,
  authorize('billing.view', 'billing.create', 'billing.edit', 'billing.delete', 'payments.view', 'payments.record', 'payments.khqr', 'payments.delete'),
  billingRoutes
);
app.use(
  '/api/v1/payments',
  authenticate,
  authorize('payments.view', 'payments.record', 'payments.khqr', 'payments.delete', 'billing.view'),
  paymentRoutes
);
app.use(
  '/api/v1/network',
  authenticate,
  authorize('network.view', 'network.create', 'network.edit', 'network.delete', 'routers.manage', 'routers.reboot', 'pppoe.manage', 'vlans.manage', 'ipam.manage'),
  networkRoutes
);
app.use(
  '/api/v1/routers',
  authenticate,
  authorize('network.view', 'network.create', 'network.edit', 'network.delete', 'routers.manage', 'routers.reboot', 'pppoe.manage', 'vlans.manage', 'ipam.manage'),
  networkRoutes
);
app.use(
  '/api/v1/accounting',
  authenticate,
  authorize('accounting.view', 'accounting.create', 'accounting.edit', 'accounting.delete', 'accounting.reports'),
  accountingRoutes
);
app.use(
  '/api/v1/operations',
  authenticate,
  authorize('operations.view', 'installations.manage', 'tickets.create', 'tickets.edit', 'tickets.delete', 'technicians.manage'),
  operationsRoutes
);
app.use(
  '/api/v1/installations',
  authenticate,
  authorize('operations.view', 'installations.manage'),
  operationsRoutes
);
app.use(
  '/api/v1/technicians',
  authenticate,
  authorize('operations.view', 'technicians.manage'),
  operationsRoutes
);
app.use(
  '/api/v1/inventory',
  authenticate,
  authorize('inventory.view', 'inventory.create', 'inventory.edit', 'inventory.delete', 'warehouses.manage'),
  inventoryRoutes
);
app.use(
  '/api/v1/purchasing',
  authenticate,
  authorize('procurement.view', 'procurement.create', 'procurement.edit', 'procurement.delete'),
  procurementRoutes
);
app.use(
  '/api/v1/customers',
  authenticate,
  customerRoutes
);
app.use(
  '/api/v1/packages',
  authenticate,
  authorize('packages.view', 'packages.create', 'packages.edit', 'packages.delete', 'subscriptions.view', 'subscriptions.create', 'subscriptions.edit', 'subscriptions.delete', 'customers.view'),
  packageRoutes
);
app.use(
  '/api/v1/tickets',
  authenticate,
  authorize('operations.view', 'tickets.create', 'tickets.edit', 'tickets.delete'),
  operationsRoutes
);
app.use(
  '/api/v1/reports',
  authenticate,
  authorize('reports.view', 'reports.create', 'reports.export', 'accounting.reports'),
  reportsRoutes
);
app.use(
  '/api/v1/automation',
  authenticate,
  authorize('automation.view', 'automation.create', 'automation.edit', 'automation.delete'),
  automationRoutes
);
app.use(
  '/api/v1/settings',
  authenticate,
  authorize('settings.view', 'settings.edit', 'audit.view', 'integrations.view', 'integrations.manage'),
  settingsRoutes
);

// Centralized error handling
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  // Map Prisma connection errors (P1001, P1002, P1017) to HTTP 503
  if (
    err.code === 'P1001' ||
    err.code === 'P1002' ||
    err.code === 'P1017' ||
    err.name === 'PrismaClientInitializationError'
  ) {
    console.error('[NSMISP Error]: Database connection error (503)');
    return res.status(503).json({
      error: 'Service temporarily unavailable',
    });
  }

  console.error('[NSMISP Error]:', err.message || err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

let server: any = null;

const shutdown = async (signal: string) => {
  console.log(`\n[NSMISP] Received ${signal}. Shutting down gracefully...`);
  if (server) {
    server.close(async () => {
      console.log('[NSMISP] HTTP server closed.');
      try {
        await prisma.$disconnect();
        console.log('[NSMISP] Database disconnected.');
      } catch (err) {
        console.error('[NSMISP] Error during database disconnect:', err);
      }
      process.exit(0);
    });
  } else {
    try {
      await prisma.$disconnect();
    } catch {}
    process.exit(0);
  }
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

async function startServer() {
  try {
    await initDatabaseConnection();
    await RbacService.syncRegistry();
  } catch (err: any) {
    console.error('[NSMISP FATAL]: Database connection failed. Aborting startup.');
    process.exit(1);
  }

  server = app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(`🚀 NSMISP ERP Backend running on port ${PORT}`);
    console.log(`📡 REST API Gateway: http://localhost:${PORT}/api/v1`);
    console.log(`📚 Swagger Docs:    http://localhost:${PORT}/api/docs`);
    console.log(`=======================================================`);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\x1b[31m[NSMISP Fatal]: Port ${PORT} is already in use by another process!\x1b[0m`);
      console.error(`To free port ${PORT}, run: kill -9 $(lsof -t -i:${PORT})\n`);
    } else {
      console.error('[NSMISP Server Listen Error]:', err);
    }
    process.exit(1);
  });
}

// Start Server if directly executed
if (process.env.NODE_ENV !== 'test') {
  startServer();
}
