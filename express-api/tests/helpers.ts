import jwt from 'jsonwebtoken';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/db/prisma.js';

export const app = createApp();
export const api = () => request(app);

let seq = 0;

/** Токен в формате auth-API. */
export function tokenFor(userId: number, opts: { secret?: string; audience?: string; issuer?: string; expiresIn?: number } = {}) {
  return jwt.sign({ sub: String(userId) }, opts.secret ?? process.env.JWT_SECRET!, {
    algorithm: 'HS256',
    issuer: opts.issuer ?? process.env.JWT_ISSUER,
    audience: opts.audience ?? process.env.JWT_AUDIENCE,
    expiresIn: opts.expiresIn ?? 900,
  });
}

export const bearer = (userId: number) => ({ Authorization: `Bearer ${tokenFor(userId)}` });

export async function createUser(data: { status?: string; xp?: number; balance?: number } = {}) {
  seq += 1;
  return prisma.user.create({ data: { email: `user${seq}-${Date.now()}@test.dev`, username: `user${seq}`, ...data } });
}

/** Юзер с активным профилем организации. */
export async function createOrgUser() {
  const user = await createUser();
  await prisma.organization.create({ data: { userId: user.id, organizationName: `Org ${user.id}`, contact: [] } });
  return user;
}

export async function createQuest(orgId: number, data: Partial<{ maxVolunteers: number; rewardXp: number; rewardCoins: number; status: 'open' | 'in_progress' | 'completed' | 'cancelled' | 'archived'; category: string; lat: number; lng: number }> = {}) {
  return prisma.quest.create({
    data: { organizationId: orgId, questName: 'Quest', category: 'ecology', maxVolunteers: 5, rewardXp: 100, rewardCoins: 50, ...data },
  });
}

export async function resetDb() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE user_rewards, rewards, quest_claims, quests, organizations, users RESTART IDENTITY CASCADE',
  );
}
