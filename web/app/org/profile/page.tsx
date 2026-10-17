import { OrganizationProfile } from '@/features/org/OrganizationForm';
import { PageTitle } from '@/shared/ui/PageTitle';

export default function OrgProfilePage() {
  return (
    <>
      <PageTitle title="Профіль організації" subtitle="Ці дані бачать волонтери на мапі та в картці квесту" />
      <OrganizationProfile />
    </>
  );
}
