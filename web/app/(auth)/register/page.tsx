import { AccountRegisterForm } from '@/features/auth/AccountRegisterForm';
import { AUTH_BACKGROUND } from '@/features/auth/images';
import { RegisterCard } from '@/features/auth/ui/RegisterCard';

// Registration step 1: the account. Then /register/role.
export default function RegisterPage() {
  return (
    <RegisterCard title="Реєстрація" image={{ ...AUTH_BACKGROUND, photo: true }} loginLink>
      <AccountRegisterForm />
    </RegisterCard>
  );
}
