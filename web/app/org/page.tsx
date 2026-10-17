import { OrgQuestList } from '@/features/org/OrgQuestList';
import { PageTitle } from '@/shared/ui/PageTitle';

export default function OrgPage() {
  return (
    <>
      <PageTitle title="Мої квести" subtitle="Квести вашої організації, заявки волонтерів і їхній статус" />
      <OrgQuestList />
    </>
  );
}
