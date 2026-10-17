import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/db/prisma.js';
import { makePromocode } from '../src/modules/rewards/promocode.js';
import { QUESTS_PER_SPIN } from '../src/modules/rewards/rewards.service.js';
import { api, bearer, createOrgUser, createQuest, createUser, resetDb } from './helpers.js';

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

function createReward(data: Partial<{ rewardsName: string; partnerName: string; cost: number; promocodeTemp: string | null }> = {}) {
  return prisma.reward.create({ data: { rewardsName: 'Кофе', partnerName: 'Coffee Point', cost: 30, ...data } });
}

/** Пользователь с n выполненными квестами (за них даются прокрутки рулетки). */
async function userWithCompletedQuests(n: number) {
  const org = await createOrgUser();
  const user = await createUser();
  for (let i = 0; i < n; i++) {
    const q = await createQuest(org.id);
    await prisma.questClaim.create({ data: { questId: q.id, userId: user.id, status: 'completed' } });
  }
  return user;
}

describe('promocode', () => {
  it('fills {code}, uses a plain template as prefix, falls back to HZ', () => {
    expect(makePromocode('COFFEE-{code}')).toMatch(/^COFFEE-[A-Z2-9]{6}$/);
    expect(makePromocode('BOOKS')).toMatch(/^BOOKS-[A-Z2-9]{6}$/);
    expect(makePromocode(null)).toMatch(/^HZ-[A-Z2-9]{6}$/);
  });
});

describe('rewards: shop', () => {
  it('GET /rewards is public, sorted by cost, hides the promo template', async () => {
    await createReward({ rewardsName: 'Книги', cost: 80, promocodeTemp: 'BOOK-{code}' });
    await createReward({ rewardsName: 'Кофе', cost: 30 });

    const res = await api().get('/rewards');
    expect(res.status).toBe(200);
    expect(res.body.map((r: { rewardsName: string }) => r.rewardsName)).toEqual(['Кофе', 'Книги']);
    expect(res.body[0]).not.toHaveProperty('promocodeTemp');
  });

  it('buy: deducts coins and issues a promo code; not enough coins -> 402; unknown -> 404', async () => {
    const user = await createUser({ balance: 50 });
    const reward = await createReward({ cost: 30, promocodeTemp: 'COFFEE-{code}' });

    const res = await api().post(`/rewards/${reward.id}/buy`).set(bearer(user.id));
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ userId: user.id, rewardId: reward.id, reward: { id: reward.id, cost: 30 } });
    expect(res.body.promocode).toMatch(/^COFFEE-/);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).balance).toBe(20);

    expect((await api().post(`/rewards/${reward.id}/buy`).set(bearer(user.id))).status).toBe(402);
    expect((await api().post('/rewards/99999/buy').set(bearer(user.id))).status).toBe(404);
    expect((await api().post(`/rewards/${reward.id}/buy`)).status).toBe(401);
  });

  it('parallel purchases never take the balance below zero', async () => {
    const user = await createUser({ balance: 60 });
    const reward = await createReward({ cost: 30 });
    const results = await Promise.all(
      Array.from({ length: 5 }, () => api().post(`/rewards/${reward.id}/buy`).set(bearer(user.id))),
    );
    expect(results.filter((r) => r.status === 201)).toHaveLength(2);
    expect(results.filter((r) => r.status === 402)).toHaveLength(3);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).balance).toBe(0);
  });
});

describe('rewards: lucky slot', () => {
  it('GET /rewards/slot counts completed quests and used spins', async () => {
    const user = await userWithCompletedQuests(3);
    const res = await api().get('/rewards/slot').set(bearer(user.id));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ completedQuests: 3, questsPerSpin: QUESTS_PER_SPIN, spinsUsed: 0 });
  });

  it('spin: one per QUESTS_PER_SPIN completed quests, then 409', async () => {
    await createReward({ promocodeTemp: 'COFFEE-{code}' });
    const user = await userWithCompletedQuests(QUESTS_PER_SPIN);

    const res = await api().post('/rewards/slot/spin').set(bearer(user.id));
    expect(res.status).toBe(201);
    expect(res.body.reward).toMatchObject({ rewardsName: 'Кофе' });
    expect(res.body.userReward).toMatchObject({ userId: user.id, rewardId: res.body.reward.id });
    expect(res.body.userReward.promocode).toMatch(/^COFFEE-/);

    expect((await api().post('/rewards/slot/spin').set(bearer(user.id))).status).toBe(409);
    expect((await api().get('/rewards/slot').set(bearer(user.id))).body.spinsUsed).toBe(1);
  });

  it('spin without earned spins -> 409; without rewards -> 409; coins are not touched', async () => {
    const user = await userWithCompletedQuests(QUESTS_PER_SPIN - 1);
    expect((await api().post('/rewards/slot/spin').set(bearer(user.id))).status).toBe(409);

    const lucky = await userWithCompletedQuests(QUESTS_PER_SPIN);
    expect((await api().post('/rewards/slot/spin').set(bearer(lucky.id))).status).toBe(409); // магазин пуст
    expect((await prisma.user.findUniqueOrThrow({ where: { id: lucky.id } })).slotSpinsUsed).toBe(0);
  });

  it('parallel spins never use more than earned', async () => {
    await createReward();
    const user = await userWithCompletedQuests(QUESTS_PER_SPIN);
    const results = await Promise.all(Array.from({ length: 4 }, () => api().post('/rewards/slot/spin').set(bearer(user.id))));
    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    expect(await prisma.userReward.count({ where: { userId: user.id } })).toBe(1);
  });
});
