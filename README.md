# Horizon

Волонтерські квести Дніпра. Організації публікують добрі справи на 3D-мапі міста,
волонтери записуються, отримують досвід і монети та обмінюють їх на нагороди партнерів.

## Структура

| Папка | Що це | Стек | Порт |
|---|---|---|---|
| `web/` | Сайт | Next.js 16, React 19, Tailwind 4, three.js | 3001 |
| `express-api/` | Квести, заявки, організації, профіль, нагороди | Express 5, Prisma 7, PostgreSQL | 3000 |
| `go-api/` | Вхід і реєстрація: пароль або Google, видає JWT | Go, chi, pgx | 8080 |

Одна база PostgreSQL (AWS RDS) на обидва API. Схемою володіє `express-api` (Prisma-міграції).

## Як це працює

- **Вхід.** `go-api` видає JWT. Next кладе його в httpOnly-cookie, `web/proxy.ts` перевіряє сесію до рендера сторінок і передає токен у `express-api`.
- **Волонтер.** Мапа квестів, запис і скасування заявки, «Мої квести», профіль із рівнем, магазин нагород і подарунок за кожні 5 виконаних квестів.
- **Організація.** Кабінет відкривається після заповнення профілю організації: квести, заявки волонтерів, підтвердження виконання з нарахуванням XP і монет.

## Запуск

Потрібні Node.js 20.19+, Go 1.26+ і SSH-тунель до бази на `localhost:5433` (див. `express-api/docs/DB_TUNNEL.md`).

```bash
# 1. express-api
cd express-api && npm install && npm run migrate:deploy && npm run db:seed && npm run dev

# 2. go-api
cd go-api && go run ./cmd/api

# 3. web
cd web && npm install && npm run dev
```

Сайт: http://localhost:3001 · Документація API: http://localhost:3000/docs

## Змінні оточення

Кожен сервіс читає свій `.env` (у git не потрапляє; приклади у `.env.example`).

| Змінна | Де | Що |
|---|---|---|
| `DATABASE_URL` | express-api, go-api | Postgres через тунель |
| `JWT_SECRET`, `JWT_ISSUER`, `JWT_AUDIENCE` | усі три | Однакові скрізь: go-api підписує, решта перевіряє |
| `CLIENT_ID` / `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | go-api / web | Client ID з Google Cloud Console |
| `NEXT_PUBLIC_API_URL=/api`, `AUTH_API_URL` | web | Адреси API для проксі Next |

## Деплой (AWS)

Два EC2 в одній VPC, Docker Compose, HTTPS дає CloudFront (`https://d203ezrrdmg2gd.cloudfront.net` → frontend :80).

| Інстанс | Що | Команда (з кореня репозиторію) |
|---|---|---|
| backend | express-api :3000, go-api :8080 | `docker compose -f docker-compose.backend.yml up -d --build` |
| frontend | web :80 | `docker compose -f docker-compose.frontend.yml --env-file web/.env up -d --build` |

express-api при старті сам застосовує міграції. Вітрина нагород: `docker compose -f docker-compose.backend.yml exec express-api npm run db:seed`.

Відмінності `.env` на серверах від локальних:

- `express-api/.env`, `go-api/.env`: `DATABASE_URL` прямо на endpoint RDS (без тунелю), `IS_DEVELOPMENT=false`, без `DEV_BYPASS_TOKEN`.
- `web/.env`: `API_URL=http://<приватний IP backend>:3000`, `AUTH_API_URL=http://<приватний IP backend>:8080`, без `NEXT_PUBLIC_API_TOKEN`. `API_URL` і `NEXT_PUBLIC_*` вшиваються під час збирання: після зміни перезбирайте образ.
- `JWT_*` однакові на обох інстансах. Домен CloudFront має бути в Google Console → Authorized JavaScript origins.

## Корисне

- `npm run db:seed` у `express-api` — dev-користувач і вітрина нагород. Можна запускати повторно, дублів не буде.
- `npm test` у `express-api` — автотести. Вони перестворюють схему, тому `.env.test` має вказувати на окрему базу.
