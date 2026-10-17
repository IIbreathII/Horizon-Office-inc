import { RedirectIfAuthenticated } from '@/features/auth/guards';
import { LoginForm } from '@/features/auth/LoginForm';
import { AuthCard } from '@/features/auth/ui/AuthCard';

export default function LoginPage() {
  return (
    <RedirectIfAuthenticated>
      <AuthCard title="Вхід">
        <LoginForm />
      </AuthCard>
    </RedirectIfAuthenticated>
  );
}
