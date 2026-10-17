# volunteer-api

Express 5 + TypeScript + Prisma 7 (адаптер `pg`) + PostgreSQL.
Модули: organizations, quests, claims — 18 эндпоинтов. Токены выпускает auth-API, этот сервис их только проверяет (HS256, общий секрет).

## Запуск

Нужны Node.js ≥ 20.19 и PostgreSQL 14+ (например, AWS RDS).

```bash
npm install
cp .env.example .env     # вписать DATABASE_URL и JWT_SECRET
npm run generate         # Prisma Client
npm run migrate:deploy   # создать таблицы
npm run db:seed          # (по желанию) тестовые данные
npm run dev
```

`DATABASE_URL` для RDS: `postgresql://<user>:<password>@<endpoint>:5432/<db>?schema=public&sslmode=require&sslaccept=accept_invalid_certs`.
Соединение шифруется; сертификат сервера не проверяется.

Если подключение висит до таймаута — проверьте у инстанса RDS *Public access* и security group (входящий порт 5432 с вашего IP).

> Миграция `20261016190000_init` написана вручную в формате Prisma. Проверка на чистой базе: `npx prisma migrate dev` должен ответить «Already in sync».

### Отдельные роли БД (необязательно)

`prisma/sql/roles.sql` создаёт роли `app_migrator` / `volunteer_api` / `auth_api` с урезанными правами. Если используете их — задайте `DATABASE_URL` под `volunteer_api`, а `MIGRATE_DATABASE_URL` под `app_migrator` (его берут `migrate` и `seed`).

### Разработка

```bash
npm run generate     # Prisma Client в src/generated/prisma (после каждого изменения схемы)
npm run db:seed      # тестовые данные
npm run dev          # http://localhost:3000/health
```

Изменение схемы: правите `prisma/schema.prisma` → `npm run migrate:dev -- --name <что_изменили>`.

### Тесты

Нужна отдельная БД. По умолчанию — `app_test` у пользователя `postgres`/`postgres` (см. `tests/testEnv.ts`); свои значения можно положить в `.env.test`:

```bash
createdb app_test
npm test
```

Перед прогоном схема `app_test` пересоздаётся и к ней применяются все миграции.

### Сборка

```bash
npm run build && npm start
```

## Эндпоинты

Авторизация: `Authorization: Bearer <токен от auth-API>`, в `sub` — `users.id`.

| Метод | Путь | Доступ |
|---|---|---|
| POST | `/organizations` | авторизованный |
| GET | `/organizations?page&limit&type&search` | все |
| GET | `/organizations/:id` | все |
| GET | `/organizations/me` | организация |
| PATCH | `/organizations/me` | организация |
| DELETE | `/organizations/me` | организация |
| POST | `/quests` | организация |
| GET | `/quests?cursor&limit&category&status&lat&lng&radius` | все |
| GET | `/quests/:id` | все |
| GET | `/organizations/:id/quests?page&limit&status` | все |
| PATCH | `/quests/:id` | владелец |
| PATCH | `/quests/:id/status` | владелец |
| DELETE | `/quests/:id` | владелец |
| POST | `/quests/:id/claims` | авторизованный |
| DELETE | `/quests/:id/claims/me` | автор заявки |
| GET | `/quests/:id/claims?page&limit&status` | владелец квеста |
| PATCH | `/quests/:id/claims/:claimId` | владелец квеста |
| POST | `/quests/:id/claims/:claimId/complete` | владелец квеста |

Формат списков: `{ data, meta }`, где `meta` — `{ page, limit, total, totalPages }` или `{ limit, hasMore, nextCursor }`.
Ошибки: `{ error: { code, message, details? } }`.

## Структура

```
prisma/            schema.prisma, migrations/, seed.ts, sql/roles.sql
src/config/        env.ts — валидация .env; database.ts — подключение к БД (URL, SSL)
src/db/            prisma.ts — PrismaClient + PrismaPg
src/common/        errors, validate, middleware (auth, requireOrg, errorHandler), pagination
src/modules/       organizations | quests | claims: routes → controller → service → repository, schema (zod)
tests/             интеграционные тесты на реальном Postgres
```
