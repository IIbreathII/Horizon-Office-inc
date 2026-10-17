'use client';

import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from 'react';
import { getMe, IS_MOCK } from '@/shared/api/api';
import { HAS_DEV_TOKEN } from '@/shared/api/http';
import { queryKeys } from '@/shared/api/queries';
import { getToken, setToken, subscribeToken } from '@/shared/api/token';
import type { Me } from '@/shared/types';

type AuthContextValue = {
  /** false during SSR and hydration: the token in localStorage is not known yet, so don't redirect. */
  ready: boolean;
  /** Signed in with a real token, or no sign-in needed (mock backend / dev token in .env). */
  isAuthenticated: boolean;
  signIn: (token: string) => void;
  signOut: () => void;
  /** Where this user's app starts: the organization cabinet or the volunteer map. */
  homePath: () => Promise<string>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const noopSubscribe = () => () => {};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const client = useQueryClient();
  const token = useSyncExternalStore(subscribeToken, getToken, () => null);
  const ready = useSyncExternalStore(noopSubscribe, () => true, () => false);

  // a new session must not show the previous user's cached data
  const signIn = useCallback(
    (next: string) => {
      setToken(next);
      client.clear();
    },
    [client],
  );

  const signOut = useCallback(() => {
    setToken(null);
    client.clear();
  }, [client]);

  const homePath = useCallback(async () => {
    const me = await client.fetchQuery<Me>({ queryKey: queryKeys.me, queryFn: getMe });
    return me.role === 'organization' ? '/org' : '/map';
  }, [client]);

  const value = useMemo(
    () => ({ ready, isAuthenticated: Boolean(token) || IS_MOCK || HAS_DEV_TOKEN, signIn, signOut, homePath }),
    [ready, token, signIn, signOut, homePath],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}
