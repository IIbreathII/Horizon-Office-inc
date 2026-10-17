'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { BUTTON_PRIMARY } from '@/shared/ui/PageShell';
import { ORGANIZATION_TYPES, organizationSchema, type OrganizationValues } from './schemas';
import { AuthPhoneField, AuthSelectField, AuthTextAreaField, AuthTextField } from './ui/AuthFields';

export function OrganizationRegisterForm() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OrganizationValues>({ resolver: zodResolver(organizationSchema), defaultValues: { description: '' } });

  async function onSubmit(values: OrganizationValues) {
    // TODO: POST /organizations via shared/api/api.ts (the account already exists after /register)
    console.info('register organization', values.organization_name);
    router.push('/org');
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      <AuthTextField
        label="Назва організації"
        autoComplete="organization"
        registration={register('organization_name')}
        error={errors.organization_name?.message}
      />
      <AuthSelectField label="Тип" options={ORGANIZATION_TYPES} registration={register('types')} error={errors.types?.message} />
      <AuthTextField label="Код ЄДРПОУ" registration={register('edrpou')} error={errors.edrpou?.message} />
      <AuthPhoneField label="Телефон організації" registration={register('contact')} error={errors.contact?.message} />
      <AuthTextAreaField label="Опис (необов’язково)" registration={register('description')} error={errors.description?.message} />
      <button type="submit" disabled={isSubmitting} className={`mt-3 ${BUTTON_PRIMARY}`}>
        Створити організацію
      </button>
    </form>
  );
}
