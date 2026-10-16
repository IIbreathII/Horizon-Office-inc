'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMyOrganization, useOrganizationQuests } from '@/shared/api/queries';
import { CATEGORIES } from '@/shared/categories';
import type { Quest } from '@/shared/types';
import { Icon } from '@/shared/ui/Icon';
import { LineIcon, type LineIconName } from '@/shared/ui/LineIcon';
import {
  BUTTON_PRIMARY,
  COIN_TEXT,
  FAINT,
  MUTED,
  PANEL,
  PANEL_HOVER,
  PROGRESS_FILL,
  PROGRESS_TRACK,
  SKELETON,
  STATUS_CHIP,
  XP_TEXT,
  tileStyle,
} from '@/shared/ui/surface';
import { QUEST_STATUS_LABEL } from './schemas';
import { QUEST_STATUS_TONE } from './status';

/** The organization's own quests (any status). */
export function OrgQuestList() {
  const { data: org, isPending, isError } = useMyOrganization();
  const quests = useOrganizationQuests(org?.id);

  if (isPending) return <ListSkeleton />;
  if (isError) return <p className={`p-5 text-sm text-rose-300 ${PANEL}`}>Не вдалося завантажити організацію. Оновіть сторінку</p>;
  if (!org) {
    return (
      <div className={`flex flex-col items-start gap-4 p-6 ${PANEL}`}>
        <span className="flex size-12 items-center justify-center rounded-xl bg-amber-300/15 text-amber-300 ring-1 ring-amber-300/60">
          <LineIcon name="building" className="size-6" />
        </span>
        <div>
          <p className="text-lg font-semibold text-white">Спочатку створіть профіль організації</p>
          <p className={`mt-1 text-sm ${MUTED}`}>Без профілю не можна публікувати квести.</p>
        </div>
        <Link href="/org/profile" className={BUTTON_PRIMARY}>
          Створити профіль
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="flex items-center gap-3 text-lg font-semibold text-white">
          <OrgLogo url={org.logoUrl} />
          {org.name}
        </p>
        <Link href="/org/quests/new" className={BUTTON_PRIMARY}>
          <LineIcon name="plus" className="size-4" />
          Новий квест
        </Link>
      </div>

      {quests.isPending ? (
        <ListSkeleton />
      ) : quests.isError ? (
        <p className={`p-5 text-sm text-rose-300 ${PANEL}`}>Не вдалося завантажити квести. Оновіть сторінку</p>
      ) : quests.data.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/15 px-6 py-14 text-center">
          <LineIcon name="list" className="size-9 text-amber-300" />
          <p className="text-lg font-semibold text-white">Квестів ще немає</p>
          <p className={`max-w-sm text-sm ${FAINT}`}>Створіть перший квест, і волонтери побачать його на мапі міста.</p>
        </div>
      ) : (
        <>
          <Stats quests={quests.data} />
          <ul className={`divide-y divide-white/[0.06] overflow-hidden ${PANEL}`}>
            {quests.data.map((quest) => (
              <QuestRow key={quest.id} quest={quest} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

/** Organization logo; falls back to an icon when there is no URL or the image fails to load. */
function OrgLogo({ url }: { url: string | null | undefined }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="flex size-10 items-center justify-center overflow-hidden rounded-xl bg-white/[0.06] ring-1 ring-white/15">
      {url && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element -- logos come from arbitrary hosts
        <img src={url} alt="" onError={() => setFailed(true)} className="size-full object-cover" />
      ) : (
        <LineIcon name="building" className="size-5 text-neutral-300" />
      )}
    </span>
  );
}

/** Counters by status, so the organization sees at a glance what needs attention. */
function Stats({ quests }: { quests: Quest[] }) {
  const count = (statuses: Quest['status'][]) => quests.filter((q) => statuses.includes(q.status)).length;
  const items: { label: string; value: number; icon: LineIconName; color: string }[] = [
    { label: 'Відкриті', value: count(['open', 'full']), icon: 'sparkle', color: 'text-white' },
    { label: 'Тривають', value: count(['in_progress']), icon: 'clock', color: 'text-amber-300' },
    { label: 'Завершені', value: count(['finished']), icon: 'trophy', color: 'text-emerald-300' },
  ];
  return (
    <ul className="grid grid-cols-3 gap-3">
      {items.map((item) => (
        <li key={item.label} className={`flex flex-col gap-1 p-4 ${PANEL}`}>
          <span className={`flex items-center gap-2 text-2xl font-semibold tabular-nums ${item.color}`}>
            <LineIcon name={item.icon} className="size-5" />
            {item.value}
          </span>
          <span className={`text-xs ${FAINT}`}>{item.label}</span>
        </li>
      ))}
    </ul>
  );
}

function QuestRow({ quest }: { quest: Quest }) {
  const category = CATEGORIES[quest.category];
  const percent = quest.slotsTotal === 0 ? 0 : Math.min(100, (quest.slotsTaken / quest.slotsTotal) * 100);
  return (
    <li>
      <Link
        href={`/org/quests/${quest.id}`}
        className={`group flex flex-wrap items-center gap-x-5 gap-y-3 px-5 py-4 outline-none focus-visible:bg-white/[0.06] ${PANEL_HOVER} rounded-none! border-0!`}
      >
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl" style={tileStyle(category.color)}>
          <Icon src={category.icon} className="size-6" />
        </span>
        <span className="min-w-48 flex-1">
          <span className="block truncate text-base font-semibold text-white group-hover:text-amber-200">{quest.title}</span>
          <span className={`block truncate text-xs ${FAINT}`}>
            {category.label} · {quest.address}
          </span>
        </span>
        <span className={STATUS_CHIP[QUEST_STATUS_TONE[quest.status]]}>{QUEST_STATUS_LABEL[quest.status]}</span>
        <span className="flex w-28 flex-col gap-1.5">
          <span className={`flex items-center gap-1 text-xs tabular-nums ${MUTED}`}>
            <LineIcon name="users" className="size-3.5" />
            {quest.slotsTaken} / {quest.slotsTotal}
          </span>
          <span className={`h-1.5 overflow-hidden rounded-full ${PROGRESS_TRACK}`}>
            <span className={`block h-full rounded-full ${PROGRESS_FILL}`} style={{ width: `${percent}%` }} />
          </span>
        </span>
        <span className="flex w-36 items-center gap-3 text-sm font-semibold">
          <span className={`flex items-center gap-1 ${XP_TEXT}`}>
            <LineIcon name="xp" className="size-4" />
            {quest.xpReward}
          </span>
          <span className={`flex items-center gap-1 ${COIN_TEXT}`}>
            <LineIcon name="coin" className="size-4" />
            {quest.coinsReward}
          </span>
        </span>
        <LineIcon name="arrowLeft" className="size-4 rotate-180 text-neutral-500 transition-colors group-hover:text-amber-300" />
      </Link>
    </li>
  );
}

function ListSkeleton() {
  return (
    <div className={`flex flex-col gap-4 p-5 ${PANEL}`} aria-busy="true" aria-label="Завантаження квестів">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-4">
          <div className={`size-11 rounded-xl! ${SKELETON}`} />
          <div className={`h-5 flex-1 ${SKELETON}`} />
          <div className={`h-5 w-24 ${SKELETON}`} />
        </div>
      ))}
    </div>
  );
}
