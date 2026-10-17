import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/db/prisma.js';
import { calcLevel, levelProgress } from '../src/modules/claims/level.js';
import { api, bearer, createOrgUser, createQuest, createUser, resetDb } from './helpers.js';

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

describe('levels', () => {
  it('levelProgress follows calcLevel: start of level, middle, exact threshold', () => {
    expect(levelProgress(0)).toEqual({ level: 1, current: 0, required: 100 });
    expect(levelProgress(250)).toEqual({ level: 2, current: 150, required: 300 });
    expect(levelProgress(400)).toEqual({ level: 3, current: 0, required: 500 });
    for (const xp of [0, 99, 100, 399, 400, 5000]) expect(levelProgress(xp).level).toBe(calcLevel(xp));
  });
});

describe('profiles', () => {
  it('GET /profiles/me: game fields, no secrets, organization only for org users', async () => {
    const user = await createUser({ xp: 250, balance: 40 });
    const res = await api().get('/profiles/me').set(bearer(user.id));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: user.id, email: user.email, xp: 250, balance: 40, organization: null });
    // уровень и прогресс считает бэкенд по xp, а не берёт сохранённый cur_level
    expect(res.body.curLevel).toBe(2);
    expect(res.body.levelProgress).toEqual({ current: 150, required: 300 });
    expect(res.body).not.toHaveProperty('password');
    expect(res.body).not.toHaveProperty('googleId');

    const org = await createOrgUser();
    const orgRes = await api().get('/profiles/me').set(bearer(org.id));
    expect(orgRes.body.organization).toEqual({ userId: org.id, organizationName: `Org ${org.id}` });

    expect((await api().get('/profiles/me')).status).toBe(401);
  });

  it('GET /profiles/me/inventory: own promo codes with the reward, newest first', async () => {
    const user = await createUser();
    const other = await createUser();
    const reward = await prisma.reward.create({ data: { rewardsName: 'Кофе', partnerName: 'Coffee Point', cost: 30 } });
    await prisma.userReward.create({ data: { userId: user.id, rewardId: reward.id, promocode: 'OLD', claimedTime: new Date(2026, 0, 1) } });
    await prisma.userReward.create({ data: { userId: user.id, rewardId: reward.id, promocode: 'NEW' } });
    await prisma.userReward.create({ data: { userId: other.id, rewardId: reward.id, promocode: 'NOT-MINE' } });

    const res = await api().get('/profiles/me/inventory').set(bearer(user.id));
    expect(res.status).toBe(200);
    expect(res.body.map((i: { promocode: string }) => i.promocode)).toEqual(['NEW', 'OLD']);
    expect(res.body[0].reward).toEqual({ id: reward.id, rewardsName: 'Кофе', partnerName: 'Coffee Point', cost: 30 });
  });
});

describe('profiles: my quests', () => {
  it('GET /profiles/me/quests: own claims in any quest status, with the quest and organization; no withdrawn', async () => {
    const org = await createOrgUser();
    const me = await createUser();
    const other = await createUser();
    const open = await createQuest(org.id);
    const running = await createQuest(org.id, { status: 'in_progress' });
    const done = await createQuest(org.id, { status: 'completed' });
    const left = await createQuest(org.id);
    await prisma.questClaim.create({ data: { questId: open.id, userId: me.id } });
    await prisma.questClaim.create({ data: { questId: running.id, userId: me.id, status: 'approved' } });
    await prisma.questClaim.create({ data: { questId: done.id, userId: me.id, status: 'completed' } });
    await prisma.questClaim.create({ data: { questId: left.id, userId: me.id, status: 'withdrawn' } });
    await prisma.questClaim.create({ data: { questId: open.id, userId: other.id } });

    const res = await api().get('/profiles/me/quests').set(bearer(me.id));
    expect(res.status).toBe(200);
    const byId = new Map(res.body.map((q: { id: number; status: string; claim: { status: string } }) => [q.id, q]));
    expect([...byId.keys()].sort()).toEqual([open.id, running.id, done.id].sort());
    expect(byId.get(running.id)).toMatchObject({ status: 'in_progress', claim: { userId: me.id, status: 'approved' } });
    expect(byId.get(done.id)).toMatchObject({ status: 'completed', claim: { status: 'completed' } });
    expect(byId.get(open.id)).toMatchObject({ organization: { userId: org.id } });

    expect((await api().get('/profiles/me/quests')).status).toBe(401);
  });
});
