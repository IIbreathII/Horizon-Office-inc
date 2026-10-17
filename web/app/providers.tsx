'use client';

import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { ApiError } from '@/shared/api/http';

let signingOut = false;

/**
 * The API rejected the session (expired, user removed…) while a page was open: drop the cookie and go to /login,
 * back to this page after signing in. Once per page, so parallel failing requests don't race.
 */
function signOutOnUnauthorized(error: unknown) {
  if (!(error instanceof ApiError) || error.status !== 401 || signingOut) return;
  if (window.location.pathname === '/login') return;
  signingOut = true;
  const next = encodeURIComponent(window.location.pathname + window.location.search);
  // a full page load on purpose: it drops all client state of the dead session (this runs outside React, no router)
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  void fetch('/auth/logout', { method: 'POST' }).finally(() => window.location.assign(`/login?next=${next}`));
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 30_000 } },
        queryCache: new QueryCache({ onError: signOutOnUnauthorized }),
        mutationCache: new MutationCache({ onError: signOutOnUnauthorized }),
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}
