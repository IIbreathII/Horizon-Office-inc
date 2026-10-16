import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/db/prisma.js';
import { calcLevel } from '../src/modules/claims/level.js';
import { api, bearer, createOrgUser, createQuest, createUser, resetDb } from './helpers.js';

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

const apply = (questId: number, userId: number) => api().post(`/quests/${questId}/claims`).set(bearer(userId));
const decide = (questId: number, claimId: number, orgId: number, status: string) =>
  api().patch(`/quests/${questId}/claims/${claimId}`).set(bearer(orgId)).send({ status });
const complete = (questId: number, claimId: number, orgId: number) =>
  api().post(`/quests/${questId}/claims/${claimId}/complete`).set(bearer(orgId));

describe('claims: volunteer side', () => {
  it('apply -> 201, repeat -> 409, own quest -> 403, closed quest -> 409', async () => {
    const org = await createOrgUser();
    const vol = await createUser();
    const q = await createQuest(org.id);

    const res = await apply(q.id, vol.id);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ questId: q.id, userId: vol.id, status: 'pending' });

    expect((await apply(q.id, vol.id)).status).toBe(409);
    expect((await apply(q.id, org.id)).status).toBe(403);

    const closed = await createQuest(org.id, { status: 'in_progress' });
    expect((await apply(closed.id, vol.id)).status).toBe(409);
    expect((await apply(99999, vol.id)).status).toBe(404);
  });

  it('parallel duplicate applications -> exactly one created', async () => {
    const org = await createOrgUser();
    const vol = await createUser();
    const q = await createQuest(org.id);
    const results = await Promise.all(Array.from({ length: 5 }, () => apply(q.id, vol.id)));
    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    expect(results.filter((r) => r.status === 409)).toHaveLength(4);
  });

  it('withdraw pending, re-apply after withdraw, withdraw approved frees slot', async () => {
    const org = await createOrgUser();
    const vol = await createUser();
    const q = await createQuest(org.id, { maxVolunteers: 1 });

    const claim = (await apply(q.id, vol.id)).body;
    expect((await api().delete(`/quests/${q.id}/claims/me`).set(bearer(vol.id))).status).toBe(204);
    expect((await prisma.questClaim.findUniqueOrThrow({ where: { id: claim.id } })).status).toBe('withdrawn');

    const again = await apply(q.id, vol.id);
    expect(again.status).toBe(201);
    expect(again.body).toMatchObject({ id: claim.id, status: 'pending' });

    await decide(q.id, claim.id, org.id, 'approved');
    expect((await prisma.quest.findUniqueOrThrow({ where: { id: q.id } })).assignedVolunteers).toBe(1);

    await api().delete(`/quests/${q.id}/claims/me`).set(bearer(vol.id));
    expect((await prisma.quest.findUniqueOrThrow({ where: { id: q.id } })).assignedVolunteers).toBe(0);

    expect((await api().delete(`/quests/${q.id}/claims/me`).set(bearer(vol.id))).status).toBe(409);
    const stranger = await createUser();
    expect((await api().delete(`/quests/${q.id}/claims/me`).set(bearer(stranger.id))).status).toBe(404);
  });
});

describe('claims: organization side', () => {
  it('list only for owner, with user info and status filter', async () => {
    const org = await createOrgUser();
    const other = await createOrgUser();
    const q = await createQuest(org.id);
    for (let i = 0; i < 3; i++) await apply(q.id, (await createUser()).id);

    const res = await api().get(`/quests/${q.id}/claims?limit=2`).set(bearer(org.id));
    expect(res.status).toBe(200);
    expect(res.body.meta).toEqual({ page: 1, limit: 2, total: 3, totalPages: 2 });
    expect(res.body.data[0].user).toHaveProperty('curLevel');
    expect(res.body.data[0].user).not.toHaveProperty('email');

    expect((await api().get(`/quests/${q.id}/claims?status=approved`).set(bearer(org.id))).body.meta.total).toBe(0);
    expect((await api().get(`/quests/${q.id}/claims`).set(bearer(other.id))).status).toBe(403);
    const vol = await createUser();
    expect((await api().get(`/quests/${q.id}/claims`).set(bearer(vol.id))).status).toBe(403);
  });

  it('approve / reject flow and slot accounting', async () => {
    const org = await createOrgUser();
    const q = await createQuest(org.id, { maxVolunteers: 1 });
    const c1 = (await apply(q.id, (await createUser()).id)).body;
    const c2 = (await apply(q.id, (await createUser()).id)).body;

    expect((await decide(q.id, c1.id, org.id, 'approved')).body.status).toBe('approved');
    expect((await decide(q.id, c2.id, org.id, 'approved')).status).toBe(409); // мест нет
    expect((await prisma.questClaim.findUniqueOrThrow({ where: { id: c2.id } })).status).toBe('pending'); // откат

    expect((await decide(q.id, c1.id, org.id, 'rejected')).body.status).toBe('rejected');
    expect((await prisma.quest.findUniqueOrThrow({ where: { id: q.id } })).assignedVolunteers).toBe(0);
    expect((await decide(q.id, c2.id, org.id, 'approved')).status).toBe(200);

    expect((await decide(q.id, c1.id, org.id, 'approved')).status).toBe(409); // rejected -> approved нельзя
    expect((await decide(q.id, c1.id, org.id, 'completed')).status).toBe(400);
    expect((await decide(q.id, 99999, org.id, 'approved')).status).toBe(404);
  });

  it('claim from another quest -> 404', async () => {
    const org = await createOrgUser();
    const q1 = await createQuest(org.id);
    const q2 = await createQuest(org.id);
    const c = (await apply(q1.id, (await createUser()).id)).body;
    expect((await decide(q2.id, c.id, org.id, 'approved')).status).toBe(404);
  });

  it('10 parallel approves with 3 slots -> exactly 3 succeed', async () => {
    const org = await createOrgUser();
    const q = await createQuest(org.id, { maxVolunteers: 3 });
    const claims = [];
    for (let i = 0; i < 10; i++) claims.push((await apply(q.id, (await createUser()).id)).body);

    const results = await Promise.all(claims.map((c) => decide(q.id, c.id, org.id, 'approved')));
    expect(results.filter((r) => r.status === 200)).toHaveLength(3);
    expect(results.filter((r) => r.status === 409)).toHaveLength(7);

    const quest = await prisma.quest.findUniqueOrThrow({ where: { id: q.id } });
    expect(quest.assignedVolunteers).toBe(3);
    expect(await prisma.questClaim.count({ where: { questId: q.id, status: 'approved' } })).toBe(3);
  });

  it('complete: rewards user once, updates level; parallel complete pays once', async () => {
    const org = await createOrgUser();
    const vol = await createUser({ xp: 50, balance: 10 });
    const q = await createQuest(org.id, { rewardXp: 100, rewardCoins: 50 });
    const c = (await apply(q.id, vol.id)).body;

    expect((await complete(q.id, c.id, org.id)).status).toBe(409); // ещё pending
    await decide(q.id, c.id, org.id, 'approved');

    const results = await Promise.all(Array.from({ length: 5 }, () => complete(q.id, c.id, org.id)));
    const ok = results.filter((r) => r.status === 200);
    expect(ok).toHaveLength(1);
    expect(ok[0].body).toMatchObject({
      claim: { status: 'completed' },
      reward: { xp: 100, coins: 50 },
      user: { id: vol.id, xp: 150, balance: 60, curLevel: calcLevel(150) },
    });

    const user = await prisma.user.findUniqueOrThrow({ where: { id: vol.id } });
    expect(user).toMatchObject({ xp: 150, balance: 60, curLevel: 2 });
  });

  it('complete allowed after quest completed, not after cancelled', async () => {
    const org = await createOrgUser();
    const q = await createQuest(org.id);
    const c = (await apply(q.id, (await createUser()).id)).body;
    await decide(q.id, c.id, org.id, 'approved');
    await api().patch(`/quests/${q.id}/status`).set(bearer(org.id)).send({ status: 'in_progress' });
    await api().patch(`/quests/${q.id}/status`).set(bearer(org.id)).send({ status: 'completed' });
    expect((await complete(q.id, c.id, org.id)).status).toBe(200);

    const q2 = await createQuest(org.id);
    const c2 = (await apply(q2.id, (await createUser()).id)).body;
    await decide(q2.id, c2.id, org.id, 'approved');
    await api().patch(`/quests/${q2.id}/status`).set(bearer(org.id)).send({ status: 'cancelled' });
    expect((await complete(q2.id, c2.id, org.id)).status).toBe(409);
  });
});

describe('level formula', () => {
  it('calcLevel', () => {
    expect([0, 99, 100, 399, 400, 900].map(calcLevel)).toEqual([1, 1, 2, 2, 3, 4]);
  });
});
