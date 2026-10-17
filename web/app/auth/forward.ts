import { NextResponse } from 'next/server';
import { SESSION_COOKIE, sessionCookieOptions, verifySession } from '@/shared/auth/session';

const AUTH_API_URL = (process.env.AUTH_API_URL ?? 'http://localhost:8080').replace(/\/$/, '');

/**
 * Sends the request body to go-api (/api/auth/<action>) from the server. On success the JWT goes into the
 * httpOnly session cookie — the browser never sees it — and the client gets only { created }.
 * go-api errors ({ error: { code, message } }) are passed through with their status.
 */
export async function forwardToAuthApi(action: 'login' | 'register' | 'google', request: Request) {
  let res: Response;
  try {
    res = await fetch(`${AUTH_API_URL}/api/auth/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: await request.text(),
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json(
      { error: { code: 'UNAVAILABLE', message: 'Сервіс входу недоступний. Спробуйте пізніше' } },
      { status: 503 },
    );
  }

  const body = (await res.json().catch(() => null)) as { token?: string; error?: unknown } | null;
  if (!res.ok || !body?.token) {
    return NextResponse.json(body?.error ? { error: body.error } : { error: { code: 'AUTH_FAILED', message: 'Не вдалося увійти' } }, {
      status: res.ok ? 502 : res.status,
    });
  }

  // a token this app can't verify (JWT_* differ from go-api / express-api) would sign the user out at once
  const session = await verifySession(body.token);
  if (!session) {
    return NextResponse.json(
      { error: { code: 'MISCONFIGURED', message: 'Токен не пройшов перевірку: JWT_* у web/.env мають збігатися з go-api' } },
      { status: 500 },
    );
  }

  const response = NextResponse.json({ created: res.status === 201 }, { status: res.status });
  response.cookies.set(SESSION_COOKIE, body.token, sessionCookieOptions(session.expiresAt - Date.now() / 1000));
  return response;
}
