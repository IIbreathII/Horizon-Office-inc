'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Suspense } from 'react';
import { QuestManage } from '@/features/org/QuestManage';

// useParams needs a Suspense boundary in Next.js (cacheComponents)
export default function OrgQuestPage() {
  return (
    <>
      <Link href="/org" className="text-sm underline">
        ← Мої квести
      </Link>
      <h1 className="mt-2 mb-6 text-2xl font-semibold">Квест</h1>
      <Suspense fallback={<p>Завантаження…</p>}>
        <QuestManageById />
      </Suspense>
    </>
  );
}

function QuestManageById() {
  const { id } = useParams<{ id: string }>();
  return <QuestManage id={id} />;
}
