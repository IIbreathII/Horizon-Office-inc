'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import type { Direction } from './flightPath';

const STROLL_MS = 7000;
// share of the stroll spent walking out / standing and looking around / walking back
const OUT_END = 0.35;
const LOOK_END = 0.65;

export type StrollPhase = { step: 'walk' | 'look'; direction: Direction } | null;

/**
 * While `active`, walks the element at `ref` out of the mascot's corner along the bottom edge,
 * stops to look around and walks back; then calls `onDone`. Interrupted (woken, chat opened),
 * it glides back from wherever it is instead of jumping.
 */
export function useStroll(ref: RefObject<HTMLElement | null>, active: boolean, onDone: () => void): StrollPhase {
  const [phase, setPhase] = useState<StrollPhase>(null);
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });

  useEffect(() => {
    const el = ref.current;
    if (!active || !el) return;

    // phones: the owl sits bottom-right next to the nav bar, so only a short walk left
    const distance = window.innerWidth < 640 ? -48 : 160;
    const out: Direction = distance > 0 ? 1 : -1;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const timers = [
      window.setTimeout(() => setPhase({ step: 'look', direction: out }), STROLL_MS * OUT_END),
      window.setTimeout(() => setPhase({ step: 'walk', direction: out === 1 ? -1 : 1 }), STROLL_MS * LOOK_END),
      window.setTimeout(() => done.current(), STROLL_MS),
    ];
    // first phase is set from a timer too, so the effect body never sets state synchronously
    timers.push(window.setTimeout(() => setPhase(reduce ? { step: 'look', direction: out } : { step: 'walk', direction: out }), 0));

    const away = `translateX(${distance}px)`;
    const animation = reduce
      ? null
      : el.animate(
          [
            { transform: 'none', easing: 'ease-in-out' },
            { transform: away, offset: OUT_END },
            { transform: away, offset: LOOK_END, easing: 'ease-in-out' },
            { transform: 'none' },
          ],
          { duration: STROLL_MS },
        );

    return () => {
      timers.forEach((id) => window.clearTimeout(id));
      setPhase(null);
      if (animation && animation.playState === 'running') {
        const current = getComputedStyle(el).transform;
        animation.cancel();
        el.animate([{ transform: current }, { transform: 'none' }], { duration: 350, easing: 'ease-out' });
      }
    };
  }, [ref, active]);

  return phase;
}
