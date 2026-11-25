import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { initDatabaseConnection, prisma } from './db/store.js';
import { openApiSpec } from './docs/openapi.js';
import { authenticate, requireRole } from './middleware/auth.middleware.js';
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
    service: 'NetPulse ISP Operations API',
    version: '1.0.0',
  });
});

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'NetPulse ISP ERP & CRM Engine',
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
  <title>NetPulse ISP API Documentation</title>
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

// Protected routes with RBAC role authorization
app.use(
  '/api/v1/billing',
  authenticate,
  requireRole('SUPER_ADMIN', 'BILLING_CASHIER', 'CASHIER', 'ACCOUNTANT', 'ADMINISTRATOR'),
  billingRoutes
);
app.use(
  '/api/v1/invoices',
  authenticate,
  requireRole('SUPER_ADMIN', 'BILLING_CASHIER', 'CASHIER', 'ACCOUNTANT', 'ADMINISTRATOR'),
  billingRoutes
);
app.use(
  '/api/v1/payments',
  authenticate,
  requireRole('SUPER_ADMIN', 'BILLING_CASHIER', 'CASHIER', 'ACCOUNTANT', 'ADMINISTRATOR'),
  paymentRoutes
);
app.use(
  '/api/v1/network',
  authenticate,
  requireRole('SUPER_ADMIN', 'NETWORK_ENGINEER', 'ADMINISTRATOR'),
  networkRoutes
);
app.use(
  '/api/v1/routers',
  authenticate,
  requireRole('SUPER_ADMIN', 'NETWORK_ENGINEER', 'ADMINISTRATOR'),
  networkRoutes
);
app.use(
  '/api/v1/accounting',
  authenticate,
  requireRole('SUPER_ADMIN', 'ACCOUNTANT', 'ADMINISTRATOR'),
  accountingRoutes
);
app.use(
  '/api/v1/operations',
  authenticate,
  requireRole('SUPER_ADMIN', 'FIELD_TECHNICIAN', 'TECHNICIAN', 'NETWORK_ENGINEER', 'SUPPORT_AGENT', 'ADMINISTRATOR'),
  operationsRoutes
);
app.use(
  '/api/v1/installations',
  authenticate,
  requireRole('SUPER_ADMIN', 'FIELD_TECHNICIAN', 'TECHNICIAN', 'NETWORK_ENGINEER', 'ADMINISTRATOR'),
  operationsRoutes
);
app.use(
  '/api/v1/technicians',
  authenticate,
  requireRole('SUPER_ADMIN', 'FIELD_TECHNICIAN', 'TECHNICIAN', 'NETWORK_ENGINEER', 'ADMINISTRATOR'),
  operationsRoutes
);
app.use(
  '/api/v1/inventory',
  authenticate,
  requireRole('SUPER_ADMIN', 'WAREHOUSE_MANAGER', 'PROCUREMENT_OFFICER', 'FIELD_TECHNICIAN', 'NETWORK_ENGINEER', 'ADMINISTRATOR'),
  inventoryRoutes
);
app.use(
  '/api/v1/purchasing',
  authenticate,
  requireRole('SUPER_ADMIN', 'PROCUREMENT_OFFICER', 'WAREHOUSE_MANAGER', 'ADMINISTRATOR'),
  procurementRoutes
);
app.use(
  '/api/v1/customers',
  authenticate,
  requireRole(
    'SUPER_ADMIN',
    'ADMINISTRATOR',
    'SUPPORT_AGENT',
    'SALES_STAFF',
    'BILLING_CASHIER',
    'CASHIER',
    'NETWORK_ENGINEER',
    'FIELD_TECHNICIAN',
    'TECHNICIAN'
  ),
  customerRoutes
);
app.use(
  '/api/v1/packages',
  authenticate,
  requireRole('SUPER_ADMIN', 'ADMINISTRATOR', 'NETWORK_ENGINEER', 'SALES_STAFF'),
  packageRoutes
);
app.use(
  '/api/v1/tickets',
  authenticate,
  requireRole('SUPER_ADMIN', 'SUPPORT_AGENT', 'FIELD_TECHNICIAN', 'TECHNICIAN', 'NETWORK_ENGINEER', 'ADMINISTRATOR'),
  operationsRoutes
);
app.use(
  '/api/v1/reports',
  authenticate,
  requireRole('SUPER_ADMIN', 'ADMINISTRATOR', 'ACCOUNTANT', 'NETWORK_ENGINEER', 'BILLING_CASHIER'),
  reportsRoutes
);
app.use(
  '/api/v1/automation',
  authenticate,
  requireRole('SUPER_ADMIN', 'ADMINISTRATOR', 'NETWORK_ENGINEER'),
  automationRoutes
);
app.use(
  '/api/v1/settings',
  authenticate,
  requireRole('SUPER_ADMIN', 'ADMINISTRATOR'),
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
    console.error('[NetPulse Error]: Database connection error (503)');
    return res.status(503).json({
      error: 'Service temporarily unavailable',
    });
  }

  console.error('[NetPulse Error]:', err.message || err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

let server: any = null;

const shutdown = async (signal: string) => {
  console.log(`\n[NetPulse] Received ${signal}. Shutting down gracefully...`);
  if (server) {
    server.close(async () => {
      console.log('[NetPulse] HTTP server closed.');
      try {
        await prisma.$disconnect();
        console.log('[NetPulse] Database disconnected.');
      } catch (err) {
        console.error('[NetPulse] Error during database disconnect:', err);
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
    console.error('[NetPulse FATAL]: Database connection failed. Aborting startup.');
    process.exit(1);
  }

  server = app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(`🚀 NetPulse ISP ERP Backend running on port ${PORT}`);
    console.log(`📡 REST API Gateway: http://localhost:${PORT}/api/v1`);
    console.log(`📚 Swagger Docs:    http://localhost:${PORT}/api/docs`);
    console.log(`=======================================================`);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\x1b[31m[NetPulse Fatal]: Port ${PORT} is already in use by another process!\x1b[0m`);
      console.error(`To free port ${PORT}, run: kill -9 $(lsof -t -i:${PORT})\n`);
    } else {
      console.error('[NetPulse Server Listen Error]:', err);
    }
    process.exit(1);
  });
}

// Start Server if directly executed
if (process.env.NODE_ENV !== 'test') {
  startServer();
}
