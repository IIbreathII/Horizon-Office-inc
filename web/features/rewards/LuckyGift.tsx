'use client';

import { useRef, useState } from 'react';
import { CAN_GRANT_TEST_SPIN } from '@/shared/api/api';
import { useGrantTestSpin, useRewardSlot, useSpinRewardSlot } from '@/shared/api/queries';
import type { RewardSlot, SlotWin } from '@/shared/types';
import { LineIcon } from '@/shared/ui/LineIcon';
import { BUTTON_GHOST, BUTTON_PRIMARY, COIN_TEXT, FAINT, MUTED, PANEL, SKELETON, tileStyle } from '@/shared/ui/surface';
import { CopyButton } from './CopyButton';
import { rewardRarity } from './rarity';

// "Gift for good deeds": every N completed quests unlock a gift box. Opening it asks the server for
// a free random reward (the lucky-slot endpoints), then the lid pops, confetti flies and the reward
// card rises out of the box. Reduced motion skips straight to the card.

const SHAKE_MS = 900; // the box shakes at least this long while the server picks the gift

// Keyframes live here: globals.css is shared with the map.
const KEYFRAMES = `
@keyframes gift-float { 0%, 100% { translate: 0 0; } 50% { translate: 0 -6px; } }
@keyframes gift-shake { 0%, 100% { rotate: 0deg; } 15% { rotate: -7deg; } 30% { rotate: 6deg; } 45% { rotate: -5deg; } 60% { rotate: 4deg; } 75% { rotate: -2deg; } }
@keyframes gift-lid { 0% { translate: 0 0; rotate: 0deg; } 55% { translate: -8px -64px; rotate: -18deg; } 100% { translate: -34px -26px; rotate: -38deg; opacity: 0; } }
@keyframes gift-confetti { 0% { transform: translate(0, 0) rotate(0deg) scale(.6); opacity: 1; } 100% { transform: translate(var(--x), var(--y)) rotate(var(--r)) scale(1); opacity: 0; } }
@keyframes gift-rays { to { rotate: 360deg; } }
@keyframes gift-rise { 0% { translate: 0 24px; scale: .9; opacity: 0; } 100% { translate: 0 0; scale: 1; opacity: 1; } }
`;

/** Confetti pieces: direction, spin, color and shape (heart/star icons or dots). */
const CONFETTI = [
  { x: -120, y: -90, r: 200, c: '#fb7185', icon: 'heart' },
  { x: -80, y: -140, r: -160, c: '#fcd34d', icon: 'star' },
  { x: -30, y: -160, r: 260, c: '#6ee7b7' },
  { x: 20, y: -150, r: -220, c: '#fcd34d', icon: 'sparkle' },
  { x: 70, y: -140, r: 180, c: '#fb7185', icon: 'heart' },
  { x: 120, y: -95, r: -240, c: '#7dd3fc' },
  { x: 140, y: -30, r: 160, c: '#fcd34d', icon: 'star' },
  { x: -145, y: -25, r: -180, c: '#a78bfa' },
  { x: -100, y: 10, r: 220, c: '#fcd34d' },
  { x: 105, y: 15, r: -200, c: '#6ee7b7', icon: 'sparkle' },
  { x: -55, y: -110, r: 140, c: '#7dd3fc', icon: 'heart' },
  { x: 45, y: -105, r: -140, c: '#a78bfa', icon: 'star' },
] as const;

type Phase = 'idle' | 'opening' | 'opened';

/** Ukrainian plural form: [one, few, many], e.g. 1 справа, 3 справи, 5 справ. */
function plural(n: number, [one, few, many]: [string, string, string]) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

export function LuckyGift() {
  const { data: slot, isPending, isError } = useRewardSlot();
  const open = useSpinRewardSlot();
  const [phase, setPhase] = useState<Phase>('idle');
  const [win, setWin] = useState<SlotWin | null>(null);
  const startedAt = useRef(0);

  if (isPending) return <div className={`h-80 ${PANEL} ${SKELETON} rounded-2xl!`} aria-busy="true" aria-label="Завантаження подарунка" />;
  if (isError) return <p className={`p-5 text-sm text-rose-300 ${PANEL}`}>Не вдалося завантажити подарунок</p>;

  const ready = slot.spinsAvailable > 0;
  const canOpen = ready && phase === 'idle';

  function openGift() {
    if (!canOpen) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setWin(null);
    setPhase('opening');
    startedAt.current = Date.now();
    open.mutate(undefined, {
      onSuccess: (won) => {
        // keep shaking a little even if the server answers instantly
        const wait = reduced ? 0 : Math.max(0, SHAKE_MS - (Date.now() - startedAt.current));
        window.setTimeout(() => {
          setWin(won);
          setPhase('opened');
        }, wait);
      },
      onError: () => setPhase('idle'),
    });
  }

  function reset() {
    setPhase('idle');
    setWin(null);
  }

  return (
    <section className={`overflow-hidden p-5 sm:p-6 ${PANEL}`} aria-labelledby="gift-title">
      <style>{KEYFRAMES}</style>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="gift-title" className="text-xl font-semibold text-white">
            Подарунок за добрі справи
          </h2>
          <p className={`mt-1 max-w-md text-sm ${FAINT}`}>
            Кожні {slot.questsPerSpin} виконаних квестів відкривають подарунок від партнерів міста
          </p>
        </div>
        {CAN_GRANT_TEST_SPIN && <TestSpinButton />}
      </header>

      <div className="mt-6 grid items-center gap-8 md:grid-cols-[1fr_auto]">
        <div className="flex flex-col gap-5">
          <Hearts slot={slot} />
          <div aria-live="polite" className="min-h-28">
            {open.isError && phase === 'idle' ? (
              <p className="text-sm text-rose-300">Подарунок не відкрився, спробуйте ще раз</p>
            ) : phase === 'opened' && win ? (
              <WinCard win={win} onDone={reset} more={slot.spinsAvailable > 0} />
            ) : phase === 'opening' ? (
              <p className={`text-sm ${MUTED}`}>Відкриваємо…</p>
            ) : ready ? (
              <div className="flex flex-col items-start gap-3">
                <p className={`text-sm ${MUTED}`}>Подарунок чекає на вас. Що всередині — сюрприз!</p>
                <button type="button" onClick={openGift} className={BUTTON_PRIMARY}>
                  <LineIcon name="gift" className="size-4" />
                  Відкрити подарунок
                </button>
              </div>
            ) : (
              <p className={`text-sm ${MUTED}`}>
                Ще {slot.questsPerSpin - slot.progress}{' '}
                {plural(slot.questsPerSpin - slot.progress, ['добра справа', 'добрі справи', 'добрих справ'])} — і подарунок ваш
              </p>
            )}
          </div>
        </div>

        <GiftBox phase={phase} ready={ready} onOpen={openGift} />
      </div>
    </section>
  );
}

/** One heart per completed quest toward the next gift, plus gifts ready to open. */
function Hearts({ slot }: { slot: RewardSlot }) {
  // a full row while an earned gift is still unopened (progress itself wraps back to 0)
  const filled = slot.progress === 0 && slot.spinsAvailable > 0 ? slot.questsPerSpin : slot.progress;
  return (
    <div className="flex flex-wrap items-center gap-4">
      <div role="img" aria-label={`${filled} з ${slot.questsPerSpin} добрих справ до подарунка`} className="flex gap-2">
        {Array.from({ length: slot.questsPerSpin }, (_, i) => {
          const done = i < filled;
          return (
            <span
              key={i}
              className={`flex size-10 items-center justify-center rounded-full transition-colors ${
                done ? 'bg-rose-500/20 text-rose-300 ring-1 ring-rose-300/80 shadow-[0_0_14px_-3px_rgba(251,113,133,0.8)]' : 'text-white/20 ring-1 ring-white/10'
              }`}
            >
              <LineIcon name="heart" className="size-5" />
            </span>
          );
        })}
      </div>
      <p className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold ${slot.spinsAvailable > 0 ? 'bg-amber-300/15 text-amber-200 ring-1 ring-amber-300/70' : 'bg-white/[0.05] text-neutral-400 ring-1 ring-white/10'}`}>
        <LineIcon name="gift" className="size-4" />
        {slot.spinsAvailable} {plural(slot.spinsAvailable, ['подарунок', 'подарунки', 'подарунків'])}
      </p>
      <p className={`w-full text-xs ${FAINT}`}>
        Усього виконано {slot.completedQuests} {plural(slot.completedQuests, ['квест', 'квести', 'квестів'])}
      </p>
    </div>
  );
}

/** Gift box drawn with CSS: floats when ready, shakes while opening, pops its lid with confetti. */
function GiftBox({ phase, ready, onOpen }: { phase: Phase; ready: boolean; onOpen: () => void }) {
  const opening = phase === 'opening';
  const opened = phase === 'opened';
  const box = ready || opened ? 'from-rose-400 to-rose-600' : 'from-neutral-600 to-neutral-700';
  const lid = ready || opened ? 'from-rose-300 to-rose-500' : 'from-neutral-500 to-neutral-600';
  const ribbon = ready || opened ? 'bg-amber-300' : 'bg-neutral-400';

  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={!ready || phase !== 'idle'}
      aria-label="Відкрити подарунок"
      className="group relative mx-auto flex size-56 cursor-pointer items-end justify-center rounded-3xl outline-none disabled:cursor-default focus-visible:ring-2 focus-visible:ring-amber-300"
    >
      {/* soft light behind the box; rays once it is open */}
      <span aria-hidden className={`absolute inset-6 rounded-full blur-2xl transition-opacity duration-500 ${ready || opened ? 'bg-amber-300/25 opacity-100' : 'opacity-0'}`} />
      {opened && (
        <span
          aria-hidden
          className="absolute -inset-10 rounded-full bg-[repeating-conic-gradient(rgba(252,211,77,0.18)_0deg_10deg,transparent_10deg_24deg)] mask-[radial-gradient(circle,black_30%,transparent_70%)] motion-safe:animate-[gift-rays_14s_linear_infinite]"
        />
      )}

      <span
        aria-hidden
        className={`relative mb-4 block h-40 w-40 ${
          opening ? 'motion-safe:animate-[gift-shake_0.45s_ease-in-out_infinite]' : ready && !opened ? 'motion-safe:animate-[gift-float_3s_ease-in-out_infinite]' : ''
        } ${ready && phase === 'idle' ? 'transition-transform group-hover:scale-105' : ''}`}
      >
        {/* box body */}
        <span className={`absolute inset-x-3 bottom-0 h-24 rounded-b-2xl rounded-t-md bg-linear-to-b ${box} shadow-[inset_0_-10px_20px_rgba(0,0,0,0.25)]`}>
          {opened && <span className="absolute inset-x-0 top-0 h-3 rounded-t-md bg-black/40" />}
          <span className={`absolute inset-y-0 left-1/2 w-6 -translate-x-1/2 ${ribbon}`} />
        </span>
        {/* lid with ribbon and bow */}
        <span
          className={`absolute inset-x-0 bottom-22 h-10 ${opened ? 'motion-safe:animate-[gift-lid_0.7s_ease-out_forwards] motion-reduce:opacity-0' : ''}`}
          style={{ transformOrigin: '20% 100%' }}
        >
          <span className={`absolute inset-0 rounded-xl bg-linear-to-b ${lid} shadow-[0_6px_10px_-4px_rgba(0,0,0,0.5)]`} />
          <span className={`absolute inset-y-0 left-1/2 w-6 -translate-x-1/2 ${ribbon}`} />
          <span className={`absolute -top-7 left-1/2 h-8 w-10 -translate-x-[105%] rotate-[-20deg] rounded-[60%_40%_50%_50%] border-[6px] ${ready || opened ? 'border-amber-300' : 'border-neutral-400'}`} />
          <span className={`absolute -top-7 left-1/2 h-8 w-10 translate-x-[5%] rotate-[20deg] rounded-[40%_60%_50%_50%] border-[6px] ${ready || opened ? 'border-amber-300' : 'border-neutral-400'}`} />
          <span className={`absolute -top-2 left-1/2 size-4 -translate-x-1/2 rounded-full ${ribbon}`} />
        </span>
        {!ready && !opened && (
          <span className="absolute right-1 bottom-1 flex size-9 items-center justify-center rounded-full bg-black/70 text-neutral-300 ring-1 ring-white/15">
            <LineIcon name="lock" className="size-4" />
          </span>
        )}
      </span>

      {/* confetti burst from the top of the box */}
      {opened && (
        <span aria-hidden className="pointer-events-none absolute top-1/3 left-1/2 motion-reduce:hidden">
          {CONFETTI.map((p, i) => (
            <span
              key={i}
              className="absolute animate-[gift-confetti_1.1s_cubic-bezier(.2,.7,.3,1)_forwards]"
              style={{ ['--x' as string]: `${p.x}px`, ['--y' as string]: `${p.y}px`, ['--r' as string]: `${p.r}deg`, color: p.c, animationDelay: `${(i % 4) * 40}ms` }}
            >
              {'icon' in p ? <LineIcon name={p.icon} className="size-5" /> : <span className="block size-2.5 rounded-full" style={{ background: p.c }} />}
            </span>
          ))}
        </span>
      )}
    </button>
  );
}

function WinCard({ win, onDone, more }: { win: SlotWin; onDone: () => void; more: boolean }) {
  const rarity = rewardRarity(win.reward.cost);
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-amber-300/60 bg-amber-300/[0.07] p-4 shadow-[0_0_24px_-8px_rgba(252,211,77,0.7)] motion-safe:animate-[gift-rise_0.5s_cubic-bezier(.2,.8,.3,1.2)_both]">
      <div className="flex items-center gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl" style={{ ...tileStyle(rarity.color), color: rarity.color }}>
          <LineIcon name="gift" className="size-6" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold" style={{ color: rarity.color }}>
            Сюрприз! {rarity.label} нагорода
          </p>
          <p className="text-base leading-snug font-semibold text-white">{win.reward.title}</p>
          <p className={`truncate text-xs ${FAINT}`}>{win.reward.partnerName}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <code className={`rounded-lg border border-amber-300/50 bg-black/60 px-3 py-1.5 font-mono text-lg tracking-widest select-all ${COIN_TEXT}`}>
          {win.item.promoCode}
        </code>
        <CopyButton text={win.item.promoCode} />
        <button type="button" onClick={onDone} className={`ml-auto py-1.5! ${more ? BUTTON_PRIMARY : BUTTON_GHOST}`}>
          {more ? 'Наступний подарунок' : 'Готово'}
        </button>
      </div>
      <p className={`text-xs ${FAINT}`}>Промокод збережено у вашому профілі</p>
    </div>
  );
}

/** TODO(remove-test-spin): test only — grants one gift (5 completed quests) on the mock. Delete before release. */
function TestSpinButton() {
  const grant = useGrantTestSpin();
  return (
    <button
      type="button"
      onClick={() => grant.mutate()}
      disabled={grant.isPending}
      title="Тестова кнопка: зараховує 5 виконаних квестів. Буде видалена"
      className="cursor-pointer rounded-lg border border-dashed border-rose-400/70 px-2.5 py-1 text-xs font-semibold text-rose-300 transition-colors hover:bg-rose-400/10 disabled:cursor-wait disabled:opacity-60"
    >
      Тест: +1 подарунок
    </button>
  );
}
