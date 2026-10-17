'use client';

import { useState } from 'react';
import { useQuests } from '@/shared/api/queries';
import type { Quest } from '@/shared/types';
import { DISPLAY } from '@/shared/ui/fonts';
import { LineIcon, type LineIconName } from '@/shared/ui/LineIcon';
import { ACCENT_FILL, ACCENT_TEXT, BUTTON_GHOST, CARD, FAINT, PANEL, SKELETON } from '@/shared/ui/surface';
import { QuestCard } from './QuestCard';
import { SlotMachine } from './SlotMachine';

type Tab = { id: string; title: string; empty: string; icon: LineIconName; filter: (q: Quest) => boolean };

// The volunteer's own quests; new quests are found and claimed on the map.
const TABS: Tab[] = [
  {
    id: 'joined',
    title: 'Взяті',
    empty: 'Знайдіть квест на мапі та запишіться на нього',
    icon: 'ticket',
    // in progress and awaiting confirmation are still "taken"; the card's status chip tells them apart
    filter: (q) => ['joined', 'in_progress', 'pending_review'].includes(q.myParticipation?.status ?? ''),
  },
  {
    id: 'completed',
    title: 'Виконані',
    empty: 'Виконайте перший квест, і він з’явиться тут разом з нагородою',
    icon: 'trophy',
    filter: (q) => q.myParticipation?.status === 'completed',
  },
];

export function QuestBoard() {
  const { data: quests, isPending, isError } = useQuests();
  const [activeId, setActiveId] = useState(TABS[0].id);
  const [slotOpen, setSlotOpen] = useState(false);

  if (isPending) return <BoardSkeleton />;
  if (isError) return <p className={`${CARD} text-sm text-rose-300`}>Не вдалося завантажити квести. Оновіть сторінку</p>;

  const active = TABS.find((t) => t.id === activeId) ?? TABS[0];
  const items = quests.filter(active.filter);

  // arrow keys move between tabs (WAI-ARIA tabs pattern)
  function onTabKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = TABS[(index + step + TABS.length) % TABS.length];
    setActiveId(next.id);
    document.getElementById(`tab-${next.id}`)?.focus();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Статус квестів" className={`flex max-w-full gap-1 self-start overflow-x-auto p-1.5 ${PANEL}`}>
          {TABS.map((tab, i) => {
            const selected = tab.id === active.id;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls="quest-tabpanel"
                tabIndex={selected ? 0 : -1}
                onClick={() => setActiveId(tab.id)}
                onKeyDown={(e) => onTabKeyDown(e, i)}
                className={`flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-xl px-4 text-sm font-semibold whitespace-nowrap transition outline-none focus-visible:ring-2 focus-visible:ring-[#fbbf24]/70 ${
                  selected ? ACCENT_FILL : 'text-neutral-300 hover:bg-white/[0.06] hover:text-white'
                }`}
              >
                <LineIcon name={tab.icon} className="size-4" />
                {tab.title}
                <span className={`min-w-6 rounded-md px-1.5 text-xs leading-5 tabular-nums ${selected ? 'bg-[#050505]/10' : 'bg-white/[0.07]'}`}>
                  {quests.filter(tab.filter).length}
                </span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => setSlotOpen((open) => !open)}
          aria-expanded={slotOpen}
          aria-controls="quest-slot"
          className={`${BUTTON_GHOST} border-amber-300/60! text-amber-200! shadow-[0_0_16px_-4px_rgba(252,211,77,0.6)]`}
        >
          <LineIcon name="sparkle" className="size-4" />
          {slotOpen ? 'Сховати автомат' : 'Крутнути удачу'}
        </button>
      </div>

      {/* slot machine slides open; inert while closed so its controls are not focusable */}
      <div
        id="quest-slot"
        inert={!slotOpen}
        className={`grid transition-[grid-template-rows,opacity] duration-500 ease-out motion-reduce:transition-none ${
          slotOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <SlotMachine quests={quests} />
        </div>
      </div>

      <section id="quest-tabpanel" role="tabpanel" aria-labelledby={`tab-${active.id}`}>
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-14 text-center">
            <LineIcon name={active.icon} className={`size-9 ${ACCENT_TEXT}`} />
            <p className={`text-lg font-semibold text-white ${DISPLAY}`}>Поки порожньо</p>
            <p className={`max-w-sm text-sm ${FAINT}`}>{active.empty}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {items.map((quest) => (
              <QuestCard key={quest.id} quest={quest} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function BoardSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Завантаження квестів">
      <div className={`h-13 w-96 max-w-full ${PANEL}`} />
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className={`flex flex-col gap-4 ${CARD}`}>
            <div className={`size-11 rounded-xl! ${SKELETON}`} />
            <div className={`h-6 w-3/4 ${SKELETON}`} />
            <div className={`h-4 w-1/2 ${SKELETON}`} />
            <div className={`h-2 w-full ${SKELETON}`} />
            <div className={`h-10 w-full rounded-xl! ${SKELETON}`} />
          </div>
        ))}
      </div>
    </div>
  );
}
