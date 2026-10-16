'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { QuestForm } from '@/features/org/QuestForm';
import { useQuest, useUpdateQuest } from '@/shared/api/queries';

// useParams needs a Suspense boundary in Next.js (cacheComponents)
export default function EditQuestPage() {
  return (
    <Suspense fallback={<p>Завантаження…</p>}>
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
      <Link href={`/org/quests/${id}`} className="text-sm underline">
        ← До квесту
      </Link>
      <h1 className="mt-2 mb-6 text-2xl font-semibold">Редагування квесту</h1>
      {isPending ? (
        <p>Завантаження…</p>
      ) : isError ? (
        <p>Квест не знайдено</p>
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
