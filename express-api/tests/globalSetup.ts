// Пересоздаёт схему тестовой БД и применяет все миграции из prisma/migrations по порядку.
// Тот же SQL, что выполнит `prisma migrate deploy`.
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { testEnv as env } from './testEnv.js';

export default async function setup() {
  const client = new pg.Client({ connectionString: env.DATABASE_URL.replace(/\?.*$/, '') });
  await client.connect();
  try {
    await client.query('DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;');
    const dir = path.resolve('prisma/migrations');
    const migrations = fs
      .readdirSync(dir)
      .filter((d) => fs.statSync(path.join(dir, d)).isDirectory())
      .sort();
    for (const m of migrations) {
      await client.query(fs.readFileSync(path.join(dir, m, 'migration.sql'), 'utf8'));
    }
  } finally {
    await client.end();
  }
}
