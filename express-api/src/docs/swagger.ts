import path from 'node:path';
import type { Express } from 'express';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

// Аннотации @openapi лежат в *.routes.ts (в dist — *.routes.js).
const modulesDir = path.join(import.meta.dirname, '..', 'modules');

export const openapiSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.3',
    info: { title: 'volunteer-api', version: '1.0.0' },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          description: 'JWT из auth-API. Локально при IS_DEVELOPMENT=true можно передать DEV_BYPASS_TOKEN.',
        },
      },
      parameters: {
        id: { name: 'id', in: 'path', required: true, schema: { type: 'integer', minimum: 1 } },
        claimId: { name: 'claimId', in: 'path', required: true, schema: { type: 'integer', minimum: 1 } },
        page: { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
        limit: { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
        cursor: { name: 'cursor', in: 'query', schema: { type: 'string' } },
      },
      responses: {
        NoContent: { description: 'Успешно, без тела' },
        BadRequest: { description: 'Ошибка валидации', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        Unauthorized: { description: 'Нет или невалидный токен', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        Forbidden: { description: 'Нет прав / нет профиля организации', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        NotFound: { description: 'Не найдено', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        Conflict: { description: 'Конфликт (уникальность, состояние)', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        PaymentRequired: { description: 'Не хватает монет', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'VALIDATION_ERROR' },
                message: { type: 'string' },
                details: {},
              },
            },
          },
        },
        PageMeta: {
          type: 'object',
          properties: {
            page: { type: 'integer' },
            limit: { type: 'integer' },
            total: { type: 'integer' },
            totalPages: { type: 'integer' },
          },
        },
        CursorMeta: {
          type: 'object',
          properties: {
            limit: { type: 'integer' },
            hasMore: { type: 'boolean' },
            nextCursor: { type: 'string', nullable: true },
          },
        },
        Organization: {
          type: 'object',
          properties: {
            userId: { type: 'integer' },
            organizationName: { type: 'string' },
            types: { type: 'string', nullable: true },
            edrpou: { type: 'string', nullable: true, example: '12345678' },
            contact: { type: 'array', items: { type: 'string' } },
            description: { type: 'string', nullable: true },
            logo: { type: 'string', nullable: true },
            trustScore: { type: 'number' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        OrganizationInput: {
          type: 'object',
          properties: {
            organizationName: { type: 'string', minLength: 1, maxLength: 200, example: 'Фонд Добро' },
            types: { type: 'string', maxLength: 100, nullable: true, example: 'ecology' },
            edrpou: { type: 'string', pattern: '^\\d{8}$', nullable: true, example: '87654321' },
            contact: { type: 'array', maxItems: 10, items: { type: 'string' }, example: ['+380000000000'] },
            description: { type: 'string', maxLength: 5000, nullable: true },
            logo: { type: 'string', format: 'uri', nullable: true },
          },
        },
        QuestStatus: { type: 'string', enum: ['open', 'in_progress', 'completed', 'cancelled', 'archived'] },
        Quest: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            organizationId: { type: 'integer' },
            questName: { type: 'string' },
            description: { type: 'string', nullable: true },
            category: { type: 'string' },
            address: { type: 'string', nullable: true },
            lat: { type: 'number', nullable: true },
            lng: { type: 'number', nullable: true },
            maxVolunteers: { type: 'integer' },
            assignedVolunteers: { type: 'integer' },
            rewardXp: { type: 'integer' },
            rewardCoins: { type: 'integer' },
            status: { $ref: '#/components/schemas/QuestStatus' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            claim: {
              allOf: [{ $ref: '#/components/schemas/Claim' }],
              nullable: true,
              description: 'в GET /quests и GET /quests/{id} с токеном и в GET /profiles/me/quests: заявка текущего пользователя, null — не подавал',
            },
          },
        },
        QuestInput: {
          type: 'object',
          description: 'lat и lng передаются только вместе',
          properties: {
            questName: { type: 'string', minLength: 1, maxLength: 200, example: 'Уборка парка' },
            description: { type: 'string', maxLength: 5000, nullable: true },
            category: { type: 'string', minLength: 1, maxLength: 100, example: 'ecology' },
            address: { type: 'string', maxLength: 500, nullable: true },
            lat: { type: 'number', minimum: -90, maximum: 90, nullable: true, example: 48.4647 },
            lng: { type: 'number', minimum: -180, maximum: 180, nullable: true, example: 35.0462 },
            maxVolunteers: { type: 'integer', minimum: 1, maximum: 1000, example: 10 },
            rewardXp: { type: 'integer', minimum: 0, maximum: 100000, default: 0 },
            rewardCoins: { type: 'integer', minimum: 0, maximum: 100000, default: 0 },
          },
        },
        ClaimStatus: { type: 'string', enum: ['pending', 'approved', 'rejected', 'completed', 'withdrawn'] },
        Claim: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            questId: { type: 'integer' },
            userId: { type: 'integer' },
            status: { $ref: '#/components/schemas/ClaimStatus' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Profile: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            email: { type: 'string' },
            username: { type: 'string', nullable: true },
            photo: { type: 'string', nullable: true },
            contact: { type: 'string', nullable: true },
            status: { type: 'string', example: 'active' },
            xp: { type: 'integer' },
            balance: { type: 'integer', description: 'монеты' },
            curLevel: { type: 'integer', description: 'уровень по xp (формула в claims/level.ts)' },
            levelProgress: {
              type: 'object',
              description: 'прогресс внутри уровня: current из required xp до следующего',
              properties: { current: { type: 'integer', example: 150 }, required: { type: 'integer', example: 300 } },
            },
            organization: {
              type: 'object',
              nullable: true,
              description: 'профиль организации пользователя, если есть',
              properties: { userId: { type: 'integer' }, organizationName: { type: 'string' } },
            },
          },
        },
        Reward: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            rewardsName: { type: 'string', example: 'Кофе' },
            partnerName: { type: 'string', example: 'Coffee Point' },
            cost: { type: 'integer', description: 'цена в монетах' },
          },
        },
        UserReward: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            userId: { type: 'integer' },
            rewardId: { type: 'integer' },
            promocode: { type: 'string', example: 'COFFEE-7KQ2MX' },
            claimedTime: { type: 'string', format: 'date-time' },
            reward: { $ref: '#/components/schemas/Reward' },
          },
        },
        RewardSlot: {
          type: 'object',
          properties: {
            completedQuests: { type: 'integer' },
            questsPerSpin: { type: 'integer', example: 5 },
            spinsUsed: { type: 'integer' },
          },
        },
      },
    },
  },
  apis: [path.join(modulesDir, '**', '*.routes.{ts,js}').replaceAll('\\', '/')],
});

/** Swagger UI на /docs и JSON-спека на /docs.json. Открыт без авторизации. */
export function mountSwagger(app: Express) {
  app.get('/docs.json', (_req, res) => {
    res.json(openapiSpec);
  });
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));
}
