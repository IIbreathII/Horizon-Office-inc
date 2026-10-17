// The signed-in user's JWT from the auth API (go-api), sent to the Express API as `Authorization: Bearer`.
// Kept in localStorage so a reload keeps the session. Subscribers (useSyncExternalStore) re-render on
// sign-in / sign-out, also when another tab changes it.

const KEY = 'horizon:token';
const listeners = new Set<() => void>();

/** Seconds since epoch when the token expires (its `exp` claim), or null if it can't be read. */
function expiresAt(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as { exp?: number };
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

/** The current token; null when signed out, on the server, or once it has expired. */
export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  let token: string | null;
  try {
    token = localStorage.getItem(KEY);
  } catch {
    return null;
  }
  if (!token) return null;
  const exp = expiresAt(token);
  return exp !== null && exp * 1000 <= Date.now() ? null : token;
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(KEY, token);
    else localStorage.removeItem(KEY);
  } catch {
    // storage unavailable: the session just won't survive a reload
  }
  listeners.forEach((listener) => listener());
}

export function subscribeToken(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}
