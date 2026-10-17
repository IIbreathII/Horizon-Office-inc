'use client';

import { useState } from 'react';
import { Mascot } from '../Mascot';
import type { NavSuggestion } from '../types';

/** Speech-bubble nav suggestion shown under the assistant message. */
export function NavBubble({
  nav,
  onNavigate,
  flyToNav,
}: {
  nav: NavSuggestion;
  onNavigate: () => void;
  flyToNav: (href: string, label: string) => void;
}) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div className="relative mt-2 flex items-center gap-3 overflow-hidden rounded-2xl border border-amber-300/60 bg-gradient-to-r from-amber-400/15 via-amber-300/10 to-transparent p-3 shadow-[0_0_24px_-6px_rgba(252,211,77,0.4)] backdrop-blur animate-message-in">
      <div className="relative shrink-0">
        <Mascot mood="point" className="size-8" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-300/90">Порада від маскота</p>
        <button
          type="button"
          onClick={() => {
            onNavigate();
            setDismissed(true);
            flyToNav(nav.href, nav.label);
          }}
          className="group mt-0.5 inline-flex cursor-pointer items-center gap-1.5 text-xs sm:text-sm font-bold text-white transition-colors hover:text-amber-200"
        >
          <span>{nav.label}</span>
          <svg className="size-4 transition-transform group-hover:translate-x-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10.293 3.293a1 1 0 0 1 1.414 0l6 6a1 1 0 0 1 0 1.414l-6 6a1 1 0 0 1-1.414-1.414L14.586 11H3a1 1 0 1 1 0-2h11.586l-4.293-4.293a1 1 0 0 1 0-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Закрити"
        className="cursor-pointer rounded-lg p-1 text-neutral-400 transition-colors hover:bg-white/10 hover:text-white"
      >
        <svg className="size-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 0 1 1.414 0L10 8.586l4.293-4.293a1 1 0 1 1 1.414 1.414L11.414 10l4.293 4.293a1 1 0 0 1-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 0 1-1.414-1.414L8.586 10 4.293 5.707a1 1 0 0 1 0-1.414z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  );
}
