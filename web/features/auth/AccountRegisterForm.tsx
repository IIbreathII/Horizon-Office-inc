'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { BUTTON_PRIMARY } from '@/shared/ui/PageShell';
import { accountSchema, type AccountValues } from './schemas';
import { AuthPhoneField, AuthTextField } from './ui/AuthFields';

/** Step 1 of registration: create the account, then choose the role on /register/role. */
export function AccountRegisterForm() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AccountValues>({ resolver: zodResolver(accountSchema) });

  async function onSubmit(values: AccountValues) {
    // TODO: POST /auth/register { username, email, contact, password } via shared/api/api.ts (signs in)
    console.info('register account', values.email);
    router.push('/register/role');
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
        Створити акаунт
      </button>
    </form>
  );
}
