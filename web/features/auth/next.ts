// Page access is checked on the server by proxy.ts (session cookie); the client only needs this helper.

/** `next` from the URL, only if it is a path on this site (never an external URL). */
export function safeNext(next: string | null): string | null {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : null;
}
