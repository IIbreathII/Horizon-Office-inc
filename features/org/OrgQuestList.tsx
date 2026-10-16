'use client';

import Link from 'next/link';
import { useMyOrganization, useOrganizationQuests } from '@/shared/api/queries';
import { CATEGORIES } from '@/shared/categories';
import { BUTTON } from '@/shared/ui/PageShell';
import { QUEST_STATUS_LABEL } from './schemas';

/** The organization's own quests (any status). */
export function OrgQuestList() {
  const { data: org, isPending, isError } = useMyOrganization();
  const quests = useOrganizationQuests(org?.id);

  if (isPending) return <p>Завантаження…</p>;
  if (isError) return <p>Не вдалося завантажити організацію</p>;
  if (!org) {
    return (
      <p>
        Спочатку створіть профіль організації:{' '}
        <Link href="/org/profile" className="underline">
          Профіль організації
        </Link>
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-gray-500">{org.name}</p>
        <Link href="/org/quests/new" className={BUTTON}>
          + Новий квест
        </Link>
      </div>
      {quests.isPending ? (
        <p>Завантаження квестів…</p>
      ) : quests.isError ? (
        <p>Не вдалося завантажити квести</p>
      ) : quests.data.length === 0 ? (
        <p className="text-gray-500">Квестів ще немає.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 text-gray-500">
            <tr>
              <th className="py-2">Назва</th>
              <th>Категорія</th>
              <th>Статус</th>
              <th>Волонтери</th>
              <th>Нагорода</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {quests.data.map((quest) => (
              <tr key={quest.id}>
                <td className="py-2">
                  <Link href={`/org/quests/${quest.id}`} className="underline">
                    {quest.title}
                  </Link>
                </td>
                <td>{CATEGORIES[quest.category].label}</td>
                <td>{QUEST_STATUS_LABEL[quest.status]}</td>
                <td>
                  {quest.slotsTaken} / {quest.slotsTotal}
                </td>
                <td>
                  {quest.xpReward} XP · {quest.coinsReward} монет
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
