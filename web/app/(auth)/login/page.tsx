import { LoginForm } from '@/features/auth/LoginForm';
import { AuthCard } from '@/features/auth/ui/AuthCard';

// Signed-in visitors never get here: proxy.ts sends them into the app.
export default function LoginPage() {
  return (
    <AuthCard title="Вхід">
      <LoginForm />
    </AuthCard>
  );
}
