import { OrgQuestList } from '@/features/org/OrgQuestList';

export default function OrgPage() {
  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold">Мої квести</h1>
      <OrgQuestList />
    </>
  );
}
