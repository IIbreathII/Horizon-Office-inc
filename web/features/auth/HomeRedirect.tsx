'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from './AuthProvider';

/** The start page for a signed-in user (proxy.ts sends everyone else to /login): /org or /map by role. */
export function HomeRedirect() {
  const { homePath } = useAuth();
  const router = useRouter();

  useEffect(() => {
    void homePath().then(
      (path) => router.replace(path),
      () => router.replace('/login'),
    );
  }, [homePath, router]);

  return null;
}
