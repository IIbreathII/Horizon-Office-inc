'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { BUTTON } from '@/shared/ui/PageShell';
import { volunteerSchema, type VolunteerValues } from './schemas';
import { TextField } from './ui/TextField';

export function VolunteerRegisterForm() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<VolunteerValues>({ resolver: zodResolver(volunteerSchema) });

  async function onSubmit(values: VolunteerValues) {
    // TODO: POST /auth/register, then POST /profiles { role: 'volunteer', contact } via shared/api/api.ts
    console.info('register volunteer', values.email);
    router.push('/map');
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-3">
      <TextField label="Ім’я" autoComplete="name" registration={register('username')} error={errors.username?.message} />
      <TextField label="Email" type="email" autoComplete="email" registration={register('email')} error={errors.email?.message} />
      <TextField
        label="Телефон"
        type="tel"
        autoComplete="tel"
        registration={register('contact')}
        error={errors.contact?.message}
      />
      <TextField
        label="Пароль"
        type="password"
        autoComplete="new-password"
        registration={register('password')}
        error={errors.password?.message}
      />
      <TextField
        label="Повторіть пароль"
        type="password"
        autoComplete="new-password"
        registration={register('confirmPassword')}
        error={errors.confirmPassword?.message}
      />
      <button type="submit" disabled={isSubmitting} className={`mt-2 ${BUTTON}`}>
        Зареєструватися
      </button>
    </form>
  );
}
