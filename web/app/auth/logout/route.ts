import { NextResponse } from 'next/server';
import { SESSION_COOKIE, sessionCookieOptions } from '@/shared/auth/session';

/** POST /auth/logout — drops the session cookie (the JWT itself stays valid until it expires). */
export function POST() {
  const response = new NextResponse(null, { status: 204 });
  response.cookies.set(SESSION_COOKIE, '', sessionCookieOptions(0));
  return response;
}
