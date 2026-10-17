'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Suspense, useEffect, useSyncExternalStore } from 'react';
import { useMe } from '@/shared/api/queries';

export const ORG_PROFILE_PATH = '/org/profile';

/**
 * Until the user has an organization profile, the cabinet is just /org/profile: every other /org page sends
 * there (the API refuses them anyway — 403 «Organization profile required»). Creating the profile unlocks the rest.
 * usePathname suspends under dynamic routes (/org/quests/[id]), so the page renders as is until it is known.
 */
export function OrgGate({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={children}>
      <Gate>{children}</Gate>
    </Suspense>
  );
}

const noopSubscribe = () => () => {};

function Gate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: me } = useMe();
  // false on the server and during hydration, so the first client render matches the server HTML
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const blocked = me !== undefined && me.role !== 'organization' && pathname !== ORG_PROFILE_PATH;

  useEffect(() => {
    if (blocked) router.replace(ORG_PROFILE_PATH);
  }, [blocked, router]);

  if (blocked) return null;
  // until the profile is known the page stays mounted but hidden: no flash of a page the user can't use yet.
  // The wrapper is always there (only `hidden` changes), so server and client render the same tree.
  return <div hidden={!hydrated || me === undefined}>{children}</div>;
}

/** true once we know the user has no organization profile yet (the cabinet tabs stay locked). */
export function useNeedsOrgProfile(): boolean {
  const { data: me } = useMe();
  return me !== undefined && me.role !== 'organization';
}
