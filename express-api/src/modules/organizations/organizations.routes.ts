import { Router } from 'express';
import { auth } from '../../common/middleware/auth.js';
import { requireOrg } from '../../common/middleware/requireOrg.js';
import { questsController } from '../quests/quests.controller.js';
import { organizationsController as c } from './organizations.controller.js';

export const organizationsRouter = Router();

organizationsRouter.post('/', auth, c.create);
organizationsRouter.get('/', c.list);

// /me — до /:id, иначе "me" попадёт в :id
organizationsRouter.get('/me', auth, requireOrg, c.getMe);
organizationsRouter.patch('/me', auth, requireOrg, c.updateMe);
organizationsRouter.delete('/me', auth, requireOrg, c.removeMe);

organizationsRouter.get('/:id', c.getById);
organizationsRouter.get('/:id/quests', questsController.listByOrg);
