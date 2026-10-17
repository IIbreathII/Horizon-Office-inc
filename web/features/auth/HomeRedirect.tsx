'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from './AuthProvider';

/** Sends the visitor to the right start page once the session is known. */
export function HomeRedirect() {
  const { ready, isAuthenticated, homePath } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (!isAuthenticated) router.replace('/login');
    else void homePath().then((path) => router.replace(path), () => router.replace('/login'));
  }, [ready, isAuthenticated, homePath, router]);

  return null;
}
