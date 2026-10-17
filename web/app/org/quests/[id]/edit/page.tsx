'use client';

import { useParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { QuestForm } from '@/features/org/QuestForm';
import { useQuest, useUpdateQuest } from '@/shared/api/queries';
import { PageTitle } from '@/shared/ui/PageTitle';

// useParams needs a Suspense boundary in Next.js (cacheComponents)
export default function EditQuestPage() {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-400">Завантаження…</p>}>
      <EditQuest />
    </Suspense>
  );
}

function EditQuest() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: quest, isPending, isError } = useQuest(id);
  const update = useUpdateQuest();

  return (
    <>
      <PageTitle title="Редагування квесту" back={{ href: `/org/quests/${id}`, label: 'До квесту' }} />
      {isPending ? (
        <p className="text-sm text-neutral-400">Завантаження…</p>
      ) : isError ? (
        <p className="text-sm text-rose-300">Квест не знайдено</p>
      ) : (
        <QuestForm
          initial={quest}
          submitLabel="Зберегти"
          onSubmit={async (input) => {
            await update.mutateAsync({ id, input });
            router.push(`/org/quests/${id}`);
          }}
        />
      )}
    </>
  );
}
