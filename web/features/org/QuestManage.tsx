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
import { BUTTON, CARD } from '@/shared/ui/PageShell';
import { CLAIM_STATUS_LABEL, QUEST_STATUS_LABEL } from './schemas';

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

const EDITABLE: Quest['status'][] = ['open', 'full', 'in_progress'];

/** Organization view of one quest: status actions, edit / delete, participants. */
export function QuestManage({ id }: { id: string }) {
  const router = useRouter();
  const { data: quest, isPending, isError } = useQuest(id);
  const changeStatus = useChangeQuestStatus();
  const remove = useDeleteQuest();

  if (isPending) return <p>Завантаження…</p>;
  if (isError) return <p>Квест не знайдено</p>;

  async function onDelete() {
    if (!window.confirm('Видалити квест? Якщо є заявки, квест буде архівовано.')) return;
    try {
      await remove.mutateAsync(id);
      router.push('/org');
    } catch {
      // shown from remove.error
    }
  }

  const error = changeStatus.error ?? remove.error;

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <section className={`flex flex-col gap-2 ${CARD}`}>
        <p className="text-sm text-gray-500">
          {CATEGORIES[quest.category].label} · {QUEST_STATUS_LABEL[quest.status]}
        </p>
        <h2 className="text-xl font-semibold">{quest.title}</h2>
        {quest.description && <p className="text-sm">{quest.description}</p>}
        <p className="text-sm">{quest.address}</p>
        <p className="text-sm">
          Волонтери: {quest.slotsTaken} / {quest.slotsTotal} · Нагорода: {quest.xpReward} XP, {quest.coinsReward} монет
        </p>

        <div className="mt-2 flex flex-wrap gap-2">
          {TRANSITIONS[quest.status]?.map((t) => (
            <button
              key={t.status}
              type="button"
              disabled={changeStatus.isPending}
              onClick={() => changeStatus.mutate({ id, status: t.status })}
              className={BUTTON}
            >
              {t.label}
            </button>
          ))}
          {EDITABLE.includes(quest.status) && (
            <Link href={`/org/quests/${id}/edit`} className={BUTTON}>
              Редагувати
            </Link>
          )}
          <button type="button" disabled={remove.isPending} onClick={onDelete} className={BUTTON}>
            Видалити
          </button>
        </div>
        {error && <p className="text-sm text-red-600">{error.message}</p>}
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
    <section className={CARD}>
      <h2 className="mb-3 font-semibold">Учасники</h2>
      {isPending ? (
        <p className="text-sm">Завантаження…</p>
      ) : isError ? (
        <p className="text-sm">Не вдалося завантажити заявки</p>
      ) : claims.length === 0 ? (
        <p className="text-sm text-gray-500">Заявок ще немає.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-gray-100">
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
      {error && <p className="mt-2 text-sm text-red-600">{error.message}</p>}
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
  return (
    <li className="flex items-center gap-3 py-2 text-sm">
      <span className="flex-1">
        {claim.volunteer.name} <span className="text-gray-500">· рівень {claim.volunteer.level}</span>
      </span>
      <span className="text-gray-500">{CLAIM_STATUS_LABEL[claim.status]}</span>
      {claim.status === 'pending' && (
        <>
          <button type="button" disabled={busy} onClick={() => onDecide('approved')} className={BUTTON}>
            Схвалити
          </button>
          <button type="button" disabled={busy} onClick={() => onDecide('rejected')} className={BUTTON}>
            Відхилити
          </button>
        </>
      )}
      {claim.status === 'approved' && (
        <>
          <button type="button" disabled={busy} onClick={onComplete} className={BUTTON}>
            Зарахувати виконання
          </button>
          <button type="button" disabled={busy} onClick={() => onDecide('rejected')} className={BUTTON}>
            Відхилити
          </button>
        </>
      )}
    </li>
  );
}
