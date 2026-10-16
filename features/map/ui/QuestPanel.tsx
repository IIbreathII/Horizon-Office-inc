'use client';

import { useEffect, useState } from 'react';
import { CATEGORIES } from '@/shared/categories';
import type { Quest } from '@/shared/types';

type QuestPanelProps = {
  quest: Quest | null;
  onClose: () => void;
  onJoin: (id: string) => void;
  onLeave: (id: string) => void;
  pending: boolean;
};

const dateTimeFormat = new Intl.DateTimeFormat('uk-UA', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Kyiv',
});

export function QuestPanel({ quest, onClose, onJoin, onLeave, pending }: QuestPanelProps) {
  // Keep the last quest so the panel slides out with its content instead of going blank
  const [shown, setShown] = useState(quest);
  if (quest && quest !== shown) setShown(quest);

  useEffect(() => {
    if (!quest) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [quest, onClose]);

  const open = quest !== null;

  return (
    <aside
      inert={!open}
      aria-hidden={!open}
      className={`fixed top-16 right-0 bottom-0 z-20 w-96 overflow-y-auto bg-white text-slate-900 transition-transform duration-300 ${open ? 'translate-x-0 shadow-2xl' : 'translate-x-full'}`}
    >
      {shown && <QuestDetails quest={shown} onClose={onClose} onJoin={onJoin} onLeave={onLeave} pending={pending} />}
    </aside>
  );
}

function QuestDetails({ quest, onClose, onJoin, onLeave, pending }: Omit<QuestPanelProps, 'quest'> & { quest: Quest }) {
  const category = CATEGORIES[quest.category];
  const joined = quest.myParticipation?.status === 'joined';
  const full = quest.slotsTaken >= quest.slotsTotal;

  return (
    <div className="flex min-h-full flex-col gap-5 p-6">
      <div className="flex items-start justify-between gap-4">
        <span
          className="rounded-full px-3 py-1 text-sm font-medium"
          style={{ backgroundColor: `${category.color}22`, color: category.color }}
        >
          {category.emoji} {category.label}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрити"
          className="-mt-1 -mr-2 cursor-pointer rounded-full px-2 text-2xl leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          ×
        </button>
      </div>

      <div>
        <h2 className="text-2xl font-semibold leading-tight">{quest.title}</h2>
        <p className="mt-1 text-sm text-slate-500">{quest.organization.name}</p>
      </div>

      <p className="leading-relaxed text-slate-700">{quest.description}</p>

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-slate-500">Адреса</dt>
        <dd>{quest.address}</dd>
        <dt className="text-slate-500">Коли</dt>
        <dd className="first-letter:uppercase">{dateTimeFormat.format(new Date(quest.startsAt))}</dd>
        <dt className="text-slate-500">Тривалість</dt>
        <dd>{quest.durationHours.toLocaleString('uk-UA')} год</dd>
        <dt className="text-slate-500">Нагорода</dt>
        <dd className="font-medium text-emerald-600">+{quest.xpReward} XP</dd>
        <dt className="text-slate-500">Місця</dt>
        <dd>
          {quest.slotsTaken} / {quest.slotsTotal}
        </dd>
      </dl>

      <div className="mt-auto">
        {joined ? (
          <ActionButton pending={pending} onClick={() => onLeave(quest.id)} className="bg-yellow-100 text-yellow-900 hover:bg-yellow-200">
            Ви записані · Скасувати
          </ActionButton>
        ) : full ? (
          <ActionButton disabled className="bg-slate-100 text-slate-400">
            Місць немає
          </ActionButton>
        ) : (
          <ActionButton pending={pending} onClick={() => onJoin(quest.id)} className="bg-blue-600 text-white hover:bg-blue-700">
            Записатися
          </ActionButton>
        )}
      </div>
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
      className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-3 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${className}`}
    >
      {pending && <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {children}
    </button>
  );
}
