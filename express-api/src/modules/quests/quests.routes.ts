import { Router } from 'express';
import { auth } from '../../common/middleware/auth.js';
import { requireOrg } from '../../common/middleware/requireOrg.js';
import { questsController as c } from './quests.controller.js';

export const questsRouter = Router();

questsRouter.post('/', auth, requireOrg, c.create);
questsRouter.get('/', c.feed);
questsRouter.get('/:id', c.getById);
questsRouter.patch('/:id', auth, requireOrg, c.update);
questsRouter.patch('/:id/status', auth, requireOrg, c.changeStatus);
questsRouter.delete('/:id', auth, requireOrg, c.remove);
