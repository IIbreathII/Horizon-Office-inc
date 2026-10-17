'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { BUTTON_PRIMARY } from '@/shared/ui/PageShell';
import { authApi } from './authApi';
import { useAuth } from './AuthProvider';
import { accountSchema, type AccountValues } from './schemas';
import { AuthPhoneField, AuthTextField } from './ui/AuthFields';

/** Step 1 of registration: create the account (signs in), then choose the role on /register/role. */
export function AccountRegisterForm() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AccountValues>({ resolver: zodResolver(accountSchema) });

  async function onSubmit(values: AccountValues) {
    setFormError(null);
    try {
      const { token } = await authApi.register({
        username: values.username,
        email: values.email,
        password: values.password,
        contact: values.contact.replace(/\s/g, ''), // "+380 67 123 45 67" → "+380671234567"
      });
      signIn(token);
      router.push('/register/role');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Не вдалося створити акаунт');
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      <AuthTextField label="Ім’я" autoComplete="name" registration={register('username')} error={errors.username?.message} />
      <AuthTextField label="Email" type="email" autoComplete="email" registration={register('email')} error={errors.email?.message} />
      <AuthPhoneField
        label="Телефон"
        registration={register('contact')}
        error={errors.contact?.message}
      />
      <AuthTextField
        label="Пароль"
        type="password"
        autoComplete="new-password"
        registration={register('password')}
        error={errors.password?.message}
      />
      <AuthTextField
        label="Повторіть пароль"
        type="password"
        autoComplete="new-password"
        registration={register('confirmPassword')}
        error={errors.confirmPassword?.message}
      />
      <button type="submit" disabled={isSubmitting} className={`mt-3 ${BUTTON_PRIMARY}`}>
        {isSubmitting ? 'Створення…' : 'Створити акаунт'}
      </button>
      {formError && (
        <p role="alert" className="text-sm text-red-600">
          {formError}
        </p>
      )}
    </form>
  );
}
