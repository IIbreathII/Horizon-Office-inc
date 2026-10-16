'use client';

import Link from 'next/link';
import { CATEGORIES } from '@/shared/categories';
import { formatDateTime, formatDuration } from '@/shared/format';
import { ICONS } from '@/shared/icons';
import type { Quest } from '@/shared/types';
import { GLASS } from '@/shared/ui/glass';
import { Icon } from '@/shared/ui/Icon';

/** Quest card in the map panel style (dark glass, category chip, rewards in color). */
export function QuestCard({ quest }: { quest: Quest }) {
  const category = CATEGORIES[quest.category];
  const completed = quest.myParticipation?.status === 'completed';

  return (
    <article className={`flex flex-col gap-4 rounded-2xl p-5 ${GLASS}`}>
      <div className="flex items-center justify-between gap-2">
        <span
          className="flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
          style={{ backgroundColor: `${category.color}33`, color: category.color }}
        >
          <Icon src={category.icon} className="size-4" /> {category.label}
        </span>
        {completed && <span className="text-xs font-medium text-emerald-300">Виконано ✓</span>}
      </div>

      <div>
        <h3 className="text-lg leading-snug font-semibold">{quest.title}</h3>
        <p className="mt-0.5 text-xs text-white/60">{quest.organization.name}</p>
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
        <dt className="text-white/50">Адреса</dt>
        <dd>{quest.address}</dd>
        <dt className="text-white/50">Коли</dt>
        <dd className="first-letter:uppercase">
          {formatDateTime(quest.startsAt)} · {formatDuration(quest.durationHours)}
        </dd>
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

      {quest.status !== 'finished' && (
        <Link
          href={`/map?quest=${quest.id}`}
          className="flex items-center justify-center rounded-xl bg-[#228fff] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#4da5ff]"
        >
          На мапі
        </Link>
      )}
    </article>
  );
}
