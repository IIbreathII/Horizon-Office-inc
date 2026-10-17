'use client';

import { useRouter } from 'next/navigation';
import { QuestForm } from '@/features/org/QuestForm';
import { useCreateQuest } from '@/shared/api/queries';
import { PageTitle } from '@/shared/ui/PageTitle';

export default function NewQuestPage() {
  const router = useRouter();
  const create = useCreateQuest();

  return (
    <>
      <PageTitle
        title="Новий квест"
        subtitle="Опишіть завдання та поставте точку на мапі — квест одразу з’явиться у волонтерів"
        back={{ href: '/org', label: 'Мої квести' }}
      />
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
