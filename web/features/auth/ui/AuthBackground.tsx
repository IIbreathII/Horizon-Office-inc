'use client';

import Image from 'next/image';
import { useEffect, useRef } from 'react';
import { AUTH_BACKGROUND } from '../images';

// Shift in px at the screen edge; the background moves against the cursor.
const SHIFT = 24;

/** Blurred full-screen landscape behind the auth pages with a mouse parallax (off for prefers-reduced-motion). */
export function AuthBackground() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

    // cursor position as -1…1 from the screen center, written to CSS variables (no re-render per move)
    function onPointerMove(e: PointerEvent) {
      if (e.pointerType !== 'mouse' || reducedMotion.matches) return;
      ref.current?.style.setProperty('--px', String((e.clientX / innerWidth) * 2 - 1));
      ref.current?.style.setProperty('--py', String((e.clientY / innerHeight) * 2 - 1));
    }

    window.addEventListener('pointermove', onPointerMove);
    return () => window.removeEventListener('pointermove', onPointerMove);
  }, []);

  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden bg-[#000000]">
      {/* scaled up so neither the blur's soft edges nor the shift ever show */}
      <div
        ref={ref}
        className="absolute inset-0 scale-125 transition-transform duration-500 ease-out [--px:0] [--py:0]"
        style={{ translate: `calc(var(--px) * ${-SHIFT}px) calc(var(--py) * ${-SHIFT}px)` }}
      >
        <Image
          src={AUTH_BACKGROUND.src}
          width={AUTH_BACKGROUND.width}
          height={AUTH_BACKGROUND.height}
          alt=""
          priority
          // blurred anyway: a small version is enough
          sizes="50vw"
          className="size-full object-cover blur-2xl"
        />
      </div>
      {/* dims the picture so the white cards and the text on it stand out */}
      <div className="absolute inset-0 bg-black/25" />
    </div>
  );
}
