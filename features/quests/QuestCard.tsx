'use client';

import Link from 'next/link';
import { CATEGORIES } from '@/shared/categories';
import { formatDateTime, formatDuration } from '@/shared/format';
import type { Quest } from '@/shared/types';
import { DISPLAY } from '@/shared/ui/fonts';
import { Icon } from '@/shared/ui/Icon';
import { LineIcon } from '@/shared/ui/LineIcon';
import {
  BUTTON_GHOST,
  COIN_TEXT,
  FAINT,
  INSET,
  PANEL,
  PANEL_HOVER,
  PROGRESS_FILL,
  PROGRESS_TRACK,
  STATUS_CHIP,
  type StatusTone,
  XP_TEXT,
  tileStyle,
} from '@/shared/ui/surface';

/** Above this many slots the pips get too small, so a plain bar is shown instead. */
const MAX_PIPS = 12;

function questStatus(quest: Quest): { tone: StatusTone; label: string } {
  switch (quest.myParticipation?.status) {
    case 'completed':
      return { tone: 'completed', label: 'Виконано' };
    case 'pending_review':
      return { tone: 'joined', label: 'Очікує підтвердження' };
    case 'in_progress':
      return { tone: 'joined', label: 'В процесі' };
    case 'joined':
      return { tone: 'joined', label: 'Ви записані' };
  }
  if (quest.slotsTaken >= quest.slotsTotal) return { tone: 'full', label: 'Місць немає' };
  return { tone: 'available', label: 'Доступно' };
}

/** A quest the volunteer has taken or completed (claiming happens on the map). */
export function QuestCard({ quest }: { quest: Quest }) {
  const category = CATEGORIES[quest.category];
  const status = questStatus(quest);
  const onMap = quest.status === 'open' || quest.status === 'full';

  return (
    <article className={`flex flex-col gap-5 overflow-hidden p-5 ${PANEL} ${PANEL_HOVER}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {/* the category tile matches the quest's marker on the map */}
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl" style={tileStyle(category.color)}>
            <Icon src={category.icon} className="size-5" />
          </span>
          <span className="truncate text-xs font-semibold" style={{ color: category.color }}>
            {category.label}
          </span>
        </div>
        <span className={STATUS_CHIP[status.tone]}>{status.label}</span>
      </div>

      <div className="min-w-0">
        <h3 className={`line-clamp-2 text-lg leading-snug font-semibold text-white ${DISPLAY}`}>{quest.title}</h3>
        <p className={`mt-1 truncate text-xs ${FAINT}`}>{quest.organization.name}</p>
      </div>

      <ul className="flex flex-col gap-2 text-sm text-neutral-200">
        <Meta icon="pin">{quest.address}</Meta>
        <Meta icon="calendar">
          <span className="inline-block first-letter:uppercase">{formatDateTime(quest.startsAt)}</span>
        </Meta>
        <Meta icon="clock">{formatDuration(quest.durationHours)}</Meta>
      </ul>

      <div className={`mt-auto flex flex-col gap-3 p-3 ${INSET}`}>
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-3 text-sm font-bold">
            <span className={`flex items-center gap-1 ${XP_TEXT}`}>
              <LineIcon name="xp" className="size-4" />+{quest.xpReward} XP
            </span>
            <span className={`flex items-center gap-1 ${COIN_TEXT}`}>
              <LineIcon name="coin" className="size-4" />+{quest.coinsReward}
            </span>
          </span>
          <span className={`flex items-center gap-1 text-xs tabular-nums ${FAINT}`}>
            <LineIcon name="users" className="size-3.5" />
            {quest.slotsTaken}/{quest.slotsTotal}
          </span>
        </div>
        <Slots taken={quest.slotsTaken} total={quest.slotsTotal} />
      </div>

      {onMap && (
        <Link href={`/map?quest=${quest.id}`} className={BUTTON_GHOST}>
          <LineIcon name="map" className="size-4" />
          На мапі
        </Link>
      )}
    </article>
  );
}

function Meta({ icon, children }: { icon: 'pin' | 'calendar' | 'clock'; children: React.ReactNode }) {
  return (
    <li className="flex min-w-0 items-center gap-2.5">
      <LineIcon name={icon} className="size-4 text-neutral-400" />
      <span className="min-w-0 truncate">{children}</span>
    </li>
  );
}

/** Taken slots as lit pips (a bar when there are too many slots). */
function Slots({ taken, total }: { taken: number; total: number }) {
  const label = `Зайнято ${taken} з ${total} місць`;
  if (total > MAX_PIPS) {
    const percent = total === 0 ? 100 : Math.min(100, (taken / total) * 100);
    return (
      <div role="img" aria-label={label} className={`h-1.5 overflow-hidden rounded-full ${PROGRESS_TRACK}`}>
        <div className={`h-full rounded-full ${PROGRESS_FILL}`} style={{ width: `${percent}%` }} />
      </div>
    );
  }
  return (
    <div role="img" aria-label={label} className="flex gap-1">
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`h-1.5 flex-1 rounded-full ${i < taken ? PROGRESS_FILL : PROGRESS_TRACK}`} />
      ))}
    </div>
  );
}
