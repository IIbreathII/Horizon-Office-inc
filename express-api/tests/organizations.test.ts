import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/db/prisma.js';
import { api, bearer, createOrgUser, createQuest, createUser, resetDb } from './helpers.js';

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

const validOrg = {
  organizationName: 'Фонд Добро',
  types: 'ecology',
  edrpou: '12345678',
  contact: ['+380000000000'],
  description: 'desc',
  logo: 'https://example.com/logo.png',
};

describe('organizations', () => {
  it('create -> 201, repeat -> 409', async () => {
    const u = await createUser();
    const res = await api().post('/organizations').set(bearer(u.id)).send(validOrg);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ userId: u.id, organizationName: 'Фонд Добро', trustScore: 0 });
    expect(res.body).not.toHaveProperty('deletedAt');

    expect((await api().post('/organizations').set(bearer(u.id)).send(validOrg)).status).toBe(409);
  });

  it('validation: bad edrpou, extra fields like trustScore -> 400', async () => {
    const u = await createUser();
    expect((await api().post('/organizations').set(bearer(u.id)).send({ ...validOrg, edrpou: '12' })).status).toBe(400);
    const res = await api().post('/organizations').set(bearer(u.id)).send({ ...validOrg, trustScore: 5 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('duplicate edrpou across orgs -> 409', async () => {
    const a = await createUser();
    const b = await createUser();
    await api().post('/organizations').set(bearer(a.id)).send(validOrg);
    expect((await api().post('/organizations').set(bearer(b.id)).send(validOrg)).status).toBe(409);
  });

  it('get by id, get me, patch me', async () => {
    const u = await createOrgUser();
    expect((await api().get(`/organizations/${u.id}`)).status).toBe(200);
    expect((await api().get('/organizations/me').set(bearer(u.id))).body.userId).toBe(u.id);

    const patched = await api().patch('/organizations/me').set(bearer(u.id)).send({ description: 'new' });
    expect(patched.status).toBe(200);
    expect(patched.body.description).toBe('new');

    expect((await api().patch('/organizations/me').set(bearer(u.id)).send({ trustScore: 10 })).status).toBe(400);
    expect((await api().patch('/organizations/me').set(bearer(u.id)).send({})).status).toBe(400);
  });

  it('/me without org profile -> 403; unknown id -> 404; bad id -> 400', async () => {
    const u = await createUser();
    expect((await api().get('/organizations/me').set(bearer(u.id))).status).toBe(403);
    expect((await api().get('/organizations/99999')).status).toBe(404);
    expect((await api().get('/organizations/abc')).status).toBe(400);
  });

  it('list with pagination, type and search filters', async () => {
    for (let i = 0; i < 5; i++) {
      const u = await createUser();
      await prisma.organization.create({
        data: { userId: u.id, organizationName: i % 2 ? `Animal help ${i}` : `Green ${i}`, types: i % 2 ? 'animals' : 'ecology', contact: [] },
      });
    }
    const page = await api().get('/organizations?page=2&limit=2');
    expect(page.body.meta).toEqual({ page: 2, limit: 2, total: 5, totalPages: 3 });
    expect(page.body.data).toHaveLength(2);

    expect((await api().get('/organizations?type=animals')).body.meta.total).toBe(2);
    expect((await api().get('/organizations?search=green')).body.meta.total).toBe(3);
    expect((await api().get('/organizations?limit=500')).body.meta.limit).toBe(100);
    expect((await api().get('/organizations?page=0')).status).toBe(400);
  });

  it('delete: soft delete, quests archived, claims rejected, can re-create', async () => {
    const org = await createOrgUser();
    const vol = await createUser();
    const open = await createQuest(org.id);
    const done = await createQuest(org.id, { status: 'completed' });
    await prisma.questClaim.create({ data: { questId: open.id, userId: vol.id } });

    expect((await api().delete('/organizations/me').set(bearer(org.id))).status).toBe(204);

    expect((await api().get(`/organizations/${org.id}`)).status).toBe(404);
    expect((await prisma.quest.findUniqueOrThrow({ where: { id: open.id } })).status).toBe('archived');
    expect((await prisma.quest.findUniqueOrThrow({ where: { id: done.id } })).status).toBe('completed');
    expect((await prisma.questClaim.findFirstOrThrow({ where: { questId: open.id } })).status).toBe('rejected');
    expect((await api().get('/organizations')).body.meta.total).toBe(0);

    const again = await api().post('/organizations').set(bearer(org.id)).send(validOrg);
    expect(again.status).toBe(201);
    expect((await api().get(`/organizations/${org.id}`)).status).toBe(200);
  });
});
