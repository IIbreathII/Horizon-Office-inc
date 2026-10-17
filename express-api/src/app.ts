import express from 'express';
import cors from 'cors';
import { errorHandler, notFoundHandler } from './common/middleware/errorHandler.js';
import { organizationsRouter } from './modules/organizations/organizations.routes.js';
import { questsRouter } from './modules/quests/quests.routes.js';
import { claimsRouter } from './modules/claims/claims.routes.js';
import { profilesRouter } from './modules/profiles/profiles.routes.js';
import { rewardsRouter } from './modules/rewards/rewards.routes.js';
import { mountSwagger } from './docs/swagger.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  // CORS: фронт с localhost / 127.0.0.1 на любом порту
  app.use(cors({ origin: /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/ }));
  app.use(express.json({ limit: '100kb' }));

  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  mountSwagger(app);

  app.use('/organizations', organizationsRouter); // включая /organizations/:id/quests
  app.use('/quests/:id/claims', claimsRouter); // до /quests
  app.use('/quests', questsRouter);
  app.use('/profiles', profilesRouter);
  app.use('/rewards', rewardsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
