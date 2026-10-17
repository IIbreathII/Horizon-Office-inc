# AWS-інфраструктура

Що налаштовано в AWS (регіон `eu-north-1`, Stockholm) під деплой на два інстанси.
Команди деплою: розділ «Деплой» у [README](../README.md).

## Схема

```
браузер ──HTTPS──▶ CloudFront d203ezrrdmg2gd.cloudfront.net
                      │ HTTP :80
                      ▼
               frontend 172.31.23.194 (Next, docker web :80→3000)
                      ├──▶ backend 172.31.42.98:3000  (express-api)
                      └──▶ backend 172.31.42.98:8080  (go-api)
                                   │ :5432
                                   ▼
                            RDS horizon-db (PostgreSQL)
```

Сервіси ходять одне до одного за приватними IP всередині VPC `vpc-09a0911fc0bbea33f`.

## Інстанси

| Роль | Тип | Приватний IP | Публічний IP | Що крутиться |
|---|---|---|---|---|
| frontend | m7i-flex.large | 172.31.23.194 | 16.192.68.220 (Elastic IP) | `docker-compose.frontend.yml` |
| backend | t3.micro (1 ГБ RAM + swap 2 ГБ) | 172.31.42.98 | 13.50.214.165 (не Elastic, зміниться після stop/start) | `docker-compose.backend.yml` |
| bastion | — | — | 16.171.139.52 | вхід по SSH і тунель до RDS |

- frontend: `i-0f1a4f2ada7c6a26c`. Elastic IP прив'язаний, щоб origin у CloudFront не змінювався після перезапуску.
- backend: Docker і Compose вже стояли. Репозиторій у `~/Horizon-Office-inc` (раніше на гілці `backend-go`, для деплою перемикається на `main`). Старий контейнер `deploy-node-api` (rewards-api на :3000) видаляється перед першим запуском.
- frontend спочатку порожній: Docker, Compose і git ставляться вручну (див. README).
- SSH на frontend іде через bastion (ProxyCommand / ProxyJump), за приватним IP — Elastic IP на це не впливає.

## RDS

- Endpoint: `horizon-db.c5ccgee6ol01.eu-north-1.rds.amazonaws.com:5432`.
- На сервері `DATABASE_URL` вказує прямо на endpoint. Локально — через SSH-тунель на bastion (`localhost:5433`, див. `express-api/docs/DB_TUNNEL.md`).
- База тестова. Схему і міграції застосовує express-api під час старту контейнера.

## Security groups

| SG | ID | На чому | Що пускає |
|---|---|---|---|
| `horizon-app-sg` | sg-0b6b3c04a8d18648b | backend | 3000 і 8080 з `frontend-sg`; 3000/8080 з `bastion-sg`; 22 і 8080 з `0.0.0.0/0` |
| `frontend-sg` | sg-067c6a0e90edf3f15 | frontend | HTTP 80 (для CloudFront) і SSH |
| `rds-ec2-2` | sg-053a985d3213025e1 | horizon-db | 5432 з `horizon-app-sg` |
| `rds-ec2-1` / `postgres-from-bastion` | sg-0f1baee349d61a8d7 | horizon-db | 5432 з bastion |
| `bastion-sg` | sg-0130a29b51d580d83 | bastion | SSH |
| `alb-sg` | sg-0fbd591244fb8a0a7 | — | HTTP для ALB (зараз не використовується) |

Під деплой додано два правила в `horizon-app-sg`:

- Custom TCP **3000** ← `frontend-sg` — «Next to express-api»
- Custom TCP **8080** ← `frontend-sg` — «Next to go-api»

Широкі правила (22 і 8080 з `0.0.0.0/0`) свідомо лишили як є. Звузити пізніше: 22 — лише bastion або свій IP, 8080 — прибрати `0.0.0.0/0`, 80 на frontend — лише з CloudFront (managed prefix list `com.amazonaws.global.cloudfront.origin-facing`).

## CloudFront

Distribution «Frontend Public», ID `EBCSBLQ4VVOM5`, домен **https://d203ezrrdmg2gd.cloudfront.net**. HTTPS дає сертифікат `*.cloudfront.net`, власний домен не потрібен.

| Налаштування | Значення |
|---|---|
| Origin type | Other (custom origin) |
| Origin | `ec2-16-192-68-220.eu-north-1.compute.amazonaws.com`, **HTTP only**, порт **80**, IPv4 |
| Viewer protocol policy | Redirect HTTP to HTTPS |
| Allowed methods | GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE |
| Cache policy | **CachingDisabled** — сторінки й API залежать від cookie сесії |
| Origin request policy | **AllViewer** — до Next доходять cookie, заголовки, query і Host |
| WAF | вимкнено |
| Billing | Pay-as-you-go (вкладаємося в безкоштовні 1 ТБ / 10 млн запитів на місяць) |

Пізніше можна додати behavior `/_next/static/*` з `CachingOptimized`, щоб статика кешувалась.

## Google OAuth

Google Auth Platform → Clients → Web client (той самий, що `CLIENT_ID` / `NEXT_PUBLIC_GOOGLE_CLIENT_ID`):

- **Authorised JavaScript origins**: `http://localhost`, `http://localhost:3001`, `http://localhost:5500`, `https://d203ezrrdmg2gd.cloudfront.net`.
- **Authorised redirect URIs**: порожньо (кнопка GSI, без редиректів).
- Branding → Application home page не заповнюємо: `cloudfront.net` не можна підтвердити як свій домен.

## Env на серверах

`.env` у образи не потрапляють (`.dockerignore`), лежать на інстансах поруч із кодом і створюються вручну один раз:

- backend: `express-api/.env`, `go-api/.env` — `DATABASE_URL` на RDS endpoint, `IS_DEVELOPMENT=false`, без `DEV_BYPASS_TOKEN`.
- frontend: `web/.env` — `API_URL=http://172.31.42.98:3000`, `AUTH_API_URL=http://172.31.42.98:8080`, без `NEXT_PUBLIC_API_TOKEN`.
- `JWT_SECRET`, `JWT_ISSUER`, `JWT_AUDIENCE` однакові у всіх трьох файлах.
