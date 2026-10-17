// Calls to the auth API (go-api): registration, password login and Google sign-in.
// The browser hits /auth/* on this origin; next.config.ts rewrites it to go-api (AUTH_API_URL), so no CORS.
// Errors come as { error: { code, message } }, like the Express API, and are thrown as ApiError.
import type { ErrorBody } from '@/shared/api/dto';
import { ApiError } from '@/shared/api/http';

const AUTH_URL = '/auth';

export type AuthResult = {
  token: string;
  /** true when this call created the account (registration, first Google sign-in). */
  created: boolean;
};

async function post(path: string, body: unknown): Promise<AuthResult> {
  let res: Response;
  try {
    res = await fetch(`${AUTH_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'Сервіс входу недоступний. Спробуйте пізніше');
  }
  if (!res.ok) {
    const error = ((await res.json().catch(() => null)) as ErrorBody | null)?.error;
    // 5xx without a JSON body: go-api is down or the proxy could not reach it
    throw new ApiError(res.status, error?.message ?? 'Сервіс входу недоступний. Спробуйте пізніше', error?.code);
  }
  const data = (await res.json()) as { token: string };
  return { token: data.token, created: res.status === 201 };
}

export const authApi = {
  /** POST /api/auth/login */
  login: (email: string, password: string) => post('/login', { email, password }),

  /** POST /api/auth/register — creates the account and signs in. */
  register: (input: { username: string; email: string; password: string; contact: string }) => post('/register', input),

  /** POST /api/auth/google — the ID token from the Google button; creates the account on the first sign-in. */
  google: (credential: string) => post('/google', { token: credential }),
};
