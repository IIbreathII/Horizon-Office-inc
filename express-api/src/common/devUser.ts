// Пользователь для локальной разработки: от его имени проходят запросы с DEV_BYPASS_TOKEN.
// Создаётся сидом (prisma/seed.ts). id большой, чтобы не пересекаться с autoincrement.
export const DEV_USER = {
  id: 999999,
  email: 'dev@local.test',
  username: 'dev',
} as const;
