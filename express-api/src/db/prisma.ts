import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { env } from '../config/env.js';
import { pgConfig } from '../config/database.js';

const adapter = new PrismaPg(pgConfig('app'));

export const prisma = new PrismaClient({
  adapter,
  log: env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
});

export type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];
