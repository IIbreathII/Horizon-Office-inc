'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { CATEGORIES } from '@/shared/categories';
import type { Category, Quest } from '@/shared/types';
import { Icon } from '@/shared/ui/Icon';
import { LineIcon } from '@/shared/ui/LineIcon';
import { BUTTON_PRIMARY, COIN_TEXT, FAINT, INSET, PANEL, XP_TEXT, tileStyle } from '@/shared/ui/surface';

// "Lucky quest": a slot machine that picks a random free quest. Pull the lever (drag it down, click it
// or press Enter) and the three reels stop one after another on the picked quest's category.

const SYMBOL = 88; // reel row height, px
const STRIP_LENGTH = 26; // symbols a reel runs through per spin
const REEL_SECONDS = [1.4, 1.85, 2.3];
const EASE = 'cubic-bezier(0.12, 0.62, 0.16, 1.02)';
const ALL = Object.keys(CATEGORIES) as Category[];

const randomItem = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)];

/** Free quests the volunteer can still join. */
const isFree = (q: Quest) => q.status === 'open' && !q.myParticipation && q.slotsTaken < q.slotsTotal;

/** Random symbols ending on `target`, starting where the reel stopped last time. */
function buildStrip(from: Category, target: Category): Category[] {
  const middle = Array.from({ length: STRIP_LENGTH - 2 }, () => randomItem(ALL));
  return [from, ...middle, target];
}

type Phase = 'idle' | 'spinning' | 'done';

export function SlotMachine({ quests }: { quests: Quest[] }) {
  const free = quests.filter(isFree);
  const [strips, setStrips] = useState<Category[][]>([['animals'], ['ecology'], ['city']]);
  const [armed, setArmed] = useState(false); // false: reels at the strip start, no transition
  const [phase, setPhase] = useState<Phase>('idle');
  const [result, setResult] = useState<Quest | null>(null);

  function spin() {
    if (phase === 'spinning' || free.length === 0) return;
    const quest = randomItem(free);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    setResult(null);
    setArmed(false);
    setStrips((current) => current.map((strip) => buildStrip(strip[strip.length - 1], quest.category)));
    setPhase('spinning');
    // two frames: let the reels render at the strip start before animating to the end
    requestAnimationFrame(() => requestAnimationFrame(() => setArmed(true)));
    window.setTimeout(
      () => {
        setPhase('done');
        setResult(quest);
      },
      reduced ? 50 : REEL_SECONDS[REEL_SECONDS.length - 1] * 1000 + 150,
    );
  }

  const spinning = phase === 'spinning';

  return (
    <section className={`flex flex-col gap-5 p-5 sm:p-6 ${PANEL}`} aria-labelledby="slot-title">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h2 id="slot-title" className="text-lg font-semibold text-white">
            Квест удачі
          </h2>
          <p className={`text-sm ${FAINT}`}>Потягніть важіль, і автомат обере для вас вільний квест</p>
        </div>
        <Lights active={spinning} />
      </header>

      <div className="flex items-center justify-center gap-4 sm:gap-10">
        <div className={`relative flex flex-none justify-center gap-1.5 p-2 ring-1 ring-amber-300/60 sm:gap-3 sm:p-3 ${INSET} shadow-[0_0_24px_-8px_rgba(252,211,77,0.6)]`}>
          {strips.map((strip, i) => (
            <Reel key={i} strip={strip} armed={armed} seconds={REEL_SECONDS[i]} />
          ))}
          {/* payline */}
          <span aria-hidden className="pointer-events-none absolute inset-x-2 top-1/2 h-px -translate-y-1/2 bg-amber-300/50" />
        </div>
        {/* the lever needs room; narrow screens get a plain button instead */}
        <div className="hidden sm:block">
          <Lever onPull={spin} disabled={spinning || free.length === 0} />
        </div>
      </div>
      <button type="button" onClick={spin} disabled={spinning || free.length === 0} className={`w-full sm:hidden ${BUTTON_PRIMARY}`}>
        <LineIcon name="sparkle" className="size-4" />
        {spinning ? 'Крутимо…' : 'Крутнути'}
      </button>

      <div aria-live="polite">
        {free.length === 0 ? (
          <p className={`text-sm ${FAINT}`}>Зараз немає вільних квестів. Загляньте трохи згодом</p>
        ) : result ? (
          <QuestResult quest={result} />
        ) : (
          <p className={`text-sm ${FAINT}`}>{spinning ? 'Крутимо…' : `У барабані ${free.length} вільних квестів`}</p>
        )}
      </div>
    </section>
  );
}

function Reel({ strip, armed, seconds }: { strip: Category[]; armed: boolean; seconds: number }) {
  const offset = armed ? (strip.length - 1) * SYMBOL : 0;
  return (
    <div
      className="relative w-16 shrink-0 overflow-hidden rounded-lg bg-black/70 sm:w-28 mask-[linear-gradient(transparent,black_22%,black_78%,transparent)]"
      style={{ height: SYMBOL }}
    >
      <div
        style={{
          transform: `translateY(-${offset}px)`,
          transition: armed ? `transform ${seconds}s ${EASE}` : 'none',
        }}
      >
        {strip.map((category, i) => (
          <div key={i} className="flex items-center justify-center" style={{ height: SYMBOL }}>
            <span className="flex size-13 items-center justify-center rounded-xl sm:size-16" style={tileStyle(CATEGORIES[category].color)}>
              <Icon src={CATEGORIES[category].icon} className="size-7 sm:size-9" />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const PULL = 64; // px the knob travels when pulled

/** Slot lever: drag the ball down, click it or press Enter/Space. */
function Lever({ onPull, disabled }: { onPull: () => void; disabled: boolean }) {
  const [dy, setDy] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef<number | null>(null);
  const dragged = useRef(false);

  function animatePull() {
    setDy(PULL);
    window.setTimeout(() => setDy(0), 180);
  }

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
    animatePull();
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
        className="absolute top-0 left-1/2 flex cursor-grab touch-none flex-col items-center outline-none active:cursor-grabbing disabled:cursor-not-allowed focus-visible:[&>span:first-child]:ring-2 focus-visible:[&>span:first-child]:ring-amber-300"
        style={{ transform: `translate(-50%, ${dy}px)`, transition: dragging ? 'none' : 'transform 220ms cubic-bezier(.3,1.6,.5,1)' }}
      >
        <span className="size-11 rounded-full bg-[radial-gradient(circle_at_35%_30%,#ff9a9a,#ef4444_45%,#7f1d1d)] shadow-[0_0_18px_-2px_rgba(239,68,68,0.8)]" />
        <span className="h-20 w-2 rounded-b-full bg-linear-to-r from-neutral-300 via-white to-neutral-400" />
      </button>
    </div>
  );
}

/** Row of bulbs that chase while the reels spin. */
function Lights({ active }: { active: boolean }) {
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

function QuestResult({ quest }: { quest: Quest }) {
  const category = CATEGORIES[quest.category];
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-amber-300/50 bg-amber-300/[0.07] p-4 motion-safe:transition motion-safe:duration-300 motion-safe:starting:scale-95 motion-safe:starting:opacity-0">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-xl" style={tileStyle(category.color)}>
        <Icon src={category.icon} className="size-6" />
      </span>
      <div className="min-w-48 flex-1">
        <p className="text-xs font-semibold text-amber-300">Ваш квест</p>
        <p className="text-base leading-snug font-semibold text-white">{quest.title}</p>
        <p className="mt-1 flex items-center gap-3 text-sm font-semibold">
          <span className={`flex items-center gap-1 ${XP_TEXT}`}>
            <LineIcon name="xp" className="size-4" />+{quest.xpReward} XP
          </span>
          <span className={`flex items-center gap-1 ${COIN_TEXT}`}>
            <LineIcon name="coin" className="size-4" />+{quest.coinsReward}
          </span>
        </p>
      </div>
      <Link href={`/map?quest=${quest.id}`} className={BUTTON_PRIMARY}>
        <LineIcon name="map" className="size-4" />
        На мапі
      </Link>
    </div>
  );
}
