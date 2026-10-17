// Server-side session: the JWT from the auth API (go-api) lives in an httpOnly cookie, out of reach of page
// scripts. proxy.ts verifies it before rendering protected pages and forwards it to the Express API as Bearer.
// Only the server imports this file: it needs JWT_SECRET (same as express-api/.env).

export const SESSION_COOKIE = 'horizon_session';

const SECRET = process.env.JWT_SECRET ?? '';
const ISSUER = process.env.JWT_ISSUER ?? 'auth-api';
const AUDIENCE = process.env.JWT_AUDIENCE ?? 'volunteer-api';

function base64UrlToBytes(part: string): Uint8Array<ArrayBuffer> {
  const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

let keyPromise: Promise<CryptoKey> | null = null;
function hmacKey(): Promise<CryptoKey> {
  keyPromise ??= crypto.subtle.importKey('raw', new TextEncoder().encode(SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'verify',
  ]);
  return keyPromise;
}

type Claims = { sub?: string; iss?: string; aud?: string | string[]; exp?: number };

/**
 * Checks the token the same way express-api does (HS256 signature, iss, aud, exp) and returns its claims,
 * or null if it isn't a valid session. Without JWT_SECRET nothing is valid.
 */
export async function verifySession(token: string | undefined): Promise<{ userId: string; expiresAt: number } | null> {
  if (!token || SECRET.length < 32) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const header = JSON.parse(new TextDecoder().decode(base64UrlToBytes(parts[0]))) as { alg?: string };
    if (header.alg !== 'HS256') return null;
    const valid = await crypto.subtle.verify(
      'HMAC',
      await hmacKey(),
      base64UrlToBytes(parts[2]),
      new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
    );
    if (!valid) return null;

    const claims = JSON.parse(new TextDecoder().decode(base64UrlToBytes(parts[1]))) as Claims;
    const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    if (!claims.sub || claims.iss !== ISSUER || !audiences.includes(AUDIENCE)) return null;
    if (typeof claims.exp !== 'number' || claims.exp * 1000 <= Date.now()) return null;
    return { userId: claims.sub, expiresAt: claims.exp };
  } catch {
    return null;
  }
}

/** Cookie settings: httpOnly (no JS access), Lax (not sent on cross-site POSTs), Secure outside local dev. */
export function sessionCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: Math.max(0, Math.floor(maxAgeSeconds)),
  };
}
