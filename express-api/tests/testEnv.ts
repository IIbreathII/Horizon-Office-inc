// Переменные окружения для автотестов.
// Если рядом лежит свой .env.test (не в git) — берём его, иначе дефолты для локального Postgres.
import fs from 'node:fs';
import dotenv from 'dotenv';

const defaults: Record<string, string> = {
  NODE_ENV: 'test',
  PORT: '0',
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/app_test?schema=public',
  JWT_SECRET: 'test-secret-test-secret-test-secret-0123456789', // только для тестов
  JWT_SECRET_PREVIOUS: '',
  JWT_ISSUER: 'auth-api',
  JWT_AUDIENCE: 'volunteer-api',
  USER_STATUS_CACHE_SECONDS: '0',
};

export const testEnv: Record<string, string> = fs.existsSync('.env.test')
  ? { ...defaults, ...dotenv.parse(fs.readFileSync('.env.test')) }
  : defaults;
