import { env } from './config/env.js';
import { prisma } from './db/prisma.js';
import { createApp } from './app.js';

async function main() {
  await prisma.$connect();

  const server = createApp().listen(env.PORT, () => {
    console.log(`volunteer-api listening on :${env.PORT} (${env.NODE_ENV})`);
  });

  // Graceful shutdown: дожидаемся текущих запросов и закрываем пул соединений.
  const shutdown = (signal: string) => {
    console.log(`${signal} received, shutting down`);
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch(async (err) => {
  console.error('Failed to start:', err);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
