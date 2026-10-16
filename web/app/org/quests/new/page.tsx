'use client';

import { useRouter } from 'next/navigation';
import { QuestForm } from '@/features/org/QuestForm';
import { useCreateQuest } from '@/shared/api/queries';

export default function NewQuestPage() {
  const router = useRouter();
  const create = useCreateQuest();

  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold">Новий квест</h1>
      <QuestForm
        submitLabel="Опублікувати"
        onSubmit={async (input) => {
          const quest = await create.mutateAsync(input);
          router.push(`/org/quests/${quest.id}`);
        }}
      />
    </>
  );
}
