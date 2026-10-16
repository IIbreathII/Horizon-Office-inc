import { LoginForm } from '@/features/auth/LoginForm';
import { AuthCard } from '@/features/auth/ui/AuthCard';

export default function LoginPage() {
  return (
    <AuthCard title="Вхід">
      <LoginForm />
    </AuthCard>
  );
}
