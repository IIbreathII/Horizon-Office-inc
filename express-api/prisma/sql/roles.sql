-- Роли для общей БД. Выполнить ОДИН раз под суперпользователем / master-пользователем RDS (до первой миграции).
-- Пароли заменить. Это не Prisma-миграция: роли живут на уровне кластера Postgres.

-- 1. Мигратор: владеет структурой, используется только для `prisma migrate`.
CREATE ROLE app_migrator LOGIN PASSWORD 'CHANGE_ME' CREATEDB; -- CREATEDB нужен для shadow-БД в migrate dev
GRANT CREATE, USAGE ON SCHEMA public TO app_migrator;
-- На RDS master-пользователь не суперюзер: без членства в роли он не сможет
-- выполнить ALTER DEFAULT PRIVILEGES FOR ROLE app_migrator и сузить права на users.
GRANT app_migrator TO CURRENT_USER;

-- 2. Рантайм volunteer-api.
CREATE ROLE volunteer_api LOGIN PASSWORD 'CHANGE_ME';
GRANT USAGE ON SCHEMA public TO volunteer_api;

-- 3. Рантайм auth-API.
CREATE ROLE auth_api LOGIN PASSWORD 'CHANGE_ME';
GRANT USAGE ON SCHEMA public TO auth_api;

-- Права на таблицы из будущих миграций (создаёт их app_migrator).
ALTER DEFAULT PRIVILEGES FOR ROLE app_migrator IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO volunteer_api;
ALTER DEFAULT PRIVILEGES FOR ROLE app_migrator IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO volunteer_api;

-- ---------------------------------------------------------------------------
-- После первой миграции (`npm run migrate:deploy`) выполнить блок ниже:
-- он сужает права на users, которые default privileges выдали слишком широко.
-- ---------------------------------------------------------------------------

-- volunteer-api: users только читает + игровые поля.
REVOKE ALL ON users FROM volunteer_api;
GRANT SELECT ON users TO volunteer_api;
GRANT UPDATE (xp, balance, cur_level, updated_at) ON users TO volunteer_api;

-- auth-API: только учётные поля users, остальные таблицы не видит.
GRANT SELECT ON users TO auth_api;
GRANT INSERT (google_id, email, status, password, username, photo, contact, updated_at) ON users TO auth_api;
GRANT UPDATE (google_id, email, status, password, username, photo, contact, updated_at) ON users TO auth_api;
GRANT USAGE, SELECT ON SEQUENCE users_id_seq TO auth_api;

-- служебная таблица Prisma — только мигратору
DO $$
BEGIN
  IF to_regclass('public._prisma_migrations') IS NOT NULL THEN
    REVOKE ALL ON _prisma_migrations FROM volunteer_api;
  END IF;
END $$;
