'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LineIcon } from '@/shared/ui/LineIcon';
import { useAuth } from './AuthProvider';

/** «Вийти»: drops the session cookie and the cached data, then goes to /login. */
export function SignOutButton({ className, labelClassName }: { className: string; labelClassName?: string }) {
  const { signOut } = useAuth();
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onClick() {
    setPending(true);
    try {
      await signOut();
    } finally {
      // the page itself is still on screen; proxy.ts would send a signed-out visitor to /login anyway
      router.replace('/login');
      router.refresh();
    }
  }

  return (
    <button type="button" title="Вийти" disabled={pending} onClick={onClick} className={className}>
      <LineIcon name="logout" className="size-5 md:size-4" />
      <span className={labelClassName}>Вийти</span>
    </button>
  );
}
