'use client';

import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { ApiError } from '@/shared/api/http';
import { getToken, setToken } from '@/shared/api/token';

/** The API rejected our token (expired, user removed…): drop the session; the guards send the user to /login. */
function signOutOnUnauthorized(error: unknown) {
  if (error instanceof ApiError && error.status === 401 && getToken()) setToken(null);
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
