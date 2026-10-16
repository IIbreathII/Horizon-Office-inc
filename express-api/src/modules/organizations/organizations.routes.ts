import { Router } from 'express';
import { auth } from '../../common/middleware/auth.js';
import { requireOrg } from '../../common/middleware/requireOrg.js';
import { questsController } from '../quests/quests.controller.js';
import { organizationsController as c } from './organizations.controller.js';

export const organizationsRouter = Router();

/**
 * @openapi
 * /organizations:
 *   post:
 *     tags: [Organizations]
 *     summary: Создать профиль организации для текущего пользователя
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             allOf:
 *               - $ref: '#/components/schemas/OrganizationInput'
 *               - required: [organizationName]
 *     responses:
 *       201: { description: Создано, content: { application/json: { schema: { $ref: '#/components/schemas/Organization' } } } }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       409: { $ref: '#/components/responses/Conflict' }
 *   get:
 *     tags: [Organizations]
 *     summary: Список организаций
 *     parameters:
 *       - $ref: '#/components/parameters/page'
 *       - $ref: '#/components/parameters/limit'
 *       - { name: type, in: query, schema: { type: string } }
 *       - { name: search, in: query, schema: { type: string } }
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data: { type: array, items: { $ref: '#/components/schemas/Organization' } }
 *                 meta: { $ref: '#/components/schemas/PageMeta' }
 */
organizationsRouter.post('/', auth, c.create);
organizationsRouter.get('/', c.list);

/**
 * @openapi
 * /organizations/me:
 *   get:
 *     tags: [Organizations]
 *     summary: Профиль своей организации
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: OK, content: { application/json: { schema: { $ref: '#/components/schemas/Organization' } } } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *   patch:
 *     tags: [Organizations]
 *     summary: Обновить свою организацию (хотя бы одно поле)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content: { application/json: { schema: { $ref: '#/components/schemas/OrganizationInput' } } }
 *     responses:
 *       200: { description: OK, content: { application/json: { schema: { $ref: '#/components/schemas/Organization' } } } }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       409: { $ref: '#/components/responses/Conflict' }
 *   delete:
 *     tags: [Organizations]
 *     summary: Мягко удалить свою организацию
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       204: { $ref: '#/components/responses/NoContent' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       409: { $ref: '#/components/responses/Conflict' }
 */
// /me — до /:id, иначе "me" попадёт в :id
organizationsRouter.get('/me', auth, requireOrg, c.getMe);
organizationsRouter.patch('/me', auth, requireOrg, c.updateMe);
organizationsRouter.delete('/me', auth, requireOrg, c.removeMe);

/**
 * @openapi
 * /organizations/{id}:
 *   get:
 *     tags: [Organizations]
 *     summary: Организация по id (id = userId владельца)
 *     parameters: [{ $ref: '#/components/parameters/id' }]
 *     responses:
 *       200: { description: OK, content: { application/json: { schema: { $ref: '#/components/schemas/Organization' } } } }
 *       404: { $ref: '#/components/responses/NotFound' }
 * /organizations/{id}/quests:
 *   get:
 *     tags: [Quests]
 *     summary: Квесты организации
 *     parameters:
 *       - $ref: '#/components/parameters/id'
 *       - $ref: '#/components/parameters/page'
 *       - $ref: '#/components/parameters/limit'
 *       - { name: status, in: query, schema: { $ref: '#/components/schemas/QuestStatus' } }
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data: { type: array, items: { $ref: '#/components/schemas/Quest' } }
 *                 meta: { $ref: '#/components/schemas/PageMeta' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
organizationsRouter.get('/:id', c.getById);
organizationsRouter.get('/:id/quests', questsController.listByOrg);
