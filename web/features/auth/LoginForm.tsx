'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { BUTTON_PRIMARY } from '@/shared/ui/PageShell';
import { authApi, type AuthResult } from './authApi';
import { useAuth } from './AuthProvider';
import { GoogleSignInButton } from './GoogleSignInButton';
import { safeNext } from './next';
import { loginSchema, type LoginValues } from './schemas';
import { AuthTextField } from './ui/AuthFields';

export function LoginForm() {
  const router = useRouter();
  const { signIn, homePath } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const [googlePending, setGooglePending] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  /** Save the session, then: a new Google account picks its role; otherwise back to `next` or the user's home. */
  async function finish({ created }: AuthResult) {
    signIn();
    if (created) {
      router.push('/register/role');
      return;
    }
    const next = safeNext(new URLSearchParams(window.location.search).get('next'));
    const home = await homePath();
    // `next` may be left from the previous session (signing out of /org adds it): the cabinet is for organizations only
    router.replace(next && !(next.startsWith('/org') && home !== '/org') ? next : home);
  }

  async function onSubmit(values: LoginValues) {
    setFormError(null);
    try {
      await finish(await authApi.login(values.email, values.password));
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Не вдалося увійти');
    }
  }

  async function onGoogle(credential: string) {
    setFormError(null);
    setGooglePending(true);
    try {
      await finish(await authApi.google(credential));
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Не вдалося увійти через Google');
    } finally {
      setGooglePending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-5">
      <AuthTextField label="Email" type="email" autoComplete="email" registration={register('email')} error={errors.email?.message} />
      <AuthTextField
        label="Пароль"
        type="password"
        autoComplete="current-password"
        registration={register('password')}
        error={errors.password?.message}
      />

      {/* one under the other at every width: Google's button can't be narrower than 200px or wider than 400px */}
      <div className="mt-2 flex flex-col gap-3">
        <button type="submit" disabled={isSubmitting || googlePending} className={`w-full ${BUTTON_PRIMARY}`}>
          {isSubmitting ? 'Вхід…' : 'Увійти'}
        </button>
        <GoogleSignInButton onCredential={onGoogle} />
      </div>
      {formError && (
        <p role="alert" className="text-sm text-red-600">
          {formError}
        </p>
      )}

      <p className="pt-4 text-center text-sm">
        Немає акаунта?{' '}
        <Link href="/register" className="font-medium text-[#228fff] hover:underline">
          Зареєструватися
        </Link>
      </p>
    </form>
  );
}
