import dotenv from 'dotenv';
import { defineConfig } from 'prisma/config';

dotenv.config({ quiet: true });
const { prismaCliUrl } = await import('./src/config/database.js');

// CLI (migrate, studio, seed) ходит под ролью мигратора, сам сервис — под DATABASE_URL.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: prismaCliUrl('migrator'),
  },
});
