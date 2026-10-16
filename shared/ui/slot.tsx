'use client';

import { useRef, useState } from 'react';
import { INSET } from './surface';

// Shared slot-machine parts: three reels that stop one after another on a target symbol,
// a pull lever and chasing lights. Used by the lucky quest (quests page) and the lucky reward (rewards page).

const SYMBOL = 88; // reel row height, px
const STRIP_LENGTH = 26; // symbols a reel runs through per spin
const REEL_SECONDS = [1.4, 1.85, 2.3];
const EASE = 'cubic-bezier(0.12, 0.62, 0.16, 1.02)';
/** Time until the last reel stops. */
const SPIN_MS = REEL_SECONDS[REEL_SECONDS.length - 1] * 1000 + 150;

export const randomItem = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)];

/** Random symbols ending on `target`, starting where the reel stopped last time. */
function buildStrip<T>(from: T, target: T, symbols: T[]): T[] {
  const middle = Array.from({ length: STRIP_LENGTH - 2 }, () => randomItem(symbols));
  return [from, ...middle, target];
}

/** Reel state: `spin(target, onDone)` runs all reels to `target` and calls `onDone` when the last one stops. */
export function useSlotReels<T>(initial: [T, T, T], symbols: T[]) {
  const [strips, setStrips] = useState<T[][]>(() => initial.map((symbol) => [symbol]));
  const [armed, setArmed] = useState(false); // false: reels at the strip start, no transition
  const [spinning, setSpinning] = useState(false);

  function spin(target: T, onDone: () => void) {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setArmed(false);
    setStrips((current) => current.map((strip) => buildStrip(strip[strip.length - 1], target, symbols)));
    setSpinning(true);
    // two frames: let the reels render at the strip start before animating to the end
    requestAnimationFrame(() => requestAnimationFrame(() => setArmed(true)));
    window.setTimeout(
      () => {
        setSpinning(false);
        onDone();
      },
      reduced ? 50 : SPIN_MS,
    );
  }

  return { strips, armed, spinning, spin };
}

type SlotReelsProps<T> = {
  strips: T[][];
  armed: boolean;
  renderSymbol: (symbol: T) => React.ReactNode;
};

/** The reel window: three reels in a gold frame with a payline. */
export function SlotReels<T>({ strips, armed, renderSymbol }: SlotReelsProps<T>) {
  return (
    <div className={`relative flex flex-none justify-center gap-1.5 p-2 ring-1 ring-amber-300/60 sm:gap-3 sm:p-3 ${INSET} shadow-[0_0_24px_-8px_rgba(252,211,77,0.6)]`}>
      {strips.map((strip, i) => {
        const offset = armed ? (strip.length - 1) * SYMBOL : 0;
        return (
          <div
            key={i}
            className="relative w-16 shrink-0 overflow-hidden rounded-lg bg-black/70 sm:w-28 mask-[linear-gradient(transparent,black_22%,black_78%,transparent)]"
            style={{ height: SYMBOL }}
          >
            <div style={{ transform: `translateY(-${offset}px)`, transition: armed ? `transform ${REEL_SECONDS[i]}s ${EASE}` : 'none' }}>
              {strip.map((symbol, j) => (
                <div key={j} className="flex items-center justify-center" style={{ height: SYMBOL }}>
                  {renderSymbol(symbol)}
                </div>
              ))}
            </div>
          </div>
        );
      })}
      {/* payline */}
      <span aria-hidden className="pointer-events-none absolute inset-x-2 top-1/2 h-px -translate-y-1/2 bg-amber-300/50" />
    </div>
  );
}

const PULL = 64; // px the knob travels when pulled

/** Slot lever: drag the ball down, click it or press Enter/Space. */
export function SlotLever({ onPull, disabled }: { onPull: () => void; disabled: boolean }) {
  const [dy, setDy] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef<number | null>(null);
  const dragged = useRef(false);

  function onPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    if (disabled) return;
    start.current = e.clientY;
    dragged.current = false;
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    if (start.current === null) return;
    const next = Math.min(PULL, Math.max(0, e.clientY - start.current));
    if (next > 6) dragged.current = true;
    setDy(next);
  }

  function onPointerUp() {
    if (start.current === null) return;
    start.current = null;
    setDragging(false);
    if (dragged.current && dy > PULL * 0.6) onPull();
    setDy(0);
  }

  function onClick() {
    // a drag already decided above; a plain click (or Enter/Space) pulls the lever
    if (dragged.current) {
      dragged.current = false;
      return;
    }
    if (disabled) return;
    setDy(PULL);
    window.setTimeout(() => setDy(0), 180);
    onPull();
  }

  return (
    <div className="relative h-48 w-14 shrink-0 select-none">
      {/* slot in the machine body */}
      <span aria-hidden className="absolute top-6 bottom-6 left-1/2 w-2 -translate-x-1/2 rounded-full bg-black/80 ring-1 ring-white/10" />
      {/* base */}
      <span aria-hidden className="absolute bottom-0 left-1/2 h-8 w-12 -translate-x-1/2 rounded-lg bg-linear-to-b from-neutral-600 to-neutral-800 ring-1 ring-white/15" />
      <button
        type="button"
        onClick={onClick}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        disabled={disabled}
        aria-label="Потягнути важіль"
        className="absolute top-0 left-1/2 flex cursor-grab touch-none flex-col items-center outline-none active:cursor-grabbing disabled:cursor-not-allowed disabled:grayscale focus-visible:[&>span:first-child]:ring-2 focus-visible:[&>span:first-child]:ring-amber-300"
        style={{ transform: `translate(-50%, ${dy}px)`, transition: dragging ? 'none' : 'transform 220ms cubic-bezier(.3,1.6,.5,1)' }}
      >
        <span className="size-11 rounded-full bg-[radial-gradient(circle_at_35%_30%,#ff9a9a,#ef4444_45%,#7f1d1d)] shadow-[0_0_18px_-2px_rgba(239,68,68,0.8)]" />
        <span className="h-20 w-2 rounded-b-full bg-linear-to-r from-neutral-300 via-white to-neutral-400" />
      </button>
    </div>
  );
}

/** Row of bulbs that chase while the reels spin. */
export function SlotLights({ active }: { active: boolean }) {
  return (
    <div aria-hidden className="flex gap-1.5">
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className={`size-2 rounded-full ${active ? 'bg-amber-300 shadow-[0_0_8px_rgba(252,211,77,0.9)] motion-safe:animate-pulse' : 'bg-amber-300/25'}`}
          style={{ animationDelay: `${i * 120}ms` }}
        />
      ))}
    </div>
  );
}
