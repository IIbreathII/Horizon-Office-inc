'use client';

import { useParams } from 'next/navigation';
import { Suspense } from 'react';
import { QuestManage } from '@/features/org/QuestManage';
import { PageTitle } from '@/shared/ui/PageTitle';

// useParams needs a Suspense boundary in Next.js (cacheComponents)
export default function OrgQuestPage() {
  return (
    <>
      <PageTitle title="Керування квестом" back={{ href: '/org', label: 'Мої квести' }} />
      <Suspense fallback={<p className="text-sm text-neutral-400">Завантаження…</p>}>
        <QuestManageById />
      </Suspense>
    </>
  );
}

function QuestManageById() {
  const { id } = useParams<{ id: string }>();
  return <QuestManage id={id} />;
}
