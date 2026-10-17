# Подключение к БД (AWS RDS) через SSH-туннель

RDS закрыт для доступа из интернета, поэтому локально к нему подключаемся через SSH-туннель
к EC2-бастиону в той же VPC. Туннель пробрасывает локальный порт `5433` на порт `5432` RDS.

```
API / Prisma  ──>  localhost:5433  ──SSH──>  EC2-бастион  ──>  <rds-endpoint>:5432
```

## Что нужно

- SSH-ключ бастиона (`.pem`). В репозиторий его не кладём.
- Публичный IP или DNS бастиона и пользователь (для Amazon Linux это `ec2-user`, для Ubuntu — `ubuntu`).
- Endpoint RDS: AWS Console → RDS → Databases → Connectivity & security → Endpoint.
- Security Group RDS должна пускать порт 5432 с Security Group бастиона.
- Security Group бастиона должна пускать порт 22 с твоего IP.

## 1. Права на ключ (Windows)

OpenSSH не примет ключ, если его может читать кто-то, кроме тебя:

```powershell
icacls .\bastion-key.pem /inheritance:r
icacls .\bastion-key.pem /grant:r "$($env:USERNAME):(R)"
```

На Linux и macOS: `chmod 400 bastion-key.pem`.

## 2. Поднять туннель

```bash
ssh -i ./bastion-key.pem -N -L 5433:<rds-endpoint>:5432 ec2-user@<bastion-ip>
```

- `-L 5433:<rds-endpoint>:5432` — локальный порт 5433 пробрасывается на RDS через бастион.
- `-N` — только туннель, без шелла.

Окно терминала должно оставаться открытым, пока работаешь с базой. Закрыл окно — туннель закрылся.

Чтобы туннель не отваливался при простое, добавь `-o ServerAliveInterval=60`.

Проверить, что порт открыт (PowerShell):

```powershell
Test-NetConnection localhost -Port 5433
```

## 3. Настроить `.env`

```env
DATABASE_URL=postgresql://<user>:<password>@localhost:5433/postgres?schema=public&sslmode=require&sslaccept=accept_invalid_certs
```

- Хост — `localhost:5433`, а не endpoint RDS: подключаемся к локальному концу туннеля.
- `sslmode=require` нужен, потому что RDS требует SSL.
- Сертификат RDS выписан на endpoint, а не на `localhost`, поэтому проверка сертификата отключена.
  Это делает `src/config/database.ts` (`rejectUnauthorized: false`).
- Спецсимволы в пароле экранируются: `@` → `%40`, `:` → `%3A`, `/` → `%2F`, `#` → `%23`, `%` → `%25`.
- Для миграций и сида можно задать отдельного пользователя через `MIGRATE_DATABASE_URL` (тот же хост `localhost:5433`).

## 4. Запуск

При поднятом туннеле:

```bash
npm run migrate:dev   # миграции + сид (создаёт dev-пользователя)
npm run dev
```

## Типичные ошибки

| Ошибка | Причина |
|---|---|
| `ECONNREFUSED 127.0.0.1:5433`, API отвечает 503 `DB_UNAVAILABLE` | Туннель не поднят или закрылся. Перезапусти команду из шага 2. |
| `Permission denied (publickey)` | Неверный ключ или пользователь (`ec2-user` / `ubuntu`). |
| `UNPROTECTED PRIVATE KEY FILE` | Слишком открытые права на `.pem`, см. шаг 1. |
| `Connection timed out` при `ssh` | Порт 22 бастиона закрыт для твоего IP в Security Group. |
| `channel 2: open failed: connect failed` | Бастион не достучался до RDS: проверь endpoint и Security Group RDS. |
| `password authentication failed` | Неверный логин или пароль в `DATABASE_URL`, либо пароль не экранирован. |
