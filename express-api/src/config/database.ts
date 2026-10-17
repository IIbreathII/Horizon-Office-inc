// Подключение к Postgres (в т.ч. AWS RDS) по DATABASE_URL.
// Без zod и JWT-переменных: модуль используют и рантайм, и Prisma CLI (prisma.config.ts, seed).
import type { PoolConfig } from 'pg';

type Role = 'app' | 'migrator';

function rawUrl(role: Role): string {
  const migrate = (process.env.MIGRATE_DATABASE_URL ?? '').trim();
  if (role === 'migrator' && migrate) return migrate;
  return (process.env.DATABASE_URL ?? '').trim();
}

/** URL для Prisma CLI (migrate, studio). Пустой — для `prisma generate` подключение не нужно. */
export function prismaCliUrl(role: Role = 'migrator'): string {
  return rawUrl(role);
}

/**
 * Конфиг node-postgres. sslmode из URL переводим в настройку ssl сами:
 * в node-postgres `sslmode=require` означает полную проверку сертификата,
 * а сертификата RDS нет в стандартном хранилище Node — соединение бы падало.
 */
export function pgConfig(role: Role = 'app'): PoolConfig {
  const value = rawUrl(role);
  if (!value) throw new Error('DATABASE_URL is not set');

  const url = new URL(value);
  const sslmode = url.searchParams.get('sslmode');
  for (const p of ['sslmode', 'sslaccept', 'schema']) url.searchParams.delete(p);

  return {
    connectionString: url.toString(),
    ssl: sslmode && sslmode !== 'disable' ? { rejectUnauthorized: false } : undefined,
    max: 10,
    connectionTimeoutMillis: 10_000,
  };
}
