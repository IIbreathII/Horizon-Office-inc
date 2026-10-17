import { Router } from 'express';
import { auth } from '../../common/middleware/auth.js';
import { rewardsController as c } from './rewards.controller.js';

export const rewardsRouter = Router();

/**
 * @openapi
 * /rewards:
 *   get:
 *     tags: [Rewards]
 *     summary: Витрина магазина наград, от дешёвых к дорогим
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema: { type: array, items: { $ref: '#/components/schemas/Reward' } }
 * /rewards/{id}/buy:
 *   post:
 *     tags: [Rewards]
 *     summary: Купить награду за монеты — списывает баланс и выдаёт промокод
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ $ref: '#/components/parameters/id' }]
 *     responses:
 *       201: { description: Создано, content: { application/json: { schema: { $ref: '#/components/schemas/UserReward' } } } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       402: { $ref: '#/components/responses/PaymentRequired' }
 *       404: { $ref: '#/components/responses/NotFound' }
 * /rewards/slot:
 *   get:
 *     tags: [Rewards]
 *     summary: Рулетка — выполненные квесты и потраченные прокрутки
 *     description: Одна прокрутка за каждые questsPerSpin выполненных квестов; доступно floor(completedQuests / questsPerSpin) - spinsUsed.
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: OK, content: { application/json: { schema: { $ref: '#/components/schemas/RewardSlot' } } } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 * /rewards/slot/spin:
 *   post:
 *     tags: [Rewards]
 *     summary: Прокрутить рулетку — бесплатная случайная награда с промокодом
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201:
 *         description: Создано
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 reward: { $ref: '#/components/schemas/Reward' }
 *                 userReward: { $ref: '#/components/schemas/UserReward' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { $ref: '#/components/responses/Conflict' }
 */
rewardsRouter.get('/', c.list);
rewardsRouter.get('/slot', auth, c.slot);
rewardsRouter.post('/slot/spin', auth, c.spin);
rewardsRouter.post('/:id/buy', auth, c.buy);
