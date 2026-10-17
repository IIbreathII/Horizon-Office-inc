// Sign-in calls from the browser. They go to this app's own route handlers (app/auth/*/route.ts), which call
// go-api on the server and keep the JWT in an httpOnly cookie: the response carries no token, only { created }.
// Errors come as { error: { code, message } }, like the Express API, and are thrown as ApiError.
import type { ErrorBody } from '@/shared/api/dto';
import { ApiError } from '@/shared/api/http';

const AUTH_URL = '/auth';

export type AuthResult = {
  /** true when this call created the account (registration, first Google sign-in). */
  created: boolean;
};

async function post(path: string, body?: unknown): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(`${AUTH_URL}${path}`, {
      method: 'POST',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'Сервіс входу недоступний. Спробуйте пізніше');
  }
  if (!res.ok) {
    const error = ((await res.json().catch(() => null)) as ErrorBody | null)?.error;
    throw new ApiError(res.status, error?.message ?? 'Сервіс входу недоступний. Спробуйте пізніше', error?.code);
  }
  return res;
}

const signInCall = async (path: string, body: unknown): Promise<AuthResult> =>
  (await (await post(path, body)).json()) as AuthResult;

export const authApi = {
  /** POST /auth/login → go-api /api/auth/login */
  login: (email: string, password: string) => signInCall('/login', { email, password }),

  /** POST /auth/register — creates the account and signs in. */
  register: (input: { username: string; email: string; password: string; contact: string }) => signInCall('/register', input),

  /** POST /auth/google — the ID token from the Google button; creates the account on the first sign-in. */
  google: (credential: string) => signInCall('/google', { token: credential }),

  /** POST /auth/logout — drops the session cookie. */
  logout: async () => {
    await post('/logout');
  },
};
