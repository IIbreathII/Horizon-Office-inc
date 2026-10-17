'use client';

import { useRouter } from 'next/navigation';
import { LineIcon } from '@/shared/ui/LineIcon';
import { useAuth } from './AuthProvider';

/** «Вийти»: forgets the token and the cached data, then goes to /login. */
export function SignOutButton({ className, labelClassName }: { className: string; labelClassName?: string }) {
  const { signOut } = useAuth();
  const router = useRouter();

  return (
    <button
      type="button"
      title="Вийти"
      onClick={() => {
        signOut();
        router.replace('/login');
      }}
      className={className}
    >
      <LineIcon name="logout" className="size-5 md:size-4" />
      <span className={labelClassName}>Вийти</span>
    </button>
  );
}
