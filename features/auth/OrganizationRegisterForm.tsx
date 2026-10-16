'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { BUTTON } from '@/shared/ui/PageShell';
import { ORGANIZATION_TYPES, organizationSchema, type OrganizationValues } from './schemas';
import { SelectField, TextAreaField, TextField } from './ui/TextField';

export function OrganizationRegisterForm() {
  const [done, setDone] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OrganizationValues>({ resolver: zodResolver(organizationSchema), defaultValues: { description: '' } });

  async function onSubmit(values: OrganizationValues) {
    // TODO: POST /auth/register, then POST /profiles { role: 'organization', … } via shared/api/api.ts,
    // then redirect to /org once the organization module exists
    console.info('register organization', values.organization_name);
    setDone(true);
  }

  if (done) return <p className="text-center">Заявку прийнято. Кабінет організації скоро буде доступний.</p>;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-3">
      <TextField
        label="Назва організації"
        autoComplete="organization"
        registration={register('organization_name')}
        error={errors.organization_name?.message}
      />
      <SelectField label="Тип" options={ORGANIZATION_TYPES} registration={register('types')} error={errors.types?.message} />
      <TextField label="Код ЄДРПОУ" registration={register('edrpou')} error={errors.edrpou?.message} />
      <TextField label="Email" type="email" autoComplete="email" registration={register('email')} error={errors.email?.message} />
      <TextField label="Телефон" type="tel" autoComplete="tel" registration={register('contact')} error={errors.contact?.message} />
      <TextAreaField label="Опис (необов’язково)" registration={register('description')} error={errors.description?.message} />
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
        Зареєструвати організацію
      </button>
    </form>
  );
}
