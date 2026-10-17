// Who is talking to the assistant: the same session as the pages (proxy.ts) — the httpOnly cookie with
// the auth-API JWT, checked by verifySession. Only signed-in users spend the Gemini quota, and the rate
// limit counts per user (an IP header can be spoofed, a signed token cannot).
import { SESSION_COOKIE, verifySession } from '@/shared/auth/session';

export type AuthResult =
  | { ok: true; userId: string; /** the session JWT, to call the Express API on the user's behalf */ token?: string }
  | { ok: false; status: 401; reason: string };

type Options = {
  /** As in proxy.ts: without a backend (mock) or with the dev bypass token nobody signs in. */
  noSignIn?: boolean;
  production?: boolean;
  verify?: typeof verifySession;
};

const NO_SIGN_IN = !process.env.NEXT_PUBLIC_API_URL || Boolean(process.env.NEXT_PUBLIC_API_TOKEN);

function readCookie(request: Request, name: string): string | undefined {
  for (const part of (request.headers.get('cookie') ?? '').split(';')) {
    const [key, ...value] = part.trim().split('=');
    if (key === name) return decodeURIComponent(value.join('='));
  }
  return undefined;
}

export async function authenticate(
  request: Request,
  { noSignIn = NO_SIGN_IN, production = process.env.NODE_ENV === 'production', verify = verifySession }: Options = {},
): Promise<AuthResult> {
  const token = readCookie(request, SESSION_COOKIE);
  const session = await verify(token);
  if (session) return { ok: true, userId: session.userId, token };
  // local development without sign-in: one shared user. Never in production — the dev token is public
  if (noSignIn && !production) return { ok: true, userId: 'local' };
  return { ok: false, status: 401, reason: token ? 'invalid session' : 'no session' };
}
