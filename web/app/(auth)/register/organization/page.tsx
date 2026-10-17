import { RequireAuth } from '@/features/auth/guards';
import { OrganizationRegisterForm } from '@/features/auth/OrganizationRegisterForm';
import { ROLES } from '@/features/auth/roles';
import { RegisterCard } from '@/features/auth/ui/RegisterCard';

// Registration step 3 (organizations only, signed in): the organization profile. Then /org.
export default function OrganizationRegisterPage() {
  return (
    <RequireAuth>
      <RegisterCard
        title="Реєстрація організації"
        back={{ href: '/register/role', label: '← Змінити роль' }}
        image={ROLES.organization.image}
        caption="Організація"
      >
        <OrganizationRegisterForm />
      </RegisterCard>
    </RequireAuth>
  );
}
