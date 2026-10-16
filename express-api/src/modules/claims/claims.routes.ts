import { Router } from 'express';
import { auth } from '../../common/middleware/auth.js';
import { requireOrg } from '../../common/middleware/requireOrg.js';
import { claimsController as c } from './claims.controller.js';

// Монтируется на /quests/:id/claims, mergeParams — чтобы видеть :id квеста.
export const claimsRouter = Router({ mergeParams: true });

// сторона волонтёра (любой авторизованный юзер)
claimsRouter.post('/', auth, c.apply);
claimsRouter.delete('/me', auth, c.withdraw);

// сторона организации-владельца квеста
claimsRouter.get('/', auth, requireOrg, c.list);
claimsRouter.patch('/:claimId', auth, requireOrg, c.decide);
claimsRouter.post('/:claimId/complete', auth, requireOrg, c.complete);
