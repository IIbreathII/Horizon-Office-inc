'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef } from 'react';
import { useAuth } from './AuthProvider';

/** `next` from the URL, only if it is a path on this site (never an external URL). */
export function safeNext(next: string | null): string | null {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : null;
}

/**
 * Pages for signed-in users: anyone else goes to /login and comes back here afterwards.
 * The session lives in the browser only, so the server (and hydration) render the page as usual: the shell
 * stays prerenderable for instant navigation. Once the token is known, a signed-out visitor is redirected.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { ready, isAuthenticated } = useAuth();
  const router = useRouter();

  // the path is read when redirecting, not with usePathname(): in a layout that hook blocks prerendering
  // of dynamic routes like /org/quests/[id] unless wrapped in Suspense
  useEffect(() => {
    if (ready && !isAuthenticated) router.replace(`/login?next=${encodeURIComponent(window.location.pathname)}`);
  }, [ready, isAuthenticated, router]);

  return !ready || isAuthenticated ? children : null;
}

/**
 * /login for someone who is already signed in: straight into the app. Checked once, when the page opens;
 * signing in on the page itself navigates from the form (which knows where to go).
 */
export function RedirectIfAuthenticated({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={children}>
      <RedirectIfAuthenticatedInner>{children}</RedirectIfAuthenticatedInner>
    </Suspense>
  );
}

function RedirectIfAuthenticatedInner({ children }: { children: React.ReactNode }) {
  const { ready, isAuthenticated, homePath } = useAuth();
  const router = useRouter();
  const next = safeNext(useSearchParams().get('next'));
  const checked = useRef(false);

  useEffect(() => {
    if (!ready || checked.current) return;
    checked.current = true;
    if (!isAuthenticated) return;
    if (next) router.replace(next);
    else void homePath().then((path) => router.replace(path), () => {});
  }, [ready, isAuthenticated, homePath, router, next]);

  return children;
}
