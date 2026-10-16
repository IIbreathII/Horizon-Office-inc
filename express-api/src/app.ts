import express from 'express';
import { errorHandler, notFoundHandler } from './common/middleware/errorHandler.js';
import { organizationsRouter } from './modules/organizations/organizations.routes.js';
import { questsRouter } from './modules/quests/quests.routes.js';
import { claimsRouter } from './modules/claims/claims.routes.js';
import { mountSwagger } from './docs/swagger.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));

  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  mountSwagger(app);

  app.use('/organizations', organizationsRouter); // включая /organizations/:id/quests
  app.use('/quests/:id/claims', claimsRouter); // до /quests
  app.use('/quests', questsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
