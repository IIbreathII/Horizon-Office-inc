'use client';

import { useEffect } from 'react';
import { CATEGORIES } from '@/shared/categories';
import { formatDateTime, formatDuration } from '@/shared/format';
import { ICONS } from '@/shared/icons';
import type { Quest } from '@/shared/types';
import { GLASS } from '@/shared/ui/glass';
import { Icon } from '@/shared/ui/Icon';

type QuestPanelProps = {
  /** Quests currently on the map (after the category filter). */
  quests: Quest[];
  /** Selected quest: details view; null: list view. */
  quest: Quest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (quest: Quest) => void;
  onBack: () => void;
  onClaim: (id: string) => void;
  pending: boolean;
};

/** Side panel under the search box: quest list by default, quest details when one is selected. */
export function QuestPanel({ quests, quest, open, onOpenChange, onSelect, onBack, onClaim, pending }: QuestPanelProps) {
  // Esc in the details view goes back to the list (the search input stops its own Esc)
  useEffect(() => {
    if (!open || !quest) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onBack();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, quest, onBack]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        className={`fixed top-16 right-4 z-20 h-10 cursor-pointer rounded-full px-4 text-sm font-medium hover:bg-neutral-800/90 ${GLASS}`}
      >
        Квести · {quests.length}
      </button>
    );
  }

  return (
    <aside className={`fixed top-16 right-4 bottom-4 z-20 flex w-72 flex-col overflow-hidden rounded-2xl ${GLASS}`}>
      <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-white/10 pr-2 pl-4">
        <h2 className="text-sm font-semibold">{quest ? 'Деталі квесту' : `Квести (${quests.length})`}</h2>
        {/* one cross: closes the quest details first, then hides the panel */}
        <button
          type="button"
          onClick={quest ? onBack : () => onOpenChange(false)}
          aria-label={quest ? 'Назад до списку' : 'Сховати панель'}
          className="cursor-pointer rounded-full p-2 opacity-60 hover:bg-white/10 hover:opacity-100"
        >
          <Icon src={ICONS.close} className="size-3.5" />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {quest ? <QuestDetails quest={quest} onClaim={onClaim} pending={pending} /> : <QuestList quests={quests} onSelect={onSelect} />}
      </div>
    </aside>
  );
}

function QuestList({ quests, onSelect }: { quests: Quest[]; onSelect: (quest: Quest) => void }) {
  if (quests.length === 0) return <p className="px-4 py-3 text-sm text-white/60">Немає квестів за цим фільтром</p>;

  return (
    <ul className="py-1">
      {quests.map((quest) => (
        <li key={quest.id}>
          <button
            type="button"
            onClick={() => onSelect(quest)}
            className="flex w-full cursor-pointer items-start gap-3 px-4 py-2.5 text-left hover:bg-white/10"
          >
            <Icon src={CATEGORIES[quest.category].icon} className="mt-0.5 size-5" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{quest.title}</span>
              <span className="block truncate text-xs text-white/60">{quest.address}</span>
              {quest.myParticipation ? (
                <span className="text-xs text-amber-300">Ви записані</span>
              ) : quest.slotsTaken >= quest.slotsTotal ? (
                <span className="text-xs text-white/40">Місць немає</span>
              ) : null}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function QuestDetails({ quest, onClaim, pending }: { quest: Quest; onClaim: (id: string) => void; pending: boolean }) {
  const category = CATEGORIES[quest.category];
  const participation = quest.myParticipation?.status;
  const full = quest.slotsTaken >= quest.slotsTotal;

  return (
    <div className="flex flex-col gap-4 p-4">
      <span
        className="flex items-center gap-1.5 self-start rounded-full px-2.5 py-0.5 text-xs font-medium"
        style={{ backgroundColor: `${category.color}33`, color: category.color }}
      >
        <Icon src={category.icon} className="size-4" /> {category.label}
      </span>

      <div>
        <h3 className="text-lg leading-snug font-semibold">{quest.title}</h3>
        <p className="mt-0.5 text-xs text-white/60">{quest.organization.name}</p>
      </div>

      <p className="text-sm leading-relaxed text-white/80">{quest.description}</p>

      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
        <dt className="text-white/50">Адреса</dt>
        <dd>{quest.address}</dd>
        <dt className="text-white/50">Коли</dt>
        <dd className="first-letter:uppercase">{formatDateTime(quest.startsAt)}</dd>
        <dt className="text-white/50">Тривалість</dt>
        <dd>{formatDuration(quest.durationHours)}</dd>
        <dt className="text-white/50">Нагорода</dt>
        <dd className="flex items-center gap-1 font-medium">
          <span className="text-emerald-300">+{quest.xpReward} XP</span>
          <span className="ml-1 text-amber-300">+{quest.coinsReward}</span>
          <Icon src={ICONS.coin} className="size-4" />
        </dd>
        <dt className="text-white/50">Місця</dt>
        <dd>
          {quest.slotsTaken} / {quest.slotsTotal}
        </dd>
      </dl>

      {/* the API has no "leave quest" endpoint, so joining is final */}
      {participation === 'completed' ? (
        <ActionButton disabled className="bg-emerald-500/20 text-emerald-300">
          Виконано ✓
        </ActionButton>
      ) : participation ? (
        <ActionButton disabled className="bg-amber-400/20 text-amber-200">
          Ви записані
        </ActionButton>
      ) : full ? (
        <ActionButton disabled className="bg-white/10 text-white/50">
          Місць немає
        </ActionButton>
      ) : (
        <ActionButton pending={pending} onClick={() => onClaim(quest.id)} className="bg-[#228fff] text-white hover:bg-[#4da5ff]">
          Записатися
        </ActionButton>
      )}
    </div>
  );
}

function ActionButton({
  children,
  className,
  onClick,
  pending = false,
  disabled = false,
}: {
  children: React.ReactNode;
  className: string;
  onClick?: () => void;
  pending?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || pending}
      className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed ${className}`}
    >
      {pending && <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {children}
    </button>
  );
}
