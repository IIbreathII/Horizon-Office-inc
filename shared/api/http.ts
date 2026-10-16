// Minimal fetch wrapper for the backend REST API.
//
// NEXT_PUBLIC_API_URL is the API base: an absolute URL (needs CORS on the backend) or a same-origin
// path like `/api`, which next.config.ts rewrites to the backend (no CORS needed).
import type { ErrorBody } from './dto';

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/$/, '');
// Local development only: the backend accepts its DEV_BYPASS_TOKEN as `Authorization: Bearer …`.
// Real auth (JWT from the auth API) will replace this.
const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN;

export class ApiError extends Error {
  readonly status: number;
  readonly code: string | undefined;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | undefined>;
};

export async function http<T>(path: string, { method = 'GET', body, query }: RequestOptions = {}): Promise<T> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) if (value !== undefined) params.set(key, String(value));
  const qs = params.toString();
  const search = qs ? `?${qs}` : '';

  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;

  const res = await fetch(`${API_URL}${path}${search}`, {
    method,
    credentials: 'include', // auth cookie, if the auth API sets one
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const error = ((await res.json().catch(() => null)) as ErrorBody | null)?.error;
    throw new ApiError(res.status, error?.message ?? `${method} ${path} → ${res.status}`, error?.code);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}
