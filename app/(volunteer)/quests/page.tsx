import { QuestBoard } from '@/features/quests/QuestBoard';
import { PageShell } from '@/shared/ui/PageShell';

export default function QuestsPage() {
  return (
    <PageShell title="Квести">
      <QuestBoard />
    </PageShell>
  );
}
