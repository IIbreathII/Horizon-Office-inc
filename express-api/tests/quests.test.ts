import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/db/prisma.js';
import { api, bearer, createOrgUser, createQuest, createUser, resetDb } from './helpers.js';

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

const validQuest = {
  questName: 'Уборка парка',
  description: 'Берём перчатки',
  category: 'ecology',
  address: 'Днепр, парк Глобы',
  lat: 48.46,
  lng: 35.04,
  maxVolunteers: 3,
  rewardXp: 100,
  rewardCoins: 50,
};

describe('quests', () => {
  it('create by org -> 201; by regular user -> 403; validation', async () => {
    const org = await createOrgUser();
    const res = await api().post('/quests').set(bearer(org.id)).send(validQuest);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ organizationId: org.id, status: 'open', assignedVolunteers: 0 });

    const user = await createUser();
    expect((await api().post('/quests').set(bearer(user.id)).send(validQuest)).status).toBe(403);

    expect((await api().post('/quests').set(bearer(org.id)).send({ ...validQuest, assignedVolunteers: 2 })).status).toBe(400);
    expect((await api().post('/quests').set(bearer(org.id)).send({ ...validQuest, lng: undefined })).status).toBe(400);
    expect((await api().post('/quests').set(bearer(org.id)).send({ ...validQuest, maxVolunteers: 0 })).status).toBe(400);
  });

  it('get by id includes organization', async () => {
    const org = await createOrgUser();
    const q = await createQuest(org.id);
    const res = await api().get(`/quests/${q.id}`);
    expect(res.status).toBe(200);
    expect(res.body.organization.userId).toBe(org.id);
    expect((await api().get('/quests/99999')).status).toBe(404);
  });

  it('only owner can edit; maxVolunteers not below assigned; closed quests not editable', async () => {
    const org = await createOrgUser();
    const other = await createOrgUser();
    const q = await createQuest(org.id, { maxVolunteers: 5 });
    await prisma.quest.update({ where: { id: q.id }, data: { assignedVolunteers: 3 } });

    expect((await api().patch(`/quests/${q.id}`).set(bearer(other.id)).send({ questName: 'X' })).status).toBe(403);

    const ok = await api().patch(`/quests/${q.id}`).set(bearer(org.id)).send({ questName: 'New name', maxVolunteers: 3 });
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({ questName: 'New name', maxVolunteers: 3 });

    expect((await api().patch(`/quests/${q.id}`).set(bearer(org.id)).send({ maxVolunteers: 2 })).status).toBe(409);
    expect((await api().patch(`/quests/${q.id}`).set(bearer(org.id)).send({ status: 'completed' })).status).toBe(400);

    const done = await createQuest(org.id, { status: 'completed' });
    expect((await api().patch(`/quests/${done.id}`).set(bearer(org.id)).send({ questName: 'X' })).status).toBe(409);
  });

  it('status transitions', async () => {
    const org = await createOrgUser();
    const q = await createQuest(org.id);
    const go = (status: string) => api().patch(`/quests/${q.id}/status`).set(bearer(org.id)).send({ status });

    expect((await go('completed')).status).toBe(409); // open -> completed нельзя
    expect((await go('in_progress')).body.status).toBe('in_progress');
    expect((await go('completed')).body.status).toBe('completed');
    expect((await go('cancelled')).status).toBe(409);
    expect((await go('archived')).status).toBe(400);
  });

  it('cancel rejects pending and approved claims', async () => {
    const org = await createOrgUser();
    const [a, b] = [await createUser(), await createUser()];
    const q = await createQuest(org.id);
    await prisma.questClaim.createMany({ data: [{ questId: q.id, userId: a.id }, { questId: q.id, userId: b.id, status: 'approved' }] });

    await api().patch(`/quests/${q.id}/status`).set(bearer(org.id)).send({ status: 'cancelled' });
    const statuses = (await prisma.questClaim.findMany({ where: { questId: q.id } })).map((c) => c.status);
    expect(statuses).toEqual(['rejected', 'rejected']);
  });

  it('delete: without claims -> deleted, with claims -> archived', async () => {
    const org = await createOrgUser();
    const empty = await createQuest(org.id);
    const withClaims = await createQuest(org.id);
    const vol = await createUser();
    await prisma.questClaim.create({ data: { questId: withClaims.id, userId: vol.id } });

    expect((await api().delete(`/quests/${empty.id}`).set(bearer(org.id))).body).toEqual({ id: empty.id, result: 'deleted' });
    expect(await prisma.quest.findUnique({ where: { id: empty.id } })).toBeNull();

    expect((await api().delete(`/quests/${withClaims.id}`).set(bearer(org.id))).body.result).toBe('archived');
    expect((await prisma.quest.findUniqueOrThrow({ where: { id: withClaims.id } })).status).toBe('archived');
  });

  it('feed: cursor pagination walks all quests without duplicates', async () => {
    const org = await createOrgUser();
    for (let i = 0; i < 45; i++) await createQuest(org.id);
    await createQuest(org.id, { status: 'completed' }); // не попадёт в ленту open

    const seen: number[] = [];
    let cursor: string | null = null;
    let pages = 0;
    do {
      const res = await api().get(`/quests?limit=20${cursor ? `&cursor=${cursor}` : ''}`);
      expect(res.status).toBe(200);
      seen.push(...res.body.data.map((q: { id: number }) => q.id));
      cursor = res.body.meta.nextCursor;
      pages++;
    } while (cursor);

    expect(pages).toBe(3);
    expect(seen).toHaveLength(45);
    expect(new Set(seen).size).toBe(45);
    expect([...seen].sort((a, b) => b - a)).toEqual(seen);
    expect((await api().get('/quests?cursor=garbage')).status).toBe(400);
  });

  it('feed: category, status and geo filters', async () => {
    const org = await createOrgUser();
    await createQuest(org.id, { category: 'ecology', lat: 48.46, lng: 35.04 }); // Днепр
    await createQuest(org.id, { category: 'animals', lat: 48.47, lng: 35.05 }); // Днепр
    await createQuest(org.id, { category: 'ecology', lat: 50.45, lng: 30.52 }); // Киев
    await createQuest(org.id, { category: 'ecology', status: 'in_progress' });

    expect((await api().get('/quests?category=ecology')).body.data).toHaveLength(2);
    expect((await api().get('/quests?status=in_progress')).body.data).toHaveLength(1);
    expect((await api().get('/quests?lat=48.46&lng=35.04&radius=10')).body.data).toHaveLength(2);
    expect((await api().get('/quests?lat=48.46&lng=35.04')).status).toBe(400);
  });

  it('GET /organizations/:id/quests with page pagination and status filter', async () => {
    const org = await createOrgUser();
    for (let i = 0; i < 3; i++) await createQuest(org.id);
    await createQuest(org.id, { status: 'completed' });

    const res = await api().get(`/organizations/${org.id}/quests?limit=2`);
    expect(res.body.meta).toEqual({ page: 1, limit: 2, total: 4, totalPages: 2 });
    expect((await api().get(`/organizations/${org.id}/quests?status=completed`)).body.meta.total).toBe(1);
    expect((await api().get('/organizations/99999/quests')).status).toBe(404);
  });
});
