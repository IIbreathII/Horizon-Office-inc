'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { ICONS } from '@/shared/icons';
import { Icon } from '@/shared/ui/Icon';
import { BUTTON_PRIMARY, BUTTON_SECONDARY } from '@/shared/ui/PageShell';
import { loginSchema, type LoginValues } from './schemas';
import { AuthTextField } from './ui/AuthFields';

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
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-1 flex-col gap-5">
      <AuthTextField label="Email" type="email" autoComplete="email" registration={register('email')} error={errors.email?.message} />
      <div className="relative">
        <AuthTextField
          label="Пароль"
          type="password"
          autoComplete="current-password"
          registration={register('password')}
          error={errors.password?.message}
        />
        {/* TODO: password reset flow (no endpoint yet) */}
        <button type="button" className="absolute -top-1.5 right-0 cursor-pointer py-1.5 text-xs text-gray-500 hover:text-[#228fff]">
          Забули пароль?
        </button>
      </div>

      <div className="mt-2 flex flex-wrap gap-3">
        <button type="submit" disabled={isSubmitting} className={`flex-1 ${BUTTON_PRIMARY}`}>
          Увійти
        </button>
        {/* TODO: Google OAuth redirect (no endpoint yet) */}
        <button type="button" className={`flex-1 whitespace-nowrap ${BUTTON_SECONDARY}`}>
          <Icon src={ICONS.google} className="size-4" />
          Увійти через Google
        </button>
      </div>

      <p className="mt-auto pt-6 text-center text-sm">
        Немає акаунта?{' '}
        <Link href="/register" className="font-medium text-[#228fff] hover:underline">
          Зареєструватися
        </Link>
      </p>
    </form>
  );
}
