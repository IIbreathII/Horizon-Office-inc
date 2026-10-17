import { describe, expect, it } from 'vitest';
import { authenticate } from './auth';

// verifySession itself is tested with the auth flow; here only what the chat does with its answer
const verify = async (token: string | undefined) => (token === 'good' ? { userId: '42', expiresAt: 0 } : null);
const request = (cookie?: string) => new Request('http://localhost/ai/chat', { headers: cookie ? { cookie } : {} });

describe('authenticate', () => {
  it('takes the user from a valid session cookie', async () => {
    const result = await authenticate(request('theme=dark; horizon_session=good'), { verify, noSignIn: false });
    expect(result).toEqual({ ok: true, userId: '42', token: 'good' });
  });

  it('rejects a missing or invalid session', async () => {
    expect(await authenticate(request(), { verify, noSignIn: false })).toMatchObject({ ok: false, status: 401 });
    expect(await authenticate(request('horizon_session=forged'), { verify, noSignIn: false })).toMatchObject({ ok: false, status: 401 });
  });

  it('lets local development without sign-in through as one shared user', async () => {
    expect(await authenticate(request(), { verify, noSignIn: true, production: false })).toEqual({ ok: true, userId: 'local' });
  });

  it('never skips sign-in in production', async () => {
    expect(await authenticate(request(), { verify, noSignIn: true, production: true })).toMatchObject({ ok: false, status: 401 });
  });
});
