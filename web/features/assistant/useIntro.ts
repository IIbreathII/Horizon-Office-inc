'use client';

import { useEffect } from 'react';
import { useMe } from '@/shared/api/queries';
import { decideIntro } from './intro';
import { useMascot } from './MascotProvider';

const START_DELAY_MS = 700; // let the page appear first
// per account: the tour once per browser, the hello once per session
const tourKey = (userId: string) => `horizon:mascot-tour:${userId}`;
const greetKey = (userId: string) => `horizon:mascot-hello:${userId}`;

function read(storage: () => Storage, key: string): boolean {
  try {
    return storage().getItem(key) !== null;
  } catch {
    return true; // storage blocked: better no hello than one on every page
  }
}

function mark(storage: () => Storage, key: string) {
  try {
    storage().setItem(key, '1');
  } catch {
    // storage blocked: nothing to remember it in
  }
}

/** After sign-in the mascot says hello: the tour for a new account, a quick wave otherwise. */
export function useIntro() {
  const { data: me } = useMe();
  const { startIntro } = useMascot();
  const userId = me?.id;
  const xp = me?.xp;
  const name = me?.username;

  useEffect(() => {
    if (userId === undefined || xp === undefined || name === undefined) return;
    const kind = decideIntro(xp, {
      tour: read(() => localStorage, tourKey(userId)),
      greetedThisSession: read(() => sessionStorage, greetKey(userId)),
    });
    if (!kind) return;
    // marked only once it really starts: while the chat is open or the owl is away, startIntro refuses,
    // and this effect runs again when that changes (startIntro depends on both)
    const timer = window.setTimeout(() => {
      if (!startIntro(kind, name)) return;
      mark(() => localStorage, tourKey(userId));
      mark(() => sessionStorage, greetKey(userId));
    }, START_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [userId, xp, name, startIntro]);
}
