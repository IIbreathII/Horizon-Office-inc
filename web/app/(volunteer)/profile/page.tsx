import { SignOutButton } from '@/features/auth/SignOutButton';
import { ProfileView } from '@/features/profile/ProfileView';
import { PageShell } from '@/shared/ui/PageShell';
import { BUTTON_GHOST, BUTTON_SM } from '@/shared/ui/surface';

export default function ProfilePage() {
  return (
    <PageShell
      title="Профіль"
      subtitle="Ваш рівень, досвід і отримані нагороди"
      actions={<SignOutButton className={`${BUTTON_GHOST} ${BUTTON_SM}`} />}
    >
      <ProfileView />
    </PageShell>
  );
}
