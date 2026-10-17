import { Router } from 'express';
import { auth } from '../../common/middleware/auth.js';
import { requireOrg } from '../../common/middleware/requireOrg.js';
import { questsController as c } from './quests.controller.js';

export const questsRouter = Router();

/**
 * @openapi
 * /quests:
 *   post:
 *     tags: [Quests]
 *     summary: Создать квест (нужен профиль организации)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             allOf:
 *               - $ref: '#/components/schemas/QuestInput'
 *               - required: [questName, category, maxVolunteers]
 *     responses:
 *       201: { description: Создано, content: { application/json: { schema: { $ref: '#/components/schemas/Quest' } } } }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *   get:
 *     tags: [Quests]
 *     summary: Лента квестов (курсорная пагинация, фильтр по радиусу)
 *     description: lat, lng и radius передаются только вместе.
 *     parameters:
 *       - $ref: '#/components/parameters/cursor'
 *       - $ref: '#/components/parameters/limit'
 *       - { name: category, in: query, schema: { type: string } }
 *       - { name: status, in: query, schema: { allOf: [{ $ref: '#/components/schemas/QuestStatus' }], default: open } }
 *       - { name: lat, in: query, schema: { type: number, minimum: -90, maximum: 90 } }
 *       - { name: lng, in: query, schema: { type: number, minimum: -180, maximum: 180 } }
 *       - { name: radius, in: query, description: км, schema: { type: number, maximum: 100 } }
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data: { type: array, items: { $ref: '#/components/schemas/Quest' } }
 *                 meta: { $ref: '#/components/schemas/CursorMeta' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 */
questsRouter.post('/', auth, requireOrg, c.create);
questsRouter.get('/', c.feed);

/**
 * @openapi
 * /quests/{id}:
 *   get:
 *     tags: [Quests]
 *     summary: Квест по id
 *     parameters: [{ $ref: '#/components/parameters/id' }]
 *     responses:
 *       200: { description: OK, content: { application/json: { schema: { $ref: '#/components/schemas/Quest' } } } }
 *       404: { $ref: '#/components/responses/NotFound' }
 *   patch:
 *     tags: [Quests]
 *     summary: Обновить свой квест (хотя бы одно поле)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ $ref: '#/components/parameters/id' }]
 *     requestBody:
 *       required: true
 *       content: { application/json: { schema: { $ref: '#/components/schemas/QuestInput' } } }
 *     responses:
 *       200: { description: OK, content: { application/json: { schema: { $ref: '#/components/schemas/Quest' } } } }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { $ref: '#/components/responses/Conflict' }
 *   delete:
 *     tags: [Quests]
 *     summary: Удалить свой квест (переводит в archived)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ $ref: '#/components/parameters/id' }]
 *     responses:
 *       204: { $ref: '#/components/responses/NoContent' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { $ref: '#/components/responses/Conflict' }
 * /quests/{id}/status:
 *   patch:
 *     tags: [Quests]
 *     summary: Сменить статус своего квеста
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ $ref: '#/components/parameters/id' }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [in_progress, completed, cancelled] }
 *     responses:
 *       200: { description: OK, content: { application/json: { schema: { $ref: '#/components/schemas/Quest' } } } }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { $ref: '#/components/responses/Conflict' }
 */
questsRouter.get('/:id', c.getById);
questsRouter.patch('/:id', auth, requireOrg, c.update);
questsRouter.patch('/:id/status', auth, requireOrg, c.changeStatus);
questsRouter.delete('/:id', auth, requireOrg, c.remove);
