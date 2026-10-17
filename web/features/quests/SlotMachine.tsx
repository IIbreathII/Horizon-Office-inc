'use client';

import Link from 'next/link';
import { useState } from 'react';
import { CATEGORIES } from '@/shared/categories';
import type { Category, Quest } from '@/shared/types';
import { Icon } from '@/shared/ui/Icon';
import { LineIcon } from '@/shared/ui/LineIcon';
import { SlotLever, SlotLights, SlotReels, randomItem, useSlotReels } from '@/shared/ui/slot';
import { BUTTON_PRIMARY, COIN_TEXT, FAINT, PANEL, XP_TEXT, tileStyle } from '@/shared/ui/surface';

// "Lucky quest": a slot machine that picks a random free quest. Pull the lever (drag it down, click it
// or press Enter) and the three reels stop one after another on the picked quest's category.

const ALL = Object.keys(CATEGORIES) as Category[];

/** Free quests the volunteer can still join. */
const isFree = (q: Quest) => q.status === 'open' && !q.myParticipation && q.slotsTaken < q.slotsTotal;

export function SlotMachine({ quests }: { quests: Quest[] }) {
  const free = quests.filter(isFree);
  const reels = useSlotReels<Category>(['animals', 'ecology', 'city'], ALL);
  const [result, setResult] = useState<Quest | null>(null);

  function spin() {
    if (reels.spinning || free.length === 0) return;
    const quest = randomItem(free);
    setResult(null);
    reels.spin(quest.category, () => setResult(quest));
  }

  const disabled = reels.spinning || free.length === 0;

  return (
    <section className={`flex flex-col gap-5 p-5 sm:p-6 ${PANEL}`} aria-labelledby="slot-title">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h2 id="slot-title" className="text-lg font-semibold text-white">
            Квест удачі
          </h2>
          <p className={`text-sm ${FAINT}`}>Потягніть важіль, і автомат обере для вас вільний квест</p>
        </div>
        <SlotLights active={reels.spinning} />
      </header>

      <div className="flex items-center justify-center gap-4 sm:gap-10">
        <SlotReels strips={reels.strips} armed={reels.armed} renderSymbol={(category) => <CategorySymbol category={category} />} />
        {/* the lever needs room; narrow screens get a plain button instead */}
        <div className="hidden sm:block">
          <SlotLever onPull={spin} disabled={disabled} />
        </div>
      </div>
      <button type="button" onClick={spin} disabled={disabled} className={`w-full sm:hidden ${BUTTON_PRIMARY}`}>
        <LineIcon name="sparkle" className="size-4" />
        {reels.spinning ? 'Крутимо…' : 'Крутнути'}
      </button>

      <div aria-live="polite">
        {free.length === 0 ? (
          <p className={`text-sm ${FAINT}`}>Зараз немає вільних квестів. Загляньте трохи згодом</p>
        ) : result ? (
          <QuestResult quest={result} />
        ) : (
          <p className={`text-sm ${FAINT}`}>{reels.spinning ? 'Крутимо…' : `У барабані ${free.length} вільних квестів`}</p>
        )}
      </div>
    </section>
  );
}

function CategorySymbol({ category }: { category: Category }) {
  return (
    <span className="flex size-13 items-center justify-center rounded-xl sm:size-16" style={tileStyle(CATEGORIES[category].color)}>
      <Icon src={CATEGORIES[category].icon} className="size-7 sm:size-9" />
    </span>
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
