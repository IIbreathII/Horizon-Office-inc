'use client';

import { useEffect, useRef, useState } from 'react';
import { ICONS } from '@/shared/icons';
import { Icon } from '@/shared/ui/Icon';
import { BUTTON_SECONDARY } from '@/shared/ui/PageShell';

// Google Identity Services: Google draws its own button and hands back an ID token (no redirect URI needed).
// The Client ID is the one from Google Cloud Console, the same as CLIENT_ID in go-api/.env.
const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const GSI_SRC = 'https://accounts.google.com/gsi/client';

type GoogleId = {
  initialize: (options: {
    client_id: string;
    callback: (response: { credential: string }) => void;
    use_fedcm_for_button?: boolean;
  }) => void;
  renderButton: (parent: HTMLElement, options: Record<string, string | number>) => void;
};
type GoogleWindow = Window & { google?: { accounts: { id: GoogleId } } };

let gsiScript: Promise<void> | null = null;
// Google allows one initialize() per page; the mounted button swaps in its handler here
let gsiInitialized = false;
let credentialHandler: ((credential: string) => void) | null = null;

/** Loads the Google script once per page. */
function loadGsi(): Promise<void> {
  gsiScript ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GSI_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      gsiScript = null;
      reject(new Error('Google script failed to load'));
    };
    document.head.appendChild(script);
  });
  return gsiScript;
}

/** «Увійти через Google»: calls onCredential with the Google ID token. */
export function GoogleSignInButton({ onCredential }: { onCredential: (credential: string) => void }) {
  const slot = useRef<HTMLDivElement>(null); // the space we have: measured
  const box = useRef<HTMLDivElement>(null); // Google draws its button here
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    credentialHandler = onCredential;
    return () => {
      if (credentialHandler === onCredential) credentialHandler = null;
    };
  }, [onCredential]);

  useEffect(() => {
    if (!CLIENT_ID) return;
    let cancelled = false;
    let observer: ResizeObserver | null = null;
    loadGsi().then(
      () => {
        const id = (window as GoogleWindow).google?.accounts.id;
        if (cancelled || !id || !slot.current || !box.current) return;
        if (!gsiInitialized) {
          id.initialize({
            client_id: CLIENT_ID,
            callback: ({ credential }) => credentialHandler?.(credential),
            // FedCM: the browser's own account picker instead of a popup window, which popup blockers stop
            // ("Failed to open popup window"); browsers without FedCM fall back to the popup
            use_fedcm_for_button: true,
          });
          gsiInitialized = true;
        }
        // Google's button has a fixed px width (200–400): match the slot, and redraw when the slot resizes
        // (window resize, rotation), otherwise it keeps its first width and overflows or leaves a gap
        let drawnWidth = 0;
        const draw = () => {
          if (cancelled || !slot.current || !box.current) return;
          const width = Math.round(Math.min(400, Math.max(200, slot.current.clientWidth)));
          if (width === drawnWidth) return;
          drawnWidth = width;
          box.current.replaceChildren();
          id.renderButton(box.current, { theme: 'outline', size: 'large', shape: 'pill', text: 'signin_with', locale: 'uk', width });
        };
        draw();
        observer = new ResizeObserver(() => requestAnimationFrame(draw));
        observer.observe(slot.current);
      },
      () => !cancelled && setFailed(true),
    );
    return () => {
      cancelled = true;
      observer?.disconnect();
    };
  }, []);

  // not configured or blocked: show the same pill, disabled, with the reason
  if (!CLIENT_ID || failed) {
    return (
      <button
        type="button"
        disabled
        title={CLIENT_ID ? 'Не вдалося завантажити вхід через Google' : 'Вхід через Google не налаштовано (NEXT_PUBLIC_GOOGLE_CLIENT_ID)'}
        className={`w-full whitespace-nowrap ${BUTTON_SECONDARY}`}
      >
        <Icon src={ICONS.google} className="size-4" />
        Увійти через Google
      </button>
    );
  }
  // no clipping here: Google's button draws its own pill, a rounded mask would cut its ends and icon
  return (
    <div ref={slot} className="w-full min-w-0">
      <div ref={box} className="flex h-10 justify-center" />
    </div>
  );
}
