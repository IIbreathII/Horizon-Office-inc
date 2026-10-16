'use client';

import { useQuests } from '@/shared/api/queries';
import type { Quest } from '@/shared/types';
import { QuestCard } from './QuestCard';

// The volunteer's own quests (§7); new quests are found and claimed on the map.
const COLUMNS: { title: string; empty: string; filter: (q: Quest) => boolean }[] = [
  {
    title: 'Мої',
    empty: 'Запишіться на квест на мапі',
    filter: (q) => ['joined', 'in_progress', 'pending_review'].includes(q.myParticipation?.status ?? ''),
  },
  {
    title: 'Завершені',
    empty: 'Тут з’являться виконані квести',
    filter: (q) => q.myParticipation?.status === 'completed',
  },
];

export function QuestBoard() {
  const { data: quests, isPending, isError } = useQuests();

  if (isPending) return <p>Завантаження квестів…</p>;
  if (isError) return <p>Не вдалося завантажити квести</p>;

  return (
    <div className="grid grid-cols-2 items-start gap-6">
      {COLUMNS.map((column) => {
        const items = quests.filter(column.filter);
        return (
          <section key={column.title} className="flex flex-col gap-3">
            <h2 className="font-semibold">
              {column.title} ({items.length})
            </h2>
            {items.length === 0 && <p className="text-sm text-gray-500">{column.empty}</p>}
            {items.map((quest) => (
              <QuestCard key={quest.id} quest={quest} />
            ))}
          </section>
        );
      })}
    </div>
  );
}
