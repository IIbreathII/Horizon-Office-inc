'use client';

import Link from 'next/link';
import { CATEGORIES } from '@/shared/categories';
import { formatDateTime, formatDuration } from '@/shared/format';
import { ICONS } from '@/shared/icons';
import type { Quest } from '@/shared/types';
import { Icon } from '@/shared/ui/Icon';
import { BUTTON, CARD } from '@/shared/ui/PageShell';

export function QuestCard({ quest }: { quest: Quest }) {
  const category = CATEGORIES[quest.category];

  return (
    <article className={`flex flex-col gap-2 ${CARD}`}>
      <p className="flex items-center gap-1.5 text-sm text-gray-500">
        <Icon src={category.icon} className="size-4" /> {category.label}
      </p>
      <h3 className="font-semibold">{quest.title}</h3>
      <p className="text-sm text-gray-500">{quest.organization.name}</p>
      <p className="text-sm">{quest.address}</p>
      <p className="text-sm first-letter:uppercase">
        {formatDateTime(quest.startsAt)} · {formatDuration(quest.durationHours)}
      </p>
      <p className="flex items-center gap-1 text-sm">
        +{quest.xpReward} XP · +{quest.coinsReward} <Icon src={ICONS.coin} className="size-4" /> · місця {quest.slotsTaken}/
        {quest.slotsTotal}
      </p>
      {quest.status !== 'finished' && (
        <Link href={`/map?quest=${quest.id}`} className={`mt-2 self-start ${BUTTON}`}>
          На мапі
        </Link>
      )}
    </article>
  );
}
