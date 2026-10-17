'use client';

import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useMemo } from 'react';
import { getMe } from '@/shared/api/api';
import { queryKeys } from '@/shared/api/queries';
import type { Me } from '@/shared/types';
import { authApi } from './authApi';

// The session itself is an httpOnly cookie set by the server (app/auth/*/route.ts) and checked by proxy.ts;
// page scripts never see the token. This context only keeps the client cache in step with the session.
type AuthContextValue = {
  /** After the server set the session cookie: a new session must not show the previous user's cached data. */
  signIn: () => void;
  /** Drops the session cookie and the cached data. */
  signOut: () => Promise<void>;
  /** Where this user's app starts: the organization cabinet or the volunteer map. */
  homePath: () => Promise<string>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const client = useQueryClient();

  const signIn = useCallback(() => client.clear(), [client]);

  const signOut = useCallback(async () => {
    await authApi.logout();
    client.clear();
  }, [client]);

  const homePath = useCallback(async () => {
    const me = await client.fetchQuery<Me>({ queryKey: queryKeys.me, queryFn: getMe });
    return me.role === 'organization' ? '/org' : '/map';
  }, [client]);

  const value = useMemo(() => ({ signIn, signOut, homePath }), [signIn, signOut, homePath]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}
