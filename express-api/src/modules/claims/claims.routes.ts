import { Router } from 'express';
import { auth } from '../../common/middleware/auth.js';
import { requireOrg } from '../../common/middleware/requireOrg.js';
import { claimsController as c } from './claims.controller.js';

// Монтируется на /quests/:id/claims, mergeParams — чтобы видеть :id квеста.
export const claimsRouter = Router({ mergeParams: true });

/**
 * @openapi
 * /quests/{id}/claims:
 *   post:
 *     tags: [Claims]
 *     summary: Откликнуться на квест (волонтёр)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ $ref: '#/components/parameters/id' }]
 *     responses:
 *       201: { description: Создано, content: { application/json: { schema: { $ref: '#/components/schemas/Claim' } } } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { $ref: '#/components/responses/Conflict' }
 *   get:
 *     tags: [Claims]
 *     summary: Отклики на свой квест (организация)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/id'
 *       - $ref: '#/components/parameters/page'
 *       - $ref: '#/components/parameters/limit'
 *       - { name: status, in: query, schema: { $ref: '#/components/schemas/ClaimStatus' } }
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data: { type: array, items: { $ref: '#/components/schemas/Claim' } }
 *                 meta: { $ref: '#/components/schemas/PageMeta' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 * /quests/{id}/claims/me:
 *   delete:
 *     tags: [Claims]
 *     summary: Отозвать свой отклик (волонтёр)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ $ref: '#/components/parameters/id' }]
 *     responses:
 *       204: { $ref: '#/components/responses/NoContent' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { $ref: '#/components/responses/Conflict' }
 */
// сторона волонтёра (любой авторизованный юзер)
claimsRouter.post('/', auth, c.apply);
claimsRouter.delete('/me', auth, c.withdraw);

/**
 * @openapi
 * /quests/{id}/claims/{claimId}:
 *   patch:
 *     tags: [Claims]
 *     summary: Одобрить или отклонить отклик (организация)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/id'
 *       - $ref: '#/components/parameters/claimId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [approved, rejected] }
 *     responses:
 *       200: { description: OK, content: { application/json: { schema: { $ref: '#/components/schemas/Claim' } } } }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { $ref: '#/components/responses/Conflict' }
 * /quests/{id}/claims/{claimId}/complete:
 *   post:
 *     tags: [Claims]
 *     summary: Засчитать выполнение — волонтёр получает XP и монеты (организация)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/id'
 *       - $ref: '#/components/parameters/claimId'
 *     responses:
 *       200: { description: OK }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { $ref: '#/components/responses/Conflict' }
 */
// сторона организации-владельца квеста
claimsRouter.get('/', auth, requireOrg, c.list);
claimsRouter.patch('/:claimId', auth, requireOrg, c.decide);
claimsRouter.post('/:claimId/complete', auth, requireOrg, c.complete);
