import { ProfileView } from '@/features/profile/ProfileView';
import { PageShell } from '@/shared/ui/PageShell';

export default function ProfilePage() {
  return (
    <PageShell title="Профіль" subtitle="Ваш рівень, досвід і отримані нагороди">
      <ProfileView />
    </PageShell>
  );
}
