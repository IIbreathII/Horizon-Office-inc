'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { BUTTON } from '@/shared/ui/PageShell';
import { loginSchema, type LoginValues } from './schemas';
import { TextField } from './ui/TextField';

export function LoginForm() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginValues) {
    // TODO: POST /auth/login via shared/api/api.ts (sets the httpOnly cookie), then go by role
    console.info('login', values.email);
    router.push('/map');
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      <TextField label="Email" type="email" autoComplete="email" registration={register('email')} error={errors.email?.message} />
      <div className="flex flex-col gap-1">
        <TextField
          label="Пароль"
          type="password"
          autoComplete="current-password"
          registration={register('password')}
          error={errors.password?.message}
        />
        {/* TODO: password reset flow (no endpoint yet) */}
        <button type="button" className="self-end text-xs text-gray-500 hover:underline">
          Забули пароль?
        </button>
      </div>

      <div className="flex gap-3">
        <button type="submit" disabled={isSubmitting} className={`flex-1 ${BUTTON}`}>
          Увійти
        </button>
        {/* TODO: Google OAuth redirect (no endpoint yet) */}
        <button type="button" className={`flex-1 ${BUTTON}`}>
          Увійти через Google
        </button>
      </div>

      <p className="mt-4 text-center text-sm">
        Немає акаунта?{' '}
        <Link href="/register" className="underline">
          Зареєструватися
        </Link>
      </p>
    </form>
  );
}
