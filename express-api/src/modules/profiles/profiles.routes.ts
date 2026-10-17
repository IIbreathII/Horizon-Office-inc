import { Router } from 'express';
import { auth } from '../../common/middleware/auth.js';
import { profilesController as c } from './profiles.controller.js';

export const profilesRouter = Router();

/**
 * @openapi
 * /profiles/me:
 *   get:
 *     tags: [Profiles]
 *     summary: Свой профиль — опыт, уровень, баланс монет
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: OK, content: { application/json: { schema: { $ref: '#/components/schemas/Profile' } } } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 * /profiles/me/inventory:
 *   get:
 *     tags: [Profiles]
 *     summary: Свои промокоды — купленные в магазине и выигранные в рулетке, новые сверху
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema: { type: array, items: { $ref: '#/components/schemas/UserReward' } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 * /profiles/me/quests:
 *   get:
 *     tags: [Profiles]
 *     summary: Свои квесты — все, на которые подавалась заявка, в любом статусе квеста
 *     description: В каждом квесте claim — заявка пользователя. Отозванные заявки не входят. Свежие сверху.
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema: { type: array, items: { $ref: '#/components/schemas/Quest' } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
profilesRouter.get('/me', auth, c.getMe);
profilesRouter.get('/me/inventory', auth, c.inventory);
profilesRouter.get('/me/quests', auth, c.myQuests);
