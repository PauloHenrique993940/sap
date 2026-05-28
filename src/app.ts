import express from 'express';
import { mockAuthMiddleware } from './modules/auth/http/auth.middleware';
import { inventoryRoutes } from './routes/inventory.routes';
import { requestRoutes } from './routes/request.routes';
import { dashboardRoutes } from './routes/dashboard.routes';
import { auditRoutes } from './routes/audit.routes';
import { errorHandler } from './shared/http/error-handler';

export function createApp() {
  const app = express();

  app.use(express.json());
  app.use(mockAuthMiddleware);

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.use('/api/v1/inventory', inventoryRoutes);
  app.use('/api/v1/requests', requestRoutes);
  app.use('/api/v1/dashboard', dashboardRoutes);
  app.use('/api/v1/audit', auditRoutes);

  app.use(errorHandler);

  return app;
}
