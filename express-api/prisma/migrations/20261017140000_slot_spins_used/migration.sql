-- AlterTable
ALTER TABLE "users" ADD COLUMN "slot_spins_used" INTEGER NOT NULL DEFAULT 0;

-- volunteer-api пишет в users только игровые поля (prisma/sql/roles.sql); счётчик прокруток — одно из них.
-- Роль есть только там, где выполнен roles.sql.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'volunteer_api') THEN
    GRANT UPDATE (slot_spins_used) ON users TO volunteer_api;
  END IF;
END $$;
