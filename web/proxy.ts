import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySession } from '@/shared/auth/session';

// Runs on the server before a matched route renders (Next 16 «proxy», formerly middleware):
// - protected pages without a valid session → /login?next=<page>
// - /login with a valid session → into the app
// - /api/* → the session JWT is attached as `Authorization: Bearer` for the Express API (the cookie is httpOnly,
//   page scripts can't read it)
// Without a backend (mock) or with the dev bypass token in .env nobody needs to sign in.

const NO_SIGN_IN = !process.env.NEXT_PUBLIC_API_URL || Boolean(process.env.NEXT_PUBLIC_API_TOKEN);

const PUBLIC_PAGES = ['/login'];

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);

  if (pathname.startsWith('/api/')) {
    // an explicit Authorization (dev bypass token) wins
    if (!session || request.headers.has('authorization')) return NextResponse.next();
    const headers = new Headers(request.headers);
    headers.set('authorization', `Bearer ${request.cookies.get(SESSION_COOKIE)!.value}`);
    return NextResponse.next({ request: { headers } });
  }

  if (PUBLIC_PAGES.includes(pathname)) {
    if (!session) return NextResponse.next();
    // already signed in: back to where they were going, or the start page (it picks /org or /map)
    const next = request.nextUrl.searchParams.get('next');
    const target = next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
    return NextResponse.redirect(new URL(target, request.url));
  }

  if (session || NO_SIGN_IN) return NextResponse.next();

  const login = new URL('/login', request.url);
  if (pathname !== '/') login.searchParams.set('next', pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  // pages that need a session, the start page, /login and the API; /register (account step) stays public
  matcher: [
    '/',
    '/login',
    '/map/:path*',
    '/quests/:path*',
    '/rewards/:path*',
    '/profile/:path*',
    '/org/:path*',
    '/register/role',
    '/register/organization',
    '/api/:path*',
  ],
};
