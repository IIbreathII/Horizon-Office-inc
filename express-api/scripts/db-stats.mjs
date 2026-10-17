// Только чтение: показывает таблицы схемы public и точное число строк в каждой.
// Запуск: node scripts/db-stats.mjs
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ quiet: true });

const url = new URL(process.env.DATABASE_URL);
const ssl = url.searchParams.get('sslmode') && url.searchParams.get('sslmode') !== 'disable';
url.search = '';

const client = new pg.Client({ connectionString: url.toString(), ssl: ssl ? { rejectUnauthorized: false } : undefined });
await client.connect();

const { rows: tables } = await client.query(
  "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename",
);

const result = [];
for (const { tablename } of tables) {
  const { rows } = await client.query(`SELECT count(*)::int AS n FROM "public"."${tablename.replace(/"/g, '""')}"`);
  result.push({ table: tablename, rows: rows[0].n });
}
console.table(result);

await client.end();
