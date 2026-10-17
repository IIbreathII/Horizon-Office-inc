import jwt from 'jsonwebtoken';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/db/prisma.js';
import { api, createUser, resetDb, tokenFor } from './helpers.js';

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

// Любой защищённый эндпоинт подходит: POST /organizations требует только auth.
const call = (headers: Record<string, string>) => api().post('/organizations').set(headers).send({ organizationName: 'X' });

describe('auth', () => {
  it('no token -> 401', async () => {
    const res = await call({});
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('wrong signature -> 401', async () => {
    const u = await createUser();
    const res = await call({ Authorization: `Bearer ${tokenFor(u.id, { secret: 'x'.repeat(40) })}` });
    expect(res.status).toBe(401);
  });

  it('alg none -> 401', async () => {
    const u = await createUser();
    const token = jwt.sign({ sub: String(u.id), iss: 'auth-api', aud: 'volunteer-api' }, '', { algorithm: 'none' });
    expect((await call({ Authorization: `Bearer ${token}` })).status).toBe(401);
  });

  it('foreign audience / issuer -> 401', async () => {
    const u = await createUser();
    expect((await call({ Authorization: `Bearer ${tokenFor(u.id, { audience: 'other-api' })}` })).status).toBe(401);
    expect((await call({ Authorization: `Bearer ${tokenFor(u.id, { issuer: 'evil' })}` })).status).toBe(401);
  });

  it('expired -> 401 Token expired', async () => {
    const u = await createUser();
    const res = await call({ Authorization: `Bearer ${tokenFor(u.id, { expiresIn: -10 })}` });
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Token expired');
  });

  it('user missing in DB -> 401, banned -> 403', async () => {
    expect((await call({ Authorization: `Bearer ${tokenFor(9999)}` })).status).toBe(401);
    const banned = await createUser({ status: 'banned' });
    expect((await call({ Authorization: `Bearer ${tokenFor(banned.id)}` })).status).toBe(403);
  });

  it('valid token passes', async () => {
    const u = await createUser();
    const res = await call({ Authorization: `Bearer ${tokenFor(u.id)}` });
    expect(res.status).toBe(201);
  });
});

describe('common', () => {
  it('health', async () => {
    expect((await api().get('/health')).body).toEqual({ ok: true });
  });

  it('unknown route -> 404 json', async () => {
    const res = await api().get('/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('malformed JSON -> 400', async () => {
    const u = await createUser();
    const res = await api()
      .post('/organizations')
      .set({ Authorization: `Bearer ${tokenFor(u.id)}`, 'Content-Type': 'application/json' })
      .send('{bad json');
    expect(res.status).toBe(400);
  });
});
