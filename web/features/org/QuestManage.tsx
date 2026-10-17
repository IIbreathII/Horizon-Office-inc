'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { QuestStatusChange } from '@/shared/api/dto';
import {
  useChangeQuestStatus,
  useCompleteClaim,
  useDecideClaim,
  useDeleteQuest,
  useQuest,
  useQuestClaims,
} from '@/shared/api/queries';
import { CATEGORIES } from '@/shared/categories';
import type { Quest, QuestClaim } from '@/shared/types';
import { Icon } from '@/shared/ui/Icon';
import { LineIcon, type LineIconName } from '@/shared/ui/LineIcon';
import {
  BUTTON_DANGER,
  BUTTON_GHOST,
  BUTTON_PRIMARY,
  BUTTON_SM,
  COIN_TEXT,
  FAINT,
  INSET,
  MUTED,
  PANEL,
  PROGRESS_FILL,
  PROGRESS_TRACK,
  STATUS_CHIP,
  XP_TEXT,
  tileStyle,
} from '@/shared/ui/surface';
import { CLAIM_STATUS_LABEL, QUEST_STATUS_LABEL } from './schemas';
import { CLAIM_STATUS_TONE, QUEST_STATUS_TONE } from './status';

/** Allowed manual transitions (backend QUEST_TRANSITIONS); open = open or full. */
const TRANSITIONS: Partial<Record<Quest['status'], { status: QuestStatusChange; label: string }[]>> = {
  open: [
    { status: 'in_progress', label: 'Почати' },
    { status: 'cancelled', label: 'Скасувати квест' },
  ],
  full: [
    { status: 'in_progress', label: 'Почати' },
    { status: 'cancelled', label: 'Скасувати квест' },
  ],
  in_progress: [
    { status: 'completed', label: 'Завершити' },
    { status: 'cancelled', label: 'Скасувати квест' },
  ],
};

/** Look of each status action: moving forward is the main action, cancelling is destructive. */
const TRANSITION_STYLE: Record<QuestStatusChange, { className: string; icon: LineIconName }> = {
  in_progress: { className: BUTTON_PRIMARY, icon: 'play' },
  completed: { className: BUTTON_PRIMARY, icon: 'flag' },
  cancelled: { className: BUTTON_DANGER, icon: 'x' },
};

const EDITABLE: Quest['status'][] = ['open', 'full', 'in_progress'];

/** Organization view of one quest: status actions, edit / delete, participants. */
export function QuestManage({ id }: { id: string }) {
  const router = useRouter();
  const { data: quest, isPending, isError } = useQuest(id);
  const changeStatus = useChangeQuestStatus();
  const remove = useDeleteQuest();

  if (isPending) return <p className={`text-sm ${FAINT}`}>Завантаження…</p>;
  if (isError) return <p className={`p-5 text-sm text-rose-300 ${PANEL}`}>Квест не знайдено</p>;

  // one click: the quest is deleted (archived if it has claims) and the page goes up to the quest list;
  // replace, so «back» does not return to a quest that is gone. Errors are shown from remove.error.
  function onDelete() {
    remove.mutate(id, { onSuccess: () => router.replace('/org') });
  }

  const error = changeStatus.error ?? remove.error;
  const category = CATEGORIES[quest.category];
  const percent = quest.slotsTotal === 0 ? 0 : Math.min(100, (quest.slotsTaken / quest.slotsTotal) * 100);

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <section className={`flex flex-col gap-5 p-6 ${PANEL}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl" style={tileStyle(category.color)}>
              <Icon src={category.icon} className="size-6" />
            </span>
            <span className="text-sm font-semibold" style={{ color: category.color }}>
              {category.label}
            </span>
          </span>
          <span className={STATUS_CHIP[QUEST_STATUS_TONE[quest.status]]}>{QUEST_STATUS_LABEL[quest.status]}</span>
        </div>

        <div>
          <h2 className="text-2xl leading-snug font-semibold text-white">{quest.title}</h2>
          {quest.description && <p className={`mt-2 text-sm leading-relaxed ${MUTED}`}>{quest.description}</p>}
        </div>

        <p className="flex items-center gap-2 text-sm text-neutral-200">
          <LineIcon name="pin" className="size-4 text-neutral-400" />
          {quest.address}
        </p>

        <div className={`grid grid-cols-2 gap-4 p-4 ${INSET}`}>
          <div className="flex flex-col gap-2">
            <span className={`text-xs ${FAINT}`}>Волонтери</span>
            <span className="flex items-center gap-1.5 text-lg font-semibold text-white tabular-nums">
              <LineIcon name="users" className="size-4 text-neutral-400" />
              {quest.slotsTaken} / {quest.slotsTotal}
            </span>
            <span className={`h-1.5 overflow-hidden rounded-full ${PROGRESS_TRACK}`}>
              <span className={`block h-full rounded-full ${PROGRESS_FILL}`} style={{ width: `${percent}%` }} />
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <span className={`text-xs ${FAINT}`}>Нагорода волонтеру</span>
            <span className="flex flex-wrap items-center gap-3 text-lg font-semibold">
              <span className={`flex items-center gap-1 ${XP_TEXT}`}>
                <LineIcon name="xp" className="size-4" />
                {quest.xpReward} XP
              </span>
              <span className={`flex items-center gap-1 ${COIN_TEXT}`}>
                <LineIcon name="coin" className="size-4" />
                {quest.coinsReward}
              </span>
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-white/[0.06] pt-5">
          {TRANSITIONS[quest.status]?.map((t) => (
            <button
              key={t.status}
              type="button"
              disabled={changeStatus.isPending}
              onClick={() => changeStatus.mutate({ id, status: t.status })}
              className={TRANSITION_STYLE[t.status].className}
            >
              <LineIcon name={TRANSITION_STYLE[t.status].icon} className="size-4" />
              {t.label}
            </button>
          ))}
          {EDITABLE.includes(quest.status) && (
            <Link href={`/org/quests/${id}/edit`} className={BUTTON_GHOST}>
              <LineIcon name="pencil" className="size-4" />
              Редагувати
            </Link>
          )}
          {/* stays disabled after success too, while the page navigates away */}
          <button type="button" disabled={remove.isPending || remove.isSuccess} onClick={onDelete} className={BUTTON_DANGER}>
            <LineIcon name="trash" className="size-4" />
            {remove.isPending || remove.isSuccess ? 'Видалення…' : 'Видалити'}
          </button>
        </div>
        {error && <p className="text-sm text-rose-300">{error.message}</p>}
      </section>

      <Participants questId={id} />
    </div>
  );
}

function Participants({ questId }: { questId: string }) {
  const { data: claims, isPending, isError } = useQuestClaims(questId);
  const decide = useDecideClaim();
  const complete = useCompleteClaim();
  const busy = decide.isPending || complete.isPending;
  const error = decide.error ?? complete.error;

  return (
    <section className={`overflow-hidden ${PANEL}`}>
      <h2 className="flex items-center gap-2.5 border-b border-white/[0.06] px-5 py-4 text-base font-semibold text-white">
        <LineIcon name="users" className="size-4 text-amber-300" />
        Учасники
        {claims && <span className={`ml-auto rounded-md bg-white/[0.07] px-1.5 text-xs leading-5 tabular-nums ${MUTED}`}>{claims.length}</span>}
      </h2>
      {isPending ? (
        <p className={`px-5 py-4 text-sm ${FAINT}`}>Завантаження…</p>
      ) : isError ? (
        <p className="px-5 py-4 text-sm text-rose-300">Не вдалося завантажити заявки</p>
      ) : claims.length === 0 ? (
        <p className={`px-5 py-6 text-sm ${FAINT}`}>Заявок ще немає. Вони з’являться, щойно волонтери запишуться на мапі.</p>
      ) : (
        <ul className="divide-y divide-white/[0.06]">
          {claims.map((claim) => (
            <ClaimRow
              key={claim.id}
              claim={claim}
              busy={busy}
              onDecide={(status) => decide.mutate({ questId, claimId: claim.id, status })}
              onComplete={() => complete.mutate({ questId, claimId: claim.id })}
            />
          ))}
        </ul>
      )}
      {error && <p className="px-5 pb-4 text-sm text-rose-300">{error.message}</p>}
    </section>
  );
}

function ClaimRow({
  claim,
  busy,
  onDecide,
  onComplete,
}: {
  claim: QuestClaim;
  busy: boolean;
  onDecide: (status: 'approved' | 'rejected') => void;
  onComplete: () => void;
}) {
  const initials = claim.volunteer.name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <li className="flex flex-col gap-3 px-5 py-4">
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-linear-to-br from-[#262629] to-[#0a0a0b] text-sm font-semibold text-white ring-1 ring-white/15">
          {claim.volunteer.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- user photos come from arbitrary hosts
            <img src={claim.volunteer.photoUrl} alt="" className="size-full object-cover" />
          ) : (
            initials
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-white">{claim.volunteer.name}</span>
          <span className="text-xs text-amber-300">Рівень {claim.volunteer.level}</span>
        </span>
        <span className={STATUS_CHIP[CLAIM_STATUS_TONE[claim.status]]}>{CLAIM_STATUS_LABEL[claim.status]}</span>
      </div>
      {(claim.status === 'pending' || claim.status === 'approved') && (
        <div className="flex flex-wrap gap-2 pl-13">
          {claim.status === 'pending' ? (
            <button type="button" disabled={busy} onClick={() => onDecide('approved')} className={`${BUTTON_PRIMARY} ${BUTTON_SM}`}>
              <LineIcon name="check" className="size-3.5" />
              Схвалити
            </button>
          ) : (
            <button type="button" disabled={busy} onClick={onComplete} className={`${BUTTON_PRIMARY} ${BUTTON_SM}`}>
              <LineIcon name="trophy" className="size-3.5" />
              Зарахувати виконання
            </button>
          )}
          <button type="button" disabled={busy} onClick={() => onDecide('rejected')} className={`${BUTTON_DANGER} ${BUTTON_SM}`}>
            <LineIcon name="x" className="size-3.5" />
            Відхилити
          </button>
        </div>
      )}
    </li>
  );
}
