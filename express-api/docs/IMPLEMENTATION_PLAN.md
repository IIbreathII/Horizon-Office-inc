# План реализации volunteer-api

**Стек:** Node.js + TypeScript + Express + Prisma 7 (code-first, драйвер-адаптер `pg`) + PostgreSQL
**Секреты:** `.env` (инфраструктура и деплой — отдельная тема, в этот план не входят)
**Авторизация:** токены выпускает отдельный auth-API, этот сервис только проверяет их (HS256, общий секрет)
**Модули:** organizations, quests, claims (18 эндпоинтов)

---

## 0. Ключевые решения

| Тема | Решение |
|---|---|
| База данных | Одна общая БД с auth-API. Структурой всех таблиц, включая `users`, владеет **только этот сервис** |
| Источник правды для БД | `prisma/schema.prisma` этого сервиса, изменения только через `prisma migrate`. auth-API миграций не делает, только читает и пишет данные |
| Секреты | `.env`, валидация через zod при старте; при ошибке сервис не запускается |
| Проверка токена | `jwt.verify` с `algorithms: ['HS256']`, `issuer`, `audience`. `jwt.sign` в коде нет |
| Роль организации | Определяется по таблице `organizations`, а не по claim в токене |
| Удаление | Soft delete: `deleted_at` у организации, квесты в статус `archived` |
| Пагинация | `GET /quests` через cursor, остальные списки через page + limit |
| Формат списков | `{ data, meta }` |
| Валидация | zod |

---

## 1. Структура проекта

```
volunteer-api/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/              # генерируется prisma migrate
│   └── seed.ts
├── prisma.config.ts             # путь к схеме, миграциям, URL для CLI
├── src/
│   ├── app.ts                   # express, роуты, errorHandler
│   ├── server.ts                # listen + graceful shutdown
│   ├── config/
│   │   └── env.ts               # чтение и валидация .env
│   ├── generated/prisma/        # сгенерированный клиент (в .gitignore)
│   ├── db/
│   │   └── prisma.ts            # единственный экземпляр PrismaClient + PrismaPg
│   ├── common/
│   │   ├── middleware/
│   │   │   ├── auth.ts
│   │   │   ├── requireOrg.ts
│   │   │   ├── validate.ts
│   │   │   └── errorHandler.ts
│   │   ├── pagination/
│   │   │   ├── page.ts
│   │   │   └── cursor.ts
│   │   └── errors.ts
│   ├── types/express.d.ts       # req.user, req.org
│   └── modules/
│       ├── organizations/  { routes, controller, service, repository, schema }.ts
│       ├── quests/         { routes, controller, service, repository, schema }.ts
│       └── claims/         { routes, controller, service, repository, schema }.ts
├── tests/
├── .env.example
└── package.json
```

Слои: `routes → middleware → controller → service → repository (Prisma) → БД`.

---

## 2. Конфиг и секреты (`.env`)

### 2.1. Переменные

Всё хранится в `.env` в корне проекта. Сам `.env` в git не попадает, в репозитории лежит `.env.example` без значений.

```env
NODE_ENV=development
PORT=3000

# рантайм сервиса (роль volunteer_api)
DATABASE_URL=postgresql://volunteer_api:pass@localhost:5432/app?schema=public
# только для prisma migrate (роль app_migrator); если пусто — берётся DATABASE_URL
MIGRATE_DATABASE_URL=postgresql://app_migrator:pass@localhost:5432/app?schema=public

# тот же секрет, что у auth-API, ≥ 32 символа (openssl rand -base64 48)
JWT_SECRET=
# заполняется только на время ротации
JWT_SECRET_PREVIOUS=
JWT_ISSUER=auth-api
JWT_AUDIENCE=volunteer-api
```

### 2.2. Загрузка: `src/config/env.ts`

```ts
import 'dotenv/config';
import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().default(3000),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_SECRET_PREVIOUS: z.string().min(32).optional().or(z.literal('').transform(() => undefined)),
  JWT_ISSUER: z.string().min(1),
  JWT_AUDIENCE: z.string().min(1),
});

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}
export const env = parsed.data;
```

Значения секретов в логи не пишем, только названия невалидных переменных.

### 2.3. Ротация `JWT_SECRET` без даунтайма

1. В `.env` этого сервиса: новый секрет в `JWT_SECRET`, старый в `JWT_SECRET_PREVIOUS`, перезапуск. Сервис принимает токены, подписанные любым из двух.
2. В auth-API поменять секрет на новый, перезапустить. Он начинает подписывать новым.
3. Подождать время жизни access-токена (например 15 минут), очистить `JWT_SECRET_PREVIOUS`, перезапустить.

### 2.4. URL для миграций: `prisma.config.ts`

В Prisma 7 CLI берёт URL из `prisma.config.ts`, а сам сервис подключается через адаптер `PrismaPg` с `DATABASE_URL`. Поэтому миграции и рантайм легко разнести по разным ролям:

```ts
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations', seed: 'tsx prisma/seed.ts' },
  datasource: { url: process.env.MIGRATE_DATABASE_URL || process.env.DATABASE_URL! },
});
```

---

## 3. Prisma: схема (code-first)

### 3.1. Общая база: кто чем владеет

| | volunteer-api (этот сервис) | auth-API |
|---|---|---|
| Структура таблиц (DDL) | **владелец**: все таблицы, включая `users`, через `prisma migrate` | не меняет, миграций не запускает |
| Данные `users` | читает профиль; пишет **только** `xp`, `balance`, `cur_level` | создаёт и обновляет учётные поля (регистрация, логин, пароль, профиль); `xp`, `balance`, `cur_level` не трогает |
| Данные остальных таблиц | читает и пишет | не трогает |
| Таблица `_prisma_migrations` | своя, единственная в БД | нет |

Правила:

1. **Модель `User` описана в `schema.prisma` этого сервиса**, поэтому работают обычные внешние ключи `organizations.user_id`, `quest_claims.user_id`, `user_rewards.user_id` → `users.id`. Отдельной таблицы `volunteers` нет: `xp`, `balance`, `cur_level` лежат прямо в `users`, и любой авторизованный юзер может подавать заявки.
2. **Разные Postgres-роли.** Мигрирует отдельная роль, рантайм обоих сервисов работает без прав на DDL:
   ```sql
   -- владелец схемы, используется только для prisma migrate
   CREATE ROLE app_migrator LOGIN PASSWORD '...';
   GRANT CREATE, USAGE ON SCHEMA public TO app_migrator;

   -- рантайм volunteer-api
   CREATE ROLE volunteer_api LOGIN PASSWORD '...';
   GRANT USAGE ON SCHEMA public TO volunteer_api;
   GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO volunteer_api;
   GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO volunteer_api;
   REVOKE ALL ON users FROM volunteer_api;
   GRANT SELECT ON users TO volunteer_api;
   GRANT UPDATE (xp, balance, cur_level, updated_at) ON users TO volunteer_api;

   -- рантайм auth-API: только users
   CREATE ROLE auth_api LOGIN PASSWORD '...';
   GRANT USAGE ON SCHEMA public TO auth_api;
   GRANT SELECT ON users TO auth_api;
   -- игровые поля xp/balance/cur_level auth-API не может ни задать, ни изменить
   GRANT INSERT (google_id, email, status, password, username, photo, contact, updated_at) ON users TO auth_api;
   GRANT UPDATE (google_id, email, status, password, username, photo, contact, updated_at) ON users TO auth_api;
   GRANT USAGE, SELECT ON SEQUENCE users_id_seq TO auth_api;

   -- чтобы права применялись к таблицам из будущих миграций
   ALTER DEFAULT PRIVILEGES FOR ROLE app_migrator IN SCHEMA public
     GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO volunteer_api;
   ALTER DEFAULT PRIVILEGES FOR ROLE app_migrator IN SCHEMA public
     GRANT USAGE, SELECT ON SEQUENCES TO volunteer_api;
   ```
   Так у auth-API физически нет возможности изменить структуру, задеть чужие таблицы или начислить себе баланс, а у volunteer-api — поменять email или пароль. Поле `updated_at` не имеет default в БД (его ставит Prisma), поэтому auth-API должен заполнять его сам при `INSERT`/`UPDATE`.
3. **Два URL в `.env`.** `DATABASE_URL` под ролью `volunteer_api` для работы сервиса, `MIGRATE_DATABASE_URL` под `app_migrator` только для `prisma migrate` (раздел 2.4).
4. **Если auth-API тоже на Prisma**, он не держит свой `schema.prisma` руками: после каждой миграции делает `prisma db pull` + `prisma generate` и никогда не вызывает `prisma migrate`. Если он на чистом SQL или другом ORM, просто ничего не мигрирует.
5. **Изменения `users` только обратно совместимые** (expand → contract), потому что auth-API деплоится отдельно:
   - добавить колонку: nullable или с default, auth-API о ней может не знать;
   - переименовать или удалить колонку: сначала добавить новую → обновить auth-API → в следующей миграции удалить старую;
   - каждую миграцию, затрагивающую `users`, согласовывать с командой auth-API.
6. **Удаление пользователя.** auth-API не удаляет строки из `users`, а ставит `status = 'deleted'` / `'banned'` (у него нет права `DELETE`). FK с `onDelete: Restrict` защищает от случайного физического удаления. Связанные данные (организацию, квесты) обрабатывает этот сервис: проверка `users.status` при запросе (раздел 9, вопрос 4) или периодическая задача.
7. **Shadow database для `migrate dev`.** Локально Prisma создаёт временную БД, поэтому у локального пользователя Postgres должно быть право `CREATEDB`. На проде используется только `migrate deploy`.
8. **Существующие таблицы.** Если в базе уже есть таблицы (например `users`, созданная до Prisma), первую миграцию делаем через baseline: `prisma db pull` → привести модели к нужному виду → `prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/0_init/migration.sql` → `prisma migrate resolve --applied 0_init`. Тогда Prisma не будет пересоздавать то, что уже есть.

### 3.2. `schema.prisma`

По сравнению с исходной диаграммой исправлено: `quest_claims.quest_id` теперь `Int` вместо `int[]`, добавлены `created_at`, `updated_at`, `deleted_at`, enum-ы статусов, индексы и уникальность заявки. У `users` добавлены `created_at` / `updated_at` и игровые поля `xp`, `balance`, `cur_level`; таблица `volunteers` убрана. Поля `users` должны совпадать с тем, что ожидает auth-API.

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

// URL задаётся в prisma.config.ts (CLI) и в PrismaPg (рантайм)
datasource db {
  provider = "postgresql"
}

enum QuestStatus {
  open
  in_progress
  completed
  cancelled
  archived
}

enum ClaimStatus {
  pending
  approved
  rejected
  completed
  withdrawn
}

// Структурой users владеет этот сервис, данные пишет auth-API.
model User {
  id        Int      @id @default(autoincrement())
  googleId  String?  @unique @map("google_id")
  email     String   @unique
  status    String   @default("active")   // active | banned | deleted
  password  String?                       // хэш, пишет только auth-API
  username  String?
  photo     String?
  contact   String?
  xp        Int      @default(0)          // пишет только volunteer-api
  balance   Int      @default(0)          // пишет только volunteer-api
  curLevel  Int      @default(1) @map("cur_level")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  organization Organization?
  claims       QuestClaim[]

  @@map("users")
}

model Organization {
  userId           Int       @id @map("user_id")
  organizationName String    @map("organization_name")
  types            String?
  edrpou           String?   @unique
  contact          String[]
  description      String?
  logo             String?
  trustScore       Float     @default(0) @map("trust_score")
  createdAt        DateTime  @default(now()) @map("created_at")
  updatedAt        DateTime  @updatedAt @map("updated_at")
  deletedAt        DateTime? @map("deleted_at")

  user   User    @relation(fields: [userId], references: [id], onDelete: Restrict)
  quests Quest[]

  @@map("organizations")
}

model Quest {
  id                 Int         @id @default(autoincrement())
  organizationId     Int         @map("organization_id")
  questName          String      @map("quest_name")
  description        String?
  category           String
  address            String?
  lat                Float?
  lng                Float?
  maxVolunteers      Int         @map("max_volunteers")
  assignedVolunteers Int         @default(0) @map("assigned_volunteers")
  rewardXp           Int         @default(0) @map("reward_xp")
  rewardCoins        Int         @default(0) @map("reward_coins")
  status             QuestStatus @default(open)
  createdAt          DateTime    @default(now()) @map("created_at")
  updatedAt          DateTime    @updatedAt @map("updated_at")

  organization Organization @relation(fields: [organizationId], references: [userId])
  claims       QuestClaim[]

  @@index([status, id])
  @@index([organizationId, id])
  @@index([category, status])
  @@map("quests")
}

model QuestClaim {
  id          Int         @id @default(autoincrement())
  questId     Int         @map("quest_id")
  userId      Int         @map("user_id")
  status      ClaimStatus @default(pending)
  createdAt   DateTime    @default(now()) @map("created_at")
  updatedAt   DateTime    @updatedAt @map("updated_at")

  quest     Quest     @relation(fields: [questId], references: [id])
  user      User      @relation(fields: [userId], references: [id])

  @@unique([questId, userId])   // одна заявка на квест от юзера
  @@index([questId, status])
  @@index([userId])
  @@map("quest_claims")
}
```

### 3.3. Команды

```bash
npx prisma migrate dev --name init     # локально: создаёт миграцию и применяет
npx prisma generate                    # генерирует клиент
npx prisma migrate deploy              # применить готовые миграции без shadow-БД
npx prisma studio                      # просмотр данных
```

`src/db/prisma.ts`:

```ts
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { env } from '../config/env';

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
export const prisma = new PrismaClient({
  adapter,
  log: env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
});
```

---

## 4. Общий слой

### 4.1. `auth.ts`

```ts
import jwt, { JwtPayload } from 'jsonwebtoken';
import { env } from '../../config/env';

export function auth(req, _res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next(new Unauthorized('No token'));
  const token = header.slice(7);
  const s = env;

  const keys = [s.JWT_SECRET, s.JWT_SECRET_PREVIOUS].filter(Boolean) as string[];
  for (const key of keys) {
    try {
      const p = jwt.verify(token, key, {
        algorithms: ['HS256'],
        issuer: s.JWT_ISSUER,
        audience: s.JWT_AUDIENCE,
      }) as JwtPayload;
      const id = Number(p.sub);
      if (!Number.isInteger(id)) return next(new Unauthorized('Invalid subject'));
      req.user = { id };
      return next();
    } catch (e) {
      if (e instanceof jwt.TokenExpiredError) return next(new Unauthorized('Token expired'));
    }
  }
  next(new Unauthorized('Invalid token'));
}
```

### 4.2. `requireOrg.ts`

Ищет `organizations` по `req.user.id` (только с `deletedAt = null`). Если записи нет, отдаёт 403. Найденную запись кладёт в `req.org`. Для заявок отдельная проверка роли не нужна: подать заявку может любой авторизованный юзер.

### 4.3. `errorHandler.ts`

Единый формат ошибки: `{ "error": { "code": "NOT_FOUND", "message": "..." } }`.
Ошибки Prisma переводим в HTTP-коды:

| Prisma | HTTP |
|---|---|
| `P2002` (unique) | 409 Conflict |
| `P2025` (record not found) | 404 Not Found |
| `P2003` (FK) | 400 Bad Request |

### 4.4. Пагинация

- `page.ts`: `parsePage(query)` возвращает `{ skip, take, page, limit }`, где `limit` от 1 до 100 (по умолчанию 20). Данные и `total` берутся через `prisma.$transaction([findMany, count])`.
- `cursor.ts`: `take: limit + 1`, `cursor: { id }`, `skip: 1`, `orderBy: { id: 'desc' }`. Курсор — base64 от `{ id }`.

---

## 5. Модули и эндпоинты

### 5.1. Organizations

| # | Метод | Путь | Middleware | Логика |
|---|---|---|---|---|
| 1 | POST | `/organizations` | auth, validate | 409, если профиль уже есть; `userId` берётся из токена |
| 2 | GET | `/organizations` | validate(query) | page-пагинация, фильтры `type`, `search` (`contains`, `mode: 'insensitive'`), `deletedAt: null` |
| 3 | GET | `/organizations/:id` | — | 404, если удалена |
| 4 | GET | `/organizations/me` | auth, requireOrg | — |
| 5 | PATCH | `/organizations/me` | auth, requireOrg, validate | `trustScore` и `userId` в zod-схему не входят |
| 6 | DELETE | `/organizations/me` | auth, requireOrg | транзакция: `deletedAt = now()` + квесты `status = archived` |

Маршрут `/organizations/me` регистрируем **до** `/organizations/:id`.

### 5.2. Quests

| # | Метод | Путь | Middleware | Логика |
|---|---|---|---|---|
| 1 | POST | `/quests` | auth, requireOrg, validate | `organizationId = req.org.userId`; `assignedVolunteers` от клиента не принимаем |
| 2 | GET | `/quests` | validate(query) | cursor-пагинация; фильтры `category`, `status`; гео-фильтр (см. ниже) |
| 3 | GET | `/quests/:id` | — | с `include: { organization: { select: ... } }` |
| 4 | GET | `/organizations/:id/quests` | validate(query) | page-пагинация, фильтр `status` |
| 5 | PATCH | `/quests/:id` | auth, requireOrg, validate | проверка владельца; `maxVolunteers` нельзя сделать меньше `assignedVolunteers` |
| 6 | PATCH | `/quests/:id/status` | auth, requireOrg, validate | только разрешённые переходы (таблица ниже) |
| 7 | DELETE | `/quests/:id` | auth, requireOrg | если есть заявки, архивируем; иначе удаляем |

Переходы статусов:

| Из | В |
|---|---|
| `open` | `in_progress`, `cancelled` |
| `in_progress` | `completed`, `cancelled` |
| `completed`, `cancelled`, `archived` | — |

Гео-фильтр: на первом этапе bounding box по `lat`/`lng` через обычный `where` (`gte`/`lte`). Если понадобится сортировка по расстоянию, перейти на `$queryRaw` с формулой haversine или на PostGIS. Тогда для этого запроса пагинация через page + limit.

### 5.3. Claims

| # | Метод | Путь | Middleware | Логика |
|---|---|---|---|---|
| 1 | POST | `/quests/:id/claims` | auth | квест `open`; повтор даёт 409 (`@@unique`) |
| 2 | DELETE | `/quests/:id/claims/me` | auth | статус `withdrawn`; если заявка была `approved`, `assignedVolunteers - 1` |
| 3 | GET | `/quests/:id/claims` | auth, requireOrg | владелец квеста; page-пагинация, фильтр `status` |
| 4 | PATCH | `/quests/:id/claims/:claimId` | auth, requireOrg, validate | `approved` / `rejected`, см. транзакцию ниже |
| 5 | POST | `/quests/:id/claims/:claimId/complete` | auth, requireOrg | только из `approved`, см. транзакцию ниже |

**Approve без гонок** (два одновременных approve не должны превысить `maxVolunteers`):

```ts
await prisma.$transaction(async (tx) => {
  const updated = await tx.$executeRaw`
    UPDATE quests SET assigned_volunteers = assigned_volunteers + 1
    WHERE id = ${questId} AND assigned_volunteers < max_volunteers`;
  if (updated === 0) throw new Conflict('No free slots');
  await tx.questClaim.update({ where: { id: claimId, status: 'pending' }, data: { status: 'approved' } });
});
```

**Complete** (в одной транзакции):

1. Заявка `approved` → `completed` (`where: { id, status: 'approved' }`, чтобы награду нельзя было начислить дважды).
2. `user.xp += quest.rewardXp`, `user.balance += quest.rewardCoins` через `{ increment }` (в таблице `users`).
3. Пересчитать `curLevel` по новому `xp`.

### 5.4. Подключение роутов

```ts
app.use(express.json());
app.use('/organizations', organizationsRouter); // включает /:id/quests
app.use('/quests/:id/claims', claimsRouter);    // Router({ mergeParams: true })
app.use('/quests', questsRouter);
app.get('/health', (_req, res) => res.json({ ok: true }));
app.use(errorHandler);
```

---

## 6. Этапы реализации (подробно)

Порядок строгий: каждый этап опирается на предыдущий. Тесты пишутся сразу в своём этапе, а не в конце.

```
1 Каркас → 2 Конфиг (.env) → 3 БД/Prisma → 4 Общий слой → 5 Organizations → 6 Quests → 7 Claims
```

---

### Этап 1. Каркас проекта

**Цель:** пустой сервер на Express + TypeScript, который запускается локально вместе с базой.

- [ ] `git init`, `.gitignore`: `node_modules`, `dist`, `.env`, `coverage`.
- [ ] `npm init -y`, поставить зависимости из раздела 8. Prisma 7 (`prisma@7`, `@prisma/client@7`, `@prisma/adapter-pg@7`). Проект в ESM (`"type": "module"`), потому что Prisma 7 поставляется как ES-модуль.
- [ ] `tsconfig.json`: `strict: true`, `target: ES2022`, `module: NodeNext`, `outDir: dist`, `rootDir: src`.
- [ ] eslint + prettier, скрипт `lint`.
- [ ] `src/app.ts`: функция `createApp()`, `express.json({ limit: '100kb' })`, `GET /health → { ok: true }`.
- [ ] `src/server.ts`: пока только `createApp().listen(PORT)`.
- [ ] `docker-compose.yml` с `postgres:16` для локальной разработки (порт 5432, volume для данных).
- [ ] Скрипты `dev`, `build`, `start`, `lint`, `test` в `package.json`.

**Готово, когда:** `docker compose up -d` поднимает базу, `npm run dev` стартует сервер, `GET /health` отвечает 200.

---

### Этап 2. Конфиг (`.env`)

**Цель:** все настройки читаются из `.env` и проверяются при старте.

- [ ] `.env.example` со всеми переменными из раздела 2.1 без значений секретов; `.env` в `.gitignore`.
- [ ] `src/config/env.ts`: zod-схема, при ошибке `process.exit(1)` со списком невалидных переменных (раздел 2.2).
- [ ] `prisma.config.ts`: URL для CLI из `MIGRATE_DATABASE_URL`, иначе `DATABASE_URL` (раздел 2.4).
- [ ] `.env.test` для тестов: отдельная БД и тестовый `JWT_SECRET`.

**Готово, когда:** с заполненным `.env` сервер стартует; с пустым или коротким (< 32 символов) `JWT_SECRET` процесс завершается с понятной ошибкой.

---

### Этап 3. База данных и Prisma

**Цель:** все таблицы создаются через Prisma, у каждого сервиса свои права в БД.

- [ ] Один раз под админом БД выполнить SQL ролей из раздела 3.1: `app_migrator`, `volunteer_api`, `auth_api` и default privileges.
- [ ] `npx prisma init`, перенести `schema.prisma` из раздела 3.2. Так как этот сервис владеет всей структурой, в схему входят **все 6 таблиц**: `users` (с `xp`, `balance`, `cur_level`), `organizations`, `quests`, `quest_claims`, `rewards`, `user_rewards`, даже если эндпоинты для наград появятся позже.
- [ ] Проверить, что в БД уже есть:
  - база пустая → `npx prisma migrate dev --name init`;
  - есть таблицы, данные нужны → baseline (раздел 3.1, пункт 8);
  - есть таблицы, данные не нужны → сделать бэкап (`pg_dump`), удалить старые таблицы, затем `migrate dev --name init`.
- [ ] `src/db/prisma.ts`: один экземпляр `PrismaClient`, на `SIGTERM`/`SIGINT` вызывать `prisma.$disconnect()`.
- [ ] `prisma/seed.ts`: 3 юзера (у двух ненулевые `xp`/`balance`), 1 организация, 5 квестов в разных статусах, 2 награды. Скрипт `prisma.seed` в `package.json`.
- [ ] Передать команде auth-API: финальные поля `users` (и что `xp`/`balance`/`cur_level` им менять нельзя), правило «только `db pull`, никаких `migrate`», строку подключения под `auth_api`.

**Готово, когда:**
- `prisma migrate deploy` на чистой базе проходит без ошибок;
- `npx prisma db seed` заполняет данные;
- под ролью `auth_api` работает `INSERT INTO users` (учётные поля), а `UPDATE users SET balance = ...`, `CREATE TABLE` и `SELECT FROM quests` дают permission denied;
- под ролью `volunteer_api` работает `UPDATE users SET xp = ...`, а `UPDATE users SET email = ...` даёт permission denied.

---

### Этап 4. Общий слой

**Цель:** всё, что используют все модули: ошибки, валидация, авторизация, пагинация.

- [ ] `src/common/errors.ts`: базовый `AppError(status, code, message, details?)` и наследники `BadRequest`, `Unauthorized`, `Forbidden`, `NotFound`, `Conflict`.
- [ ] `src/common/middleware/errorHandler.ts`:
  - `AppError` → его статус и `{ error: { code, message, details } }`;
  - `ZodError` → 400 со списком полей;
  - Prisma `P2002` → 409, `P2025` → 404, `P2003` → 400;
  - всё остальное → 500, stack только в логах, клиенту не отдаём.
- [ ] `src/common/middleware/validate.ts`: `validate({ body?, query?, params? })` парсит через zod и кладёт результат обратно в `req`. Числа из query приводятся через `z.coerce`.
- [ ] `src/common/middleware/auth.ts`: проверка по раздел 4.1, с `JWT_SECRET_PREVIOUS` для ротации.
- [ ] `src/common/middleware/requireOrg.ts`: `organization.findFirst({ where: { userId, deletedAt: null } })` → `req.org`, иначе 403.
- [ ] (опционально) проверка `users.status`: если `banned`/`deleted` → 403. Можно встроить в `auth.ts` с кешем на 30–60 сек.
- [ ] `src/common/pagination/page.ts`: `pageQuerySchema` (`page ≥ 1`, `limit 1..100`, по умолчанию 20), `toPrismaPage()` → `{ skip, take }`, `pageMeta(total, page, limit)`.
- [ ] `src/common/pagination/cursor.ts`: `encodeCursor`/`decodeCursor` (base64 JSON), невалидный курсор → 400; `cursorResult(items, limit)` отрезает лишний элемент и считает `hasMore`/`nextCursor`.
- [ ] `src/types/express.d.ts`: `req.user`, `req.org`.

**Готово, когда:** unit-тесты проходят:
- `auth`: нет токена, неверная подпись, `alg: none`, чужой `aud`, просроченный → 401; валидный → `req.user.id`; токен на старом секрете при заданном `JWT_SECRET_PREVIOUS` → проходит;
- пагинация: `limit=500` обрезается до 100, `page=0` → 400, курсор кодируется и декодируется обратно.

---

### Этап 5. Модуль Organizations

**Цель:** 6 эндпоинтов из раздела 5.1.

- [ ] `organizations.schema.ts`:
  - `createOrgSchema`: `organizationName` (1–200), `types`, `edrpou` (8 цифр), `contact` (массив до 10 строк), `description` (до 5000), `logo` (url);
  - `updateOrgSchema = createOrgSchema.partial()`, `strict()`, чтобы `trustScore`/`userId` вызывали 400, а не молча игнорировались;
  - `listOrgsQuerySchema`: пагинация + `type`, `search`.
- [ ] `organizations.repository.ts`: `create`, `findActiveById`, `findMany(filter, skip, take)` + `count(filter)` в `$transaction`, `update`, `softDeleteWithQuests(userId)`.
- [ ] `organizations.service.ts`:
  - `create`: если профиль уже есть → 409; если `edrpou` занят → 409 (P2002);
  - `update`: только своя организация;
  - `remove`: транзакция `deletedAt = now()` + `quest.updateMany({ status: 'archived' })` для её квестов в статусах `open`/`in_progress`. Заявки `pending` по этим квестам переводятся в `rejected`.
- [ ] `organizations.controller.ts`: коды `201` (create), `200` (get/update), `204` (delete).
- [ ] `organizations.routes.ts`: `/me` **до** `/:id`; `/:id` валидируется как целое число.
- [ ] Тесты (supertest): весь CRUD, повторное создание → 409, `PATCH` с `trustScore` → 400, удалённая организация → 404 на `GET /:id`, её квесты стали `archived`.

**Готово, когда:** все 6 эндпоинтов отвечают по контракту и тесты зелёные.

---

### Этап 6. Модуль Quests

**Цель:** 7 эндпоинтов из раздела 5.2 и лента с cursor-пагинацией.

- [ ] `quests.schema.ts`:
  - `createQuestSchema`: `questName` (1–200), `category`, `description`, `address`, `lat` (−90..90), `lng` (−180..180), `maxVolunteers` (1..1000), `rewardXp`/`rewardCoins` (≥ 0);
  - `updateQuestSchema`: `partial().strict()`, без `status`, `assignedVolunteers`, `organizationId`;
  - `changeStatusSchema`: `{ status: enum }`;
  - `feedQuerySchema`: `cursor`, `limit`, `category`, `status` (по умолчанию `open`), `lat`+`lng`+`radius` (км, до 100) только все вместе;
  - `orgQuestsQuerySchema`: пагинация + `status`.
- [ ] `quests.repository.ts`: `create`, `findById`, `feed(filter, cursor, limit)`, `findByOrg(orgId, filter, skip, take)` + `count`, `update`, `delete`, `countClaims(questId)`.
- [ ] `quests.service.ts`:
  - `assertOwner(quest, orgId)` → 403;
  - карта переходов статусов (раздел 5.2), запрещённый переход → 409;
  - редактировать можно только квесты `open`/`in_progress`;
  - `maxVolunteers` нельзя сделать меньше `assignedVolunteers` → 409;
  - `remove`: если есть заявки → `archived`, иначе физическое удаление;
  - при переходе в `cancelled` все `pending`/`approved` заявки → `rejected`.
- [ ] Гео-фильтр (bounding box): `dLat = radius / 111`, `dLng = radius / (111 * cos(lat))`, условие `lat between`, `lng between`. Квесты без координат в гео-выдачу не попадают.
- [ ] Лента: `orderBy: { id: 'desc' }`, `take: limit + 1`, при курсоре `cursor: { id }, skip: 1`. В ответ включать `organization: { select: { userId, organizationName, logo, trustScore } }`.
- [ ] `GET /organizations/:id/quests`: маршрут в `organizations.routes.ts`, логика в `quests.service`.
- [ ] Тесты: создание не-организацией → 403, чужой квест → 403, недопустимый переход статуса → 409, лента из 45 квестов при `limit=20` даёт 3 страницы без дублей и пропусков, гео-фильтр отсекает дальние квесты.

**Готово, когда:** все 7 эндпоинтов работают и лента листается до конца с `hasMore: false`.

---

### Этап 7. Модуль Claims

**Цель:** 5 эндпоинтов из раздела 5.3 без гонок и двойных начислений.

- [ ] `claims.schema.ts`: `params` (`id`, `claimId` целые), `decideClaimSchema` (`approved` | `rejected`), `listClaimsQuerySchema` (пагинация + `status`).
- [ ] `claims.repository.ts`: `create`, `findByQuestAndUser`, `findById`, `list(questId, filter, skip, take)` + `count`, `updateStatus(id, fromStatus, toStatus)` (условие по текущему статусу).
- [ ] `claims.service.ts`:
  - **подать заявку:** квест `open`; юзер не владелец организации этого квеста; если заявка уже есть со статусом `withdrawn` → вернуть в `pending`, иначе → 409;
  - **отозвать:** `pending`/`approved` → `withdrawn`; если была `approved`, в той же транзакции `assignedVolunteers - 1`;
  - **список:** только владелец квеста;
  - **approve:** транзакция из раздела 5.3 (атомарный `UPDATE ... WHERE assigned_volunteers < max_volunteers`), квест должен быть `open`/`in_progress`;
  - **reject:** `pending` → `rejected`; если была `approved` → `assignedVolunteers - 1`;
  - **complete:** транзакция: заявка `approved` → `completed` (условие по статусу) → `user.update({ xp: { increment }, balance: { increment } })` → пересчёт `curLevel`.
- [ ] `src/modules/claims/level.ts`: `calcLevel(xp)`, пока заглушка (например `floor(sqrt(xp / 100)) + 1`), формулу согласовать (раздел 9).
- [ ] `claims.routes.ts`: `Router({ mergeParams: true })`; `/me` **до** `/:claimId`.
- [ ] Тесты:
  - повторная заявка → 409, повторная после отзыва → 201;
  - 10 параллельных approve при `maxVolunteers = 3` → ровно 3 успешных, 7 получают 409;
  - два параллельных complete → награда начислена один раз;
  - отзыв approved-заявки освобождает место.

**Готово, когда:** все 5 эндпоинтов работают и тесты на конкурентность стабильно проходят (прогнать 10 раз подряд).

---

## 7. Тесты

- **Инструменты:** vitest или jest + supertest, отдельная тестовая БД (docker-compose с Postgres), перед прогоном `prisma migrate reset --force`.
- **Токены в тестах:** подписываются тестовым секретом из `.env.test` с `iss`/`aud` как у auth-API.
- **Обязательные кейсы:**
  - нет токена / неверная подпись / `alg: none` / чужой `aud` / просроченный → 401;
  - не владелец редактирует чужой квест или организацию → 403;
  - повторная заявка → 409;
  - approve при заполненном квесте → 409;
  - параллельные approve (`Promise.all`) не превышают `maxVolunteers`;
  - повторный complete не начисляет награду второй раз;
  - удаление организации архивирует её квесты.

---

## 8. Зависимости

```bash
npm i express @prisma/client@7 @prisma/adapter-pg@7 pg jsonwebtoken zod dotenv
npm i -D typescript tsx prisma@7 @types/express @types/jsonwebtoken @types/node @types/pg vitest supertest @types/supertest
```

`package.json` scripts:

```json
{
  "dev": "tsx watch src/server.ts",
  "build": "prisma generate && tsc",
  "generate": "prisma generate",
  "start": "node dist/server.js",
  "migrate:dev": "prisma migrate dev",
  "migrate:deploy": "prisma migrate deploy",
  "test": "vitest run"
}
```

`.env.example` — см. раздел 2.1.

---

## 9. Открытые вопросы

1. ~~Общая БД или раздельные?~~ **Решено:** общая БД, миграции всех таблиц делает только этот сервис, auth-API работает с данными (раздел 3.1). Осталось: есть ли в базе уже таблицы (тогда первая миграция через baseline) и на чём написан auth-API (Prisma → `db pull`).
2. ~~Где создаётся профиль волонтёра?~~ **Решено:** таблицы `volunteers` нет, `xp`, `balance`, `cur_level` хранятся в `users`.
3. Формула уровня `curLevel` от `xp`.
4. Нужен ли мгновенный бан пользователя (проверка `users.status` на каждый запрос)?
5. Время жизни access-токена у auth-API (от него зависит окно ротации секрета).
